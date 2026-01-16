'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserForm from '@/components/UserForm'
import UserList from '@/components/UserList'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'

interface User {
  id: string
  name: string
  email: string
  organization_id: string | null
  organization?: {
    id: string
    organization_name: string
  } | null
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUsers = async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(id, organization_name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching users:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingUser(null)
    setShowForm(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    if (!supabase) {
      alert('Database connection not available')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingUser(null)
    fetchUsers()
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
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
      {/* Users Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Users</h1>
          <GeistButton 
            variant="primary" 
            onClick={handleAdd}
            className="bg-[#1e7145] text-white border-none"
          >
            Add User
          </GeistButton>
        </div>
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <UserList
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

