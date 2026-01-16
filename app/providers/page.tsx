'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProviderForm from '@/components/ProviderForm'
import ProviderList from '@/components/ProviderList'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface Provider {
  id: string
  name: string
  claims_phone_number: string
  created_at: string
  updated_at: string
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setProviders(data || [])
    } catch (error) {
      console.error('Error fetching providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingProvider(null)
    setShowForm(true)
  }

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return

    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchProviders()
    } catch (error) {
      console.error('Error deleting provider:', error)
      alert('Failed to delete provider')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProvider(null)
    fetchProviders()
  }

  if (loading) {
    return <div className="text-center py-8">Loading providers...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Providers Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Providers</h1>
          <GeistButton 
            variant="primary" 
            onClick={handleAdd}
            className="bg-[#1e7145] text-white border-none"
          >
            Add Provider
          </GeistButton>
        </div>
      </div>

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <ProviderList
        providers={providers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}


