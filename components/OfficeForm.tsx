'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Office {
  id?: string
  name: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  callback_number?: string
  ein?: string
}

interface OfficeFormProps {
  office?: Office | null
  onClose: () => void
  onSave: () => void
}

export default function OfficeForm({ office, onClose, onSave }: OfficeFormProps) {
  const [formData, setFormData] = useState<Office>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    callback_number: '',
    ein: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (office) {
      setFormData({
        name: office.name || '',
        address: office.address || '',
        city: office.city || '',
        state: office.state || '',
        zip_code: office.zip_code || '',
        callback_number: office.callback_number || '',
        ein: office.ein || '',
      })
    } else {
      // Reset form when creating new office
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        callback_number: '',
        ein: '',
      })
    }
  }, [office])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Clean up formData: remove empty strings for optional fields, convert to null
      // Only include fields that have values (or null for optional fields)
      const cleanedData: Record<string, any> = {
        name: formData.name.trim(),
        address: formData.address.trim(),
      }

      // Only add optional fields if they have values
      if (formData.city?.trim()) cleanedData.city = formData.city.trim()
      if (formData.state?.trim()) cleanedData.state = formData.state.trim()
      if (formData.zip_code?.trim()) cleanedData.zip_code = formData.zip_code.trim()
      if (formData.callback_number?.trim()) cleanedData.callback_number = formData.callback_number.trim()
      if (formData.ein?.trim()) cleanedData.ein = formData.ein.trim()

      if (office?.id) {
        const { data, error } = await supabase
          .from('offices')
          .update(cleanedData)
          .eq('id', office.id)
          .select()

        if (error) {
          console.error('Supabase update error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to update office')
        }
      } else {
        const { data, error } = await supabase
          .from('offices')
          .insert([cleanedData])
          .select()

        if (error) {
          console.error('Supabase insert error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to create office')
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving office:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save office. Please check the console for details.'
      alert(errorMessage)
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
              {office ? 'Edit Office' : 'Add Office'}
            </h2>
            <button
              onClick={onClose}
              className="text-dark/70 hover:text-dark text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Office Name *
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
                Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full geist-input text-black"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full geist-input text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full geist-input text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full geist-input text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Callback Number
              </label>
              <input
                type="text"
                value={formData.callback_number || ''}
                onChange={(e) => setFormData({ ...formData, callback_number: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="e.g., 208-313-8005"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                EIN (Employer Identification Number)
              </label>
              <input
                type="text"
                value={formData.ein || ''}
                onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="e.g., 453080679"
              />
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

