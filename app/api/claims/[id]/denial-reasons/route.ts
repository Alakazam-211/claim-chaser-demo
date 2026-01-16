import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Fetch all denial reasons for a claim
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: claimId } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('denial_reasons')
      .select('*')
      .eq('claim_id', claimId)
      .order('date_recorded', { ascending: false })

    if (error) {
      console.error('Error fetching denial reasons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch denial reasons' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      denial_reasons: data || [],
    })
  } catch (error) {
    console.error('Error in GET denial-reasons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

