import type { Metadata } from 'next'
import '../globals.css'
import DemoBodyStyle from './DemoBodyStyle'
import Link from 'next/link'
import Image from 'next/image'

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
      {/* Logo-only navigation for demo page */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent demo-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center min-h-[44px] min-w-[44px] gap-2 sm:gap-3">
              <Image
                src="/claim-chaser-green.png"
                alt="Claim Chaser"
                width={3000}
                height={971}
                className="h-8 sm:h-10 md:h-12 w-auto"
                priority
                quality={100}
                style={{ objectFit: 'contain' }}
              />
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </>
  )
}

