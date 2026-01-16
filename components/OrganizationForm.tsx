'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Organization {
  id?: string
  organization_name: string
  voice_on: boolean
}

interface OrganizationFormProps {
  organization?: Organization | null
  onClose: () => void
  onSave: () => void
}

export default function OrganizationForm({ organization, onClose, onSave }: OrganizationFormProps) {
  const [formData, setFormData] = useState<Organization>({
    organization_name: '',
    voice_on: false,
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (organization) {
      setFormData({
        organization_name: organization.organization_name || '',
        voice_on: organization.voice_on || false,
      })
    } else {
      // Reset form when creating new organization
      setFormData({
        organization_name: '',
        voice_on: false,
      })
    }
  }, [organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const cleanedData = {
        organization_name: formData.organization_name.trim(),
        voice_on: formData.voice_on,
      }

      if (organization?.id) {
        const { error } = await supabase
          .from('organizations')
          .update(cleanedData)
          .eq('id', organization.id)
          .select()

        if (error) {
          console.error('Supabase update error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to update organization')
        }
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert([cleanedData])
          .select()

        if (error) {
          console.error('Supabase insert error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to create organization')
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving organization:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save organization. Please check the console for details.'
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
              {organization ? 'Edit Organization' : 'Add Organization'}
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
                Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                className="w-full geist-input text-black"
              />
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.voice_on}
                  onChange={(e) => setFormData({ ...formData, voice_on: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-dark">
                  Voice On
                </span>
              </label>
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

