'use client'

import GeistButton from './GeistButton'

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

interface DoctorListProps {
  doctors: Doctor[]
  onEdit: (doctor: Doctor) => void
  onDelete: (id: string) => void
}

export default function DoctorList({ doctors, onEdit, onDelete }: DoctorListProps) {
  if (doctors.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No doctors found. Click "Add Doctor" to create one.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-dark">Name</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">NPI</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Office</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{doctor.name}</td>
              <td className="py-3 px-4 text-dark">{doctor.npi || 'N/A'}</td>
              <td className="py-3 px-4 text-dark">{doctor.office?.name || 'N/A'}</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <GeistButton
                    variant="primary"
                    onClick={() => onEdit(doctor)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Edit
                  </GeistButton>
                  <GeistButton
                    variant="primary"
                    onClick={() => onDelete(doctor.id)}
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

