import { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'dark' | 'opaque';
}

/**
 * GlassCard Component
 * 
 * A versatile card component with glassmorphic styling.
 * 
 * @example
 * ```tsx
 * <GlassCard variant="light" className="p-8">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </GlassCard>
 * ```
 */
export default function GlassCard({
  children,
  className = '',
  variant = 'light',
  ...props
}: GlassCardProps) {
  let baseClasses: string;
  if (variant === 'opaque') {
    baseClasses = 'glass-card-opaque';
  } else if (variant === 'dark') {
    baseClasses = 'glass-card-dark';
  } else {
    baseClasses = 'glass-card';
  }
  
  return (
    <div className={`${baseClasses} rounded-3xl p-8 ${className}`} {...props}>
      {children}
    </div>
  );
}

