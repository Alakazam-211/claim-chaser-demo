import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Check if a string is a valid denial reason (not a question, instruction, or meta-commentary)
 */
function isValidDenialReason(reason: string): boolean {
  const lowerReason = reason.toLowerCase().trim()
  
  // Filter out questions
  if (lowerReason.startsWith('what') || 
      lowerReason.startsWith('how') || 
      lowerReason.startsWith('why') ||
      lowerReason.startsWith('when') ||
      lowerReason.startsWith('where') ||
      lowerReason.startsWith('who') ||
      lowerReason.includes('what specific steps') ||
      lowerReason.includes('what steps') ||
      lowerReason.includes('how to') ||
      lowerReason.includes('how do') ||
      lowerReason.includes('how can')) {
    return false
  }
  
  // Filter out instructions about steps/resolution
  if (lowerReason.includes('steps we need to take') ||
      lowerReason.includes('steps to take') ||
      lowerReason.includes('to resolve') ||
      lowerReason.includes('to fix') ||
      lowerReason.includes('need to') ||
      lowerReason.includes('should do') ||
      lowerReason.includes('must do') ||
      lowerReason.includes('next step')) {
    return false
  }
  
  // Filter out meta-commentary
  if (lowerReason.includes('the first denial reason') ||
      lowerReason.includes('the second denial reason') ||
      lowerReason.includes('denial reason was') ||
      lowerReason.includes('denial reason is') ||
      lowerReason.match(/^(first|second|third|fourth|fifth)\s+(denial\s+)?reason/i)) {
    return false
  }
  
  // Must have some substantive content (at least 10 characters after cleaning)
  if (lowerReason.length < 10) {
    return false
  }
  
  return true
}

/**
 * Format a denial reason as a complete sentence
 */
function formatDenialReason(reason: string): string {
  let formatted = reason.trim()
  
  // Remove common conversational prefixes (case-insensitive)
  // Handle compound phrases first (e.g., "Yeah, it was denied because...")
  const compoundPrefixes = [
    /^yeah[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^yes[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^well[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^um[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^uh[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^so[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
    /^okay[,]?\s*(?:it\s+was\s+denied\s+because|it\s+was\s+denied|it's\s+denied\s+because|it's\s+denied)\s+/i,
  ]
  
  for (const prefix of compoundPrefixes) {
    formatted = formatted.replace(prefix, '')
  }
  
  // Then remove simple conversational prefixes
  const prefixes = [
    /^yeah[,]?\s+/i,
    /^yes[,]?\s+/i,
    /^well[,]?\s+/i,
    /^um[,]?\s+/i,
    /^uh[,]?\s+/i,
    /^so[,]?\s+/i,
    /^okay[,]?\s+/i,
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
    /^the\s+first\s+denial\s+reason\s+(?:was|is)\s+that\s*/i,
    /^the\s+second\s+denial\s+reason\s+(?:was|is)\s+that\s*/i,
    /^the\s+third\s+denial\s+reason\s+(?:was|is)\s+that\s*/i,
  ]
  
  for (const prefix of prefixes) {
    formatted = formatted.replace(prefix, '')
  }
  
  // Handle "there was no/is no/wasn't/isn't" -> "the claim was missing"
  formatted = formatted.replace(/^there (?:was|is|wasn't|isn't) no\s+/i, 'the claim was missing ')
  formatted = formatted.replace(/^there (?:was|is|wasn't|isn't)\s+/i, 'the claim ')
  formatted = formatted.replace(/^there's no\s+/i, 'the claim was missing ')
  
  // Handle "no [something] put on the record" -> "the claim was missing [something]"
  formatted = formatted.replace(/^no\s+(.+?)\s+put on the record/i, 'the claim was missing $1')
  formatted = formatted.replace(/^no\s+(.+?)\s+on the record/i, 'the claim was missing $1')
  
  // Handle "wasn't [something]" -> "the claim was missing [something]"
  formatted = formatted.replace(/^wasn't\s+/i, 'the claim was missing ')
  formatted = formatted.replace(/^isn't\s+/i, 'the claim was missing ')
  
  // Handle "was not [something]" -> "the claim was missing [something]"
  formatted = formatted.replace(/^was not\s+/i, 'the claim was missing ')
  formatted = formatted.replace(/^is not\s+/i, 'the claim was missing ')
  
  // Remove trailing phrases that don't add value
  formatted = formatted.replace(/\s+put on the record\.?$/i, '')
  formatted = formatted.replace(/\s+on the record\.?$/i, '')
  formatted = formatted.replace(/\s+in the system\.?$/i, '')
  formatted = formatted.replace(/\s+in the file\.?$/i, '')
  
  // Ensure it starts with "The claim" or similar if it doesn't already
  if (!formatted.match(/^(the|it|this|that)/i)) {
    formatted = 'the claim ' + formatted
  }
  
  // Ensure it starts with "The" (capitalized)
  formatted = formatted.trim()
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }
  
  // Ensure it ends with proper punctuation
  formatted = formatted.replace(/[.,!?;:]+$/, '')
  formatted = formatted.trim() + '.'
  
  // Normalize whitespace
  formatted = formatted.replace(/\s+/g, ' ').trim()
  
  return formatted
}

/**
 * Split a denial reason string that contains multiple reasons (separated by "and", "also", etc.)
 * Returns formatted complete sentences for each reason
 */
function splitMultipleReasons(reason: string, depth: number = 0): string[] {
  // Prevent infinite recursion
  if (depth > 5) {
    const formatted = formatDenialReason(reason)
    return isValidDenialReason(formatted) ? [formatted] : []
  }
  
  const reasons: string[] = []
  
  // Patterns to split on: "and", "also", ", and", etc.
  // Order matters - more specific patterns first
  // Look for patterns that indicate separate reasons, not just compound phrases
  const splitPatterns = [
    // Split on "and the" - usually indicates a new reason
    /\s+and\s+the\s+(?:claim\s+)?(?:was|is)\s+/i,
    // Split on "and there" - usually indicates a new reason
    /\s+and\s+there\s+(?:was|is)\s+/i,
    // Split on "and the absence of" - new reason
    /\s+and\s+the\s+absence\s+of\s+/i,
    // Split on "and" followed by "missing" - new reason
    /\s+and\s+(?:the\s+)?(?:claim\s+)?(?:was\s+)?missing\s+/i,
    // Split on ", and" - comma before and usually indicates separate items
    /[,]\s+and\s+/i,
    // Split on "and" followed by capital letter (new sentence)
    /\s+and\s+(?=[A-Z])/i,
    // Split on "also" - usually indicates additional reason
    /\s+also[,]?\s+(?:the\s+)?(?:claim\s+)?(?:was|is)\s+/i,
    /[,]\s+also\s+/i,
    // Split on "and" in general (but be more careful)
    /\s+and\s+(?:the\s+)?(?:claim\s+)?(?:was|is|has|had)\s+/i,
  ]
  
  let remaining = reason.trim()
  let splitFound = false
  
  for (let patternIndex = 0; patternIndex < splitPatterns.length; patternIndex++) {
    const pattern = splitPatterns[patternIndex]
    const parts = remaining.split(pattern)
    if (parts.length > 1) {
      splitFound = true
      // Recursively split each part in case there are more reasons
      for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim()
        
        // If this isn't the first part, restore the connecting word context
        // based on which pattern matched
        if (i > 0) {
          if (patternIndex === 0) { // "and the claim was/is"
            part = 'the claim was ' + part
          } else if (patternIndex === 1) { // "and there was/is"
            part = 'there was ' + part
          } else if (patternIndex === 3) { // "and missing"
            part = 'the claim was missing ' + part
          }
        }
        
        const subReasons = splitMultipleReasons(part, depth + 1)
        if (subReasons.length > 0) {
          reasons.push(...subReasons)
        } else {
          const formatted = formatDenialReason(part)
          if (isValidDenialReason(formatted)) {
            reasons.push(formatted)
          }
        }
      }
      break
    }
  }
  
  // If no split pattern found, format as single reason
  if (!splitFound) {
    const formatted = formatDenialReason(reason)
    if (isValidDenialReason(formatted)) {
      reasons.push(formatted)
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

    // Format and split denial reasons into complete sentences
    const cleanedReasons = splitMultipleReasons(denial_reason)
    
    // Filter out any invalid reasons
    const validReasons = cleanedReasons.filter(reason => isValidDenialReason(reason))
    
    if (validReasons.length === 0) {
      return NextResponse.json(
        { error: 'Invalid denial reason format - no valid denial reasons found' },
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
    const newReasons = validReasons.filter(reason => {
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

