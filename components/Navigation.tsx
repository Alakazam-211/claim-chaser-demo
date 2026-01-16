'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface NavLink {
  href: string;
  label: string;
}

interface NavigationProps {
  logo?: string;
  logoAlt?: string;
  links: NavLink[];
  cta?: {
    href: string;
    label: string;
  };
  variant?: 'light' | 'dark';
  primaryColor?: string;
}

/**
 * Navigation Component
 * 
 * Clean navigation component inspired by LZTEK.io design.
 * Features horizontal layout, clean styling, and mobile-responsive menu.
 * 
 * @example
 * ```tsx
 * <Navigation
 *   logo="/logo.svg"
 *   logoAlt="Company Logo"
 *   links={[
 *     { href: '/', label: 'Home' },
 *     { href: '/about', label: 'About' },
 *     { href: '/contact', label: 'Contact' }
 *   ]}
 *   cta={{ href: '/signup', label: 'Sign Up' }}
 *   variant="light"
 *   primaryColor="#1e7145"
 * />
 * ```
 */
export default function Navigation({
  logo,
  logoAlt = 'Claim Chaser',
  links,
  cta,
  variant = 'light',
  primaryColor = '#1e7145',
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Main Navigation Links */}
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center rounded-md ${
                      active
                        ? 'text-black bg-gray-100'
                        : 'text-gray-700 hover:text-black hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            
            {/* CTA Button */}
            {cta && (
              <Link href={cta.href} className="ml-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-[#1e7145] text-white text-sm font-medium rounded-md transition-colors min-h-[44px] flex items-center hover:bg-[#165832]"
                >
                  {cta.label}
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-50"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <motion.svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </motion.svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden py-4 space-y-1 overflow-hidden border-t border-gray-200"
            >
              {links.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 rounded-md text-base font-medium transition-colors min-h-[44px] flex items-center ${
                        active
                          ? 'text-black bg-gray-100'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              
              {cta && (
                <div className="pt-4 border-t border-gray-200">
                  <Link href={cta.href} onClick={() => setIsOpen(false)} className="block">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-2 bg-[#1e7145] text-white text-base font-medium rounded-md transition-colors min-h-[44px] flex items-center justify-center hover:bg-[#165832]"
                    >
                      {cta.label}
                    </motion.button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
