'use client'

interface Demo {
  id: string
  name: string
  phone: string
  email: string
  created_at: string
  updated_at: string
}

interface DemoListProps {
  demos: Demo[]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DemoList({ demos }: DemoListProps) {
  if (demos.length === 0) {
    return (
      <div className="p-8 text-center text-dark/70 bg-white rounded-lg border border-gray-200">
        No demo records found.
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
            <th className="text-left py-3 px-4 font-semibold text-dark">Phone</th>
            <th className="text-left py-3 px-4 font-semibold text-dark">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {demos.map((demo) => (
            <tr key={demo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-dark font-medium">{demo.name}</td>
              <td className="py-3 px-4 text-dark">
                <a 
                  href={`mailto:${demo.email}`}
                  className="text-[#1e7145] hover:underline"
                >
                  {demo.email}
                </a>
              </td>
              <td className="py-3 px-4 text-dark">
                <a 
                  href={`tel:${demo.phone}`}
                  className="text-[#1e7145] hover:underline"
                >
                  {demo.phone}
                </a>
              </td>
              <td className="py-3 px-4 text-dark text-sm">{formatDate(demo.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

