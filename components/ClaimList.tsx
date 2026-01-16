'use client'

import GeistCard from './GeistCard'
import GeistButton from './GeistButton'

interface DenialReason {
  id: string
  claim_id: string
  denial_reason: string
  date_recorded: string
  status: 'Pending' | 'Resubmitted' | 'Accepted'
  date_reason_resubmitted?: string
  date_accepted?: string
}

interface Claim {
  id: string
  patient_name: string
  patient_id?: string
  date_of_birth?: string
  insurance_provider: string
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
  doctor_id?: string
  doctor?: {
    id: string
    name: string
    npi?: string
  }
  created_at: string
  updated_at: string
}

interface ClaimListProps {
  claims: Claim[]
  onEdit: (claim: Claim) => void
  onDelete: (id: string) => void
  onView?: (claim: Claim) => void
}

const formatCurrency = (amount?: number) => {
  if (!amount) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  // Parse date string as local date to avoid timezone conversion
  // If it's already in YYYY-MM-DD format, parse it directly
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  // Fallback for other formats
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Complete':
      return 'text-green-600 bg-green-50'
    case 'Denied':
      return 'text-red-600 bg-red-50'
    case 'Pending Resubmission':
      return 'text-orange-600 bg-orange-50'
    case 'Awaiting Acceptance':
      return 'text-yellow-600 bg-yellow-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const getDenialReasonStatusColor = (status: string) => {
  switch (status) {
    case 'Accepted':
      return 'text-green-600 bg-green-50 border border-green-200'
    case 'Resubmitted':
      return 'text-blue-600 bg-blue-50 border border-blue-200'
    case 'Pending':
      return 'text-orange-600 bg-orange-50 border border-orange-200'
    default:
      return 'text-gray-600 bg-gray-50 border border-gray-200'
  }
}

const isMissingDenialReasons = (claim: Claim) => {
  // Check count field and structured data
  const hasDenialReasons = (claim.denial_reasons_count && claim.denial_reasons_count > 0) ||
                           (claim.denial_reasons_data && claim.denial_reasons_data.length > 0)
  return claim.claim_status === 'Denied' && !hasDenialReasons
}

const renderClaimCard = (claim: Claim, onEdit: (claim: Claim) => void, onDelete: (id: string) => void, onView?: (claim: Claim) => void, highlightMissing?: boolean) => {
  const missingReasons = isMissingDenialReasons(claim)
  
  const handleCardClick = () => {
    if (onView) {
      onView(claim)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  
  return (
    <div 
      key={claim.id} 
      className={`p-6 bg-white rounded-lg border-0 border-none shadow-none ${highlightMissing || missingReasons ? 'ring-2 ring-orange-400 ring-opacity-50' : ''} ${onView ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
      onClick={onView ? handleCardClick : undefined}
      style={{ border: 'none', boxShadow: 'none' }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl font-semibold text-dark">{claim.patient_name}</h3>
            {claim.claim_status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.claim_status)}`}>
                {claim.claim_status}
              </span>
            )}
            {missingReasons && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                ⚠️ Missing Denial Reasons
              </span>
            )}
          </div>
          <div className="text-sm text-dark/70 space-y-1">
            <p>
              <span className="font-medium">Insurance:</span> {claim.insurance_provider}
            </p>
            {claim.claim_number && (
              <p>
                <span className="font-medium">Claim #:</span> {claim.claim_number}
              </p>
            )}
            {claim.patient_id && (
              <p>
                <span className="font-medium">Patient ID:</span> {claim.patient_id}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          {claim.billed_amount && (
            <p className="text-lg font-bold text-dark mb-1">
              {formatCurrency(claim.billed_amount)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        {claim.date_of_birth && (
          <div>
            <span className="text-dark/70">DOB:</span>
            <p className="text-dark font-medium">{formatDate(claim.date_of_birth)}</p>
          </div>
        )}
        {claim.date_of_service && (
          <div>
            <span className="text-dark/70">Service Date:</span>
            <p className="text-dark font-medium">{formatDate(claim.date_of_service)}</p>
          </div>
        )}
        {claim.doctor && (
          <div>
            <span className="text-dark/70">Doctor:</span>
            <p className="text-dark font-medium">{claim.doctor.name}</p>
          </div>
        )}
        {claim.length_of_service && (
          <div>
            <span className="text-dark/70">Length of Service:</span>
            <p className="text-dark font-medium">{claim.length_of_service}</p>
          </div>
        )}
      </div>

      {/* Display denial reasons */}
      {claim.denial_reasons_data && claim.denial_reasons_data.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-dark/70 mb-2">
            Denial Reasons ({claim.denial_reasons_data.length}):
          </p>
          <div className="space-y-2">
            {claim.denial_reasons_data.map((dr) => (
              <div key={dr.id} className="pl-3 border-l-2 border-gray-200 text-sm">
                <p className="text-dark">{dr.denial_reason}</p>
                <div className="flex gap-2 mt-1 text-xs text-dark/60">
                  <span className={`px-2 py-0.5 rounded ${getDenialReasonStatusColor(dr.status)}`}>
                    {dr.status}
                  </span>
                  {dr.date_reason_resubmitted && (
                    <span>Resubmitted: {formatDate(dr.date_reason_resubmitted)}</span>
                  )}
                  {dr.date_accepted && (
                    <span>Accepted: {formatDate(dr.date_accepted)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {missingReasons && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm font-medium text-orange-800">
            ⚠️ This denied claim is missing denial reasons. Call the insurance provider to obtain the denial reasons.
          </p>
        </div>
      )}

      {claim.next_steps && (
        <div className="mb-4 text-sm">
          <span className="font-medium text-dark/70">Next Steps:</span>
          <p className="text-dark">{claim.next_steps}</p>
        </div>
      )}

      <div className="flex space-x-2 pt-4 border-t border-gray-200" onClick={handleButtonClick}>
        {onView && (
          <GeistButton
            variant="primary"
            onClick={(e) => {
              e.stopPropagation()
              onView(claim)
            }}
            className="flex-1 text-sm bg-[#1e7145] text-white border-none"
          >
            View
          </GeistButton>
        )}
        <GeistButton
          variant="primary"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(claim)
          }}
          className="flex-1 text-sm bg-[#1e7145] text-white border-none"
        >
          Edit
        </GeistButton>
        <GeistButton
          variant="primary"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(claim.id)
          }}
          className="flex-1 text-sm bg-[#1e7145] text-white border-none"
        >
          Delete
        </GeistButton>
      </div>
    </div>
  )
}

export default function ClaimList({ claims, onEdit, onDelete, onView }: ClaimListProps) {
  if (claims.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No claims found. Click "Add Claim" to create one.
      </div>
    )
  }

  // Separate claims missing denial reasons
  const claimsMissingReasons = claims.filter(claim => isMissingDenialReasons(claim))
  const otherClaims = claims.filter(claim => !isMissingDenialReasons(claim))

  // Group claims by status
  const groupedClaims = otherClaims.reduce((acc, claim) => {
    const status = claim.claim_status || 'No Status'
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(claim)
    return acc
  }, {} as Record<string, Claim[]>)

  // Define status order for display
  const statusOrder = [
    'Complete',
    'Awaiting Acceptance',
    'Pending Resubmission',
    'Denied',
    'No Status'
  ]

  // Sort statuses: known statuses first (in order), then any others alphabetically
  const sortedStatuses = [
    ...statusOrder.filter(status => groupedClaims[status]),
    ...Object.keys(groupedClaims)
      .filter(status => !statusOrder.includes(status))
      .sort()
  ]

  return (
    <div className="space-y-6">
      {/* Show claims missing denial reasons at the top */}
      {claimsMissingReasons.length > 0 && (
        <div className="space-y-3">
          <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-orange-900">⚠️ Denied Claims Missing Reasons</h2>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-200 text-orange-800">
                  {claimsMissingReasons.length} {claimsMissingReasons.length === 1 ? 'claim' : 'claims'}
                </span>
              </div>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              These denied claims need denial reasons. Call the insurance provider to obtain this information.
            </p>
          </div>
          <div className="space-y-4">
            {claimsMissingReasons.map((claim) => renderClaimCard(claim, onEdit, onDelete, onView, true))}
          </div>
        </div>
      )}

      {/* Show other claims grouped by status */}
      {sortedStatuses.map((status) => {
        const statusClaims = groupedClaims[status]
        const count = statusClaims.length
        
        return (
          <div key={status} className="space-y-3">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-dark">{status}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {count} {count === 1 ? 'claim' : 'claims'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {statusClaims.map((claim) => renderClaimCard(claim, onEdit, onDelete, onView))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

