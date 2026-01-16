import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH - Update a denial reason
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const denialReasonId = id
    const body = await request.json()
    const { 
      denial_reason, 
      resubmission_instructions, 
      date_reason_resubmitted, 
      date_accepted,
      status 
    } = body

    const supabase = await createClient()

    const updateData: any = {}

    if (denial_reason !== undefined) {
      updateData.denial_reason = denial_reason
    }
    if (resubmission_instructions !== undefined) {
      updateData.resubmission_instructions = resubmission_instructions
    }
    if (date_reason_resubmitted !== undefined) {
      updateData.date_reason_resubmitted = date_reason_resubmitted
      // Automatically set status to "Resubmitted" if a date is provided
      if (date_reason_resubmitted && date_reason_resubmitted !== null && date_reason_resubmitted !== '') {
        updateData.status = 'Resubmitted'
      }
    }
    if (date_accepted !== undefined) {
      updateData.date_accepted = date_accepted
      // Automatically set status to "Accepted" if a date is provided
      if (date_accepted && date_accepted !== null && date_accepted !== '') {
        updateData.status = 'Accepted'
      }
    }
    if (status !== undefined) {
      if (!['Pending', 'Resubmitted', 'Accepted'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be Pending, Resubmitted, or Accepted' },
          { status: 400 }
        )
      }
      // Only update status if it wasn't already set by the date_reason_resubmitted or date_accepted logic
      if (!updateData.status) {
        updateData.status = status
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('denial_reasons')
      .update(updateData)
      .eq('id', denialReasonId)
      .select()
      .single()

    if (error) {
      console.error('Error updating denial reason:', error)
      return NextResponse.json(
        { error: 'Failed to update denial reason' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      denial_reason: data,
    })
  } catch (error) {
    console.error('Error in PATCH denial-reasons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a denial reason
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const denialReasonId = id
    const supabase = await createClient()

    const { error } = await supabase
      .from('denial_reasons')
      .delete()
      .eq('id', denialReasonId)

    if (error) {
      console.error('Error deleting denial reason:', error)
      return NextResponse.json(
        { error: 'Failed to delete denial reason' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error in DELETE denial-reasons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

