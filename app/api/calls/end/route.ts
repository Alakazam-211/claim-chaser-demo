import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { callId, conversationId } = body

    // If conversationId is provided, try to end it via ElevenLabs API
    if (conversationId) {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (apiKey) {
        try {
          // Try to end the conversation via ElevenLabs API
          // Note: ElevenLabs may not have a direct "end" endpoint, but we can try
          // For now, we'll just update the database status
          // If ElevenLabs adds an endpoint to end conversations, we can add it here
        } catch (apiError) {
          console.warn('Could not end conversation via ElevenLabs API:', apiError)
          // Continue anyway - we'll still mark it as completed in the database
        }
      }
    }

    // Update the call status in the database
    const updateData: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
    }

    let result
    if (callId) {
      // Update by call ID
      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to end call', details: updateError.message },
          { status: 500 }
        )
      }

      result = updatedCall
    } else if (conversationId) {
      // Update by conversation ID
      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('conversation_id', conversationId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to end call', details: updateError.message },
          { status: 500 }
        )
      }

      result = updatedCall
    } else {
      // Find active call and end it
      const { data: activeCall, error: findError } = await supabase
        .from('calls')
        .select('id, conversation_id')
        .in('status', ['initiated', 'in_progress'])
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (findError) {
        return NextResponse.json(
          { error: 'Failed to find active call', details: findError.message },
          { status: 500 }
        )
      }

      if (!activeCall) {
        return NextResponse.json(
          { error: 'No active call found' },
          { status: 404 }
        )
      }

      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', activeCall.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to end call', details: updateError.message },
          { status: 500 }
        )
      }

      result = updatedCall
    }

    // After ending a call, check if voice is enabled and automatically start the next call
    console.log(`[END-CALL] Call ended (ID: ${result?.id}), checking if next call should start...`)
    try {
      const { data: voiceSettings } = await supabase
        .from('voice_settings')
        .select('enabled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log(`[END-CALL] Voice settings: enabled=${voiceSettings?.enabled}`)

      if (voiceSettings?.enabled) {
        // Check if there's already an active call
        const { data: existingActiveCall } = await supabase
          .from('calls')
          .select('id')
          .in('status', ['initiated', 'in_progress'])
          .is('ended_at', null)
          .limit(1)
          .maybeSingle()

        console.log(`[END-CALL] Existing active call check: ${existingActiveCall ? `Found active call (ID: ${existingActiveCall.id})` : 'No active call'}`)

        if (!existingActiveCall) {
          // Make the next call automatically
          try {
            // Construct the internal API URL
            const baseUrl = process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}`
              : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
            const makeCallUrl = `${baseUrl}/api/make-call`
            
            console.log(`[END-CALL] Attempting to start next call via: ${makeCallUrl}`)
            const makeCallResponse = await fetch(makeCallUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

            if (makeCallResponse.ok) {
              const makeCallData = await makeCallResponse.json()
              console.log(`[END-CALL] ✅ Successfully started next call: ${makeCallData.message || 'Call initiated'}`)
            } else {
              const errorData = await makeCallResponse.json().catch(() => ({ error: 'Unknown error' }))
              console.log(`[END-CALL] ❌ Could not start next call: ${errorData.error || 'Unknown error'}`)
            }
          } catch (makeCallError) {
            console.error('[END-CALL] ❌ Error making next call automatically:', makeCallError)
          }
        } else {
          console.log(`[END-CALL] ⏭️ Skipping - there is already an active call (ID: ${existingActiveCall.id})`)
        }
      } else {
        console.log(`[END-CALL] ⏭️ Skipping - voice is not enabled`)
      }
    } catch (voiceCheckError) {
      console.error('[END-CALL] ❌ Error checking voice settings:', voiceCheckError)
    }

    return NextResponse.json({
      success: true,
      message: 'Call ended successfully',
      call: result,
    })
  } catch (error) {
    console.error('Error ending call:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

