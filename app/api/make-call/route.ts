import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function POST(request: NextRequest) {
  try {
    // Get Supabase client
    const supabase = await createClient()

    // Check if there's already an active call
    const { data: activeCall } = await supabase
      .from('calls')
      .select('id, status')
      .in('status', ['initiated', 'in_progress'])
      .is('ended_at', null)
      .limit(1)
      .maybeSingle()

    if (activeCall) {
      return NextResponse.json(
        { error: 'There is already an active call in progress. Please wait for it to complete.' },
        { status: 409 }
      )
    }

    // Priority 1: Find denied claims (even if they have denial reasons - allows retries)
    let { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('claim_status', 'Denied')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:28',message:'Querying for Denied claims',data:{foundClaim:!!claim,claimId:claim?.id,claimStatus:claim?.claim_status,error:claimError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Priority 2: If no denied claims, find "Pending Resubmission" claims (these need follow-up calls)
    if (claimError || !claim) {
      const { data: pendingResubmissionClaims, error: pendingError } = await supabase
        .from('claims')
        .select('*')
        .eq('claim_status', 'Pending Resubmission')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:40',message:'Querying for Pending Resubmission claims',data:{foundClaim:!!pendingResubmissionClaims,claimId:pendingResubmissionClaims?.id,claimStatus:pendingResubmissionClaims?.claim_status,error:pendingError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      if (!pendingError && pendingResubmissionClaims) {
        claim = pendingResubmissionClaims
        claimError = null
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:47',message:'Selected claim from Pending Resubmission list',data:{claimId:claim.id,claimStatus:claim.claim_status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }
    }

    // Priority 3: If no denied or pending resubmission claims, find any uncalled claim
    if (claimError || !claim) {
      const { data: uncalledClaims, error: uncalledError } = await supabase
        .from('claims')
        .select('*')
        .is('called_at', null)
        .order('created_at', { ascending: true })

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:54',message:'Querying for uncalled claims',data:{uncalledCount:uncalledClaims?.length||0,claimIds:uncalledClaims?.map(c=>c.id)||[],claimStatuses:uncalledClaims?.map(c=>c.claim_status)||[],error:uncalledError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      if (uncalledError || !uncalledClaims || uncalledClaims.length === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:61',message:'No claims found to call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return NextResponse.json(
          { error: 'No claims found that need calling. All claims have been called.' },
          { status: 404 }
        )
      }

      claim = uncalledClaims[0]
      claimError = null
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:70',message:'Selected claim from uncalled list',data:{claimId:claim.id,claimStatus:claim.claim_status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }

    // Get office information if office_id exists
    let officeInfo = null
    if (claim.office_id) {
      const { data: office, error: officeError } = await supabase
        .from('offices')
        .select('*')
        .eq('id', claim.office_id)
        .single()
      
      if (!officeError && office) {
        officeInfo = office
      } else {
        // Offices table might not exist or office not found, continue without office info
        console.warn('Could not fetch office info:', officeError?.message)
      }
    }

    // Get doctor information if doctor_id exists
    let doctorInfo = null
    if (claim.doctor_id) {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', claim.doctor_id)
        .single()
      
      if (!doctorError && doctor) {
        doctorInfo = doctor
      } else {
        // Doctors table might not exist or doctor not found, continue without doctor info
        console.warn('Could not fetch doctor info:', doctorError?.message)
      }
    }

    // Get ElevenLabs API key from environment
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    }

    // Find the "Demo Claim Chaser" agent
    const agentsResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/agents`,
      { headers }
    )

    if (!agentsResponse.ok) {
      const errorText = await agentsResponse.text()
      console.error('ElevenLabs API error:', {
        status: agentsResponse.status,
        statusText: agentsResponse.statusText,
        error: errorText
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch agents from ElevenLabs',
          details: errorText,
          status: agentsResponse.status
        },
        { status: 500 }
      )
    }

    const agentsData = await agentsResponse.json()
    const agents = agentsData.agents || []
    
    const agent = agents.find((a: any) => 
      a.name?.toLowerCase().includes('demo claim chaser') ||
      a.name?.toLowerCase().includes('claim chaser')
    )

    if (!agent) {
      return NextResponse.json(
        { error: 'Demo Claim Chaser agent not found in ElevenLabs' },
        { status: 404 }
      )
    }

    const agentId = agent.agent_id

    // Get phone numbers
    const phoneNumbersResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/phone-numbers`,
      { headers }
    )

    if (!phoneNumbersResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch phone numbers from ElevenLabs' },
        { status: 500 }
      )
    }

    const phoneNumbersData = await phoneNumbersResponse.json()
    const phoneNumbers = Array.isArray(phoneNumbersData) 
      ? phoneNumbersData 
      : phoneNumbersData.phone_numbers || []

    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No phone numbers found in ElevenLabs' },
        { status: 404 }
      )
    }

    const phoneNumber = phoneNumbers[0]
    const phoneNumberId = phoneNumber.phone_number_id

    // Get the provider information using the provider_id relationship
    if (!claim.provider_id) {
      return NextResponse.json(
        { error: `Claim does not have a provider associated. Please link this claim to a provider.` },
        { status: 400 }
      )
    }

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('claims_phone_number, name')
      .eq('id', claim.provider_id)
      .single()

    if (providerError || !provider?.claims_phone_number) {
      return NextResponse.json(
        { error: `No phone number found for provider. Please ensure the provider has a claims_phone_number set.` },
        { status: 404 }
      )
    }

    let toNumber = provider.claims_phone_number
    const providerName = provider.name || claim.insurance_provider || 'the insurance provider'

    // Ensure phone number is in E.164 format
    if (!toNumber.startsWith('+')) {
      toNumber = '+' + toNumber.replace(/\D/g, '')
    }

    // Build dynamic prompt with claim-specific information
    let dynamicPrompt = `# Personality

You are Russel, a professional medical billing representative calling ${providerName} at ${toNumber} on behalf of a medical office.

Your name is Russel. When introducing yourself, say "My name is Russel" or "This is Russel calling" or similar variations.

You are CURRENTLY ON THE PHONE CALL speaking directly with the insurance representative. You are NOT helping someone else make this call—YOU ARE THE AGENT ON THE CALL.

# Claim Information

**Patient Information:**
- Patient Name: ${claim.patient_name}
${claim.patient_id ? `- Patient ID: ${claim.patient_id}` : ''}
${claim.date_of_birth ? `- Date of Birth: ${claim.date_of_birth}` : ''}

**Claim Details:**
- Insurance Provider: ${providerName}
${claim.claim_number ? `- Claim Number: ${claim.claim_number}` : ''}
${claim.date_of_service ? `- Date of Service: ${claim.date_of_service}` : ''}
${claim.billed_amount ? `- Billed Amount: $${claim.billed_amount}` : ''}
${claim.length_of_service ? `- Length of Service: ${claim.length_of_service}` : ''}
${claim.claim_status ? `- Current Status: ${claim.claim_status}` : ''}

`

    if (officeInfo) {
      dynamicPrompt += `**Office Information:**
- Office Name: ${officeInfo.name}
${officeInfo.address ? `- Address: ${officeInfo.address}` : ''}
${officeInfo.city && officeInfo.state ? `- City, State: ${officeInfo.city}, ${officeInfo.state}` : ''}
${officeInfo.zip_code ? `- ZIP Code: ${officeInfo.zip_code}` : ''}
${officeInfo.callback_number ? `- Callback Number: ${officeInfo.callback_number}` : ''}
${officeInfo.ein ? `- EIN: ${officeInfo.ein}` : ''}

**IMPORTANT:** If asked for the office phone number or callback number, provide the Callback Number listed above. The Callback Number is the phone number to use for callbacks.

`
    }

    if (doctorInfo) {
      dynamicPrompt += `**Doctor Information:**
- Doctor Name: ${doctorInfo.name}
${doctorInfo.npi ? `- NPI: ${doctorInfo.npi}` : ''}

`
    }

    dynamicPrompt += `# Goal

Get the reason why the claim was denied and what needs to happen next:

1. Navigate the automated phone system
2. Verify claim status with the representative
3. **Get ALL reasons why the claim was denied** - ask specifically for every denial reason
4. **Get clear instructions on how to fix each denial reason** - what needs to happen next for each issue
5. Ensure you have complete information about all denial reasons and corresponding fixes

This step is important: Only provide patient information when explicitly asked.

This step is important: Do not end the call until you have obtained ALL denial reasons and the specific next steps to fix each one.

# Guardrails

Never provide patient information unless the representative specifically requests it. This step is important.

Never volunteer additional information beyond what is asked.

If asked a Yes or No question, respond with only "Yes" or "No" - do not add any additional words or explanations. This step is important.`

    // Build DTMF rules separately to avoid nested template literal issues
    const npiValue = doctorInfo?.npi || '1740598556'
    const einValue = officeInfo?.ein || '453080679'
    const patientIdValue = claim.patient_id || '101987841000'
    
    const npiRule = '- If asked to enter your **NPI** or **NPI or tax ID** → use play_keypad_touch_tone with "' + npiValue + '"'
    const einRule = '- If asked to enter your **tax ID** or **EIN** → use play_keypad_touch_tone with "' + einValue + '"'
    const patientIdRule = '- If asked to enter your **ID**, **member ID**, **member\'s ID**, or **patient ID** → use play_keypad_touch_tone with "' + patientIdValue + '"'

    dynamicPrompt += `**CRITICAL DTMF RULES:**
1. **WAIT FOR PROMPTS**: Do NOT send DTMF tones automatically. WAIT until the automated system explicitly asks you to press a button or enter a number.
2. **ONLY SEND DTMF WHEN ASKED**: Only use the play_keypad_touch_tone tool when the system explicitly asks you to press a button or enter a number via keypad.
3. **MATCH THE REQUESTED NUMBER**: When asked to enter a number via keypad:
   ${npiRule}
   ${einRule}
   ${patientIdRule}
   - If asked to press a menu option (e.g., "Press 0 for operator") → use play_keypad_touch_tone with the digit requested (e.g., "0")
4. **CRITICAL: WHEN ASKED FOR KEYPAD INPUT, YOU MUST USE THE TOOL - DO NOT SPEAK**: If the system asks you to enter numbers via keypad, you MUST use the play_keypad_touch_tone tool immediately. Do NOT say anything - just silently use the tool.
5. **DO NOT ANNOUNCE THAT YOU ARE SENDING DTMF**: When using the play_keypad_touch_tone tool, do NOT announce it. Just silently use the tool.`

    // Update agent prompt with claim-specific information
    const updatePromptResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/agents/${agentId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: dynamicPrompt,
              },
            },
          },
        }),
      }
    )

    if (!updatePromptResponse.ok) {
      const errorText = await updatePromptResponse.text()
      console.error('Failed to update agent prompt:', errorText)
      // Continue anyway - the call might still work with the existing prompt
    }

    // Make the outbound call
    const callResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
          // Pass context data if ElevenLabs supports it
          // Note: You may need to update the agent's system prompt via API
          // or use a different method to pass this context
        }),
      }
    )

    if (!callResponse.ok) {
      const errorText = await callResponse.text()
      return NextResponse.json(
        { error: `Failed to initiate call: ${errorText}` },
        { status: callResponse.status }
      )
    }

    const callResult = await callResponse.json()
    
    // Extract conversation_id from the response (ElevenLabs may return this)
    const conversationId = callResult.conversation_id || callResult.conversationId || null

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:348',message:'Call result received',data:{hasConversationId:!!callResult.conversation_id,hasConversationIdAlt:!!callResult.conversationId,conversationId,allKeys:Object.keys(callResult)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Create a call record to track this call
    const { data: callRecord, error: callRecordError } = await supabase
      .from('calls')
      .insert({
        claim_id: claim.id,
        conversation_id: conversationId,
        call_sid: callResult.call_sid,
        to_number: toNumber,
        status: 'initiated',
      })
      .select()
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'make-call/route.ts:363',message:'Call record created',data:{callId:callRecord?.id,claimId:claim.id,conversationId:callRecord?.conversation_id,error:callRecordError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (callRecordError) {
      console.error('Error creating call record:', callRecordError)
      // Continue anyway - don't fail the call if we can't track it
    }

    // Update the claim to mark it as called
    await supabase
      .from('claims')
      .update({ called_at: new Date().toISOString() })
      .eq('id', claim.id)

    return NextResponse.json({
      success: true,
      message: `Call initiated for claim ${claim.claim_number || claim.id}`,
      call_sid: callResult.call_sid,
      conversation_id: conversationId,
      call_id: callRecord?.id,
      claim_id: claim.id,
      to_number: toNumber,
    })
  } catch (error) {
    console.error('Error making call:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

