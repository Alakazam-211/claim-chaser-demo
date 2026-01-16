import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function GET() {
  try {
    const supabase = await createClient()
    const apiKey = process.env.ELEVENLABS_API_KEY

    // Find the most recent active call (status is 'initiated' or 'in_progress' and not ended)
    const { data: activeCall, error } = await supabase
      .from('calls')
      .select('*')
      .in('status', ['initiated', 'in_progress'])
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active call:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active call' },
        { status: 500 }
      )
    }

    if (!activeCall) {
      return NextResponse.json({ activeCall: null })
    }

    // Fetch claim data separately (more reliable than join)
    let claimData = null
    if (activeCall.claim_id) {
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .select('id, patient_name, claim_number, date_of_service, billed_amount, claim_status, insurance_provider')
        .eq('id', activeCall.claim_id)
        .maybeSingle()
      
      if (claimError) {
        console.warn('Error fetching claim data:', claimError)
      } else if (claim) {
        claimData = claim
      }
    }

    // Skip ElevenLabs verification for calls that just started (less than 30 seconds ago)
    // This prevents false positives where ElevenLabs might return "initiated" status
    // which could be misinterpreted as completed
    const callAgeSeconds = Math.floor((Date.now() - new Date(activeCall.started_at).getTime()) / 1000)
    const shouldCheckElevenLabs = callAgeSeconds > 30 // Only check calls older than 30 seconds
    
    // Verify with ElevenLabs that the call is actually still active (only for older calls)
    if (activeCall.conversation_id && apiKey && shouldCheckElevenLabs) {
      try {
        const headers = {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        }

        const conversationResponse = await fetch(
          `${ELEVENLABS_API_BASE}/convai/conversations/${activeCall.conversation_id}`,
          { headers }
        )

        if (conversationResponse.ok) {
          const conversationData = await conversationResponse.json()
          
          // Check if conversation is completed
          const status = conversationData.status || conversationData.conversation_status
          const hasEndedAt = conversationData.ended_at !== null && conversationData.ended_at !== undefined
          
          // ElevenLabs "done" status means the call has ended, even if ended_at isn't set yet
          // Also check for other completion indicators
          const isCompleted = 
            status === 'completed' ||
            status === 'ended' ||
            status === 'done' ||
            status === 'finished' ||
            hasEndedAt ||
            (conversationData.conversation_status === 'completed' || 
             conversationData.conversation_status === 'ended' ||
             conversationData.conversation_status === 'done')

          if (isCompleted) {
            // Call has ended - update the database
            await supabase
              .from('calls')
              .update({
                status: 'completed',
                ended_at: conversationData.ended_at || new Date().toISOString(),
              })
              .eq('id', activeCall.id)

            // Return null since call is no longer active
            return NextResponse.json({ activeCall: null })
          }
        } else if (conversationResponse.status === 404) {
          // Only mark as completed if call is older than 5 minutes (conversation might not exist yet for new calls)
          if (callAgeSeconds > 300) {
            // Conversation not found - likely ended (but only if call is old enough)
            await supabase
              .from('calls')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
              })
              .eq('id', activeCall.id)

            return NextResponse.json({ activeCall: null })
          }
        }
      } catch (apiError) {
        // If API check fails, continue with the call as active
        // (don't fail the request, just log the error)
        console.warn('Failed to verify call status with ElevenLabs:', apiError)
      }
    }

    // Calculate call duration in seconds
    const startedAt = new Date(activeCall.started_at)
    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

    // Also check if call has been going on for more than 2 hours (likely ended but not updated)
    const twoHoursInSeconds = 2 * 60 * 60
    if (durationSeconds > twoHoursInSeconds) {
      // Call has been going on for too long - mark as completed
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeCall.id)

      return NextResponse.json({ activeCall: null })
    }

    return NextResponse.json({
      activeCall: {
        ...activeCall,
        claims: claimData,
        duration_seconds: durationSeconds,
      },
    })
  } catch (error) {
    console.error('Error in active call endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

