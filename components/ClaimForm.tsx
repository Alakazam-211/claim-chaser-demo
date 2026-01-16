'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Claim {
  id?: string
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

interface ClaimFormProps {
  claim?: Claim | null
  onClose: () => void
  onSave: () => void | Promise<void>
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

  useEffect(() => {
    if (dateResubmitted && dateResubmitted.trim() !== '') {
      setStatus('Resubmitted')
    }
  }, [dateResubmitted])

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
        updates.date_reason_resubmitted = dateResubmitted
      } else {
        updates.date_reason_resubmitted = undefined
      }
      if (dateAccepted) {
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
                      className="w-full geist-input text-black"
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
                      className="w-full geist-input text-black"
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
                      className="w-full geist-input text-black"
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
                      className="w-full geist-input text-black"
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

export default function ClaimForm({ claim, onClose, onSave }: ClaimFormProps) {
  const [formData, setFormData] = useState<Claim>({
    patient_name: '',
    patient_id: '',
    date_of_birth: '',
    insurance_provider: '',
    provider_id: '',
    office_id: '',
    doctor_id: '',
    insurance_phone: '',
    date_of_service: '',
    length_of_service: '',
    billed_amount: undefined,
    claim_status: '',
    claim_number: '',
  })
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [offices, setOffices] = useState<Office[]>([])
  const [loadingOffices, setLoadingOffices] = useState(true)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([])
  const [denialReasonsLoading, setDenialReasonsLoading] = useState(true)
  const [showDenialInput, setShowDenialInput] = useState(false)
  const [denialReasonInput, setDenialReasonInput] = useState('')
  const [updatingDenial, setUpdatingDenial] = useState(false)
  const [editingDenialReason, setEditingDenialReason] = useState<DenialReason | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [callsLoading, setCallsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchProviders()
    fetchOffices()
    fetchDoctors()
    if (claim?.id) {
      fetchDenialReasons()
      fetchCalls()
    }
  }, [claim?.id])

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name, claims_phone_number')
        .order('name', { ascending: true })

      if (error) throw error
      setProviders(data || [])
    } catch (error) {
      console.error('Error fetching providers:', error)
    } finally {
      setLoadingProviders(false)
    }
  }

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('id, name, address, city, state')
        .order('name', { ascending: true })

      if (error) throw error
      setOffices(data || [])
    } catch (error) {
      console.error('Error fetching offices:', error)
    } finally {
      setLoadingOffices(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, npi')
        .order('name', { ascending: true })

      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoadingDoctors(false)
    }
  }

  const fetchDenialReasons = async () => {
    if (!claim?.id) return
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

  const fetchCalls = async () => {
    if (!claim?.id) return
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

  const handleAddDenialReason = async () => {
    if (!claim?.id || !denialReasonInput.trim()) return

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

      setDenialReasonInput('')
      setShowDenialInput(false)
      await fetchDenialReasons()
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
    } catch (error) {
      console.error('Error deleting denial reason:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete denial reason')
      throw error
    }
  }

  const handleMarkAsSubmitted = async (denialReason: DenialReason) => {
    try {
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

  useEffect(() => {
    if (claim) {
      console.log('ClaimForm: Claim prop received:', {
        id: claim.id,
        patient_name: claim.patient_name,
        office_id: claim.office_id,
        doctor_id: claim.doctor_id,
        provider_id: claim.provider_id
      })
      setFormData({
        patient_name: claim.patient_name || '',
        patient_id: claim.patient_id || '',
        date_of_birth: claim.date_of_birth || '',
        insurance_provider: claim.insurance_provider || '',
        provider_id: claim.provider_id || '',
        office_id: claim.office_id || '',
        doctor_id: claim.doctor_id || '',
        insurance_phone: claim.insurance_phone || '',
        date_of_service: claim.date_of_service || '',
        length_of_service: claim.length_of_service || '',
        billed_amount: claim.billed_amount,
        claim_status: claim.claim_status || '',
        claim_number: claim.claim_number || '',
        next_steps: claim.next_steps || '',
        resubmission_instructions: claim.resubmission_instructions || '',
      })
    } else {
      console.log('ClaimForm: No claim prop (creating new claim)')
      // Reset form when creating new claim
      setFormData({
        patient_name: '',
        patient_id: '',
        date_of_birth: '',
        insurance_provider: '',
        provider_id: '',
        office_id: '',
        doctor_id: '',
        insurance_phone: '',
        date_of_service: '',
        length_of_service: '',
        billed_amount: undefined,
        claim_status: '',
        claim_number: '',
      })
    }
  }, [claim])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Check if we're editing but don't have an ID
      if (claim && !claim.id) {
        console.error('Editing claim but no ID found:', claim)
        alert('Error: Cannot save claim - missing claim ID. Please refresh the page and try again.')
        setSaving(false)
        return
      }

      // Use the status from the form - respect user's manual selection
      let claimStatus = formData.claim_status || null

      // Get provider name for insurance_provider field (for backward compatibility)
      const selectedProvider = providers.find(p => p.id === formData.provider_id)
      const insuranceProviderName = selectedProvider?.name || formData.insurance_provider || ''

      // Validate required fields
      if (!formData.office_id) {
        alert('Please select an office. This field is required.')
        setSaving(false)
        return
      }

      if (!formData.doctor_id) {
        alert('Please select a doctor. This field is required.')
        setSaving(false)
        return
      }

      // Additional validation for editing
      if (claim?.id && (!formData.office_id || !formData.doctor_id)) {
        console.warn('Editing claim but required fields missing:', {
          office_id: formData.office_id,
          doctor_id: formData.doctor_id,
          claim_id: claim.id
        })
      }

      const dataToSave = {
        ...formData,
        patient_id: formData.patient_id || null,
        date_of_birth: formData.date_of_birth || null,
        insurance_provider: insuranceProviderName,
        provider_id: formData.provider_id || null,
        office_id: formData.office_id,
        doctor_id: formData.doctor_id,
        insurance_phone: formData.insurance_phone || null,
        date_of_service: formData.date_of_service || null,
        length_of_service: formData.length_of_service || null,
        billed_amount: formData.billed_amount || null,
        claim_status: claimStatus,
        claim_number: formData.claim_number || null,
      }

      const claimId = claim?.id
      if (claimId) {
        console.log('Updating claim with ID:', claimId)
        console.log('Claim object:', claim)
        console.log('Update data:', JSON.stringify(dataToSave, null, 2))
        
        // Remove any undefined values that might cause issues
        const cleanData = Object.fromEntries(
          Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
        )
        
        console.log('Clean update data:', JSON.stringify(cleanData, null, 2))
        
        const { data, error } = await supabase
          .from('claims')
          .update(cleanData)
          .eq('id', claimId)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
        }
        
        if (!data || data.length === 0) {
          throw new Error('Update succeeded but no data was returned. The claim may not exist.')
        }
        
        console.log('Claim updated successfully:', data)
      } else {
        console.log('Creating new claim:', dataToSave)
        const { data, error } = await supabase
          .from('claims')
          .insert([dataToSave])
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
        
        console.log('Claim created successfully:', data)
      }

      // Success - close form and refresh data
      console.log('Save completed successfully, closing form...')
      const result = onSave()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error('Error saving claim:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save claim: ${errorMessage}`)
      // Don't close the form on error
      return
    } finally {
      setSaving(false)
    }
  }

  // Get selected provider, office, and doctor for display
  const selectedProvider = providers.find(p => p.id === formData.provider_id)
  const selectedOffice = offices.find(o => o.id === formData.office_id)
  const selectedDoctor = doctors.find(d => d.id === formData.doctor_id)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GeistCard variant="opaque" className="max-w-4xl w-full max-h-[90vh] overflow-y-auto !bg-[#f5f5f5]">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-dark">
                {claim ? 'Edit Claim' : 'Add Claim'}
              </h2>
              {formData.claim_status && (
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(formData.claim_status)}`}>
                  {formData.claim_status}
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
              type="button"
              variant="primary"
              onClick={onClose}
              disabled={saving}
              className="!bg-[#1e7145] !text-white !border-none"
            >
              Cancel
            </GeistButton>
            <GeistButton
              type="submit"
              variant="primary"
              disabled={saving}
              form="claim-form"
              className="!bg-[#1e7145] !text-white !border-none"
            >
              {saving ? 'Saving...' : 'Save'}
            </GeistButton>
          </div>

          <form id="claim-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Claim Status */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Claim Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Claim Status
                  </label>
                  <select
                    value={formData.claim_status || ''}
                    onChange={(e) => setFormData({ ...formData, claim_status: e.target.value })}
                    className="w-full geist-input text-black"
                  >
                    <option value="">Select status</option>
                    <option value="Denied">Denied</option>
                    <option value="Pending Resubmission">Pending Resubmission</option>
                    <option value="Awaiting Acceptance">Awaiting Acceptance</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Claim Number
                  </label>
                  <input
                    type="text"
                    value={formData.claim_number || ''}
                    onChange={(e) => setFormData({ ...formData, claim_number: e.target.value })}
                    className="w-full geist-input text-black"
                  />
                </div>
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
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    className="w-full geist-input text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={formData.patient_id || ''}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full geist-input text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full geist-input text-black"
                  />
                </div>
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
                    Insurance Provider *
                  </label>
                  {loadingProviders ? (
                    <div className="w-full geist-input text-black">
                      Loading providers...
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.provider_id || ''}
                      onChange={(e) => {
                        const selectedProvider = providers.find(p => p.id === e.target.value)
                        setFormData({ 
                          ...formData, 
                          provider_id: e.target.value,
                          insurance_provider: selectedProvider?.name || ''
                        })
                      }}
                      className="w-full geist-input text-black"
                    >
                      <option value="">Select a provider</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedProvider && (
                    <p className="text-dark/70 text-sm mt-1">
                      Claims Phone: {selectedProvider.claims_phone_number}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Insurance Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.insurance_phone || ''}
                    onChange={(e) => setFormData({ ...formData, insurance_phone: e.target.value })}
                    className="w-full geist-input text-black"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </section>

            {/* Service Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Service Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Date of Service
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_service || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_service: e.target.value })}
                    className="w-full geist-input text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Length of Service
                  </label>
                  <input
                    type="text"
                    value={formData.length_of_service || ''}
                    onChange={(e) => setFormData({ ...formData, length_of_service: e.target.value })}
                    className="w-full geist-input text-black"
                    placeholder="e.g., 30 minutes, 1 hour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Billed Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.billed_amount || ''}
                    onChange={(e) => setFormData({ ...formData, billed_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full geist-input text-black"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </section>

            {/* Provider & Office Information */}
            <section>
              <h3 className="text-xl font-semibold text-dark mb-4 pb-2 border-b-2 border-gray-400">
                Provider & Office Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Office *
                  </label>
                  {loadingOffices ? (
                    <div className="w-full geist-input text-black">
                      Loading offices...
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.office_id || ''}
                      onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                      className="w-full geist-input text-black"
                    >
                      <option value="">Select an office</option>
                      {offices.map((office) => (
                        <option key={office.id} value={office.id}>
                          {office.name} {office.city && office.state ? `- ${office.city}, ${office.state}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedOffice && (
                    <div className="text-dark/70 text-sm mt-1">
                      {(selectedOffice.address || selectedOffice.city || selectedOffice.state) && (
                        <p>
                          {[selectedOffice.address, selectedOffice.city, selectedOffice.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {selectedOffice.ein && <p>EIN: {selectedOffice.ein}</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-1">
                    Doctor *
                  </label>
                  {loadingDoctors ? (
                    <div className="w-full geist-input text-black">
                      Loading doctors...
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.doctor_id || ''}
                      onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                      className="w-full geist-input text-black"
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} {doctor.npi ? `(NPI: ${doctor.npi})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedDoctor && (
                    <div className="text-dark/70 text-sm mt-1">
                      {selectedDoctor.npi && <p>NPI: {selectedDoctor.npi}</p>}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Denial Reasons */}
            {claim?.id && (
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
                        className="flex-1 geist-input text-black"
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
            )}

            {/* Call History */}
            {claim?.id && (
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
                              <td className="py-3 px-4 text-dark">{formData.insurance_provider || 'N/A'}</td>
                              <td className="py-3 px-4 text-dark">
                                {formData.claim_number ? `CL-${formData.claim_number}` : 'N/A'}
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
            )}

          </form>
        </div>
      </GeistCard>
    </div>
  )
}
