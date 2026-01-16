import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const supabase = await createClient()

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

    // Find or create DEMO12345 claim
    let { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('claim_number', 'DEMO12345')
      .maybeSingle()

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
          claim_number: 'DEMO12345',
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

    // Delete all existing denial reasons for DEMO12345
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
      return NextResponse.json(
        { error: 'Failed to fetch agents from ElevenLabs' },
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

    // Build dynamic prompt for demo call
    // In demo mode, we're calling the user (not insurance provider)
    // The user will play the role of the insurance representative
    let dynamicPrompt = `# Personality

You are a professional medical billing representative calling on behalf of a medical office.

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

    dynamicPrompt += `# Goal

Get the reason why the claim was denied and what needs to happen next:

1. Navigate the automated phone system (if applicable)
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

    // Build DTMF rules
    const npiValue = doctor?.npi || '1234567890'
    const einValue = office?.ein || '123456789'
    const patientIdValue = claim.patient_id || 'DEMO12345'
    
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
      return NextResponse.json(
        { error: `Failed to initiate call: ${errorText}` },
        { status: callResponse.status }
      )
    }

    const callResult = await callResponse.json()
    
    // Extract conversation_id from the response
    const conversationId = callResult.conversation_id || callResult.conversationId || null

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
      message: `Call initiated to ${toNumber} for demo claim DEMO12345`,
      call_sid: callResult.call_sid,
      conversation_id: conversationId,
      call_id: callRecord?.id,
      claim_id: claim.id,
      to_number: toNumber,
    })
  } catch (error) {
    console.error('Error making demo call:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

