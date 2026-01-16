'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

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

interface Provider {
  id: string
  name: string
  claims_phone_number: string
}

interface Office {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  ein?: string
}

interface Doctor {
  id: string
  name: string
  npi?: string
}

interface Call {
  id: string
  claim_id: string
  conversation_id?: string
  call_sid?: string
  status?: string
  to_number: string
  from_number?: string
  started_at?: string
  ended_at?: string
  call_date?: string
  transcript?: any
  extracted_data?: any
  created_at: string
  updated_at: string
}

interface ClaimViewProps {
  claim: Claim
  onClose: () => void
  onEdit: (claim: Claim) => void
  onUpdate?: () => void
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
  // Parse date string as local date to avoid timezone conversion
  // If it's already in YYYY-MM-DD format, parse it directly
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
  // Fallback for other formats
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A'
  // For datetime strings, parse normally (they include time info)
  // But if it's a date-only string, parse as local date
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  // For datetime strings with time, use normal parsing
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

interface EditDenialReasonModalProps {
  denialReason: DenialReason
  onClose: () => void
  onSave: (updates: Partial<DenialReason>) => Promise<void>
  onDelete?: () => Promise<void>
}

function EditDenialReasonModal({ denialReason, onClose, onSave, onDelete }: EditDenialReasonModalProps) {
  const [resubmissionInstructions, setResubmissionInstructions] = useState(denialReason.resubmission_instructions || '')
  const [status, setStatus] = useState(denialReason.status)
  const [dateResubmitted, setDateResubmitted] = useState(
    denialReason.date_reason_resubmitted ? denialReason.date_reason_resubmitted.split('T')[0] : ''
  )
  const [dateAccepted, setDateAccepted] = useState(
    denialReason.date_accepted ? denialReason.date_accepted.split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Automatically set status to "Resubmitted" when a date is entered
  useEffect(() => {
    if (dateResubmitted && dateResubmitted.trim() !== '') {
      setStatus('Resubmitted')
    }
  }, [dateResubmitted])

  // Automatically set status to "Accepted" when date_accepted is entered
  useEffect(() => {
    if (dateAccepted && dateAccepted.trim() !== '') {
      setStatus('Accepted')
    }
  }, [dateAccepted])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: Partial<DenialReason> = {
        resubmission_instructions: resubmissionInstructions || undefined,
        status,
      }
      if (dateResubmitted) {
        // Use the raw date string (already in YYYY-MM-DD format) to avoid timezone conversion
        updates.date_reason_resubmitted = dateResubmitted
      } else {
        updates.date_reason_resubmitted = undefined
      }
      if (dateAccepted) {
        // Use the raw date string (already in YYYY-MM-DD format) to avoid timezone conversion
        updates.date_accepted = dateAccepted
      } else {
        updates.date_accepted = undefined
      }
      await onSave(updates)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    if (!confirm('Are you sure you want to delete this denial reason? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GeistCard variant="opaque" className="max-w-2xl w-full !bg-[#f5f5f5]">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-dark mb-4">Edit Denial Reason</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark mb-2">
              Denial Reason
            </label>
            <p className="text-dark bg-white/10 p-3 rounded-lg">{denialReason.denial_reason}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-dark mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Pending' | 'Resubmitted' | 'Accepted')}
              className="w-full geist-input"
            >
              <option value="Pending">Pending</option>
              <option value="Resubmitted">Resubmitted</option>
              <option value="Accepted">Accepted</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-dark mb-2">
              Resubmission Instructions
            </label>
            <textarea
              value={resubmissionInstructions}
              onChange={(e) => setResubmissionInstructions(e.target.value)}
              placeholder="Enter resubmission instructions..."
              rows={4}
              className="w-full geist-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Date Reason Resubmitted
              </label>
              <input
                type="date"
                value={dateResubmitted}
                onChange={(e) => setDateResubmitted(e.target.value)}
                className="w-full geist-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Date Accepted
              </label>
              <input
                type="date"
                value={dateAccepted}
                onChange={(e) => setDateAccepted(e.target.value)}
                className="w-full geist-input"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {onDelete && (
              <GeistButton
                variant="outline"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="bg-[#1e7145] text-white border-none"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </GeistButton>
            )}
            <GeistButton
              variant="outline"
              onClick={onClose}
              disabled={saving || deleting}
              className="bg-[#1e7145] text-white border-none"
            >
              Cancel
            </GeistButton>
            <GeistButton
              variant="primary"
              onClick={handleSave}
              disabled={saving || deleting}
              className="bg-[#1e7145] text-white border-none"
            >
              {saving ? 'Saving...' : 'Save'}
            </GeistButton>
          </div>
        </div>
      </GeistCard>
    </div>
  )
}

const getCallStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'in_progress':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'initiated':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const formatCallDuration = (startedAt?: string, endedAt?: string) => {
  if (!startedAt || !endedAt) return 'N/A'
  const start = new Date(startedAt)
  const end = new Date(endedAt)
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)
  return `${diffMins}m ${diffSecs}s`
}

export default function ClaimView({ claim, onClose, onEdit, onUpdate }: ClaimViewProps) {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [office, setOffice] = useState<Office | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([])
  const [loading, setLoading] = useState(true)
  const [callsLoading, setCallsLoading] = useState(true)
  const [denialReasonsLoading, setDenialReasonsLoading] = useState(true)
  const [showDenialInput, setShowDenialInput] = useState(false)
  const [denialReasonInput, setDenialReasonInput] = useState('')
  const [updatingDenial, setUpdatingDenial] = useState(false)
  const [editingDenialReason, setEditingDenialReason] = useState<DenialReason | null>(null)
  const [currentClaim, setCurrentClaim] = useState<Claim>(claim)
  const supabase = createClient()

  useEffect(() => {
    fetchRelatedData()
    fetchCalls()
    fetchDenialReasons()
    setCurrentClaim(claim)
  }, [claim])

  const fetchRelatedData = async () => {
    setLoading(true)
    try {
      // Fetch provider
      if (claim.provider_id) {
        const { data: providerData } = await supabase
          .from('providers')
          .select('*')
          .eq('id', claim.provider_id)
          .single()
        setProvider(providerData || null)
      }

      // Fetch office
      if (claim.office_id) {
        const { data: officeData } = await supabase
          .from('offices')
          .select('*')
          .eq('id', claim.office_id)
          .single()
        setOffice(officeData || null)
      }

      // Fetch doctor
      if (claim.doctor_id) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', claim.doctor_id)
          .single()
        setDoctor(doctorData || null)
      }
    } catch (error) {
      console.error('Error fetching related data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCalls = async () => {
    setCallsLoading(true)
    try {
      const { data: callsData, error } = await supabase
        .from('calls')
        .select('*')
        .eq('claim_id', claim.id)
        .order('call_date', { ascending: false })
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error fetching calls:', error)
      } else {
        setCalls(callsData || [])
      }
    } catch (error) {
      console.error('Error fetching calls:', error)
    } finally {
      setCallsLoading(false)
    }
  }

  const fetchDenialReasons = async () => {
    setDenialReasonsLoading(true)
    try {
      const response = await fetch(`/api/claims/${claim.id}/denial-reasons`)
      if (!response.ok) {
        throw new Error('Failed to fetch denial reasons')
      }
      const { denial_reasons } = await response.json()
      setDenialReasons(denial_reasons || [])
    } catch (error) {
      console.error('Error fetching denial reasons:', error)
    } finally {
      setDenialReasonsLoading(false)
    }
  }

  const handleAddDenialReason = async () => {
    if (!denialReasonInput.trim()) return

    setUpdatingDenial(true)
    try {
      const response = await fetch(`/api/claims/${claim.id}/update-denial-reasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          denial_reason: denialReasonInput.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add denial reason')
      }

      const { claim: updatedClaim } = await response.json()
      setCurrentClaim(updatedClaim)
      setDenialReasonInput('')
      setShowDenialInput(false)
      
      // Refresh denial reasons
      await fetchDenialReasons()
      
      // Refresh the parent component's claim list if callback provided
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding denial reason:', error)
      alert(error instanceof Error ? error.message : 'Failed to add denial reason')
    } finally {
      setUpdatingDenial(false)
    }
  }

  const handleUpdateDenialReason = async (denialReason: DenialReason, updates: Partial<DenialReason>) => {
    try {
      const response = await fetch(`/api/denial-reasons/${denialReason.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update denial reason')
      }

      await fetchDenialReasons()
      setEditingDenialReason(null)
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating denial reason:', error)
      alert(error instanceof Error ? error.message : 'Failed to update denial reason')
    }
  }

  const handleDeleteDenialReason = async () => {
    if (!editingDenialReason) return

    try {
      const response = await fetch(`/api/denial-reasons/${editingDenialReason.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete denial reason')
      }

      await fetchDenialReasons()
      setEditingDenialReason(null)
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting denial reason:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete denial reason')
      throw error
    }
  }

  const handleMarkAsSubmitted = async (denialReason: DenialReason) => {
    try {
      // Get today's date in YYYY-MM-DD format (local timezone) to avoid timezone conversion
      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await handleUpdateDenialReason(denialReason, {
        date_reason_resubmitted: todayString,
        status: 'Resubmitted',
      })
    } catch (error) {
      console.error('Error marking denial reason as submitted:', error)
      alert(error instanceof Error ? error.message : 'Failed to mark as submitted')
    }
  }

  const handleMarkAsAccepted = async (denialReason: DenialReason) => {
    try {
      // Get today's date in YYYY-MM-DD format (local timezone) to avoid timezone conversion
      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      await handleUpdateDenialReason(denialReason, {
        date_accepted: todayString,
        status: 'Accepted',
      })
    } catch (error) {
      console.error('Error marking denial reason as accepted:', error)
      alert(error instanceof Error ? error.message : 'Failed to mark as accepted')
    }
  }

  const getDenialReasonStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Resubmitted':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Pending':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GeistCard variant="opaque" className="max-w-4xl w-full max-h-[90vh] overflow-y-auto !bg-[#f5f5f5]">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-dark">Claim Details</h2>
              {currentClaim.claim_status && (
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(currentClaim.claim_status)}`}>
                  {currentClaim.claim_status}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-dark/70 hover:text-dark text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mb-6 pb-6 border-b border-white/20">
            <GeistButton
              variant="primary"
              onClick={onClose}
              className="!bg-[#1e7145] !text-white !border-none"
            >
              Close
            </GeistButton>
            <GeistButton
              variant="primary"
              onClick={() => {
                if (!currentClaim.id) {
                  console.error('Cannot edit claim: missing ID', currentClaim)
                  alert('Error: Cannot edit claim - missing claim ID. Please refresh the page and try again.')
                  return
                }
                console.log('Opening edit form for claim:', currentClaim.id)
                onEdit(currentClaim)
                onClose()
              }}
              className="!bg-[#1e7145] !text-white !border-none"
            >
              Edit Claim
            </GeistButton>
          </div>

          <div className="space-y-6">
            {/* Claim Status */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Claim Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentClaim.claim_status && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Claim Status
                    </label>
                    <p className="text-dark font-medium text-lg">{currentClaim.claim_status}</p>
                  </div>
                )}
                {currentClaim.claim_number && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Claim Number
                    </label>
                    <p className="text-dark font-medium">{currentClaim.claim_number}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Patient Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Patient Name
                  </label>
                  <p className="text-dark font-medium text-lg">{claim.patient_name}</p>
                </div>
                {claim.patient_id && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Patient ID
                    </label>
                    <p className="text-dark font-medium">{claim.patient_id}</p>
                  </div>
                )}
                {claim.date_of_birth && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Date of Birth
                    </label>
                    <p className="text-dark font-medium">{formatDate(claim.date_of_birth)}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Insurance Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Insurance Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Insurance Provider
                  </label>
                  <p className="text-dark font-medium text-lg">{claim.insurance_provider}</p>
                </div>
                {claim.insurance_phone && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Insurance Phone
                    </label>
                    <p className="text-dark font-medium">{claim.insurance_phone}</p>
                  </div>
                )}
                {claim.claim_number && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Claim Number
                    </label>
                    <p className="text-dark font-medium">{claim.claim_number}</p>
                  </div>
                )}
                {provider && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Provider Claims Phone
                    </label>
                    <p className="text-dark font-medium">{provider.claims_phone_number}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Service Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Service Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {claim.date_of_service && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Date of Service
                    </label>
                    <p className="text-dark font-medium">{formatDate(claim.date_of_service)}</p>
                  </div>
                )}
                {claim.length_of_service && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Length of Service
                    </label>
                    <p className="text-dark font-medium">{claim.length_of_service}</p>
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
            </section>

            {/* Provider, Office, and Doctor Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Provider & Office Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {office && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Office
                    </label>
                    <p className="text-dark font-medium">{office.name}</p>
                    <div className="text-dark/70 text-sm mt-1">
                      {(office.address || office.city || office.state) && (
                        <p>
                          {[office.address, office.city, office.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {office.ein && <p>EIN: {office.ein}</p>}
                    </div>
                  </div>
                )}
                {doctor && (
                  <div>
                    <label className="block text-sm font-medium text-dark/70 mb-1">
                      Doctor
                    </label>
                    <p className="text-dark font-medium">{doctor.name}</p>
                    {doctor.npi && (
                      <p className="text-dark/70 text-sm mt-1">NPI: {doctor.npi}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Denial Reasons */}
            <section>
              <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-gray-400">
                <h3 className="text-xl font-semibold text-dark">
                  Denial Reasons
                </h3>
                {!showDenialInput && (
                  <GeistButton
                    variant="primary"
                    onClick={() => setShowDenialInput(true)}
                    className="text-sm !bg-[#1e7145] !text-white !border-none"
                  >
                    + Add Denial Reason
                  </GeistButton>
                )}
              </div>
              
              {denialReasonsLoading ? (
                <div className="mb-4">
                  <p className="text-dark/70 text-sm">Loading denial reasons...</p>
                </div>
              ) : denialReasons.length > 0 ? (
                <div className="space-y-4 mb-4">
                  {denialReasons.map((dr) => (
                    <div
                      key={dr.id}
                      className="bg-white/10 rounded-lg p-4 border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-dark font-medium mb-2">{dr.denial_reason}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-dark/70 mb-2">
                            <span>Recorded: {formatDate(dr.date_recorded)}</span>
                            {dr.date_reason_resubmitted && (
                              <span>Resubmitted: {formatDate(dr.date_reason_resubmitted)}</span>
                            )}
                            {dr.date_accepted && (
                              <span>Accepted: {formatDate(dr.date_accepted)}</span>
                            )}
                          </div>
                          {dr.resubmission_instructions && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-dark">
                              <strong>Resubmission Instructions:</strong>
                              <p className="mt-1 whitespace-pre-wrap">{dr.resubmission_instructions}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs border ${getDenialReasonStatusColor(dr.status)}`}>
                            {dr.status}
                          </span>
                          {dr.status !== 'Resubmitted' && dr.status !== 'Accepted' && (
                            <GeistButton
                              variant="primary"
                              onClick={() => handleMarkAsSubmitted(dr)}
                              className="text-xs !bg-[#1e7145] !text-white !border-none"
                            >
                              Submitted
                            </GeistButton>
                          )}
                          {dr.status === 'Resubmitted' && (
                            <GeistButton
                              variant="primary"
                              onClick={() => handleMarkAsAccepted(dr)}
                              className="text-xs !bg-[#1e7145] !text-white !border-none"
                            >
                              Resubmission Accepted
                            </GeistButton>
                          )}
                          <GeistButton
                            variant="primary"
                            onClick={() => setEditingDenialReason(dr)}
                            className="text-xs !bg-[#1e7145] !text-white !border-none"
                          >
                            Edit
                          </GeistButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-dark/70 text-sm italic">
                    No denial reasons recorded yet. Add the reason from your call below.
                  </p>
                </div>
              )}

              {showDenialInput && (
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <label className="block text-sm font-medium text-dark mb-2">
                    Denial Reason
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={denialReasonInput}
                      onChange={(e) => setDenialReasonInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddDenialReason()
                        }
                      }}
                      placeholder="Enter the denial reason from the call..."
                      className="flex-1 geist-input"
                      disabled={updatingDenial}
                    />
                    <GeistButton
                      variant="primary"
                      onClick={handleAddDenialReason}
                      disabled={updatingDenial || !denialReasonInput.trim()}
                      className="bg-[#1e7145] text-white border-none"
                    >
                      {updatingDenial ? 'Saving...' : 'Save'}
                    </GeistButton>
                    <GeistButton
                      variant="outline"
                      onClick={() => {
                        setShowDenialInput(false)
                        setDenialReasonInput('')
                      }}
                      disabled={updatingDenial}
                      className="bg-[#1e7145] text-white border-none"
                    >
                      Cancel
                    </GeistButton>
                  </div>
                  <p className="text-xs text-dark/60 mt-2">
                    💡 After adding a denial reason, this claim will be marked as "Pending Resubmission" and won't be called again automatically.
                  </p>
                </div>
              )}

              {editingDenialReason && (
                <EditDenialReasonModal
                  denialReason={editingDenialReason}
                  onClose={() => setEditingDenialReason(null)}
                  onSave={(updates) => handleUpdateDenialReason(editingDenialReason, updates)}
                  onDelete={handleDeleteDenialReason}
                />
              )}
            </section>

            {/* Next Steps */}
            {currentClaim.next_steps && (
              <section>
                <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                  Next Steps
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-dark whitespace-pre-wrap">{currentClaim.next_steps}</p>
                </div>
              </section>
            )}

            {/* Call History */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Call History
              </h3>
              {callsLoading ? (
                <div className="text-center py-8">
                  <p className="text-dark/70">Loading call history...</p>
                </div>
              ) : calls.length === 0 ? (
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
                      {calls.map((call) => {
                        // Format duration to match dashboard format (MM:SS)
                        let duration = 'N/A'
                        if (call.started_at && call.ended_at) {
                          const start = new Date(call.started_at)
                          const end = new Date(call.ended_at)
                          const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
                          const minutes = Math.floor(durationSeconds / 60)
                          const seconds = durationSeconds % 60
                          duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
                        }
                        
                        // Format time - use ended_at if available, otherwise started_at, otherwise call_date
                        const timeDate = call.ended_at || call.started_at || call.call_date
                        const time = timeDate 
                          ? new Date(timeDate).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'N/A'

                        return (
                          <tr key={call.id} className="bg-white border-b border-gray-100 hover:bg-gray-100 transition-colors">
                            <td className="py-3 px-4 text-dark">{claim.insurance_provider || 'N/A'}</td>
                            <td className="py-3 px-4 text-dark">
                              {claim.claim_number ? `CL-${claim.claim_number}` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-dark">{duration}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                call.status === 'completed' ? 'bg-green-100 text-green-700' :
                                call.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {call.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-dark">{time}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        </div>
      </GeistCard>
    </div>
  )
}

