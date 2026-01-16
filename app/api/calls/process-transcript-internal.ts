import { SupabaseClient } from '@supabase/supabase-js'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

interface ExtractedData {
  denial_reasons: string[]
  next_steps?: string
  claim_status?: string
}

/**
 * Clean up a denial reason by removing conversational prefixes and extracting the core reason
 */
function cleanDenialReason(reason: string): string {
  let cleaned = reason.trim()
  
  // Remove common conversational prefixes (case-insensitive)
  const prefixes = [
    /^yeah[,]?\s*/i,
    /^yes[,]?\s*/i,
    /^well[,]?\s*/i,
    /^um[,]?\s*/i,
    /^uh[,]?\s*/i,
    /^so[,]?\s*/i,
    /^okay[,]?\s*/i,
    /^it was denied because\s*/i,
    /^it was denied\s+/i,
    /^the claim was denied because\s*/i,
    /^the claim was denied\s+/i,
    /^it's denied because\s*/i,
    /^it's denied\s+/i,
    /^the reason is\s*/i,
    /^the reason was\s*/i,
    /^the denial reason is\s*/i,
    /^the denial reason was\s*/i,
    /^because\s*/i,
    /^due to\s*/i,
  ]
  
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '')
  }
  
  // Handle "there was no/is no/wasn't/isn't" -> "missing"
  cleaned = cleaned.replace(/^there (?:was|is|wasn't|isn't) no\s+/i, 'missing ')
  cleaned = cleaned.replace(/^there (?:was|is|wasn't|isn't)\s+/i, '')
  cleaned = cleaned.replace(/^there's no\s+/i, 'missing ')
  
  // Handle "no [something] put on the record" -> "missing [something]"
  cleaned = cleaned.replace(/^no\s+(.+?)\s+put on the record/i, 'missing $1')
  cleaned = cleaned.replace(/^no\s+(.+?)\s+on the record/i, 'missing $1')
  
  // Handle "wasn't [something]" -> "missing [something]"
  cleaned = cleaned.replace(/^wasn't\s+/i, 'missing ')
  cleaned = cleaned.replace(/^isn't\s+/i, 'missing ')
  
  // Handle "was not [something]" -> "missing [something]"
  cleaned = cleaned.replace(/^was not\s+/i, 'missing ')
  cleaned = cleaned.replace(/^is not\s+/i, 'missing ')
  
  // Remove trailing phrases that don't add value
  cleaned = cleaned.replace(/\s+put on the record\.?$/i, '')
  cleaned = cleaned.replace(/\s+on the record\.?$/i, '')
  cleaned = cleaned.replace(/\s+in the system\.?$/i, '')
  cleaned = cleaned.replace(/\s+in the file\.?$/i, '')
  
  // Capitalize first letter
  cleaned = cleaned.trim()
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  // Remove trailing punctuation and normalize whitespace
  cleaned = cleaned.replace(/[.,!?;:]+$/, '').replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Split a denial reason string that contains multiple reasons (separated by "and", "also", etc.)
 */
function splitMultipleReasons(reason: string, depth: number = 0): string[] {
  // Prevent infinite recursion
  if (depth > 5) {
    const cleaned = cleanDenialReason(reason)
    return cleaned.length > 5 ? [cleaned] : []
  }
  
  const reasons: string[] = []
  
  // Patterns to split on: "and", "also", ", and", etc.
  // Order matters - more specific patterns first
  const splitPatterns = [
    /\s+and\s+the\s+/i,      // "and the" (e.g., "no service and the doctor wasn't listed")
    /\s+and\s+there\s+/i,    // "and there" (e.g., "no service and there was no doctor")
    /\s+and\s+(?:it|this|that)\s+/i,  // "and it/this/that"
    /[,]\s+and\s+/i,         // ", and" (comma before and)
    /\s+and\s+(?=[A-Z])/i,   // "and" followed by capital letter (new sentence)
    /\s+and\s+/i,             // "and" (general case - check last)
    /\s+also[,]?\s+/i,       // "also"
    /[,]\s+also\s+/i,        // ", also"
  ]
  
  let remaining = reason
  let splitFound = false
  
  for (const pattern of splitPatterns) {
    const parts = remaining.split(pattern)
    if (parts.length > 1) {
      splitFound = true
      // Recursively split each part in case there are more reasons
      for (const part of parts) {
        const subReasons = splitMultipleReasons(part, depth + 1)
        if (subReasons.length > 0) {
          reasons.push(...subReasons)
        } else {
          const cleaned = cleanDenialReason(part)
          if (cleaned.length > 5) {
            reasons.push(cleaned)
          }
        }
      }
      break
    }
  }
  
  // If no split pattern found, return the cleaned single reason
  if (!splitFound) {
    const cleaned = cleanDenialReason(reason)
    if (cleaned.length > 5) {
      reasons.push(cleaned)
    }
  }
  
  return reasons
}

/**
 * Extract denial reasons and other information from transcript
 */
async function extractClaimInfoFromTranscript(
  transcript: string,
  messages: any[]
): Promise<ExtractedData> {
  const fullTranscript = messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'Insurance Rep' : 'Agent'
      const content = msg.message || msg.content || ''
      return `${role}: ${content}`
    })
    .join('\n\n')

  const denialReasons: string[] = []
  let nextSteps = ''

  // Look for denial reasons in user messages
  const userMessages = messages.filter((m) => m.role === 'user')
  
  // Pattern matching for denial reasons - improved patterns
  const denialPatterns = [
    /denied because\s+(.+?)(?:\.|$|,|and|also)/gi,
    /reason for denial[:\s]+(.+?)(?:\.|$|,|and|also)/gi,
    /denial reason[:\s]+(.+?)(?:\.|$|,|and|also)/gi,
    /not covered[:\s]+(.+?)(?:\.|$|,|and|also)/gi,
    /was denied[:\s]+(.+?)(?:\.|$|,|and|also)/gi,
    /denial code[:\s]+(.+?)(?:\.|$|,|and|also)/gi,
    /denied\s+(?:due to|because of|for)\s+(.+?)(?:\.|$|,|and|also)/gi,
  ]

  for (const pattern of denialPatterns) {
    const matches = fullTranscript.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        const rawReason = match[1].trim()
        // Split if multiple reasons, otherwise clean single reason
        const splitReasons = splitMultipleReasons(rawReason)
        for (const reason of splitReasons) {
          if (reason && reason.length > 5) {
            denialReasons.push(reason)
          }
        }
      }
    }
  }

  // Look for sentences with denial keywords in user messages
  const denialKeywords = ['denied', 'denial', 'rejected', 'not covered', 'not eligible', 'not approved']
  for (const msg of userMessages) {
    const content = msg.message || msg.content || ''
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim())
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      if (denialKeywords.some(keyword => lowerSentence.includes(keyword))) {
        // Only process if it wasn't already captured by patterns above
        const trimmed = sentence.trim()
        if (trimmed.length > 10) {
          // Check if this sentence contains a denial reason pattern
          let foundInPattern = false
          for (const pattern of denialPatterns) {
            if (pattern.test(trimmed)) {
              foundInPattern = true
              break
            }
          }
          
          // If not found in patterns, try to extract the reason part
          if (!foundInPattern) {
            // Try to extract just the reason part after denial keywords
            const reasonMatch = trimmed.match(/(?:denied|denial|rejected|not covered|not eligible|not approved)[:\s]+(.+?)(?:\.|$|,|and|also)/i)
            if (reasonMatch && reasonMatch[1]) {
              const splitReasons = splitMultipleReasons(reasonMatch[1])
              for (const reason of splitReasons) {
                if (reason && reason.length > 5) {
                  denialReasons.push(reason)
                }
              }
            } else {
              // Fallback: clean the whole sentence
              const splitReasons = splitMultipleReasons(trimmed)
              for (const reason of splitReasons) {
                if (reason && reason.length > 5) {
                  denialReasons.push(reason)
                }
              }
            }
          }
        }
      }
    }
  }

  // Normalize and deduplicate denial reasons (case-insensitive, normalize punctuation)
  const normalizeReason = (reason: string): string => {
    return reason
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]+$/, '') // Remove trailing punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
  
  const seen = new Set<string>()
  const uniqueReasons: string[] = []
  
  for (const reason of denialReasons) {
    const trimmed = reason.trim()
    if (trimmed.length > 5) {
      const normalized = normalizeReason(trimmed)
      if (!seen.has(normalized)) {
        seen.add(normalized)
        uniqueReasons.push(trimmed) // Keep original capitalization
      }
    }
  }

  // Extract next steps
  for (const msg of userMessages) {
    const content = (msg.message || msg.content || '').toLowerCase()
    if (
      content.includes('next step') ||
      content.includes('you need to') ||
      content.includes('to fix') ||
      content.includes('to resolve')
    ) {
      if (!nextSteps) {
        nextSteps = msg.message || msg.content || ''
      }
    }
  }
  
  return {
    denial_reasons: uniqueReasons,
    next_steps: nextSteps || undefined,
  }
}

/**
 * Process transcript for a call and update the claim
 * This is the internal function that can be called from cron jobs or API endpoints
 */
export async function processTranscriptForCall(
  conversationId: string,
  callId: string | null,
  supabase: SupabaseClient,
  apiKey: string
): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:124',message:'processTranscriptForCall started',data:{conversationId,callId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // Get call record if call_id is provided
  let callRecord = null
  if (callId) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:133',message:'Call record lookup',data:{callId,found:!!data,error:error?.message||null,claimId:data?.claim_id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    if (error) {
      throw new Error(`Call not found: ${error.message}`)
    }
    callRecord = data
  }

  // Fetch conversation transcript from ElevenLabs
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  }

  const conversationResponse = await fetch(
    `${ELEVENLABS_API_BASE}/convai/conversations/${conversationId}`,
    { headers }
  )

  if (!conversationResponse.ok) {
    const errorText = await conversationResponse.text()
    throw new Error(`Failed to fetch conversation: ${errorText}`)
  }

  const conversationData = await conversationResponse.json()
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:161',message:'Conversation data structure',data:{conversationId,allKeys:Object.keys(conversationData),hasMessages:!!conversationData.messages,hasTranscript:!!conversationData.transcript,hasHistory:!!conversationData.history,status:conversationData.status,messageCount:conversationData.messages?.length||0,transcriptLength:conversationData.transcript?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // ElevenLabs returns transcript as an array, not messages
  // Try transcript first (ElevenLabs format), then messages (legacy), then history
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:177',message:'Before extraction',data:{conversationId,hasTranscript:!!conversationData.transcript,transcriptType:typeof conversationData.transcript,transcriptIsArray:Array.isArray(conversationData.transcript),transcriptLength:conversationData.transcript?.length||0,hasMessages:!!conversationData.messages,messagesLength:conversationData.messages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  let messages = conversationData.transcript || conversationData.messages || conversationData.history || []
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:182',message:'After first assignment',data:{conversationId,messagesLength:messages.length,messagesType:typeof messages,messagesIsArray:Array.isArray(messages),source:conversationData.transcript?'transcript':conversationData.messages?'messages':'history'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  // If messages is an object, try to extract array from it
  if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
    messages = messages.items || messages.data || []
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:187',message:'Extracted from object',data:{conversationId,messagesLength:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:192',message:'Messages extracted - final',data:{conversationId,messageCount:messages.length,hasMessages:messages.length>0,isArray:Array.isArray(messages),firstMessageKeys:messages.length>0?Object.keys(messages[0]):[],firstMessageSample:messages.length>0?JSON.stringify(messages[0]).substring(0,200):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  if (messages.length === 0) {
    // Wait a moment and retry once - transcript might not be ready immediately
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:175',message:'No messages found - retrying after wait',data:{conversationId,status:conversationData.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const retryResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/conversations/${conversationId}`,
      { headers }
    )
    
    if (retryResponse.ok) {
      const retryData = await retryResponse.json()
      messages = retryData.transcript || retryData.messages || retryData.history || []
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:190',message:'Retry after wait',data:{conversationId,messageCount:messages.length,hasMessages:messages.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    }
    
    if (messages.length === 0) {
      throw new Error('No transcript found for this conversation - transcript may not be available yet')
    }
  }

  // Extract denial reasons and other information
  const extractedData = await extractClaimInfoFromTranscript(
    JSON.stringify(conversationData),
    messages
  )

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:172',message:'Extraction complete',data:{denialReasonsCount:extractedData.denial_reasons.length,denialReasons:extractedData.denial_reasons,hasNextSteps:!!extractedData.next_steps},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // Update call record with transcript and extracted data
  if (callRecord) {
    await supabase
      .from('calls')
      .update({
        transcript: conversationData,
        extracted_data: extractedData,
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callRecord.id)
  } else {
    // Try to find call record by conversation_id
    const { data: existingCall } = await supabase
      .from('calls')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:187',message:'Looking up call by conversation_id',data:{conversationId,found:!!existingCall,claimId:existingCall?.claim_id||null,toNumber:existingCall?.to_number||null,hasToNumber:!!existingCall?.to_number,allKeys:existingCall?Object.keys(existingCall):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

    if (existingCall) {
      await supabase
        .from('calls')
        .update({
          transcript: conversationData,
          extracted_data: extractedData,
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', existingCall.id)
      
      callRecord = existingCall // Use the full existingCall object, not just claim_id
    }
  }

  // Update the claim with extracted information
  let claimId = callRecord?.claim_id

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:208',message:'Preparing claim update',data:{claimId,hasClaimId:!!claimId,denialReasonsCount:extractedData.denial_reasons.length,callRecordClaimId:callRecord?.claim_id,toNumber:callRecord?.to_number,hasCallRecord:!!callRecord,callRecordKeys:callRecord?Object.keys(callRecord):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
  // #endregion

  // Fallback: If claim_id is missing, try to find claim by phone number and call time
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:281',message:'Checking fallback condition',data:{hasClaimId:!!claimId,hasCallRecord:!!callRecord,hasToNumber:!!callRecord?.to_number,toNumber:callRecord?.to_number,willRunFallback:(!claimId&&!!callRecord?.to_number)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!claimId && callRecord?.to_number) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:281',message:'Attempting fallback claim lookup',data:{toNumber:callRecord.to_number,startedAt:callRecord.started_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Find claim by phone number, matching calls made within 2 hours of the call start time
    const callStartTime = callRecord.started_at ? new Date(callRecord.started_at) : new Date()
    const twoHoursBefore = new Date(callStartTime.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const twoHoursAfter = new Date(callStartTime.getTime() + 2 * 60 * 60 * 1000).toISOString()
    
    const { data: matchingClaims, error: lookupError } = await supabase
      .from('claims')
      .select('id, claims_phone_number, called_at')
      .eq('claims_phone_number', callRecord.to_number)
      .gte('called_at', twoHoursBefore)
      .lte('called_at', twoHoursAfter)
      .order('called_at', { ascending: false })
      .limit(1)
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:293',message:'Fallback lookup result',data:{found:!!matchingClaims,matchCount:matchingClaims?.length||0,matchedClaimId:matchingClaims?.[0]?.id||null,lookupError:lookupError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (matchingClaims && matchingClaims.length > 0) {
      claimId = matchingClaims[0].id
      
      // Update the call record with the found claim_id
      await supabase
        .from('calls')
        .update({ claim_id: claimId })
        .eq('id', callRecord.id)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:303',message:'Updated call record with found claim_id',data:{callId:callRecord.id,claimId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } else {
      // Fallback: Try matching by phone number only (most recent claim with that number)
      const { data: phoneOnlyClaims, error: phoneLookupError } = await supabase
        .from('claims')
        .select('id, claims_phone_number')
        .eq('claims_phone_number', callRecord.to_number)
        .order('created_at', { ascending: false })
        .limit(1)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:312',message:'Phone-only fallback lookup',data:{found:!!phoneOnlyClaims,matchCount:phoneOnlyClaims?.length||0,matchedClaimId:phoneOnlyClaims?.[0]?.id||null,phoneLookupError:phoneLookupError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      if (phoneOnlyClaims && phoneOnlyClaims.length > 0) {
        claimId = phoneOnlyClaims[0].id
        
        // Update the call record with the found claim_id
        await supabase
          .from('calls')
          .update({ claim_id: claimId })
          .eq('id', callRecord.id)
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:323',message:'Updated call record with phone-matched claim_id',data:{callId:callRecord.id,claimId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    }
  }

  if (!claimId) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:309',message:'WARNING: No claim_id found - cannot update claim',data:{conversationId,callId,callRecordExists:!!callRecord,toNumber:callRecord?.to_number},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    // Still update the call record with transcript even if no claim_id
    return
  }

  if (claimId) {
    const { data: currentClaim } = await supabase
      .from('claims')
      .select('claim_status')
      .eq('id', claimId)
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:212',message:'Current claim fetched',data:{claimId,found:!!currentClaim,currentStatus:currentClaim?.claim_status,denialReasonsCount:extractedData.denial_reasons.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    const updateData: any = {}

    // Create denial reason records in the new table
    if (extractedData.denial_reasons.length > 0) {
      // Normalize function to check for duplicates
      const normalizeReason = (reason: string): string => {
        return reason
          .trim()
          .toLowerCase()
          .replace(/[.,!?;:]+$/, '') // Remove trailing punctuation
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      // Get existing denial reasons for this claim to avoid duplicates
      const { data: existingDenialReasons } = await supabase
        .from('denial_reasons')
        .select('denial_reason')
        .eq('claim_id', claimId)
      
      const existingNormalized = new Set(
        (existingDenialReasons || []).map((dr: any) => normalizeReason(dr.denial_reason))
      )
      
      // Insert new denial reasons that don't already exist
      const newDenialReasons = extractedData.denial_reasons
        .filter(reason => {
          const normalized = normalizeReason(reason)
          return !existingNormalized.has(normalized)
        })
        .map(reason => {
          // Get today's date in YYYY-MM-DD format (local timezone) to avoid timezone conversion
          const today = new Date()
          const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          
          return {
            claim_id: claimId,
            denial_reason: reason.trim(),
            date_recorded: todayString,
            status: 'Pending' as const
          }
        })
      
      if (newDenialReasons.length > 0) {
        const { error: insertError } = await supabase
          .from('denial_reasons')
          .insert(newDenialReasons)
        
        if (insertError) {
          throw new Error(`Failed to insert denial reasons: ${insertError.message}`)
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:235',message:'Denial reasons inserted',data:{claimId,insertedCount:newDenialReasons.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // Update claim status if it was "Denied"
        if (currentClaim?.claim_status === 'Denied') {
          updateData.claim_status = 'Pending Resubmission'
        }
      }
    }

    if (extractedData.next_steps) {
      updateData.next_steps = extractedData.next_steps
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:235',message:'Updating claim',data:{claimId,updateData,updateDataKeys:Object.keys(updateData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claimId)

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:240',message:'Claim update result',data:{claimId,success:!updateError,error:updateError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      if (updateError) {
        throw new Error(`Failed to update claim: ${updateError.message}`)
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:244',message:'No data to update',data:{claimId,denialReasonsCount:extractedData.denial_reasons.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
    }
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-transcript-internal.ts:247',message:'No claimId - skipping claim update',data:{callRecordClaimId:callRecord?.claim_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
  }
}

