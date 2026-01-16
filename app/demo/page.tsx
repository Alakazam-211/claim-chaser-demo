'use client'

import { useState, useEffect, useRef } from 'react'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'
import { createClient } from '@/lib/supabase/client'

interface Claim {
  id: string
  patient_name: string
  patient_id?: string
  date_of_birth?: string
  insurance_provider: string
  provider_id?: string
  office_id?: string
  doctor_id?: string
  insurance_phone?: string
  date_of_service?: string
  length_of_service?: string
  billed_amount?: number
  claim_status?: string
  claim_number?: string
  next_steps?: string
  resubmission_instructions?: string
  created_at: string
  updated_at: string
}

interface DenialReason {
  id: string
  claim_id: string
  denial_reason: string
  date_recorded: string
  resubmission_instructions?: string
  date_reason_resubmitted?: string
  date_accepted?: string
  status: 'Pending' | 'Resubmitted' | 'Accepted'
  created_at: string
  updated_at: string
}

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

const formatCurrency = (amount?: number) => {
  if (!amount) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDuration = (startedAt: string): string => {
  const startTime = new Date(startedAt).getTime()
  const now = Date.now()
  const seconds = Math.floor((now - startTime) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Complete':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'Denied':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'Pending Resubmission':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'Awaiting Acceptance':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  })
  const [claim, setClaim] = useState<Claim | null>(null)
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([])
  const [loading, setLoading] = useState(true)
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState<string | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [currentDuration, setCurrentDuration] = useState<string>('00:00')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Fetch DEMO12345 claim on mount
  useEffect(() => {
    fetchDemoClaim()
  }, [])

  // Poll for active call status
  useEffect(() => {
    const checkActiveCall = async () => {
      try {
        const response = await fetch('/api/calls/active')
        const data = await response.json()
        
        if (data.activeCall) {
          setActiveCall(data.activeCall)
          setCallStatus(null)
        } else {
          setActiveCall(null)
        }
      } catch (error) {
        console.error('Error checking active call:', error)
      }
    }

    checkActiveCall()
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

  // Update duration display every second when there's an active call
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

  // Refresh denial reasons when call ends
  useEffect(() => {
    if (!activeCall && claim?.id) {
      fetchDenialReasons(claim.id)
      fetchDemoClaim() // Refresh claim to get updated status
    }
  }, [activeCall, claim?.id])

  const fetchDemoClaim = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('claim_number', 'DEMO12345')
        .maybeSingle()

      if (error) {
        console.error('Error fetching demo claim:', error)
      } else {
        setClaim(data)
        if (data?.id) {
          await fetchDenialReasons(data.id)
        }
      }
    } catch (error) {
      console.error('Error fetching demo claim:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDenialReasons = async (claimId?: string) => {
    const id = claimId || claim?.id
    if (!id) return
    
    try {
      const response = await fetch(`/api/claims/${id}/denial-reasons`)
      if (response.ok) {
        const { denial_reasons } = await response.json()
        setDenialReasons(denial_reasons || [])
      }
    } catch (error) {
      console.error('Error fetching denial reasons:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setCallStatus('❌ Please fill in all fields')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setCallStatus('❌ Please enter a valid email address')
      return
    }

    // Validate phone format (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setCallStatus('❌ Please enter a valid phone number')
      return
    }

    setIsCalling(true)
    setCallStatus(null)

    try {
      const response = await fetch('/api/demo/make-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCallStatus(`✅ ${data.message || 'Call initiated successfully!'}`)
        
        // Refresh claim and denial reasons
        await fetchDemoClaim()
        
        // Check for active call
        const checkForActiveCall = async (retries = 5) => {
          try {
            const activeResponse = await fetch('/api/calls/active')
            const activeData = await activeResponse.json()
            
            if (activeData.activeCall) {
              setActiveCall(activeData.activeCall)
              setCallStatus(null)
            } else if (retries > 0) {
              setTimeout(() => checkForActiveCall(retries - 1), 500)
            }
          } catch (error) {
            console.error('Error checking for active call:', error)
            if (retries > 0) {
              setTimeout(() => checkForActiveCall(retries - 1), 500)
            }
          }
        }
        
        checkForActiveCall()
      } else {
        setCallStatus(`❌ ${data.error || 'Failed to initiate call'}`)
      }
    } catch (error) {
      setCallStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-dark mb-2">Claim Chaser Demo</h1>
        <p className="text-gray-600">
          Experience how AI Claim Chaser automatically calls insurance providers to get denial reasons.
          Enter your information below and we'll call you to demonstrate the system.
        </p>
      </div>

      {/* Contact Form */}
      <GeistCard variant="opaque" className="mb-6 !bg-[#f5f5f5]">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-dark mb-4">Your Information</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark/70 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="John Doe"
                disabled={isCalling}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark/70 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="(555) 123-4567"
                disabled={isCalling}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll call this number to demonstrate the system
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark/70 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="john@example.com"
                disabled={isCalling}
              />
            </div>
            <GeistButton
              type="submit"
              variant="primary"
              disabled={isCalling}
              className="w-full bg-[#1e7145] text-white border-none"
            >
              {isCalling ? 'Initiating Call...' : 'Make Call'}
            </GeistButton>
          </form>

          {callStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              callStatus.startsWith('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {callStatus}
            </div>
          )}

          {/* Active Call Box */}
          {activeCall && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-700">Active Call</span>
                <span className="text-2xl font-bold text-blue-700">
                  {currentDuration}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Answer your phone to experience the demo!
              </p>
            </div>
          )}
        </div>
      </GeistCard>

      {/* Demo Claim Display */}
      <GeistCard variant="opaque" className="mb-6 !bg-[#f5f5f5]">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-dark mb-4">Demo Claim</h2>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading claim...</p>
            </div>
          ) : claim ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-dark">Claim #{claim.claim_number}</h3>
                {claim.claim_status && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(claim.claim_status)}`}>
                    {claim.claim_status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Patient Name
                  </label>
                  <p className="text-dark font-medium">{claim.patient_name}</p>
                </div>
                {claim.insurance_provider && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Insurance Provider
                    </label>
                    <p className="text-dark font-medium">{claim.insurance_provider}</p>
                  </div>
                )}
                {claim.date_of_service && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Date of Service
                    </label>
                    <p className="text-dark font-medium">{formatDate(claim.date_of_service)}</p>
                  </div>
                )}
                {claim.billed_amount !== undefined && claim.billed_amount !== null && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Billed Amount
                    </label>
                    <p className="text-dark font-medium text-xl">{formatCurrency(claim.billed_amount)}</p>
                  </div>
                )}
              </div>

              {/* Denial Reasons */}
              {denialReasons.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-dark mb-3">Denial Reasons</h3>
                  <div className="space-y-3">
                    {denialReasons.map((dr) => (
                      <div
                        key={dr.id}
                        className="bg-white rounded-lg p-4 border border-gray-200"
                      >
                        <p className="text-dark font-medium mb-2">{dr.denial_reason}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Recorded: {formatDate(dr.date_recorded)}</span>
                          <span className={`px-2 py-1 rounded text-xs border ${
                            dr.status === 'Pending' 
                              ? 'text-orange-600 bg-orange-50 border-orange-200'
                              : dr.status === 'Resubmitted'
                              ? 'text-blue-600 bg-blue-50 border-blue-200'
                              : 'text-green-600 bg-green-50 border-green-200'
                          }`}>
                            {dr.status}
                          </span>
                        </div>
                        {dr.resubmission_instructions && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-dark">
                            <strong>Resubmission Instructions:</strong>
                            <p className="mt-1 whitespace-pre-wrap">{dr.resubmission_instructions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Demo claim not found. It will be created when you make your first call.</p>
            </div>
          )}
        </div>
      </GeistCard>
    </div>
  )
}

