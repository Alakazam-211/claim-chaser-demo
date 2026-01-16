import { ReactNode } from 'react';

interface GeistCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'subtle' | 'opaque';
  material?: 'base' | 'small' | 'medium' | 'large';
  hover?: boolean;
}

/**
 * GeistCard Component
 * 
 * A minimalist card component inspired by Vercel's Geist design system.
 * Features clean borders, subtle shadows, and smooth transitions.
 * 
 * @example
 * ```tsx
 * <GeistCard variant="default" className="p-8">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </GeistCard>
 * ```
 */
export default function GeistCard({
  children,
  className = '',
  variant = 'default',
  material = 'medium',
  hover = true,
}: GeistCardProps) {
  const baseClasses = 'geist-card';
  
  const variantClasses = {
    default: '',
    dark: 'geist-card-dark',
    subtle: 'geist-card-subtle',
    opaque: 'geist-card-opaque',
  };
  
  const materialClasses = {
    base: 'material-base',
    small: 'material-small',
    medium: 'material-medium',
    large: 'material-large',
  };
  
  const hoverClass = hover ? '' : 'hover:transform-none hover:shadow-sm';
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${materialClasses[material]} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}

