import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS (same as active endpoint)
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch {
      // Fallback to regular client if service role key not available
      supabase = await createClient()
    }
    
    const body = await request.json()
    const { callId, conversationId } = body

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:15',message:'End call request received',data:{callId,conversationId,hasCallId:!!callId,hasConversationId:!!conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
    // #endregion

    // Get conversation_id and call_sid from call record if not provided
    let actualConversationId = conversationId
    let callSid = null
    if (callId) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:22',message:'Looking up call record',data:{callId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
      // #endregion
      
      const { data: callRecord, error: fetchError } = await supabase
        .from('calls')
        .select('conversation_id, call_sid')
        .eq('id', callId)
        .single()

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:30',message:'Call record lookup result',data:{callId,found:!!callRecord,hasConversationId:!!callRecord?.conversation_id,conversationId:callRecord?.conversation_id,hasCallSid:!!callRecord?.call_sid,error:fetchError?.message||null,errorCode:fetchError?.code||null,errorDetails:fetchError?.details||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
      // #endregion

      if (fetchError) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:35',message:'Call record lookup failed',data:{callId,error:fetchError.message,errorCode:fetchError.code,errorDetails:fetchError.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
        // #endregion
        
        return NextResponse.json(
          { error: 'Failed to find call record', details: fetchError.message },
          { status: 500 }
        )
      }

      if (!actualConversationId) {
        actualConversationId = callRecord?.conversation_id || null
      }
      callSid = callRecord?.call_sid || null
    }

    // Try to end the conversation via ElevenLabs API
    if (actualConversationId) {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (apiKey) {
        try {
          const headers = {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          }

          // Try multiple endpoints to end the conversation
          let endedSuccessfully = false
          const attempts = []

          // Attempt 1: POST /end
          try {
            const postEndResponse = await fetch(
              `${ELEVENLABS_API_BASE}/convai/conversations/${actualConversationId}/end`,
              {
                method: 'POST',
                headers,
              }
            )
            const postEndText = await postEndResponse.text().catch(() => '')
            attempts.push(`POST /end: ${postEndResponse.status} - ${postEndText.substring(0, 200)}`)
            if (postEndResponse.ok) {
              console.log(`[END-CALL] ✅ Successfully ended conversation ${actualConversationId} via POST /end`)
              endedSuccessfully = true
            }
          } catch (e) {
            attempts.push(`POST /end: Error - ${e}`)
          }

          // Attempt 2: DELETE conversation
          if (!endedSuccessfully) {
            try {
              const deleteResponse = await fetch(
                `${ELEVENLABS_API_BASE}/convai/conversations/${actualConversationId}`,
                {
                  method: 'DELETE',
                  headers,
                }
              )
              const deleteText = await deleteResponse.text().catch(() => '')
              attempts.push(`DELETE: ${deleteResponse.status} - ${deleteText.substring(0, 200)}`)
              if (deleteResponse.ok) {
                console.log(`[END-CALL] ✅ Successfully ended conversation ${actualConversationId} via DELETE`)
                endedSuccessfully = true
              } else if (deleteResponse.status === 404) {
                console.log(`[END-CALL] Conversation ${actualConversationId} not found (may already be ended)`)
                endedSuccessfully = true // Consider 404 as success (already ended)
              }
            } catch (e) {
              attempts.push(`DELETE: Error - ${e}`)
            }
          }

          // Attempt 3: PATCH with status update
          if (!endedSuccessfully) {
            try {
              const patchResponse = await fetch(
                `${ELEVENLABS_API_BASE}/convai/conversations/${actualConversationId}`,
                {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({ status: 'ended', action: 'end' }),
                }
              )
              const patchText = await patchResponse.text().catch(() => '')
              attempts.push(`PATCH: ${patchResponse.status} - ${patchText.substring(0, 200)}`)
              if (patchResponse.ok) {
                console.log(`[END-CALL] ✅ Successfully ended conversation ${actualConversationId} via PATCH`)
                endedSuccessfully = true
              }
            } catch (e) {
              attempts.push(`PATCH: Error - ${e}`)
            }
          }

          // Attempt 4: POST to hangup endpoint
          if (!endedSuccessfully) {
            try {
              const hangupResponse = await fetch(
                `${ELEVENLABS_API_BASE}/convai/conversations/${actualConversationId}/hangup`,
                {
                  method: 'POST',
                  headers,
                }
              )
              const hangupText = await hangupResponse.text().catch(() => '')
              attempts.push(`POST /hangup: ${hangupResponse.status} - ${hangupText.substring(0, 200)}`)
              if (hangupResponse.ok) {
                console.log(`[END-CALL] ✅ Successfully ended conversation ${actualConversationId} via POST /hangup`)
                endedSuccessfully = true
              }
            } catch (e) {
              attempts.push(`POST /hangup: Error - ${e}`)
            }
          }

          // Attempt 5: If we have call_sid, try Twilio-specific endpoint
          if (!endedSuccessfully && callSid) {
            try {
              const twilioEndResponse = await fetch(
                `${ELEVENLABS_API_BASE}/convai/twilio/calls/${callSid}/end`,
                {
                  method: 'POST',
                  headers,
                }
              )
              const twilioText = await twilioEndResponse.text().catch(() => '')
              attempts.push(`POST /twilio/calls/${callSid}/end: ${twilioEndResponse.status} - ${twilioText.substring(0, 200)}`)
              if (twilioEndResponse.ok) {
                console.log(`[END-CALL] ✅ Successfully ended call ${callSid} via Twilio endpoint`)
                endedSuccessfully = true
              }
            } catch (e) {
              attempts.push(`Twilio endpoint: Error - ${e}`)
            }
          }

          if (!endedSuccessfully) {
            console.warn(`[END-CALL] ⚠️ Could not end conversation ${actualConversationId} via ElevenLabs API. Attempts:`, attempts)
            // Log all attempts for debugging
            attempts.forEach((attempt, idx) => {
              console.warn(`[END-CALL] Attempt ${idx + 1}: ${attempt}`)
            })
          }
        } catch (apiError) {
          console.warn('[END-CALL] Could not end conversation via ElevenLabs API:', apiError)
          // Continue anyway - we'll still mark it as completed in the database
        }
      }
    }

    // Update the call status in the database
    const updateData: any = {
      status: 'completed',
      ended_at: new Date().toISOString(),
    }

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:195',message:'Updating call status',data:{callId,conversationId,updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
    // #endregion

    let result
    if (callId) {
      // Update by call ID
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:203',message:'Updating call by ID',data:{callId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
      // #endregion
      
      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single()

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/end/route.ts:210',message:'Update by ID result',data:{callId,success:!updateError,updatedCallId:updatedCall?.id,error:updateError?.message||null,errorCode:updateError?.code||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
      // #endregion

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

