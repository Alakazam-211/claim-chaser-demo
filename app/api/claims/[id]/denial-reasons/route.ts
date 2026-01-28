import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET - Fetch all denial reasons for a claim
 * For demo claims, uses service role client to bypass RLS
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: claimId } = await params
    
    // Check if this is the demo claim (1738493) - use service role client to bypass RLS
    // First check using service role client to see if it's the demo claim
    let supabase
    const demoClaimId = 'c9a1742d-ad04-4ed9-a19e-11a9e708f2e1' // Known demo claim ID
    
    // If it's the known demo claim ID, use service role client directly
    if (claimId === demoClaimId) {
      console.log('Using service role client for demo claim')
      supabase = createServiceRoleClient()
    } else {
      // For other claims, try regular client first
      try {
        const regularClient = await createClient()
        // Verify it's not the demo claim by checking claim_number
        const serviceClient = createServiceRoleClient()
        const { data: claim } = await serviceClient
          .from('claims')
          .select('claim_number')
          .eq('id', claimId)
          .maybeSingle()
        
        // If it's the demo claim, use service role client
        if (claim?.claim_number === '1738493') {
          console.log('Using service role client for demo claim (by claim_number)')
          supabase = serviceClient
        } else {
          supabase = regularClient
        }
      } catch (error) {
        // Fallback to service role client if regular client fails
        console.log('Regular client failed, using service role client:', error)
        supabase = createServiceRoleClient()
      }
    }

    const { data, error } = await supabase
      .from('denial_reasons')
      .select('*')
      .eq('claim_id', claimId)
      .order('date_recorded', { ascending: false })

    if (error) {
      console.error('Error fetching denial reasons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch denial reasons', details: error.message },
        { status: 500 }
      )
    }

    console.log(`Fetched ${data?.length || 0} denial reasons for claim ${claimId}`)

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

