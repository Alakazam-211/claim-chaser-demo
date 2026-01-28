import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function GET() {
  try {
    // Use service role client to bypass RLS and see all calls
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch {
      // Fallback to regular client if service role key not available
      supabase = await createClient()
    }
    const apiKey = process.env.ELEVENLABS_API_KEY

    // Find the most recent active call (status is 'initiated' or 'in_progress' and not ended)
    // Use COALESCE to fallback to created_at if started_at is null
    const { data: activeCall, error } = await supabase
      .from('calls')
      .select('*')
      .in('status', ['initiated', 'in_progress'])
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:13',message:'Query for active call',data:{hasActiveCall:!!activeCall,callId:activeCall?.id,status:activeCall?.status,startedAt:activeCall?.started_at,conversationId:activeCall?.conversation_id,queryError:error?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
    // #endregion

    if (error) {
      console.error('Error fetching active call:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active call' },
        { status: 500 }
      )
    }

    // Debug logging
    if (activeCall) {
      console.log('Active call found:', {
        id: activeCall.id,
        status: activeCall.status,
        started_at: activeCall.started_at,
        conversation_id: activeCall.conversation_id,
        claim_id: activeCall.claim_id,
      })
    } else {
      // Check if there are any calls at all
      const { data: allCalls } = await supabase
        .from('calls')
        .select('id, status, started_at, ended_at')
        .order('started_at', { ascending: false })
        .limit(5)
      console.log('No active call found. Recent calls:', allCalls)
    }

    if (!activeCall) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:50',message:'No active call found - returning null',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ activeCall: null })
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:55',message:'Active call found - checking details',data:{callId:activeCall.id,status:activeCall.status,startedAt:activeCall.started_at,conversationId:activeCall.conversation_id,hasEndedAt:!!activeCall.ended_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
    // #endregion

    // Fetch claim data separately (more reliable than join)
    let claimData = null
    if (activeCall.claim_id) {
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .select('id, patient_name, claim_number, date_of_service, billed_amount, claim_status, insurance_provider')
        .eq('id', activeCall.claim_id)
        .maybeSingle()
      
      if (claimError) {
        console.warn('Error fetching claim data:', claimError)
      } else if (claim) {
        claimData = claim
      }
    }

    // Skip ElevenLabs verification for calls that just started (less than 30 seconds ago)
    // This prevents false positives where ElevenLabs might return "initiated" status
    // which could be misinterpreted as completed
    const callAgeSeconds = Math.floor((Date.now() - new Date(activeCall.started_at).getTime()) / 1000)
    const shouldCheckElevenLabs = callAgeSeconds > 30 // Only check calls older than 30 seconds
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:72',message:'Checking call age',data:{callAgeSeconds,shouldCheckElevenLabs,hasConversationId:!!activeCall.conversation_id,hasApiKey:!!apiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
    // #endregion
    
    // If call doesn't have conversation_id and is older than 2 minutes, mark as completed
    // (calls without conversation_id can't be verified, so we assume they're stale)
    if (!activeCall.conversation_id && callAgeSeconds > 120) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:76',message:'Call without conversation_id is old - marking completed',data:{callId:activeCall.id,callAgeSeconds},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'K'})}).catch(()=>{});
      // #endregion
      
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeCall.id)

      return NextResponse.json({ activeCall: null })
    }

    // Verify with ElevenLabs that the call is actually still active (only for older calls)
    if (activeCall.conversation_id && apiKey && shouldCheckElevenLabs) {
      try {
        const headers = {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        }

        const conversationResponse = await fetch(
          `${ELEVENLABS_API_BASE}/convai/conversations/${activeCall.conversation_id}`,
          { headers }
        )

        if (conversationResponse.ok) {
          const conversationData = await conversationResponse.json()
          
          // Check if conversation is completed
          const status = conversationData.status || conversationData.conversation_status
          const hasEndedAt = conversationData.ended_at !== null && conversationData.ended_at !== undefined
          
          // ElevenLabs "done" status means the call has ended, even if ended_at isn't set yet
          // Also check for other completion indicators
          const isCompleted = 
            status === 'completed' ||
            status === 'ended' ||
            status === 'done' ||
            status === 'finished' ||
            hasEndedAt ||
            (conversationData.conversation_status === 'completed' || 
             conversationData.conversation_status === 'ended' ||
             conversationData.conversation_status === 'done')

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:89',message:'ElevenLabs conversation check',data:{status,conversationStatus:conversationData.conversation_status,hasEndedAt,isCompleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
          // #endregion

          if (isCompleted) {
            // Call has ended - update the database
            await supabase
              .from('calls')
              .update({
                status: 'completed',
                ended_at: conversationData.ended_at || new Date().toISOString(),
              })
              .eq('id', activeCall.id)

            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:107',message:'Marking call as completed',data:{callId:activeCall.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J'})}).catch(()=>{});
            // #endregion

            // Return null since call is no longer active
            return NextResponse.json({ activeCall: null })
          }
        } else if (conversationResponse.status === 404) {
          // Only mark as completed if call is older than 5 minutes (conversation might not exist yet for new calls)
          if (callAgeSeconds > 300) {
            // Conversation not found - likely ended (but only if call is old enough)
            await supabase
              .from('calls')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
              })
              .eq('id', activeCall.id)

            return NextResponse.json({ activeCall: null })
          }
        }
      } catch (apiError) {
        // If API check fails, continue with the call as active
        // (don't fail the request, just log the error)
        console.warn('Failed to verify call status with ElevenLabs:', apiError)
      }
    }

    // Calculate call duration in seconds
    const startedAt = new Date(activeCall.started_at)
    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

    // Also check if call has been going on for more than 2 hours (likely ended but not updated)
    const twoHoursInSeconds = 2 * 60 * 60
    if (durationSeconds > twoHoursInSeconds) {
      // Call has been going on for too long - mark as completed
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeCall.id)

      return NextResponse.json({ activeCall: null })
    }

    const responseData = {
      activeCall: {
        ...activeCall,
        claims: claimData,
        duration_seconds: durationSeconds,
      },
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calls/active/route.ts:162',message:'Returning active call to frontend',data:{callId:activeCall.id,status:activeCall.status,durationSeconds,hasClaimData:!!claimData},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'J,K,L'})}).catch(()=>{});
    // #endregion
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in active call endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

