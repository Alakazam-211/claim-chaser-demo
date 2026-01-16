import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Webhook endpoint for ElevenLabs to notify when a call ends
 * This can be configured in ElevenLabs dashboard or called manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ElevenLabs webhook payload structure may vary
    // Common fields: conversation_id, status, event_type
    const { conversation_id, conversationId, status, event_type, eventType } = body
    
    const convId = conversation_id || conversationId
    
    if (!convId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    // Check if call is completed
    const isCompleted = 
      status === 'completed' || 
      status === 'ended' ||
      event_type === 'conversation.completed' ||
      eventType === 'conversation.completed'

    if (!isCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Call not yet completed, will process when completed',
      })
    }

    // Process the transcript by calling our process-transcript endpoint
    // We do this internally to avoid circular dependencies
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000'
    
    const processResponse = await fetch(`${baseUrl}/api/calls/process-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation_id: convId }),
    })

    if (!processResponse.ok) {
      const error = await processResponse.json()
      console.error('Error processing transcript:', error)
      return NextResponse.json(
        { error: 'Failed to process transcript', details: error },
        { status: 500 }
      )
    }

    const result = await processResponse.json()

    // After processing a completed call, check if voice is enabled and automatically start the next call
    try {
      const supabase = await createClient()
      const { data: voiceSettings } = await supabase
        .from('voice_settings')
        .select('enabled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (voiceSettings?.enabled) {
        // Check if there's already an active call
        const { data: existingActiveCall } = await supabase
          .from('calls')
          .select('id')
          .in('status', ['initiated', 'in_progress'])
          .is('ended_at', null)
          .limit(1)
          .maybeSingle()

        if (!existingActiveCall) {
          // Make the next call automatically
          try {
            // Construct the internal API URL
            const baseUrl = process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}`
              : process.env.NEXT_PUBLIC_SITE_URL || 
                process.env.NEXT_PUBLIC_APP_URL || 
                request.headers.get('origin') || 
                'http://localhost:3000'
            const makeCallUrl = `${baseUrl}/api/make-call`
            
            const makeCallResponse = await fetch(makeCallUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

            if (makeCallResponse.ok) {
              const makeCallData = await makeCallResponse.json()
              console.log(`Automatically started next call from webhook: ${makeCallData.message || 'Call initiated'}`)
            } else {
              const errorData = await makeCallResponse.json().catch(() => ({ error: 'Unknown error' }))
              // Don't fail the webhook if we can't make a new call (maybe no claims available)
              console.log(`Could not automatically start next call from webhook: ${errorData.error || 'Unknown error'}`)
            }
          } catch (makeCallError) {
            // Don't fail the webhook if making the next call fails
            console.error('Error making next call automatically from webhook:', makeCallError)
          }
        }
      }
    } catch (voiceCheckError) {
      // Don't fail the webhook if checking voice settings fails
      console.error('Error checking voice settings in webhook:', voiceCheckError)
    }

    return NextResponse.json({
      success: true,
      message: 'Call processed successfully',
      ...result,
    })
  } catch (error) {
    console.error('Error in ElevenLabs webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// Also support GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'ElevenLabs webhook endpoint is active',
  })
}


