'use client'

import { useState, useEffect, useRef } from 'react'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface ActiveCall {
  id: string
  started_at: string
  duration_seconds: number
  claim_id: string | null
  conversation_id?: string | null
  claims: {
    patient_name: string
    claim_number: string | null
    date_of_service: string | null
    billed_amount: number | null
    claim_status: string
    insurance_provider: string | null
  } | null
}

interface RecentCall {
  id: string
  provider: string
  claim_number: string | null
  duration: string
  status: string
  time: string
  patient_name: string | null
}

interface CallStats {
  activeCalls: number
  today: number
  avgDuration: string
  successRate: number
}

const formatDuration = (startedAt: string): string => {
  const startTime = new Date(startedAt).getTime()
  const now = Date.now()
  const seconds = Math.floor((now - startTime) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function Home() {
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState<string | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isTogglingVoice, setIsTogglingVoice] = useState(false)
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [callStats, setCallStats] = useState<CallStats>({
    activeCalls: 0,
    today: 0,
    avgDuration: '0:00',
    successRate: 0,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check voice settings on mount
  useEffect(() => {
    const checkVoiceSettings = async () => {
      try {
        const response = await fetch('/api/voice-settings')
        const data = await response.json()
        setVoiceEnabled(data.enabled || false)
      } catch (error) {
        console.error('Error checking voice settings:', error)
      }
    }
    checkVoiceSettings()
  }, [])

  // Fetch call stats
  useEffect(() => {
    const fetchCallStats = async () => {
      try {
        const response = await fetch('/api/calls/stats')
        const data = await response.json()
        if (response.ok) {
          setCallStats(data)
        }
      } catch (error) {
        console.error('Error fetching call stats:', error)
      }
    }
    fetchCallStats()
    const statsInterval = setInterval(fetchCallStats, 10000) // Update every 10 seconds
    return () => clearInterval(statsInterval)
  }, [])

  // Fetch recent calls
  useEffect(() => {
    const fetchRecentCalls = async () => {
      try {
        const response = await fetch('/api/calls/recent?limit=10')
        const data = await response.json()
        if (response.ok) {
          setRecentCalls(data.calls || [])
        }
      } catch (error) {
        console.error('Error fetching recent calls:', error)
      }
    }
    fetchRecentCalls()
    const recentCallsInterval = setInterval(fetchRecentCalls, 10000) // Update every 10 seconds
    return () => clearInterval(recentCallsInterval)
  }, [])

  // Poll for active call status
  useEffect(() => {
    const checkActiveCall = async () => {
      try {
        const response = await fetch('/api/calls/active')
        const data = await response.json()
        
        if (data.activeCall) {
          setActiveCall(data.activeCall)
          // Clear the call status message when we have an active call
          setCallStatus(null)
        } else {
          setActiveCall(null)
        }
      } catch (error) {
        console.error('Error checking active call:', error)
      }
    }

    // Check immediately
    checkActiveCall()

    // Poll every second when there's an active call, every 5 seconds when there isn't
    const pollInterval = activeCall ? 1000 : 5000
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(checkActiveCall, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeCall])

  const handleTurnOnVoice = async () => {
    setIsCalling(true)
    setCallStatus(null)

    try {
      // First, enable voice settings
      const voiceResponse = await fetch('/api/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })

      if (!voiceResponse.ok) {
        const voiceData = await voiceResponse.json()
        const errorMsg = voiceData.details 
          ? `${voiceData.error}: ${voiceData.details}` 
          : voiceData.error || 'Unknown error'
        setCallStatus(`❌ Failed to enable voice: ${errorMsg}`)
        console.error('Voice settings error:', voiceData)
        return
      }

      const voiceData = await voiceResponse.json()
      setVoiceEnabled(true)

      // Then, make the call
      const response = await fetch('/api/make-call', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setCallStatus(`✅ ${data.message || 'Call initiated successfully!'}`)
        // Immediately check for active call, then retry a few times if not found
        const checkForActiveCall = async (retries = 5) => {
          try {
            const activeResponse = await fetch('/api/calls/active')
            const activeData = await activeResponse.json()
            
            if (activeData.activeCall) {
              setActiveCall(activeData.activeCall)
              setCallStatus(null) // Clear the status message when we have active call
            } else if (retries > 0) {
              // Retry after a short delay
              setTimeout(() => checkForActiveCall(retries - 1), 500)
            }
          } catch (error) {
            console.error('Error checking for active call:', error)
            if (retries > 0) {
              setTimeout(() => checkForActiveCall(retries - 1), 500)
            }
          }
        }
        
        // Start checking immediately, then retry a few times
        checkForActiveCall()
      } else {
        setCallStatus(`❌ ${data.error || 'Failed to initiate call'}`)
      }
    } catch (error) {
      setCallStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCalling(false)
    }
  }

  const handleTurnOffVoice = async () => {
    setIsTogglingVoice(true)
    setCallStatus(null)

    try {
      // Disable voice settings (current call will continue, but no new calls will be made)
      const response = await fetch('/api/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })

      const data = await response.json()

      if (response.ok) {
        setVoiceEnabled(false)
        if (activeCall) {
          setCallStatus(`✅ Voice system turned off. Current call will continue.`)
        } else {
          setCallStatus(`✅ Voice system turned off successfully`)
        }
        // Clear status message after 3 seconds
        setTimeout(() => setCallStatus(null), 3000)
      } else {
        setCallStatus(`❌ ${data.error || 'Failed to turn off voice'}`)
      }
    } catch (error) {
      setCallStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTogglingVoice(false)
    }
  }

  // Update duration display every second when there's an active call
  const [currentDuration, setCurrentDuration] = useState<string>('00:00')
  
  useEffect(() => {
    if (!activeCall) {
      setCurrentDuration('00:00')
      return
    }

    const updateDuration = () => {
      setCurrentDuration(formatDuration(activeCall.started_at))
    }

    updateDuration()
    const durationInterval = setInterval(updateDuration, 1000)

    return () => clearInterval(durationInterval)
  }, [activeCall])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Call Monitor Section */}
      <div className="mb-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-dark">Call Monitor</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Active Calls</div>
            <div className="text-2xl font-bold text-dark">{callStats.activeCalls}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Today</div>
            <div className="text-2xl font-bold text-dark">{callStats.today}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-dark">{callStats.avgDuration}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-dark">{callStats.successRate}%</div>
          </div>
        </div>

        {/* Turn on Voice Button */}
        <div className="mb-4">
          <GeistButton
            variant="primary"
            onClick={voiceEnabled ? handleTurnOffVoice : handleTurnOnVoice}
            disabled={isCalling || isTogglingVoice}
            className="w-full bg-[#1e7145] text-white border-none"
          >
            {isCalling ? 'Initiating Call...' : isTogglingVoice ? 'Turning off Voice...' : voiceEnabled ? 'Turn off Voice' : 'Turn on Voice'}
          </GeistButton>
        </div>

        {/* Active Call Box */}
        {activeCall ? (
          <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-blue-700">Active Call</span>
              <span className="text-3xl font-bold text-blue-700">
                {currentDuration}
              </span>
            </div>
            
            {activeCall.claims ? (
              <div className="space-y-3 text-sm">
                <div className="font-semibold text-blue-900 mb-2">
                  Speaking with {activeCall.claims.insurance_provider || 'insurance provider'} about claim {activeCall.claims.claim_number ? `CL-${activeCall.claims.claim_number}` : '...'}
                </div>
                <div className="grid grid-cols-2 gap-4 text-blue-800">
                  <div>
                    <span className="font-semibold">Provider:</span> {activeCall.claims.insurance_provider || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Claim #:</span> {activeCall.claims.claim_number ? `CL-${activeCall.claims.claim_number}` : 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Patient:</span> {activeCall.claims.patient_name || 'N/A'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-blue-700 italic">
                {activeCall.claim_id 
                  ? `Loading claim information... (Claim ID: ${activeCall.claim_id})`
                  : 'No claim associated with this call'}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-white rounded-lg border border-gray-200 mb-6 text-center text-gray-500">
            No active calls
          </div>
        )}

        {callStatus && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            callStatus.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {callStatus}
          </div>
        )}
      </div>

      {/* Recent Calls Section */}
      <div>
        <h2 className="text-2xl font-semibold text-dark mb-4">Recent Calls</h2>
        {recentCalls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent calls
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-dark">Provider</th>
                  <th className="text-left py-3 px-4 font-semibold text-dark">Claim #</th>
                  <th className="text-left py-3 px-4 font-semibold text-dark">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-dark">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-dark">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                    <td className="py-3 px-4 text-dark">{call.provider}</td>
                    <td className="py-3 px-4 text-dark">
                      {call.claim_number ? `CL-${call.claim_number}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-dark">{call.duration}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        call.status === 'completed' ? 'bg-green-100 text-green-700' :
                        call.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {call.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark">{call.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

