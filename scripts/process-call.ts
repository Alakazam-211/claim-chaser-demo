#!/usr/bin/env tsx
/**
 * Script to manually process a completed call
 * Usage: tsx scripts/process-call.ts [call_id or conversation_id]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { processTranscriptForCall } from '../app/api/calls/process-transcript-internal'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const apiKey = process.env.ELEVENLABS_API_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY environment variable')
  process.exit(1)
}

// Use service role key if available to bypass RLS, otherwise use anon key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  const arg = process.argv[2]
  
  if (arg) {
    // Process specific call or conversation
    let conversationId: string | null = null
    let callId: string | null = null
    
    if (arg.startsWith('conv_')) {
      conversationId = arg
    } else {
      callId = arg
    }
    
    // If call_id provided, get conversation_id
    if (callId && !conversationId) {
      const { data: call, error } = await supabase
        .from('calls')
        .select('conversation_id')
        .eq('id', callId)
        .single()
      
      if (error || !call) {
        console.error(`Call not found: ${callId}`)
        process.exit(1)
      }
      
      conversationId = call.conversation_id
    }
    
    if (!conversationId) {
      console.error('Could not determine conversation_id')
      process.exit(1)
    }
    
    console.log(`Processing call: ${callId || 'N/A'}, conversation: ${conversationId}`)
    try {
      // First check if call exists and get its details
      let callDetails = null
      if (callId) {
        const { data } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .single()
        callDetails = data
      } else if (conversationId) {
        const { data } = await supabase
          .from('calls')
          .select('*')
          .eq('conversation_id', conversationId)
          .single()
        callDetails = data
        callId = data?.id || null
      }
      
      console.log('Call details:', {
        id: callDetails?.id,
        claim_id: callDetails?.claim_id,
        status: callDetails?.status,
        has_extracted_data: !!callDetails?.extracted_data
      })
      
      await processTranscriptForCall(conversationId, callId, supabase, apiKey)
      console.log('✅ Call processed successfully!')
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify the data was saved
      const { data: updatedCall } = await supabase
        .from('calls')
        .select('extracted_data, transcript')
        .eq('conversation_id', conversationId)
        .single()
      
      if (updatedCall?.extracted_data) {
        console.log('Extracted data:', JSON.stringify(updatedCall.extracted_data, null, 2))
      } else {
        console.log('⚠️  Warning: extracted_data is still null after processing')
        if (updatedCall?.transcript) {
          console.log('Transcript exists but no extracted data. Transcript keys:', Object.keys(updatedCall.transcript))
        } else {
          console.log('No transcript found either')
        }
      }
    } catch (error) {
      console.error('❌ Error processing call:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      throw error
    }
  } else {
    // Find and process the most recent completed call without extracted_data
    console.log('Finding most recent completed call without extracted_data...')
    
    const { data: calls, error } = await supabase
      .from('calls')
      .select('id, conversation_id, claim_id, status, ended_at')
      .eq('status', 'completed')
      .is('extracted_data', null)
      .not('conversation_id', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error fetching calls:', error)
      process.exit(1)
    }
    
    if (!calls || calls.length === 0) {
      console.log('No completed calls found without extracted_data')
      process.exit(0)
    }
    
    const call = calls[0]
    console.log(`Found call: ${call.id}, conversation: ${call.conversation_id}`)
    console.log(`Processing...`)
    
    try {
      await processTranscriptForCall(call.conversation_id!, call.id, supabase, apiKey)
      console.log('✅ Call processed successfully!')
      
      // Verify the data was saved
      const { data: updatedCall } = await supabase
        .from('calls')
        .select('extracted_data')
        .eq('id', call.id)
        .single()
      
      if (updatedCall?.extracted_data) {
        console.log('Extracted data:', JSON.stringify(updatedCall.extracted_data, null, 2))
      } else {
        console.log('⚠️  Warning: extracted_data is still null after processing')
      }
    } catch (error) {
      console.error('❌ Error processing call:', error)
      throw error
    }
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

