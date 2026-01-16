'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ClaimForm from '@/components/ClaimForm'
import ClaimList from '@/components/ClaimList'
import ClaimView from '@/components/ClaimView'
import GeistCard from '@/components/GeistCard'
import GeistButton from '@/components/GeistButton'
import * as XLSX from 'xlsx'

interface DenialReason {
  id: string
  claim_id: string
  denial_reason: string
  date_recorded: string
  status: 'Pending' | 'Resubmitted' | 'Accepted'
  date_reason_resubmitted?: string
  date_accepted?: string
}

interface Doctor {
  id: string
  name: string
  npi?: string
}

interface Claim {
  id: string
  patient_name: string
  patient_id?: string
  date_of_birth?: string
  insurance_provider: string
  provider_id?: string
  office_id?: string
  doctor_id?: string
  doctor?: Doctor
  insurance_phone?: string
  date_of_service?: string
  length_of_service?: string
  billed_amount?: number
  claim_status?: string
  claim_number?: string
  denial_reasons_count?: number
  denial_reasons_data?: DenialReason[]
  next_steps?: string
  resubmission_instructions?: string
  created_at: string
  updated_at: string
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [claimsKey, setClaimsKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null)
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilters, setProviderFilters] = useState<string[]>([])
  const [dateFilters, setDateFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [openFilterDropdown, setOpenFilterDropdown] = useState<'provider' | 'date' | 'status' | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchClaims()
  }, [])

  const fetchClaims = async () => {
    try {
      const { data: claimsData, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch denial reasons and doctor data for each claim
      const claimsWithDenialReasons = await Promise.all(
        (claimsData || []).map(async (claim: any) => {
          const { data: denialReasons, count } = await supabase
            .from('denial_reasons')
            .select('*')
            .eq('claim_id', claim.id)
            .order('date_recorded', { ascending: false })
          
          // Fetch doctor information if doctor_id exists
          let doctor = null
          if (claim.doctor_id) {
            const { data: doctorData } = await supabase
              .from('doctors')
              .select('id, name, npi')
              .eq('id', claim.doctor_id)
              .single()
            doctor = doctorData
          }
          
          return {
            ...claim,
            denial_reasons_count: count || 0,
            denial_reasons_data: denialReasons || [],
            doctor: doctor,
          }
        })
      )
      
      setClaims(claimsWithDenialReasons)
      setClaimsKey(prev => prev + 1)
    } catch (error) {
      console.error('Error fetching claims:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingClaim(null)
    setShowForm(true)
  }

  const handleEdit = async (claim: Claim) => {
    // Fetch fresh data from database to ensure we have the latest
    try {
      const { data: freshClaim, error } = await supabase
        .from('claims')
        .select('*')
        .eq('id', claim.id)
        .single()
      
      if (error) throw error
      setEditingClaim(freshClaim || claim)
    } catch (error) {
      console.error('Error fetching fresh claim:', error)
      // Fallback to using the claim from the list
      setEditingClaim(claim)
    }
    setShowForm(true)
  }

  const handleView = (claim: Claim) => {
    setViewingClaim(claim)
    setShowView(true)
  }

  const handleViewClose = () => {
    setShowView(false)
    setViewingClaim(null)
  }

  const handleViewUpdate = async () => {
    // Refresh claims list and update viewing claim if it's still open
    await fetchClaims()
    if (viewingClaim) {
      const { data: updatedClaim } = await supabase
        .from('claims')
        .select('*')
        .eq('id', viewingClaim.id)
        .single()
      if (updatedClaim) {
        setViewingClaim(updatedClaim)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this claim?')) return

    try {
      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchClaims()
    } catch (error) {
      console.error('Error deleting claim:', error)
      alert('Failed to delete claim')
    }
  }

  const handleFormClose = async () => {
    setShowForm(false)
    setEditingClaim(null)
    await fetchClaims()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch
      return `${month}/${day}/${year}`
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  }

  const handleExport = () => {
    // Create Excel workbook
    const workbook = XLSX.utils.book_new()
    
    // Prepare data for export
    const exportData = claims.map(claim => ({
      'Claim #': claim.claim_number || '',
      'Patient': claim.patient_name,
      'Provider': claim.insurance_provider,
      'Date': claim.date_of_service ? formatDate(claim.date_of_service) : '',
      'Amount': claim.billed_amount ? `$${claim.billed_amount.toFixed(2)}` : '',
      'Status': claim.claim_status || '',
    }))
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims')
    
    // Generate filename with current date
    const filename = `claims_export_${new Date().toISOString().split('T')[0]}.xlsx`
    
    // Write file
    XLSX.writeFile(workbook, filename)
  }

  // Get unique values for filters
  const uniqueProviders = Array.from(new Set(claims.map(c => c.insurance_provider).filter(Boolean))).sort()
  const uniqueStatuses = Array.from(new Set(claims.map(c => c.claim_status).filter((status): status is string => status !== null && status !== undefined))).sort()
  
  // Get unique dates (extract year-month for grouping)
  const uniqueDateMonths = Array.from(
    new Set(
      claims
        .map(c => {
          if (!c.date_of_service) return null
          const date = new Date(c.date_of_service)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        })
        .filter((item): item is string => item !== null)
    )
  ).sort().reverse()

  // Filter claims based on search query and dropdown filters
  const filteredClaims = claims.filter((claim) => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      
      // Normalize query - remove CL- prefix if present for better matching
      const normalizedQuery = query.replace(/^cl-/, '')
      
      // Format claim number with CL- prefix for searching
      const formattedClaimNumber = claim.claim_number 
        ? `cl-${claim.claim_number.toLowerCase()}` 
        : ''
      
      const searchableFields = [
        claim.patient_name?.toLowerCase() || '',
        claim.patient_id?.toLowerCase() || '',
        claim.insurance_provider?.toLowerCase() || '',
        claim.claim_number?.toLowerCase() || '', // Original claim number (e.g., "12345")
        formattedClaimNumber, // Formatted with CL- prefix (e.g., "cl-12345")
        claim.claim_status?.toLowerCase() || '',
        claim.doctor?.name?.toLowerCase() || '',
        claim.date_of_service || '',
        claim.billed_amount?.toString() || '',
      ]
      
      // Check if query matches any field
      // Also check if normalized query (without CL-) matches the raw claim number
      const matchesField = searchableFields.some(field => field.includes(query))
      const matchesNormalized = claim.claim_number && 
        claim.claim_number.toLowerCase().includes(normalizedQuery)
      
      if (!matchesField && !matchesNormalized) {
        return false
      }
    }

    // Provider filters (multiple selection)
    if (providerFilters.length > 0 && !providerFilters.includes(claim.insurance_provider)) {
      return false
    }

    // Status filters (multiple selection)
    if (statusFilters.length > 0 && (!claim.claim_status || !statusFilters.includes(claim.claim_status))) {
      return false
    }

    // Date filters (multiple selection, by year-month)
    if (dateFilters.length > 0) {
      if (!claim.date_of_service) {
        return false
      }
      const claimDate = new Date(claim.date_of_service)
      const claimYearMonth = `${claimDate.getFullYear()}-${String(claimDate.getMonth() + 1).padStart(2, '0')}`
      if (!dateFilters.includes(claimYearMonth)) {
        return false
      }
    }

    return true
  })

  // Handle filter toggle
  const toggleFilter = (filterType: 'provider' | 'date' | 'status', value: string) => {
    if (filterType === 'provider') {
      setProviderFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      )
    } else if (filterType === 'date') {
      setDateFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      )
    } else if (filterType === 'status') {
      setStatusFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      )
    }
  }

  // Remove individual filter
  const removeFilter = (filterType: 'provider' | 'date' | 'status', value: string) => {
    if (filterType === 'provider') {
      setProviderFilters(prev => prev.filter(f => f !== value))
    } else if (filterType === 'date') {
      setDateFilters(prev => prev.filter(f => f !== value))
    } else if (filterType === 'status') {
      setStatusFilters(prev => prev.filter(f => f !== value))
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-dropdown-container')) {
        setOpenFilterDropdown(null)
      }
    }

    if (openFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openFilterDropdown])

  // Calculate summary statistics (using filtered claims for display, but could use all claims)
  const totalClaims = claims.length
  const deniedClaims = claims.filter(c => c.claim_status === 'Denied').length
  const pendingClaims = claims.filter(c => c.claim_status === 'Pending' || c.claim_status === 'Pending Resubmission').length
  const totalValue = claims.reduce((sum, c) => sum + (c.billed_amount || 0), 0)

  if (loading) {
    return <div className="text-center py-8">Loading claims...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Claims Dashboard Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-dark">Claims Dashboard</h1>
          <div className="flex gap-3">
            <GeistButton 
              variant="primary" 
              onClick={handleExport}
              className="bg-[#1e7145] text-white border-none"
            >
              Export
            </GeistButton>
            <GeistButton 
              variant="primary" 
              onClick={() => router.push('/uploads')}
              className="bg-[#1e7145] text-white border-none"
            >
              Upload Claims
            </GeistButton>
            <GeistButton 
              variant="primary" 
              onClick={handleAdd}
              className="bg-[#1e7145] text-white border-none"
            >
              Add Claim
            </GeistButton>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Claims</div>
            <div className="text-2xl font-bold text-dark">{totalClaims}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Denied</div>
            <div className="text-2xl font-bold text-dark">{deniedClaims}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-dark">{pendingClaims}</div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-dark">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <GeistButton
            variant="primary"
            onClick={() => setViewMode('table')}
            className={`text-sm bg-[#1e7145] text-white border-none ${viewMode !== 'table' ? 'opacity-50' : ''}`}
          >
            Table View
          </GeistButton>
          <GeistButton
            variant="primary"
            onClick={() => setViewMode('cards')}
            className={`text-sm bg-[#1e7145] text-white border-none ${viewMode !== 'cards' ? 'opacity-50' : ''}`}
          >
            Card View
          </GeistButton>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search claims by patient name, claim number, provider, status, doctor, date, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full geist-input text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e7145] focus:border-transparent"
          />
          {(searchQuery || providerFilters.length > 0 || dateFilters.length > 0 || statusFilters.length > 0) && (
            <div className="mt-2 flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Showing {filteredClaims.length} of {claims.length} claims
              </div>
              {(providerFilters.length > 0 || dateFilters.length > 0 || statusFilters.length > 0) && (
                <GeistButton
                  variant="primary"
                  onClick={() => {
                    setProviderFilters([])
                    setDateFilters([])
                    setStatusFilters([])
                  }}
                  className="text-xs bg-gray-500 text-white border-none py-1 px-2"
                >
                  Clear All Filters
                </GeistButton>
              )}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ClaimForm
          claim={editingClaim}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      {showView && viewingClaim && (
        <ClaimView
          claim={viewingClaim}
          onClose={handleViewClose}
          onEdit={handleEdit}
          onUpdate={handleViewUpdate}
        />
      )}

      {viewMode === 'table' ? (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-dark">Claim #</th>
                <th className="text-left py-3 px-4 font-semibold text-dark">Patient</th>
                <th className="text-left py-3 px-4 font-semibold text-dark relative">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span>Provider</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterDropdown(openFilterDropdown === 'provider' ? null : 'provider')
                        }}
                        className="text-gray-600 hover:text-gray-800 focus:outline-none"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${openFilterDropdown === 'provider' ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {openFilterDropdown === 'provider' && (
                      <div className="filter-dropdown-container absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto min-w-[200px]">
                        {uniqueProviders.map((provider) => (
                          <label key={provider} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={providerFilters.includes(provider)}
                              onChange={() => toggleFilter('provider', provider)}
                              className="w-4 h-4 text-[#1e7145] border-gray-300 rounded focus:ring-[#1e7145]"
                            />
                            <span className="text-sm text-black">{provider}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {providerFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {providerFilters.map((filter) => (
                          <span
                            key={filter}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1e7145] text-xs rounded border-0"
                            style={{ color: 'white' }}
                          >
                            <span style={{ color: 'white' }}>{filter}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('provider', filter)
                              }}
                              className="hover:text-gray-200 focus:outline-none font-bold"
                              style={{ color: 'white' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-dark relative">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterDropdown(openFilterDropdown === 'date' ? null : 'date')
                        }}
                        className="text-gray-600 hover:text-gray-800 focus:outline-none"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${openFilterDropdown === 'date' ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {openFilterDropdown === 'date' && (
                      <div className="filter-dropdown-container absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto min-w-[200px]">
                        {uniqueDateMonths.map((yearMonth) => {
                          if (!yearMonth) return null
                          const [year, month] = yearMonth.split('-')
                          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
                          const displayText = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          return (
                            <label key={yearMonth} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dateFilters.includes(yearMonth)}
                                onChange={() => toggleFilter('date', yearMonth)}
                                className="w-4 h-4 text-[#1e7145] border-gray-300 rounded focus:ring-[#1e7145]"
                              />
                              <span className="text-sm text-black">{displayText}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {dateFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dateFilters.map((filter) => {
                          const [year, month] = filter.split('-')
                          const date = new Date(parseInt(year), parseInt(month) - 1, 1)
                          const displayText = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          return (
                            <span
                              key={filter}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[#1e7145] text-xs rounded border-0"
                              style={{ color: 'white' }}
                            >
                              <span style={{ color: 'white' }}>{displayText}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeFilter('date', filter)
                                }}
                                className="hover:text-gray-200 focus:outline-none font-bold"
                                style={{ color: 'white' }}
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-dark">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-dark relative">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')
                        }}
                        className="text-gray-600 hover:text-gray-800 focus:outline-none"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${openFilterDropdown === 'status' ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {openFilterDropdown === 'status' && (
                      <div className="filter-dropdown-container absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto min-w-[200px]">
                        {uniqueStatuses.map((status) => (
                          <label key={status} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={statusFilters.includes(status)}
                              onChange={() => toggleFilter('status', status)}
                              className="w-4 h-4 text-[#1e7145] border-gray-300 rounded focus:ring-[#1e7145]"
                            />
                            <span className="text-sm text-black">{status}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {statusFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {statusFilters.map((filter) => (
                          <span
                            key={filter}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#1e7145] text-xs rounded border-0"
                            style={{ color: 'white' }}
                          >
                            <span style={{ color: 'white' }}>{filter}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('status', filter)
                              }}
                              className="hover:text-gray-200 focus:outline-none font-bold"
                              style={{ color: 'white' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    {searchQuery ? `No claims found matching "${searchQuery}".` : 'No claims found. Click "Add Claim" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                    <td className="py-3 px-4 text-dark">
                      {claim.claim_number ? `CL-${claim.claim_number}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-dark">{claim.patient_name}</td>
                    <td className="py-3 px-4 text-dark">{claim.insurance_provider}</td>
                    <td className="py-3 px-4 text-dark">
                      {claim.date_of_service ? formatDate(claim.date_of_service) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-dark">
                      {claim.billed_amount ? `$${claim.billed_amount.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        claim.claim_status === 'Denied' ? 'bg-red-100 text-red-700' :
                        claim.claim_status === 'Pending' || claim.claim_status === 'Pending Resubmission' ? 'bg-yellow-100 text-yellow-700' :
                        claim.claim_status === 'Complete' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {claim.claim_status || 'No Status'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <GeistButton
                        variant="primary"
                        onClick={() => handleView(claim)}
                        className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                      >
                        View
                      </GeistButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <ClaimList
          key={claimsKey}
          claims={filteredClaims}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      )}
    </div>
  )
}

