import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

/**
 * Cron job endpoint that runs every minute to check for completed calls
 * and automatically process their transcripts
 * 
 * Configure this in vercel.json or your hosting platform's cron settings
 */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:12',message:'Cron job started',data:{timestamp:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Verify this is a cron request (optional security check)
  // Allow Vercel cron requests (they send x-vercel-cron header) or requests with valid CRON_SECRET
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const authHeader = request.headers.get('authorization')
  const hasValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  
  if (process.env.CRON_SECRET && !isVercelCron && !hasValidSecret) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:16',message:'Auth failed',data:{hasSecret:!!process.env.CRON_SECRET,isVercelCron,hasValidSecret,hasHeader:!!authHeader},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use service role client to bypass RLS (same as active endpoint)
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch {
      // Fallback to regular client if service role key not available
      supabase = await createClient()
    }
    const apiKey = process.env.ELEVENLABS_API_KEY

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:25',message:'API key check',data:{hasApiKey:!!apiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // First, check the most recent call to understand its state
    // #region agent log
    const { data: mostRecentCall } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:32',message:'Most recent call state',data:{hasRecentCall:!!mostRecentCall,callId:mostRecentCall?.id,status:mostRecentCall?.status,conversationId:mostRecentCall?.conversation_id,hasConversationId:!!mostRecentCall?.conversation_id,startedAt:mostRecentCall?.started_at,endedAt:mostRecentCall?.ended_at,hasEndedAt:!!mostRecentCall?.ended_at,hasExtractedData:!!mostRecentCall?.extracted_data,extractedDataKeys:mostRecentCall?.extracted_data?Object.keys(mostRecentCall.extracted_data):[],extractedDataDenialReasons:mostRecentCall?.extracted_data?.denial_reasons?.length||0,createdAt:mostRecentCall?.created_at,now:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,H'})}).catch(()=>{});
    // #endregion

    // Find all calls that are initiated or in_progress
    // Check calls that started more than 1 minute ago (to avoid checking calls that just started)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:40',message:'Querying active calls',data:{oneMinuteAgo,now:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
    
    const { data: activeCalls, error: fetchError } = await supabase
      .from('calls')
      .select('*')
      .in('status', ['initiated', 'in_progress'])
      .lt('started_at', oneMinuteAgo)
      .not('conversation_id', 'is', null)

    // Also check for recently completed calls that might not have been processed correctly
    // (e.g., if transcript extraction failed or claim_id was missing)
    // Check for calls completed in the last 10 minutes that don't have extracted_data or have empty extracted_data
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:48',message:'Querying recently completed calls',data:{tenMinutesAgo,now:new Date().toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion
    
    const { data: recentCompletedCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('status', 'completed')
      .gte('ended_at', tenMinutesAgo)
      .not('conversation_id', 'is', null)
      .limit(10)

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:55',message:'Recently completed calls query result',data:{recentCompletedCount:recentCompletedCalls?.length||0,callIds:recentCompletedCalls?.map(c=>c.id)||[],callDetails:recentCompletedCalls?.map(c=>({id:c.id,status:c.status,endedAt:c.ended_at,hasExtractedData:!!c.extracted_data,extractedDataKeys:c.extracted_data?Object.keys(c.extracted_data):[]}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion

    // Also check for calls that started recently but don't have extracted_data yet
    // This catches calls that might be completed but status/ended_at haven't been updated yet
    // Query for calls without extracted_data (null or empty object)
    const { data: recentCallsWithoutData } = await supabase
      .from('calls')
      .select('*')
      .gte('started_at', tenMinutesAgo)
      .not('conversation_id', 'is', null)
      .limit(20) // Get more to filter in code

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:65',message:'Recent calls without extracted_data query result',data:{recentCallsWithoutDataCount:recentCallsWithoutData?.length||0,callIds:recentCallsWithoutData?.map(c=>c.id)||[],callDetails:recentCallsWithoutData?.map(c=>({id:c.id,status:c.status,startedAt:c.started_at,endedAt:c.ended_at,hasExtractedData:!!c.extracted_data}))||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D,H'})}).catch(()=>{});
    // #endregion

    // Filter to only those without extracted_data or with empty extracted_data
    const callsNeedingProcessing = (recentCompletedCalls || []).filter(call => 
      !call.extracted_data || 
      (typeof call.extracted_data === 'object' && Object.keys(call.extracted_data).length === 0) ||
      (call.extracted_data && (!call.extracted_data.denial_reasons || call.extracted_data.denial_reasons.length === 0))
    )
    
    // Also add recent calls without data that aren't already in the list
    const recentCallsNeedingProcessing = (recentCallsWithoutData || []).filter(call => {
      // Skip if already in activeCalls or callsNeedingProcessing
      const alreadyIncluded = 
        (activeCalls || []).some(c => c.id === call.id) ||
        callsNeedingProcessing.some(c => c.id === call.id)
      
      if (alreadyIncluded) return false
      
      // Include if no extracted_data or empty extracted_data
      return !call.extracted_data || 
        (typeof call.extracted_data === 'object' && Object.keys(call.extracted_data).length === 0) ||
        (call.extracted_data && (!call.extracted_data.denial_reasons || call.extracted_data.denial_reasons.length === 0))
    })
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:85',message:'Recent calls needing processing (from fallback query)',data:{recentCallsNeedingProcessingCount:recentCallsNeedingProcessing.length,callIds:recentCallsNeedingProcessing.map(c=>c.id),callDetails:recentCallsNeedingProcessing.map(c=>({id:c.id,status:c.status,startedAt:c.started_at,endedAt:c.ended_at}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D,H'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:62',message:'Filtered calls needing processing',data:{recentCompletedCount:recentCompletedCalls?.length||0,needsProcessingCount:callsNeedingProcessing.length,callIds:callsNeedingProcessing.map(c=>c.id),filterDetails:callsNeedingProcessing.map(c=>({id:c.id,hasExtractedData:!!c.extracted_data,extractedDataType:typeof c.extracted_data,extractedDataKeys:c.extracted_data?Object.keys(c.extracted_data):[],denialReasonsCount:c.extracted_data?.denial_reasons?.length||0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    // Combine all lists
    const allCallsToProcess = [...(activeCalls || []), ...callsNeedingProcessing, ...recentCallsNeedingProcessing]

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:68',message:'Active calls query result',data:{activeCallsCount:activeCalls?.length||0,error:fetchError?.message||null,callIds:activeCalls?.map(c=>c.id)||[],conversationIds:activeCalls?.map(c=>c.conversation_id)||[],statuses:activeCalls?.map(c=>c.status)||[],startedAts:activeCalls?.map(c=>c.started_at)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:71',message:'All calls to process',data:{totalCallsToProcess:allCallsToProcess.length,callIds:allCallsToProcess.map(c=>c.id),mostRecentCallIncluded:mostRecentCall?allCallsToProcess.some(c=>c.id===mostRecentCall.id):false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,H'})}).catch(()=>{});
    // #endregion

    if (fetchError) {
      console.error('Error fetching active calls:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: 500 }
      )
    }

    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    }

    let processedCount = 0
    let errorCount = 0
    const errors: string[] = []
    let nextCallAttempted = false // Track if we've already tried to make the next call

    // Helper function to attempt making the next call
    const attemptNextCall = async () => {
      if (nextCallAttempted) return
      
      try {
        // First, get ALL voice settings to see what's in the database
        const { data: allVoiceSettings } = await supabase
          .from('voice_settings')
          .select('id, enabled, created_at, updated_at')
          .order('created_at', { ascending: false })

        // Then get the latest one (what we actually use)
        const { data: voiceSettings, error: voiceSettingsError } = await supabase
          .from('voice_settings')
          .select('id, enabled, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:214',message:'Voice settings check (next call attempt)',data:{enabled:voiceSettings?.enabled,hasVoiceSettings:!!voiceSettings,voiceSettingsId:voiceSettings?.id,allSettingsCount:allVoiceSettings?.length||0,allSettings:allVoiceSettings?.map(s=>({id:s.id,enabled:s.enabled,created:s.created_at}))||[],error:voiceSettingsError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        if (voiceSettings?.enabled) {
          // Check if there's already an active call
          const { data: existingActiveCall } = await supabase
            .from('calls')
            .select('id')
            .in('status', ['initiated', 'in_progress'])
            .is('ended_at', null)
            .limit(1)
            .maybeSingle()

          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:220',message:'Active call check (next call attempt)',data:{hasActiveCall:!!existingActiveCall,activeCallId:existingActiveCall?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion

          if (!existingActiveCall) {
            nextCallAttempted = true // Mark that we've attempted to make the next call
            
            // Make the next call automatically by directly calling the handler function
            try {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:224',message:'Attempting to make next call via direct import',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E,F'})}).catch(()=>{});
              // #endregion
              
              console.log(`[AUTO-CALL] Checking if next call should start...`)
              
              // Directly import and call the make-call handler function
              const { POST: makeCallHandler } = await import('../../make-call/route')
              const makeCallRequest = new NextRequest('http://localhost/api/make-call', {
                method: 'POST',
              })
              const makeCallResponse = await makeCallHandler(makeCallRequest)

              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:236',message:'make-call handler response received',data:{status:makeCallResponse.status,ok:makeCallResponse.ok,statusText:makeCallResponse.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,F'})}).catch(()=>{});
              // #endregion

              if (makeCallResponse.ok) {
                const makeCallData = await makeCallResponse.json()
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:243',message:'Next call started successfully',data:{message:makeCallData.message,claimId:makeCallData.claim_id,callId:makeCallData.call_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                console.log(`[AUTO-CALL] Successfully started next call: ${makeCallData.message || 'Call initiated'}`)
              } else {
                const errorData = await makeCallResponse.json().catch(() => ({ error: 'Unknown error' }))
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:247',message:'make-call handler returned error',data:{status:makeCallResponse.status,error:errorData.error,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,F'})}).catch(()=>{});
                // #endregion
                console.log(`[AUTO-CALL] Could not start next call: ${errorData.error || 'Unknown error'}`)
              }
            } catch (makeCallError) {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:250',message:'Exception making next call',data:{error:makeCallError instanceof Error?makeCallError.message:String(makeCallError),stack:makeCallError instanceof Error?makeCallError.stack:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
              console.error('[AUTO-CALL] Error making next call automatically:', makeCallError)
            }
          } else {
            console.log(`[AUTO-CALL] Skipping - there is already an active call (ID: ${existingActiveCall.id})`)
          }
        } else {
          console.log(`[AUTO-CALL] Skipping - voice is not enabled`)
        }
      } catch (voiceCheckError) {
        console.error('[AUTO-CALL] Error checking voice settings:', voiceCheckError)
      }
    }

    // If there are no calls to process, still check if we should make a new call
    if (!allCallsToProcess || allCallsToProcess.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:97',message:'No calls to process - checking for new calls',data:{mostRecentCallId:mostRecentCall?.id,mostRecentCallStatus:mostRecentCall?.status,mostRecentCallHasConversationId:!!mostRecentCall?.conversation_id,mostRecentCallStartedAt:mostRecentCall?.started_at,mostRecentCallEndedAt:mostRecentCall?.ended_at,oneMinuteAgo,tenMinutesAgo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion
      await attemptNextCall()
      return NextResponse.json({
        success: true,
        message: 'No calls to process',
        processed: 0,
      })
    }

    // Check each call to see if it's completed
    for (const call of allCallsToProcess) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:67',message:'Processing call',data:{callId:call.id,claimId:call.claim_id,conversationId:call.conversation_id,status:call.status,startedAt:call.started_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
        // #endregion

        if (!call.conversation_id) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:70',message:'Skipping call - no conversation_id',data:{callId:call.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          continue
        }

        // Fetch conversation status from ElevenLabs
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:74',message:'Fetching conversation from ElevenLabs',data:{conversationId:call.conversation_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        const conversationResponse = await fetch(
          `${ELEVENLABS_API_BASE}/convai/conversations/${call.conversation_id}`,
          { headers }
        )

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:79',message:'ElevenLabs API response',data:{status:conversationResponse.status,ok:conversationResponse.ok,conversationId:call.conversation_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        if (!conversationResponse.ok) {
          // If conversation not found or error, skip it
          const errorText = await conversationResponse.text()
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:82',message:'ElevenLabs API error',data:{status:conversationResponse.status,errorText,conversationId:call.conversation_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          console.warn(`Failed to fetch conversation ${call.conversation_id}: ${conversationResponse.status}`)
          continue
        }

        const conversationData = await conversationResponse.json()
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:89',message:'Conversation data received',data:{hasStatus:!!conversationData.status,status:conversationData.status,hasConversationStatus:!!conversationData.conversation_status,conversationStatus:conversationData.conversation_status,hasEndedAt:!!conversationData.ended_at,endedAt:conversationData.ended_at,messageCount:conversationData.messages?.length||0,lastMessageRole:conversationData.messages?.[conversationData.messages.length-1]?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,F'})}).catch(()=>{});
        // #endregion

        // Check if conversation is completed
        // ElevenLabs may return status in different fields
        const status = conversationData.status || conversationData.conversation_status
        const isCompleted = 
          call.status === 'completed' || // Already marked as completed
          status === 'completed' ||
          status === 'ended' ||
          status === 'done' ||
          status === 'finished' ||
          conversationData.ended_at !== null ||
          (conversationData.transcript && conversationData.transcript.length > 0) || // Has transcript
          (conversationData.messages && conversationData.messages.length > 0 && 
           conversationData.messages[conversationData.messages.length - 1]?.role === 'system')

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:96',message:'Completion check result',data:{callStatus:call.status,conversationStatus:status,isCompleted,check1:call.status==='completed',check2:status==='completed',check3:status==='ended',check4:status==='done',check5:status==='finished',check6:conversationData.ended_at!==null,check7:!!conversationData.transcript,check8:conversationData.messages?.length>0&&conversationData.messages[conversationData.messages.length-1]?.role==='system'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        if (!isCompleted && call.status !== 'completed') {
          // Call is still in progress, update status if needed
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:99',message:'Call not completed yet',data:{callId:call.id,currentStatus:call.status,hasMessages:!!conversationData.messages,hasTranscript:!!conversationData.transcript,messageCount:conversationData.messages?.length||0,transcriptCount:conversationData.transcript?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          if (call.status === 'initiated' && (conversationData.transcript?.length > 0 || conversationData.messages?.length > 0)) {
            await supabase
              .from('calls')
              .update({ status: 'in_progress' })
              .eq('id', call.id)
          }
          continue
        }

        // Call is completed - update status if not already marked as completed
        if (call.status !== 'completed' || !call.ended_at) {
          await supabase
            .from('calls')
            .update({ 
              status: 'completed',
              ended_at: conversationData.ended_at || new Date().toISOString()
            })
            .eq('id', call.id)
          console.log(`[CRON] Updated call ${call.id} status to completed`)
        }

        // Call is completed - first check if we need to start the next call
        // Do this BEFORE processing transcript so it happens immediately
        await attemptNextCall()

        // Now process the transcript
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:110',message:'Call completed - starting transcript processing',data:{callId:call.id,claimId:call.claim_id,conversationId:call.conversation_id,status:call.status,endedAt:call.ended_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F,G'})}).catch(()=>{});
        // #endregion

        const { processTranscriptForCall } = await import('../../calls/process-transcript-internal')
        
        try {
          await processTranscriptForCall(call.conversation_id, call.id, supabase, apiKey)
          processedCount++
          
          // Verify the data was saved
          const { data: updatedCall } = await supabase
            .from('calls')
            .select('extracted_data, transcript')
            .eq('id', call.id)
            .single()
          
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:120',message:'Transcript processed - verifying save',data:{callId:call.id,claimId:call.claim_id,hasExtractedData:!!updatedCall?.extracted_data,extractedDataKeys:updatedCall?.extracted_data?Object.keys(updatedCall.extracted_data):[],denialReasonsCount:updatedCall?.extracted_data?.denial_reasons?.length||0,hasTranscript:!!updatedCall?.transcript},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
          // #endregion
          
          console.log(`Successfully processed call ${call.id} for claim ${call.claim_id}`)
        } catch (processError) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:125',message:'Transcript processing failed',data:{callId:call.id,error:processError instanceof Error?processError.message:String(processError),stack:processError instanceof Error?processError.stack:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          console.error(`Failed to process transcript for call ${call.id}:`, processError)
          errorCount++
          errors.push(`Call ${call.id}: ${processError instanceof Error ? processError.message : 'Unknown error'}`)
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-completed-calls/route.ts:131',message:'Error in call processing loop',data:{callId:call.id,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        console.error(`Error processing call ${call.id}:`, error)
        errorCount++
        errors.push(`Call ${call.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // After processing all calls, check if we should make a new call (in case we didn't process any completed calls)
    await attemptNextCall()

    return NextResponse.json({
      success: true,
      message: `Checked ${allCallsToProcess.length} calls`,
      processed: processedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in process-completed-calls cron:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export const POST = GET

