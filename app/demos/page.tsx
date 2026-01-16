'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import DemoList from '@/components/DemoList'
import GeistCard from '@/components/GeistCard'

interface Demo {
  id: string
  name: string
  phone: string
  email: string
  created_at: string
  updated_at: string
}

export default function DemosPage() {
  const [demos, setDemos] = useState<Demo[]>([])
  const [loading, setLoading] = useState(true)
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
      fetchDemos()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchDemos = async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('demos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching demos:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setDemos(data || [])
    } catch (error) {
      console.error('Error fetching demos:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setDemos([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">Loading demo records...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <GeistCard variant="opaque" className="p-8">
          <div className="text-center text-red-600">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <p className="mt-4 text-sm text-dark/70">
              Please check your environment variables and ensure Supabase is properly configured.
            </p>
          </div>
        </GeistCard>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-dark mb-2">Demo Records</h1>
        <p className="text-dark/70">
          View all demo requests submitted through the demo site.
        </p>
      </div>

      <DemoList demos={demos} />
    </div>
  )
}

