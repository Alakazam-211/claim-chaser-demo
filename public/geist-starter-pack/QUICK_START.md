# Quick Start Guide

Get up and running with Geist design in 5 minutes!

## Step 1: Copy Files

Copy these folders to your Next.js project:

```
geist-starter-pack/
├── components/     → Copy to your app/components/ or components/
├── styles/         → Copy to your app/ or public/styles/
└── config/         → Copy to your app/config/ or config/
```

## Step 2: Install Dependencies

```bash
npm install framer-motion
# or
yarn add framer-motion
```

## Step 3: Import Styles

Add to your `app/globals.css` or main CSS file:

```css
@import './styles/geist.css';
```

## Step 4: Use Components

```tsx
// app/page.tsx
import GeistCard from '@/components/GeistCard';
import GeistButton from '@/components/GeistButton';
import Navigation from '@/components/Navigation';

export default function Home() {
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
      
      <main className="pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <GeistCard className="p-8">
            <h1 className="text-4xl font-bold mb-4">Hello Geist!</h1>
            <p className="text-gray-600 mb-6">
              Build beautiful, minimalist interfaces with Geist design.
            </p>
            <GeistButton variant="primary">Get Started</GeistButton>
          </GeistCard>
        </div>
      </main>
    </div>
  );
}
```

## Step 5: Customize Colors

Edit `styles/geist.css`:

```css
:root {
  --geist-black: #your-color;
  --geist-blue: #your-accent-color;
}
```

That's it! You're ready to build beautiful minimalist interfaces.

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [examples.md](./docs/examples.md) for more usage examples
- Customize colors in `config/colors.ts`
