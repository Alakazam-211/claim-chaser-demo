import { ReactNode, ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

interface GeistButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'blue' | 'glass';
  className?: string;
}

/**
 * GeistButton Component
 * 
 * Button component with minimalist styling inspired by Vercel's Geist design system.
 * Features high contrast, clean borders, and smooth transitions.
 * 
 * @example
 * ```tsx
 * // As a button
 * <GeistButton variant="primary" onClick={handleClick}>
 *   Click Me
 * </GeistButton>
 * 
 * // As a link
 * <GeistButton variant="primary" href="/page">
 *   Go to Page
 * </GeistButton>
 * ```
 */
export default function GeistButton({
  children,
  href,
  variant = 'primary',
  className = '',
  ...props
}: GeistButtonProps) {
  const baseClasses = 'geist-button';
  
  const variantClasses = {
    primary: 'geist-button-primary',
    secondary: 'geist-button-secondary',
    outline: 'geist-button-outline',
    ghost: 'geist-button-ghost',
    blue: 'geist-button-blue',
    glass: 'geist-button-secondary', // Map glass to secondary for compatibility
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

