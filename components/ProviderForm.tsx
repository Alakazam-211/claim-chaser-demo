'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Provider {
  id?: string
  name: string
  claims_phone_number: string
}

interface ProviderFormProps {
  provider?: Provider | null
  onClose: () => void
  onSave: () => void
}

export default function ProviderForm({ provider, onClose, onSave }: ProviderFormProps) {
  const [formData, setFormData] = useState<Provider>({
    name: '',
    claims_phone_number: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || '',
        claims_phone_number: provider.claims_phone_number || '',
      })
    } else {
      // Reset form when creating new provider
      setFormData({
        name: '',
        claims_phone_number: '',
      })
    }
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (provider?.id) {
        const { error } = await supabase
          .from('providers')
          .update(formData)
          .eq('id', provider.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('providers')
          .insert([formData])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving provider:', error)
      alert('Failed to save provider')
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
              {provider ? 'Edit Provider' : 'Add Provider'}
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
                Provider Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="e.g., Aetna, Humana, Blue Cross"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Claims Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.claims_phone_number}
                onChange={(e) => setFormData({ ...formData, claims_phone_number: e.target.value })}
                className="w-full geist-input text-black"
                placeholder="e.g., 1-800-123-4567"
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

