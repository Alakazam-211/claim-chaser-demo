'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import OrganizationForm from '@/components/OrganizationForm'
import OrganizationList from '@/components/OrganizationList'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface Organization {
  id: string
  organization_name: string
  voice_on: boolean
  created_at: string
  updated_at: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize database connection')
      return null
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchOrganizations()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchOrganizations = async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching organizations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingOrganization(null)
    setShowForm(true)
  }

  const handleEdit = (organization: Organization) => {
    setEditingOrganization(organization)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return

    if (!supabase) {
      alert('Database connection not available')
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchOrganizations()
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('Failed to delete organization')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingOrganization(null)
    fetchOrganizations()
  }

  if (loading) {
    return <div className="text-center py-8">Loading organizations...</div>
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="p-8 bg-white rounded-lg">
          <div className="text-center text-red-600">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <p className="mt-4 text-sm text-dark/70">
              Please check your environment variables and ensure Supabase is properly configured.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Organizations Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Organizations</h1>
          <GeistButton 
            variant="primary" 
            onClick={handleAdd}
            className="bg-[#1e7145] text-white border-none"
          >
            Add Organization
          </GeistButton>
        </div>
      </div>

      {showForm && (
        <OrganizationForm
          organization={editingOrganization}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <OrganizationList
        organizations={organizations}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

