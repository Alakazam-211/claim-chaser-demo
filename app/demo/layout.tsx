import type { Metadata } from 'next'
import '../globals.css'
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
  return (
    <>
      <DemoBodyStyle />
      {children}
    </>
  )
}

