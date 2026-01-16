import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch recent completed calls
    const { data: calls, error } = await supabase
      .from('calls')
      .select('id, claim_id, status, started_at, ended_at, to_number')
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent calls:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent calls' },
        { status: 500 }
      )
    }

    // Fetch claim data for each call
    const callsWithDuration = await Promise.all((calls || []).map(async (call) => {
      let claimData = null
      if (call.claim_id) {
        const { data: claim } = await supabase
          .from('claims')
          .select('id, patient_name, claim_number, insurance_provider')
          .eq('id', call.claim_id)
          .maybeSingle()
        claimData = claim
      }

      const startedAt = new Date(call.started_at)
      const endedAt = new Date(call.ended_at)
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      const minutes = Math.floor(durationSeconds / 60)
      const seconds = durationSeconds % 60
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`

      // Format time
      const time = new Date(call.ended_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      return {
        ...call,
        duration,
        time,
        provider: claimData?.insurance_provider || 'Unknown',
        claim_number: claimData?.claim_number || null,
        patient_name: claimData?.patient_name || null,
      }
    }))

    return NextResponse.json({ calls: callsWithDuration })
  } catch (error) {
    console.error('Error in recent calls endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

