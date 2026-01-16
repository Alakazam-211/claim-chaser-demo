'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface NavigationProps {
  logo?: string;
  logoAlt?: string;
  primaryColor?: string;
}

/**
 * Navigation Component
 * 
 * Clean navigation component with centered logo.
 * 
 * @example
 * ```tsx
 * <Navigation
 *   logo="/logo.svg"
 *   logoAlt="Company Logo"
 *   primaryColor="#1e7145"
 * />
 * ```
 */
export default function Navigation({
  logo,
  logoAlt = 'Claim Chaser',
  primaryColor = '#1e7145',
}: NavigationProps) {

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          {/* Logo - Centered */}
          <Link href="/" className="flex items-center min-h-[44px] min-w-[44px] gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              {logo ? (
                <Image
                  src={logo}
                  alt={logoAlt}
                  width={3000}
                  height={971}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                  priority
                  quality={100}
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
                  {logoAlt}
                </span>
              )}
            </motion.div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
