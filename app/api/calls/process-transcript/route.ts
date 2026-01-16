import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processTranscriptForCall } from '../process-transcript-internal'

/**
 * Process a completed call and update the claim with extracted information
 * Can be called directly or by the cron job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { conversation_id, call_id } = body

    if (!conversation_id && !call_id) {
      return NextResponse.json(
        { error: 'conversation_id or call_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Get call record if call_id is provided
    let callRecord = null
    if (call_id) {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', call_id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Call not found' },
          { status: 404 }
        )
      }
      callRecord = data
    }

    // If we have a call record, use its conversation_id
    const convId = conversation_id || callRecord?.conversation_id

    if (!convId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    // Use the shared processing function
    await processTranscriptForCall(convId, callRecord?.id || null, supabase, apiKey)

    // Get the updated call record to return extracted data
    const { data: updatedCall } = await supabase
      .from('calls')
      .select('extracted_data')
      .eq('conversation_id', convId)
      .single()

    return NextResponse.json({
      success: true,
      extracted_data: updatedCall?.extracted_data || {},
      message: 'Transcript processed and claim updated successfully',
    })
  } catch (error) {
    console.error('Error processing transcript:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

