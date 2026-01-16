'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface Organization {
  id: string
  organization_name: string
}

interface User {
  id?: string
  name: string
  email: string
  organization_id: string | null
}

interface UserFormProps {
  user?: User | null
  onClose: () => void
  onSave: () => void
}

export default function UserForm({ user, onClose, onSave }: UserFormProps) {
  const [formData, setFormData] = useState<User>({
    name: '',
    email: '',
    organization_id: null,
  })
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchOrganizations()
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        organization_id: user.organization_id || null,
      })
    } else {
      // Reset form when creating new user
      setFormData({
        name: '',
        email: '',
        organization_id: null,
      })
    }
  }, [user])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, organization_name')
        .order('organization_name', { ascending: true })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const cleanedData: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      }

      // Only include organization_id if one is selected
      if (formData.organization_id) {
        cleanedData.organization_id = formData.organization_id
      } else {
        cleanedData.organization_id = null
      }

      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update(cleanedData)
          .eq('id', user.id)
          .select()

        if (error) {
          console.error('Supabase update error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to update user')
        }
      } else {
        const { error } = await supabase
          .from('users')
          .insert([cleanedData])
          .select()

        if (error) {
          console.error('Supabase insert error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          throw new Error(error.message || 'Failed to create user')
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving user:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save user. Please check the console for details.'
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
              {user ? 'Edit User' : 'Add User'}
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
                Name *
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
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full geist-input text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Organization
              </label>
              {loadingOrgs ? (
                <div className="text-sm text-dark/70">Loading organizations...</div>
              ) : (
                <select
                  value={formData.organization_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    organization_id: e.target.value || null 
                  })}
                  className="w-full geist-input text-black"
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              )}
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

