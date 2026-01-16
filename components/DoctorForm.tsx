'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Doctor {
  id?: string
  name: string
  npi?: string
  office_id?: string
}

interface Office {
  id: string
  name: string
}

interface DoctorFormProps {
  doctor?: Doctor | null
  offices: Office[]
  onClose: () => void
  onSave: () => void
}

export default function DoctorForm({ doctor, offices, onClose, onSave }: DoctorFormProps) {
  const [formData, setFormData] = useState<Doctor>({
    name: '',
    npi: '',
    office_id: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name || '',
        npi: doctor.npi || '',
        office_id: doctor.office_id || '',
      })
    } else {
      // Reset form when creating new doctor
      setFormData({
        name: '',
        npi: '',
        office_id: '',
      })
    }
  }, [doctor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dataToSave = {
        ...formData,
        office_id: formData.office_id || null,
        npi: formData.npi || null,
      }

      if (doctor?.id) {
        const { error } = await supabase
          .from('doctors')
          .update(dataToSave)
          .eq('id', doctor.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([dataToSave])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving doctor:', error)
      alert('Failed to save doctor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GeistCard variant="opaque" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto !bg-[#f5f5f5]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dark">
              {doctor ? 'Edit Doctor' : 'Add Doctor'}
            </h2>
            <button
              onClick={onClose}
              className="text-dark/70 hover:text-dark text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Doctor Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full geist-input text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                NPI (National Provider Identifier)
              </label>
              <input
                type="text"
                value={formData.npi || ''}
                onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="e.g., 1740598556"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Office
              </label>
              <select
                value={formData.office_id || ''}
                onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                className="w-full geist-input text-black"
              >
                <option value="">Select an office (optional)</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <GeistButton
                type="button"
                variant="primary"
                onClick={onClose}
                className="!bg-[#1e7145] !text-white !border-none"
              >
                Cancel
              </GeistButton>
              <GeistButton
                type="submit"
                variant="primary"
                disabled={saving}
                className="!bg-[#1e7145] !text-white !border-none"
              >
                {saving ? 'Saving...' : 'Save'}
              </GeistButton>
            </div>
          </form>
        </div>
      </GeistCard>
    </div>
  )
}

