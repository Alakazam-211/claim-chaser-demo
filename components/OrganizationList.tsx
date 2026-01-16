'use client'

import GeistButton from './GeistButton'

interface Organization {
  id: string
  organization_name: string
  voice_on: boolean
  created_at: string
  updated_at: string
}

interface OrganizationListProps {
  organizations: Organization[]
  onEdit: (organization: Organization) => void
  onDelete: (id: string) => void
}

export default function OrganizationList({ organizations, onEdit, onDelete }: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No organizations found. Click "Add Organization" to create one.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-dark">Organization Name</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Voice On</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((organization) => (
            <tr key={organization.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{organization.organization_name}</td>
              <td className="py-3 px-4 text-dark">
                <span className={organization.voice_on ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  {organization.voice_on ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <GeistButton
                    variant="primary"
                    onClick={() => onEdit(organization)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Edit
                  </GeistButton>
                  <GeistButton
                    variant="primary"
                    onClick={() => onDelete(organization.id)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Delete
                  </GeistButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

