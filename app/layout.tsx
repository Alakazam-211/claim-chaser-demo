import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'AI Claim Chaser Database',
  description: 'Manage insurance claims, offices, and doctors',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/claims', label: 'Claims' },
    { href: '/offices', label: 'Offices' },
    { href: '/doctors', label: 'Doctors' },
    { href: '/providers', label: 'Providers' },
    { href: '/users', label: 'Users' },
    { href: '/organizations', label: 'Organizations' },
    { href: '/uploads', label: 'Uploads' },
  ]

  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: '#1e7145' }}>
        <Navigation 
          logo="/claim-chaser-green.png"
          logoAlt="Claim Chaser"
          primaryColor="#1e7145"
        />
        <main className="container mx-auto px-4 pt-24 pb-24">
          {children}
        </main>
      </body>
    </html>
  )
}

