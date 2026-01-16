'use client'

import GeistButton from './GeistButton'

interface Provider {
  id: string
  name: string
  claims_phone_number: string
  created_at: string
  updated_at: string
}

interface ProviderListProps {
  providers: Provider[]
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
}

export default function ProviderList({ providers, onEdit, onDelete }: ProviderListProps) {
  if (providers.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No providers found. Click "Add Provider" to create one.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-dark">Name</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Claims Phone</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{provider.name}</td>
              <td className="py-3 px-4 text-dark">
                <a 
                  href={`tel:${provider.claims_phone_number}`}
                  className="!text-dark hover:underline"
                  style={{ color: '#000000' }}
                >
                  {provider.claims_phone_number}
                </a>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <GeistButton
                    variant="primary"
                    onClick={() => onEdit(provider)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Edit
                  </GeistButton>
                  <GeistButton
                    variant="primary"
                    onClick={() => onDelete(provider.id)}
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


