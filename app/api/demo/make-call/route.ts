import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email } = body

    // Validate input
    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: 'Name, phone, and email are required' },
        { status: 400 }
      )
    }

    // Use service role client for server-side operations that need to bypass RLS
    // Regular client uses ANON_KEY which is subject to RLS policies
    let supabase
    try {
      supabase = createServiceRoleClient()
    } catch (serviceRoleError) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:22',message:'Service role client creation failed',data:{error:serviceRoleError instanceof Error?serviceRoleError.message:'unknown',hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // Fallback to regular client if service role key not available
      supabase = await createClient()
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:30',message:'Supabase client created',data:{hasUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,usingServiceRole:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C,F'})}).catch(()=>{});
    // #endregion

    // Store demo info in demos table
    const { data: demoRecord, error: demoError } = await supabase
      .from('demos')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      })
      .select()
      .single()

    if (demoError) {
      console.error('Error storing demo info:', demoError)
      return NextResponse.json(
        { error: 'Failed to store demo information' },
        { status: 500 }
      )
    }

    // Check if there's already an active call
    const { data: activeCall, error: activeCallQueryError } = await supabase
      .from('calls')
      .select('id, status')
      .in('status', ['initiated', 'in_progress'])
      .is('ended_at', null)
      .limit(1)
      .maybeSingle()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:45',message:'Query active calls',data:{canQueryCalls:!activeCallQueryError,queryError:activeCallQueryError?.message||null,hasActiveCall:!!activeCall},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (activeCall) {
      return NextResponse.json(
        { error: 'There is already an active call in progress. Please wait for it to complete.' },
        { status: 409 }
      )
    }

    // Find or create 1738493 claim
    let { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*, organization_id')
      .eq('claim_number', '1738493')
      .maybeSingle()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:60',message:'Demo claim fetched',data:{hasClaim:!!claim,claimId:claim?.id,hasOrgId:!!claim?.organization_id,orgId:claim?.organization_id||null,claimKeys:claim?Object.keys(claim):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // If claim doesn't exist, create it
    if (!claim) {
      // Get or create a demo provider
      let { data: provider } = await supabase
        .from('providers')
        .select('id, name, claims_phone_number')
        .eq('name', 'Demo Insurance Provider')
        .maybeSingle()

      if (!provider) {
        const { data: newProvider, error: providerError } = await supabase
          .from('providers')
          .insert({
            name: 'Demo Insurance Provider',
            claims_phone_number: '+18005551234', // Dummy number
          })
          .select()
          .single()
        
        if (providerError || !newProvider) {
          console.error('Error creating demo provider:', providerError)
          return NextResponse.json(
            { error: 'Failed to create demo provider' },
            { status: 500 }
          )
        }
        provider = newProvider
      }

      // Ensure provider is not null (TypeScript guard)
      if (!provider) {
        return NextResponse.json(
          { error: 'Failed to get or create demo provider' },
          { status: 500 }
        )
      }

      // Get or create a demo office
      let { data: office } = await supabase
        .from('offices')
        .select('id, name')
        .eq('name', 'Demo Medical Office')
        .maybeSingle()

      if (!office) {
        const { data: newOffice, error: officeError } = await supabase
          .from('offices')
          .insert({
            name: 'Demo Medical Office',
            address: '123 Demo Street',
            city: 'Demo City',
            state: 'CO',
            zip_code: '80202',
            ein: '123456789',
          })
          .select()
          .single()
        
        if (officeError || !newOffice) {
          console.error('Error creating demo office:', officeError)
          return NextResponse.json(
            { error: 'Failed to create demo office' },
            { status: 500 }
          )
        }
        office = newOffice
      }

      // Ensure office is not null (TypeScript guard)
      if (!office) {
        return NextResponse.json(
          { error: 'Failed to get or create demo office' },
          { status: 500 }
        )
      }

      // Get or create a demo doctor
      let { data: doctor } = await supabase
        .from('doctors')
        .select('id, name')
        .eq('name', 'Dr. Demo Doctor')
        .maybeSingle()

      if (!doctor) {
        const { data: newDoctor, error: doctorError } = await supabase
          .from('doctors')
          .insert({
            name: 'Dr. Demo Doctor',
            npi: '1234567890',
            office_id: office.id,
          })
          .select()
          .single()
        
        if (doctorError || !newDoctor) {
          console.error('Error creating demo doctor:', doctorError)
          return NextResponse.json(
            { error: 'Failed to create demo doctor' },
            { status: 500 }
          )
        }
        doctor = newDoctor
      }

      // Ensure doctor is not null (TypeScript guard)
      if (!doctor) {
        return NextResponse.json(
          { error: 'Failed to get or create demo doctor' },
          { status: 500 }
        )
      }

      // Create the demo claim
      const { data: newClaim, error: createClaimError } = await supabase
        .from('claims')
        .insert({
          claim_number: '1738493',
          patient_name: 'Demo Patient',
          insurance_provider: provider.name,
          provider_id: provider.id,
          office_id: office.id,
          doctor_id: doctor.id,
          date_of_service: new Date().toISOString().split('T')[0],
          billed_amount: 500.00,
          claim_status: 'Denied',
        })
        .select()
        .single()

      if (createClaimError) {
        console.error('Error creating demo claim:', createClaimError)
        return NextResponse.json(
          { error: 'Failed to create demo claim' },
          { status: 500 }
        )
      }

      claim = newClaim
    }

    // Delete all existing denial reasons for 1738493
    await supabase
      .from('denial_reasons')
      .delete()
      .eq('claim_id', claim.id)

    // Reset claim status to "Denied" and clear called_at
    await supabase
      .from('claims')
      .update({
        claim_status: 'Denied',
        called_at: null,
      })
      .eq('id', claim.id)

    // Get ElevenLabs API key
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Log API key status (without exposing the actual key)
    console.log('ElevenLabs API key configured:', apiKey ? `Yes (length: ${apiKey.length})` : 'No')

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
      let errorMessage = 'Failed to fetch agents from ElevenLabs'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `ElevenLabs API Error: ${errorJson.detail?.message || errorJson.message || errorText}`
      } catch {
        errorMessage = `ElevenLabs API Error (${agentsResponse.status}): ${errorText}`
      }
      console.error('ElevenLabs API error:', {
        status: agentsResponse.status,
        statusText: agentsResponse.statusText,
        error: errorText,
        errorMessage
      })
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorText,
          status: agentsResponse.status
        },
        { status: agentsResponse.status || 500 }
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
      const errorText = await phoneNumbersResponse.text()
      let errorMessage = 'Failed to fetch phone numbers from ElevenLabs'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `ElevenLabs API Error: ${errorJson.detail?.message || errorJson.message || errorText}`
      } catch {
        errorMessage = `ElevenLabs API Error (${phoneNumbersResponse.status}): ${errorText}`
      }
      console.error('ElevenLabs phone numbers fetch error:', errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: phoneNumbersResponse.status || 500 }
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

    // Format user's phone number to E.164 format
    let toNumber = phone.trim()
    if (!toNumber.startsWith('+')) {
      // Remove all non-digit characters
      const digits = toNumber.replace(/\D/g, '')
      // If it starts with 1, assume US number
      if (digits.length === 11 && digits.startsWith('1')) {
        toNumber = '+' + digits
      } else if (digits.length === 10) {
        // Assume US number without country code
        toNumber = '+1' + digits
      } else {
        // Try to add +1 for US numbers
        toNumber = '+1' + digits
      }
    }

    // Get office and doctor info for the prompt
    const { data: office } = await supabase
      .from('offices')
      .select('*')
      .eq('id', claim.office_id)
      .single()

    const { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', claim.doctor_id)
      .single()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:371',message:'Claim data for prompt',data:{hasClaim:!!claim,claimId:claim.id,patientName:claim.patient_name,claimNumber:claim.claim_number,insuranceProvider:claim.insurance_provider,hasOffice:!!office,hasDoctor:!!doctor,officeId:claim.office_id,doctorId:claim.doctor_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G,H,I'})}).catch(()=>{});
    // #endregion

    // Build dynamic prompt for demo call
    // In demo mode, we're calling the user (not insurance provider)
    // The user will play the role of the insurance representative
    let dynamicPrompt = `# Personality

You are Russel, a professional medical billing representative calling ${claim.insurance_provider} on behalf of a medical office.

Your name is Russel. When introducing yourself, say "My name is Russel" or "This is Russel calling" or similar variations.

You are CURRENTLY ON THE PHONE CALL speaking directly with the insurance representative. You are NOT helping someone else make this call—YOU ARE THE AGENT ON THE CALL.

# Claim Information

**Patient Information:**
- Patient Name: ${claim.patient_name}
${claim.patient_id ? `- Patient ID: ${claim.patient_id}` : ''}
${claim.date_of_birth ? `- Date of Birth: ${claim.date_of_birth}` : ''}

**Claim Details:**
- Insurance Provider: ${claim.insurance_provider}
${claim.claim_number ? `- Claim Number: ${claim.claim_number}` : ''}
${claim.date_of_service ? `- Date of Service: ${claim.date_of_service}` : ''}
${claim.billed_amount ? `- Billed Amount: $${claim.billed_amount}` : ''}
${claim.length_of_service ? `- Length of Service: ${claim.length_of_service}` : ''}
${claim.claim_status ? `- Current Status: ${claim.claim_status}` : ''}

`

    if (office) {
      dynamicPrompt += `**Office Information:**
- Office Name: ${office.name}
${office.address ? `- Address: ${office.address}` : ''}
${office.city && office.state ? `- City, State: ${office.city}, ${office.state}` : ''}
${office.zip_code ? `- ZIP Code: ${office.zip_code}` : ''}
${office.callback_number ? `- Callback Number: ${office.callback_number}` : ''}
${office.ein ? `- EIN: ${office.ein}` : ''}

`
    }

    if (doctor) {
      dynamicPrompt += `**Doctor Information:**
- Doctor Name: ${doctor.name}
${doctor.npi ? `- NPI: ${doctor.npi}` : ''}

`
    }

    dynamicPrompt += `# Opening the Conversation

**CRITICAL: When the call connects, wait for the other person to speak first. Do NOT immediately start talking about the claim.**

When they answer or greet you:
1. Wait for them to introduce themselves or ask how they can help
2. Then introduce yourself: "Hi, this is Russel calling from ${office?.name || 'the medical office'}."
3. When they ask what you're calling about or how they can help, respond naturally: "I'm calling to check on the status of a claim - claim number ${claim.claim_number || 'our claim'} for patient ${claim.patient_name}."

Do NOT ask generic questions like "how can I help you" - you are the caller, not the person answering. Wait for them to speak first, then respond appropriately when they ask what you need.

# Goal

Get the reason why the claim was denied and what needs to happen next:

1. Navigate the automated phone system (if applicable)
2. Verify claim status with the representative
3. **CRITICAL: Get ALL reasons why the claim was denied** - you MUST ask specifically for every denial reason. Do not assume there is only one reason.
4. **CRITICAL: Verify completeness** - After the representative gives you denial reasons, explicitly ask: "Are there any other denial reasons?" or "Is that all of them?" or "Are there any additional reasons why this claim was denied?"
5. **Get clear instructions on how to fix each denial reason** - what needs to happen next for each issue
6. **Repeat back all denial reasons** - Before ending the call, summarize all denial reasons you received to confirm you have them all: "So just to confirm, the claim was denied because [reason 1], [reason 2], [reason 3], etc. Is that correct?"

This step is important: Only provide patient information when explicitly asked.

This step is important: Do not end the call until you have:
- Asked if there are any other denial reasons
- Received confirmation that you have all denial reasons
- Summarized all denial reasons back to the representative for verification
- Obtained the specific next steps to fix each denial reason

# Guardrails

Never provide patient information unless the representative specifically requests it. This step is important.

Never volunteer additional information beyond what is asked.

If asked a Yes or No question, respond with only "Yes" or "No" - do not add any additional words or explanations. This step is important.

# Response Speed

Respond quickly and naturally. Do not add unnecessary pauses or delays. When you have the information you need, respond immediately. Keep your responses concise and to the point.`

    // Build DTMF rules
    const npiValue = doctor?.npi || '1234567890'
    const einValue = office?.ein || '123456789'
    const patientIdValue = claim.patient_id || '1738493'
    
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

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:472',message:'Before prompt update',data:{agentId,promptLength:dynamicPrompt.length,promptPreview:dynamicPrompt.substring(0,200),hasClaimInfo:dynamicPrompt.includes(claim.patient_name),hasClaimNumber:dynamicPrompt.includes(claim.claim_number||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G,H,I'})}).catch(()=>{});
    // #endregion
    
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
              // Reduce response delay for faster interactions
              response_delay_ms: 500,
            },
          },
        }),
      }
    )

    // #region agent log
    const updatePromptStatus = updatePromptResponse.ok
    const updatePromptStatusText = updatePromptResponse.status
    let updatePromptErrorText = null
    if (!updatePromptResponse.ok) {
      updatePromptErrorText = await updatePromptResponse.text()
    }
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:495',message:'Prompt update response',data:{success:updatePromptStatus,status:updatePromptStatusText,error:updatePromptErrorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'G,H,I'})}).catch(()=>{});
    // #endregion

    if (!updatePromptResponse.ok) {
      const errorText = updatePromptErrorText || await updatePromptResponse.text()
      let errorMessage = 'Failed to update agent prompt'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `ElevenLabs API Error: ${errorJson.detail?.message || errorJson.message || errorText}`
      } catch {
        errorMessage = `ElevenLabs API Error (${updatePromptResponse.status}): ${errorText}`
      }
      console.error('Failed to update agent prompt:', errorMessage)
      // Continue anyway - the call might still work with the existing prompt
    }

    // Make the outbound call to the user's phone number
    const callResponse = await fetch(
      `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
        }),
      }
    )

    if (!callResponse.ok) {
      const errorText = await callResponse.text()
      let errorMessage = 'Failed to initiate call'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `ElevenLabs API Error: ${errorJson.detail?.message || errorJson.message || errorText}`
      } catch {
        errorMessage = `ElevenLabs API Error (${callResponse.status}): ${errorText}`
      }
      console.error('ElevenLabs outbound call error:', errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: callResponse.status || 500 }
      )
    }

    const callResult = await callResponse.json()
    
    // Extract conversation_id from the response
    const conversationId = callResult.conversation_id || callResult.conversationId || null

    // Create a call record to track this call
    const now = new Date().toISOString()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:517',message:'Before call record insert',data:{claimId:claim.id,claimOrganizationId:claim.organization_id||null,conversationId,callSid:callResult.call_sid,toNumber,status:'initiated',startedAt:now},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Check if calls table has organization_id column by trying to select it
    const { data: testCall, error: testCallError } = await supabase
      .from('calls')
      .select('id, organization_id')
      .limit(1)
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:525',message:'Check calls table structure',data:{hasOrgColumn:testCallError?.code!=='42703',testError:testCallError?.message||null,testCode:testCallError?.code||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Test if we can query calls table (hypothesis: SELECT works but INSERT doesn't)
    const { data: testQuery, error: testError } = await supabase
      .from('calls')
      .select('id')
      .limit(1)
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:533',message:'Test query calls table',data:{canQuery:!testError,testError:testError?.message||null,testCode:testError?.code||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Build insert data
    // Note: calls table does not have organization_id column, so we don't include it
    // Service role client bypasses RLS, so organization membership is not checked
    const insertData: any = {
      claim_id: claim.id,
      conversation_id: conversationId,
      call_sid: callResult.call_sid,
      to_number: toNumber,
      status: 'initiated',
      started_at: now,
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:545',message:'Insert data prepared',data:{claimOrgId:claim.organization_id||null,insertKeys:Object.keys(insertData)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    const { data: callRecord, error: callRecordError } = await supabase
      .from('calls')
      .insert(insertData)
      .select()
      .single()

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/be7aff16-d429-4a75-8f70-8af1d47e5494',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demo/make-call/route.ts:555',message:'After call record insert',data:{success:!callRecordError,callId:callRecord?.id,error:callRecordError?.message||null,errorCode:callRecordError?.code||null,errorDetails:callRecordError?.details||null,errorHint:callRecordError?.hint||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    if (callRecordError) {
      console.error('Error creating call record:', {
        error: callRecordError,
        message: callRecordError.message,
        details: callRecordError.details,
        hint: callRecordError.hint,
        code: callRecordError.code,
        claim_id: claim.id,
        conversation_id: conversationId,
        call_sid: callResult.call_sid,
      })
      // Return error - we need the call record to track the call
      return NextResponse.json(
        {
          error: 'Call was initiated but failed to create tracking record',
          details: callRecordError.message,
          call_sid: callResult.call_sid,
          conversation_id: conversationId,
        },
        { status: 500 }
      )
    }

    if (!callRecord) {
      console.error('Call record was not created despite no error')
      return NextResponse.json(
        {
          error: 'Call was initiated but call record was not created',
          call_sid: callResult.call_sid,
          conversation_id: conversationId,
        },
        { status: 500 }
      )
    }

    console.log('Call record created successfully:', {
      call_id: callRecord.id,
      claim_id: claim.id,
      conversation_id: conversationId,
      status: callRecord.status,
      started_at: callRecord.started_at,
    })

    // Update the claim to mark it as called
    await supabase
      .from('claims')
      .update({ called_at: new Date().toISOString() })
      .eq('id', claim.id)

    // Log the response for debugging
    console.log('Call initiated successfully:', {
      call_id: callRecord?.id,
      conversation_id: conversationId,
      call_sid: callResult.call_sid,
      status: callRecord?.status,
      started_at: callRecord?.started_at,
      claim_id: claim.id,
      to_number: toNumber,
    })

    return NextResponse.json({
      success: true,
      message: `Call initiated to ${toNumber} for demo claim 1738493`,
      call_sid: callResult.call_sid,
      conversation_id: conversationId,
      call_id: callRecord?.id,
      claim_id: claim.id,
      to_number: toNumber,
      call_status: callRecord?.status,
      started_at: callRecord?.started_at,
    })
  } catch (error) {
    console.error('Error making demo call:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

