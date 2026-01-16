import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claimId = id
    const body = await request.json()
    const { denial_reason, next_steps } = body

    if (!denial_reason || typeof denial_reason !== 'string' || !denial_reason.trim()) {
      return NextResponse.json(
        { error: 'denial_reason is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Clean and split denial reasons
    const cleanedReasons = splitMultipleReasons(denial_reason)
    
    if (cleanedReasons.length === 0) {
      return NextResponse.json(
        { error: 'Invalid denial reason format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify claim exists
    const { data: currentClaim, error: fetchError } = await supabase
      .from('claims')
      .select('claim_status')
      .eq('id', claimId)
      .single()

    if (fetchError || !currentClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Get existing denial reasons to avoid duplicates
    const { data: existingDenialReasons } = await supabase
      .from('denial_reasons')
      .select('denial_reason')
      .eq('claim_id', claimId)
    
    const normalizeReason = (reason: string): string => {
      return reason
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    const existingNormalized = new Set(
      (existingDenialReasons || []).map((dr: any) => normalizeReason(dr.denial_reason))
    )
    
    // Filter out duplicates
    const newReasons = cleanedReasons.filter(reason => {
      const normalized = normalizeReason(reason)
      return !existingNormalized.has(normalized)
    })
    
    if (newReasons.length === 0) {
      return NextResponse.json(
        { error: 'All denial reasons already exist for this claim' },
        { status: 400 }
      )
    }
    
    // Get today's date in YYYY-MM-DD format (local timezone) to avoid timezone conversion
    const today = new Date()
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    // Insert all new denial reasons
    const denialReasonRecords = newReasons.map(reason => ({
      claim_id: claimId,
      denial_reason: reason,
      date_recorded: todayString,
      status: 'Pending' as const,
    }))
    
    const { data: insertedDenialReasons, error: insertError } = await supabase
      .from('denial_reasons')
      .insert(denialReasonRecords)
      .select()

    if (insertError) {
      console.error('Error creating denial reasons:', insertError)
      return NextResponse.json(
        { error: 'Failed to create denial reasons' },
        { status: 500 }
      )
    }
    
    // For backward compatibility, return the first inserted reason as newDenialReason
    const newDenialReason = insertedDenialReasons?.[0]

    // Update claim with next_steps if provided
    const updateData: any = {}
    if (next_steps !== undefined) {
      updateData.next_steps = next_steps
    }

    // If status is "Denied" and we're adding denial reasons, change to "Pending Resubmission"
    if (currentClaim.claim_status === 'Denied') {
      updateData.claim_status = 'Pending Resubmission'
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-denial-reasons/route.ts:68',message:'Updating claim status',data:{claimId,oldStatus:currentClaim.claim_status,newStatus:updateData.claim_status,updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,G'})}).catch(()=>{});
    // #endregion

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claimId)

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update-denial-reasons/route.ts:73',message:'Claim status update result',data:{claimId,updateError:updateError?.message||null,success:!updateError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,G'})}).catch(()=>{});
      // #endregion

      if (updateError) {
        console.error('Error updating claim:', updateError)
        // Don't fail the request if claim update fails, denial reason was already created
      }
    }

    // Fetch updated claim with denial reasons
    const { data: updatedClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single()

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      denial_reason: newDenialReason,
      denial_reasons: insertedDenialReasons, // Return all inserted reasons
    })
  } catch (error) {
    console.error('Error in update-denial-reasons:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

