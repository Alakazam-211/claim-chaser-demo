# Geist Design - Usage Examples

Complete examples showing how to use all components and styles.

## Basic Setup

### 1. Import Styles

```tsx
// app/globals.css or your main CSS file
@import './styles/geist.css';
```

### 2. Setup Layout

```tsx
// app/layout.tsx
import Navigation from '@/components/Navigation';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navigation
          logo="/logo.svg"
          links={[
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' }
          ]}
          cta={{ href: '/signup', label: 'Get Started' }}
        />
        <main className="pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
```

## Component Examples

### GeistCard

```tsx
import GeistCard from '@/components/GeistCard';

export default function Page() {
  return (
    <div className="container mx-auto p-8">
      {/* Default variant with medium material */}
      <GeistCard material="medium" className="mb-8 p-8">
        <h2 className="text-heading-24 mb-4">Card Title</h2>
        <p className="text-copy-14 text-label-13">This is a default Geist card with clean borders.</p>
      </GeistCard>
      
      {/* Using material-base */}
      <GeistCard material="base" className="mb-8 p-8">
        <h2 className="text-heading-20 mb-4">Base Material</h2>
        <p className="text-copy-14">Everyday use card with 6px radius.</p>
      </GeistCard>
      
      {/* Using material-large */}
      <GeistCard material="large" className="mb-8 p-8">
        <h2 className="text-heading-20 mb-4">Large Material</h2>
        <p className="text-copy-14">Further raised card with 12px radius.</p>
      </GeistCard>
      
      {/* Dark variant */}
      <GeistCard variant="dark" material="medium" className="mb-8 p-8">
        <h2 className="text-heading-24 mb-4">Dark Card</h2>
        <p className="text-copy-14">This is a dark Geist card.</p>
      </GeistCard>
      
      {/* Subtle variant */}
      <GeistCard variant="subtle" material="small" className="mb-8 p-8">
        <h2 className="text-heading-20 mb-4">Subtle Card</h2>
        <p className="text-copy-14">This card has a subtle background.</p>
      </GeistCard>
      
      {/* Without hover effect */}
      <GeistCard hover={false} material="medium" className="p-8">
        <h2 className="text-heading-20 mb-4">Static Card</h2>
        <p className="text-copy-14">This card doesn't have hover effects.</p>
      </GeistCard>
    </div>
  );
}
```

### GeistButton

```tsx
import GeistButton from '@/components/GeistButton';

export default function Page() {
  return (
    <div className="container mx-auto p-8 space-y-4">
      {/* Primary variant (default) */}
      <GeistButton variant="primary">
        Primary Button
      </GeistButton>
      
      {/* Secondary variant */}
      <GeistButton variant="secondary">
        Secondary Button
      </GeistButton>
      
      {/* Outline variant */}
      <GeistButton variant="outline">
        Outline Button
      </GeistButton>
      
      {/* Ghost variant */}
      <GeistButton variant="ghost">
        Ghost Button
      </GeistButton>
      
      {/* Blue variant */}
      <GeistButton variant="blue">
        Blue Button
      </GeistButton>
      
      {/* As a link */}
      <GeistButton variant="primary" href="/page">
        Link Button
      </GeistButton>
      
      {/* With onClick */}
      <GeistButton variant="primary" onClick={() => alert('Clicked!')}>
        Click Me
      </GeistButton>
    </div>
  );
}
```

### Geist Input Fields

```tsx
export default function ContactForm() {
  return (
    <form className="space-y-4 max-w-md">
      <div>
        <label className="block mb-2 font-medium text-sm">Name</label>
        <input
          type="text"
          className="geist-input w-full"
          placeholder="Enter your name"
        />
      </div>
      
      <div>
        <label className="block mb-2 font-medium text-sm">Email</label>
        <input
          type="email"
          className="geist-input w-full"
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <label className="block mb-2 font-medium text-sm">Message</label>
        <textarea
          className="geist-input w-full resize-none"
          rows={5}
          placeholder="Enter your message"
        />
      </div>
      
      <GeistButton variant="primary" type="submit">
        Submit
      </GeistButton>
    </form>
  );
}
```

### Complete Page Example

```tsx
import GeistCard from '@/components/GeistCard';
import GeistButton from '@/components/GeistButton';
import Navigation from '@/components/Navigation';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation
        logo="/logo.svg"
        links={[
          { href: '/', label: 'Home' },
          { href: '/features', label: 'Features' },
          { href: '/pricing', label: 'Pricing' }
        ]}
        cta={{ href: '/signup', label: 'Get Started' }}
      />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-6xl font-bold mb-6">
            Build with <span className="geist-text-gradient-blue">Geist</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Minimalist, high-contrast design system for modern web applications
          </p>
          <div className="flex gap-4 justify-center">
            <GeistButton variant="primary" href="/signup">
              Get Started
            </GeistButton>
            <GeistButton variant="outline" href="/docs">
              Documentation
            </GeistButton>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <GeistCard className="p-8">
              <h3 className="text-xl font-bold mb-3">Minimalist</h3>
              <p className="text-gray-600">
                Clean, uncluttered interfaces that focus on content
              </p>
            </GeistCard>
            
            <GeistCard className="p-8">
              <h3 className="text-xl font-bold mb-3">High Contrast</h3>
              <p className="text-gray-600">
                Black and white design with subtle grays for clarity
              </p>
            </GeistCard>
            
            <GeistCard className="p-8">
              <h3 className="text-xl font-bold mb-3">Fast</h3>
              <p className="text-gray-600">
                Optimized CSS and animations for performance
              </p>
            </GeistCard>
          </div>
        </div>
      </section>
    </div>
  );
}
```

## Customization Examples

### Custom Colors

```css
/* Override CSS variables */
:root {
  --geist-black: #1a1a1a;
  --geist-blue: #0066ff;
  --geist-gray-100: #f0f0f0;
}
```

### Custom Shadows

```css
.geist-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.geist-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
```

### Custom Animations

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="geist-card p-8"
>
  Content
</motion.div>
```

### Typography Examples

```tsx
{/* Headings */}
<h1 className="text-heading-72">Marketing Hero</h1>
<h2 className="text-heading-32">
  Subheading <strong>with Strong</strong>
</h2>

{/* Labels */}
<p className="text-label-16">
  Label 16 <strong>with Strong</strong>
</p>
<p className="text-label-14-mono">Mono Label</p>

{/* Copy */}
<p className="text-copy-16">
  Copy 16 <strong>with Strong</strong>
</p>
<p className="text-copy-13-mono">Inline code mention</p>

{/* Gradient Text */}
<h1 className="geist-text-gradient-blue text-heading-48">
  Gradient Text
</h1>
```

### Material Classes

```tsx
{/* Surface materials */}
<div className="material-base p-8">Base material (6px radius)</div>
<div className="material-small p-8">Small material (6px radius)</div>
<div className="material-medium p-8">Medium material (12px radius)</div>
<div className="material-large p-8">Large material (12px radius)</div>

{/* Floating materials */}
<div className="material-tooltip p-4">Tooltip (6px radius)</div>
<div className="material-menu p-4">Menu (12px radius)</div>
<div className="material-modal p-8">Modal (12px radius)</div>
<div className="material-fullscreen p-8">Fullscreen (16px radius)</div>
```

## Best Practices

1. **Use Geist Typography**: Use the official typography classes (`text-heading-*`, `text-label-*`, `text-copy-*`)
2. **Use Materials System**: Apply appropriate material classes for elevation (`material-base`, `material-medium`, etc.)
3. **Use Strong Tags**: For emphasis, use `<strong>` tags within typography classes
4. **Consistent spacing**: Stick to the spacing scale (4px increments)
5. **Maintain contrast**: Ensure text is readable (especially in dark mode)
6. **Test on mobile**: All components are mobile-optimized
7. **Use semantic HTML**: Maintain accessibility
8. **Follow color system**: Use the 10-color scale (Colors 1-10)
9. **Keep it minimal**: Geist design emphasizes simplicity
10. **Reference official docs**: Check [vercel.com/geist](https://vercel.com/geist) for latest updates

## Accessibility

- All interactive elements have minimum 44x44px touch targets
- Proper ARIA labels on navigation
- Keyboard navigation support
- Focus states on all inputs and buttons
- Screen reader friendly
- High contrast ratios for text

## Dark Mode

Dark mode is automatically enabled based on system preferences. To test:

1. **macOS**: System Preferences → General → Appearance
2. **Windows**: Settings → Personalization → Colors
3. **Browser DevTools**: Toggle prefers-color-scheme in rendering tab

Or force dark mode:

```tsx
<html className="dark">
  {/* Dark mode styles */}
</html>
```
