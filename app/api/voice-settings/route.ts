import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Check if voice is enabled
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: settings, error } = await supabase
      .from('voice_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching voice settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch voice settings' },
        { status: 500 }
      )
    }

    // If no settings exist, create default (disabled)
    if (!settings) {
      const { data: newSettings, error: insertError } = await supabase
        .from('voice_settings')
        .insert({ enabled: false })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to initialize voice settings' },
          { status: 500 }
        )
      }

      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({ enabled: settings.enabled || false })
  } catch (error) {
    console.error('Error in voice settings GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// POST - Enable or disable voice
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    // Get existing settings or create new
    const { data: existingSettings } = await supabase
      .from('voice_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-settings/route.ts:67',message:'POST voice settings - checking existing',data:{enabled,hasExistingSettings:!!existingSettings,existingId:existingSettings?.id,existingEnabled:existingSettings?.enabled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    let result
    if (existingSettings) {
      // Update existing settings
      const { data: updatedSettings, error: updateError } = await supabase
        .from('voice_settings')
        .update({ enabled })
        .eq('id', existingSettings.id)
        .select()
        .single()

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/45626ac0-1892-4f7a-abce-7919fa2e7a1d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-settings/route.ts:77',message:'POST voice settings - update result',data:{enabled,updatedId:updatedSettings?.id,updatedEnabled:updatedSettings?.enabled,error:updateError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (updateError) {
        console.error('Error updating voice settings:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to update voice settings',
            details: updateError.message,
            code: updateError.code,
            hint: updateError.hint
          },
          { status: 500 }
        )
      }

      result = updatedSettings
    } else {
      // Create new settings
      const { data: newSettings, error: insertError } = await supabase
        .from('voice_settings')
        .insert({ enabled })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating voice settings:', insertError)
        return NextResponse.json(
          { 
            error: 'Failed to create voice settings',
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint
          },
          { status: 500 }
        )
      }

      result = newSettings
    }

    return NextResponse.json({ 
      success: true, 
      enabled: result.enabled 
    })
  } catch (error) {
    console.error('Error in voice settings POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}


