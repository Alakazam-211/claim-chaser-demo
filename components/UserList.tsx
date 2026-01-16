'use client'

import GeistButton from './GeistButton'

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

interface UserListProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (id: string) => void
}

export default function UserList({ users, onEdit, onDelete }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg">
        No users found. Click "Add User" to create one.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-dark">Name</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Email</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Organization</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{user.name}</td>
              <td className="py-3 px-4 text-dark">{user.email}</td>
              <td className="py-3 px-4 text-dark">{user.organization?.organization_name || 'No organization assigned'}</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <GeistButton
                    variant="primary"
                    onClick={() => onEdit(user)}
                    className="text-sm px-3 py-1 bg-[#1e7145] text-white border-none"
                  >
                    Edit
                  </GeistButton>
                  <GeistButton
                    variant="primary"
                    onClick={() => onDelete(user.id)}
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

