import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Use service role client for demo claim operations to bypass RLS
    const supabase = createServiceRoleClient()

    // Find the 1738493 claim
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id')
      .eq('claim_number', '1738493')
      .maybeSingle()

    if (claimError) {
      console.error('Error fetching demo claim:', claimError)
      return NextResponse.json(
        { error: 'Failed to fetch demo claim', details: claimError.message },
        { status: 500 }
      )
    }

    if (!claim) {
      return NextResponse.json(
        { error: 'Demo claim not found' },
        { status: 404 }
      )
    }

    // Delete all denial reasons for this claim
    const { data: deletedReasons, error: deleteError } = await supabase
      .from('denial_reasons')
      .delete()
      .eq('claim_id', claim.id)
      .select()

    if (deleteError) {
      console.error('Error deleting denial reasons:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete denial reasons', details: deleteError.message },
        { status: 500 }
      )
    }

    const deletedCount = deletedReasons?.length || 0
    console.log(`Deleted ${deletedCount} denial reasons for demo claim`)

    // Reset claim status to "Denied" and clear called_at
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        claim_status: 'Denied',
        called_at: null,
      })
      .eq('id', claim.id)

    if (updateError) {
      console.error('Error updating claim status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update claim status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Demo claim cleared successfully',
      deleted_denial_reasons: deletedCount,
    })
  } catch (error) {
    console.error('Error clearing demo claim:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

