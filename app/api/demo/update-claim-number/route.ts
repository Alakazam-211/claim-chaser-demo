import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Find the DEMO12345 claim
    const { data: oldClaim, error: findError } = await supabase
      .from('claims')
      .select('id')
      .eq('claim_number', 'DEMO12345')
      .maybeSingle()

    if (findError) {
      console.error('Error finding old claim:', findError)
      return NextResponse.json(
        { error: 'Failed to find old claim' },
        { status: 500 }
      )
    }

    if (!oldClaim) {
      // Check if claim with new number already exists
      const { data: existingClaim } = await supabase
        .from('claims')
        .select('id')
        .eq('claim_number', '1738493')
        .maybeSingle()

      if (existingClaim) {
        return NextResponse.json({
          success: true,
          message: 'Claim with number 1738493 already exists',
        })
      }

      return NextResponse.json(
        { error: 'Demo claim not found. It will be created when you make your first call.' },
        { status: 404 }
      )
    }

    // Update the claim number
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        claim_number: '1738493',
      })
      .eq('id', oldClaim.id)

    if (updateError) {
      console.error('Error updating claim number:', updateError)
      return NextResponse.json(
        { error: 'Failed to update claim number' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Claim number updated successfully from DEMO12345 to 1738493',
    })
  } catch (error) {
    console.error('Error updating claim number:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}


