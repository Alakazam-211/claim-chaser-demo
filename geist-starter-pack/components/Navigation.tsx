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
  logo: string;
  logoAlt?: string;
  links: NavLink[];
  cta?: {
    href: string;
    label: string;
  };
  variant?: 'light' | 'dark';
}

/**
 * Navigation Component
 * 
 * Minimalist navigation component inspired by Vercel's Geist design system.
 * Features clean borders, smooth animations, and mobile-responsive menu.
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
 * />
 * ```
 */
export default function Navigation({
  logo,
  logoAlt = 'Logo',
  links,
  cta,
  variant = 'light',
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

  const navClasses = variant === 'dark' 
    ? 'geist-nav geist-nav-dark' 
    : 'geist-nav';
  const scrolledClass = scrolled ? 'geist-nav-scrolled' : '';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`${navClasses} ${scrolledClass} fixed top-0 left-0 right-0 z-50`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center min-h-[44px] min-w-[44px]">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="h-8 w-auto"
            >
              <Image
                src={logo}
                alt={logoAlt}
                width={120}
                height={32}
                className="h-full w-auto object-contain"
                priority
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                    active
                      ? variant === 'dark'
                        ? 'text-white bg-white/10'
                        : 'text-black bg-gray-100'
                      : variant === 'dark'
                      ? 'text-gray-300 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            
            {/* CTA Button */}
            {cta && (
              <Link href={cta.href} className="ml-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`geist-button ${
                    variant === 'dark'
                      ? 'geist-button-primary'
                      : 'geist-button-primary'
                  }`}
                >
                  {cta.label}
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              variant === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
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
              className="md:hidden py-4 space-y-1 overflow-hidden border-t border-gray-200 dark:border-gray-800"
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
                          ? variant === 'dark'
                            ? 'text-white bg-white/10'
                            : 'text-black bg-gray-100'
                          : variant === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-white/5'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              
              {cta && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Link href={cta.href} onClick={() => setIsOpen(false)} className="block">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className={`geist-button w-full ${
                        variant === 'dark'
                          ? 'geist-button-primary'
                          : 'geist-button-primary'
                      }`}
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
    </motion.nav>
  );
}
