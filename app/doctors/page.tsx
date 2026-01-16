'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DoctorForm from '@/components/DoctorForm'
import DoctorList from '@/components/DoctorList'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface Doctor {
  id: string
  name: string
  npi?: string
  office_id?: string
  office?: {
    name: string
  }
  created_at: string
  updated_at: string
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [offices, setOffices] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchDoctors()
    fetchOffices()
  }, [])

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          office:offices(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from('offices')
        .select('id, name')
        .order('name')

      if (error) throw error
      setOffices(data || [])
    } catch (error) {
      console.error('Error fetching offices:', error)
    }
  }

  const handleAdd = () => {
    setEditingDoctor(null)
    setShowForm(true)
  }

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDoctors()
    } catch (error) {
      console.error('Error deleting doctor:', error)
      alert('Failed to delete doctor')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingDoctor(null)
    fetchDoctors()
  }

  if (loading) {
    return <div className="text-center py-8">Loading doctors...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Doctors Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Doctors</h1>
          <GeistButton 
            variant="primary" 
            onClick={handleAdd}
            className="bg-[#1e7145] text-white border-none"
          >
            Add Doctor
          </GeistButton>
        </div>
      </div>

      {showForm && (
        <DoctorForm
          doctor={editingDoctor}
          offices={offices}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <DoctorList
        doctors={doctors}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

