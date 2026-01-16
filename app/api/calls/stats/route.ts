import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Count active calls
    const { count: activeCallsCount } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .in('status', ['initiated', 'in_progress'])
      .is('ended_at', null)

    // Count today's calls
    const { count: todayCallsCount } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', today.toISOString())
      .lt('started_at', tomorrow.toISOString())

    // Get all completed calls to calculate average duration and success rate
    const { data: completedCalls } = await supabase
      .from('calls')
      .select('started_at, ended_at, status, extracted_data')
      .not('ended_at', 'is', null)

    let avgDuration = '0:00'
    let successRate = 0

    if (completedCalls && completedCalls.length > 0) {
      // Calculate average duration
      const totalDuration = completedCalls.reduce((sum, call) => {
        const startedAt = new Date(call.started_at)
        const endedAt = new Date(call.ended_at)
        return sum + (endedAt.getTime() - startedAt.getTime())
      }, 0)
      
      const avgDurationMs = totalDuration / completedCalls.length
      const avgMinutes = Math.floor(avgDurationMs / 60000)
      const avgSeconds = Math.floor((avgDurationMs % 60000) / 1000)
      avgDuration = `${avgMinutes}:${avgSeconds.toString().padStart(2, '0')}`

      // Calculate success rate (calls that have extracted_data or successful status)
      const successfulCalls = completedCalls.filter(call => {
        const hasExtractedData = call.extracted_data && 
          typeof call.extracted_data === 'object' && 
          Object.keys(call.extracted_data).length > 0
        return hasExtractedData || call.status === 'completed'
      })
      
      successRate = Math.round((successfulCalls.length / completedCalls.length) * 100)
    }

    return NextResponse.json({
      activeCalls: activeCallsCount || 0,
      today: todayCallsCount || 0,
      avgDuration,
      successRate,
    })
  } catch (error) {
    console.error('Error in call stats endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

