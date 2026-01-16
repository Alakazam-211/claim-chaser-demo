'use client'

import GeistButton from './GeistButton'

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

interface OfficeListProps {
  offices: Office[]
  onEdit: (office: Office) => void
  onDelete: (id: string) => void
}

export default function OfficeList({ offices, onEdit, onDelete }: OfficeListProps) {
  if (offices.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No offices found. Click "Add Office" to create one.
      </div>
    )
  }

  const formatAddress = (office: Office) => {
    const parts = [office.address]
    const cityStateZip = [office.city, office.state, office.zip_code]
      .filter(Boolean)
      .join(', ')
    if (cityStateZip) {
      parts.push(cityStateZip)
    }
    return parts.join(', ')
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-dark">Name</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Address</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Callback Number</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">EIN</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offices.map((office) => (
            <tr key={office.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{office.name}</td>
              <td className="py-3 px-4 text-dark">{formatAddress(office)}</td>
              <td className="py-3 px-4 text-dark">{office.callback_number || 'N/A'}</td>
              <td className="py-3 px-4 text-dark">{office.ein || 'N/A'}</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <GeistButton
                    variant="primary"
                    onClick={() => onEdit(office)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Edit
                  </GeistButton>
                  <GeistButton
                    variant="primary"
                    onClick={() => onDelete(office.id)}
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

