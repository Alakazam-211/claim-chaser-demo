# Geist Design Starter Pack

A complete starter pack for implementing Vercel's official Geist design system in your Next.js projects. This pack includes reusable components, styles, animations, and design tokens based on the [official Geist design system](https://vercel.com/geist).

**Official Documentation**: [vercel.com/geist](https://vercel.com/geist)

## 📦 What's Included

- **Design Tokens** - Color palette, spacing, typography, shadows
- **Reusable Components** - GeistCard, GeistButton, Navigation
- **CSS Utilities** - Pre-built Geist classes and utilities
- **Motion Effects** - Framer Motion animations and transitions
- **Dark Mode Support** - Automatic dark mode with CSS variables
- **Documentation** - Complete usage guide and examples

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install framer-motion next react react-dom
# or
yarn add framer-motion next react react-dom
```

### 2. Copy Files

Copy the following folders/files to your project:

```
geist-starter-pack/
├── components/          → Copy to your components folder
├── styles/              → Copy to your styles folder
├── config/              → Copy to your config folder
└── docs/                → Reference documentation
```

### 3. Import Styles

Add to your `globals.css` or main CSS file:

```css
@import './styles/geist.css';
```

### 4. Use Components

```tsx
import GeistCard from '@/components/GeistCard';
import GeistButton from '@/components/GeistButton';
import Navigation from '@/components/Navigation';

export default function Page() {
  return (
    <div>
      <Navigation 
        logo="/logo.svg"
        links={[
          { href: '/', label: 'Home' },
          { href: '/about', label: 'About' }
        ]}
        cta={{ href: '/signup', label: 'Sign Up' }}
      />
      <GeistCard className="p-8">
        <h1>Hello Geist!</h1>
        <GeistButton variant="primary">Click Me</GeistButton>
      </GeistCard>
    </div>
  );
}
```

## 🎨 Design System

This starter pack implements the official Geist design system specifications:

### Color System (10-Color Scale)

Geist uses a systematic 10-color approach:

- **Backgrounds**: Background 1 (default) and Background 2 (secondary)
- **Component Backgrounds**: Colors 1-3 (default, hover, active)
- **Borders**: Colors 4-6 (default, hover, active)
- **High Contrast**: Colors 7-8 (background, hover)
- **Text/Icons**: Colors 9-10 (secondary, primary)
- **Automatic Dark Mode**: Respects system preferences

See [official color documentation](https://vercel.com/geist/colors) for details.

### Typography

Geist includes comprehensive typography classes:

- **Headings**: `text-heading-72` through `text-heading-14`
- **Buttons**: `text-button-16`, `text-button-14`, `text-button-12`
- **Labels**: `text-label-20` through `text-label-12` (with mono variants)
- **Copy**: `text-copy-24` through `text-copy-13` (with mono variants)
- **Fonts**: Geist Sans (primary) and Geist Mono (code)
- **Strong Modifier**: Use `<strong>` tags for emphasis

See [official typography documentation](https://vercel.com/geist/typography) for details.

### Materials

Geist provides material classes for surfaces and floating elements:

**Surface** (on page):
- `material-base` - Everyday use (6px radius)
- `material-small` - Slightly raised (6px radius)
- `material-medium` - Further raised (12px radius)
- `material-large` - Further raised (12px radius)

**Floating** (above page):
- `material-tooltip` - Lightest shadow (6px radius)
- `material-menu` - Lift from page (12px radius)
- `material-modal` - Further lift (12px radius)
- `material-fullscreen` - Biggest lift (16px radius)

See [official materials documentation](https://vercel.com/geist/materials) for details.

### Spacing

- **Base Unit**: 4px (0.25rem)
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px

## 📚 Components

### GeistCard

A minimalist card component using Geist Materials system.

```tsx
<GeistCard variant="default" material="medium" className="p-8">
  Content here
</GeistCard>
```

**Props:**
- `variant`: `'default' | 'dark' | 'subtle'` - Card style variant
- `material`: `'base' | 'small' | 'medium' | 'large'` - Material elevation (default: 'medium')
- `hover`: `boolean` - Enable/disable hover effects (default: true)
- `className`: Additional CSS classes

### GeistButton

Button component with high-contrast styling.

```tsx
<GeistButton variant="primary" href="/page">
  Button Text
</GeistButton>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'outline' | 'ghost' | 'blue'`
- `href`: Optional link URL
- `className`: Additional CSS classes

### Navigation

Complete navigation component with mobile menu.

```tsx
<Navigation 
  logo="/logo.svg"
  links={[
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' }
  ]}
  cta={{ href: '/signup', label: 'Sign Up' }}
  variant="light"
/>
```

**Props:**
- `logo`: Path to logo image
- `logoAlt`: Alt text for logo (default: 'Logo')
- `links`: Array of navigation links
- `cta`: Optional call-to-action button
- `variant`: `'light' | 'dark'` - Navigation theme

## 🎭 Motion Effects

All components use Framer Motion for smooth animations:

- **Hover Effects**: Subtle scale and translate transforms
- **Transitions**: Fast, smooth cubic-bezier easing
- **Mobile Menu**: Animated expand/collapse
- **Active States**: Smooth state transitions

## 🎨 Customization

### Adjusting Colors

Edit `styles/geist.css` CSS variables:

```css
:root {
  --geist-black: #000000;
  --geist-white: #ffffff;
  --geist-blue: #0070f3;
  /* ... customize your palette */
}
```

### Changing Colors Programmatically

Edit `config/colors.ts`:

```typescript
export const colors = {
  black: '#000000',
  blue: '#0070f3',
  // ... customize your palette
};
```

### Modifying Animations

Components use Framer Motion - adjust in component files:

```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  transition={{ duration: 0.2 }}
>
```

## 📱 Responsive Design

All components are mobile-first and include:

- Touch-friendly targets (44x44px minimum)
- Responsive typography
- Mobile menu with animations
- Optimized for all screen sizes

## 🌙 Dark Mode

Dark mode is automatically enabled based on system preferences. To force dark mode:

```css
@media (prefers-color-scheme: dark) {
  /* Styles automatically applied */
}
```

Or use a class-based approach:

```tsx
<html className="dark">
  {/* Dark mode styles */}
</html>
```

## 🛠️ Browser Support

- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Full support
- Mobile browsers: Optimized

## 📖 Examples

See `docs/examples.md` for complete usage examples.

## 🤝 Contributing

Feel free to customize and extend this starter pack for your needs!

## 📄 License

Free to use in your projects.

## 🙏 Credits

Based on [Vercel's official Geist Design System](https://vercel.com/geist).

- [Geist Introduction](https://vercel.com/geist/introduction)
- [Geist Colors](https://vercel.com/geist/colors)
- [Geist Typography](https://vercel.com/geist/typography)
- [Geist Materials](https://vercel.com/geist/materials)
- [Geist Icons](https://vercel.com/geist/icons)
