import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claimId = id
    const body = await request.json()
    const { denial_reason, next_steps } = body

    if (!denial_reason || typeof denial_reason !== 'string' || !denial_reason.trim()) {
      return NextResponse.json(
        { error: 'denial_reason is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify claim exists
    const { data: currentClaim, error: fetchError } = await supabase
      .from('claims')
      .select('claim_status')
      .eq('id', claimId)
      .single()

    if (fetchError || !currentClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Create a new denial reason record
    // Get today's date in YYYY-MM-DD format (local timezone) to avoid timezone conversion
    const today = new Date()
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const { data: newDenialReason, error: insertError } = await supabase
      .from('denial_reasons')
      .insert({
        claim_id: claimId,
        denial_reason: denial_reason.trim(),
        date_recorded: todayString,
        status: 'Pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating denial reason:', insertError)
      return NextResponse.json(
        { error: 'Failed to create denial reason' },
        { status: 500 }
      )
    }

    // Update claim with next_steps if provided
    const updateData: any = {}
    if (next_steps !== undefined) {
      updateData.next_steps = next_steps
    }

    // If status is "Denied" and we're adding denial reasons, change to "Pending Resubmission"
    if (currentClaim.claim_status === 'Denied') {
      updateData.claim_status = 'Pending Resubmission'
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-denial-reasons/route.ts:68',message:'Updating claim status',data:{claimId,oldStatus:currentClaim.claim_status,newStatus:updateData.claim_status,updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,G'})}).catch(()=>{});
    // #endregion

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claimId)

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-denial-reasons/route.ts:73',message:'Claim status update result',data:{claimId,updateError:updateError?.message||null,success:!updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,G'})}).catch(()=>{});
      // #endregion

      if (updateError) {
        console.error('Error updating claim:', updateError)
        // Don't fail the request if claim update fails, denial reason was already created
      }
    }

    // Fetch updated claim with denial reasons
    const { data: updatedClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single()

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      denial_reason: newDenialReason,
    })
  } catch (error) {
    console.error('Error in update-denial-reasons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

