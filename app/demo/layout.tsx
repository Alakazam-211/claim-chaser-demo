import type { Metadata } from 'next'
import '../globals.css'
import Navigation from '@/components/Navigation'
import DemoBodyStyle from './DemoBodyStyle'

export const metadata: Metadata = {
  title: 'Claim Chaser Demo',
  description: 'Experience the AI Claim Chaser demo',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simplified navigation for demo - just logo, no links
  const navLinks: { href: string; label: string }[] = []

  return (
    <>
      <DemoBodyStyle />
      <Navigation 
        logo="/claim-chaser-green.png"
        logoAlt="Claim Chaser"
        links={navLinks}
        primaryColor="#1e7145"
      />
      <main className="container mx-auto px-4 pt-20 pb-8" data-demo="true">
        {children}
      </main>
    </>
  )
}

