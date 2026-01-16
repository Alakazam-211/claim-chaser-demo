'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import OfficeForm from '@/components/OfficeForm'
import OfficeList from '@/components/OfficeList'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface Office {
  id: string
  name: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  callback_number?: string
  ein?: string
  created_at: string
  updated_at: string
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingOffice, setEditingOffice] = useState<Office | null>(null)
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
      fetchOffices()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchOffices = async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching offices:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setOffices(data || [])
    } catch (error) {
      console.error('Error fetching offices:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Set empty array on error to prevent UI issues
      setOffices([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingOffice(null)
    setShowForm(true)
  }

  const handleEdit = (office: Office) => {
    setEditingOffice(office)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office?')) return

    if (!supabase) {
      alert('Database connection not available')
      return
    }

    try {
      const { error } = await supabase
        .from('offices')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchOffices()
    } catch (error) {
      console.error('Error deleting office:', error)
      alert('Failed to delete office')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingOffice(null)
    fetchOffices()
  }

  if (loading) {
    return <div className="text-center py-8">Loading offices...</div>
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
      {/* Offices Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Offices</h1>
          <GeistButton 
            variant="primary" 
            onClick={handleAdd}
            className="bg-[#1e7145] text-white border-none"
          >
            Add Office
          </GeistButton>
        </div>
      </div>

      {showForm && (
        <OfficeForm
          office={editingOffice}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <OfficeList
        offices={offices}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

