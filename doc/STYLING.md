# Styling Guide

## 🎨 Design System

### Color Palette

The project uses a premium navy and gold color system with semantic CSS custom properties.

#### Core Colors
```css
:root {
  /* Primary Blue - Main CTA and interactive elements */
  --wc-primary: #00216e;                    /* Deep Space Blue */
  --wc-primary-container: #0033a0;          /* Darker Blue (hover) */
  --wc-on-primary: #ffffff;                 /* Text on primary */

  /* Secondary Gold - Accents and highlights */
  --wc-secondary: #6a4700;                  /* Princeton Orange */
  --wc-secondary-container: #ffd24a;        /* Amber Flame (badges) */
  --wc-on-secondary: #ffffff;               /* Text on secondary */

  /* Surface Colors - Layering and backgrounds */
  --wc-surface-lowest: #ffffff;             /* Pure white */
  --wc-surface-low: #f0f3ff;                /* Light blue-tint */
  --wc-surface: #f9f9ff;                    /* Subtle blue tint */
  --wc-surface-container: #e7eeff;          /* Medium container */
  --wc-surface-container-high: #dee8ff;     /* High contrast container */
  --wc-surface-variant: #d8e3fb;            /* Variant surface */

  /* Text Colors */
  --wc-on-bg: #081735;                      /* Main text */
  --wc-on-surface: #0b1d46;                 /* On surface text */
  --wc-on-surface-variant: #2b3d67;         /* Secondary text */

  /* Borders and Outlines */
  --wc-outline: #747684;                    /* Standard outline */
  --wc-outline-variant: #c4c5d5;            /* Light outline */

  /* Error States */
  --wc-error: #ba1a1a;                      /* Error red */
  --wc-error-container: #ffdad6;            /* Error background */

  /* Inverse (dark mode ready) */
  --wc-inverse-surface: #263143;
  --wc-inverse-on-surface: #ecf1ff;
  --wc-inverse-primary: #b6c4ff;
}
```

#### Usage in Components
```tsx
// ✅ Use CSS variables (recommended)
<div className="text-[var(--wc-primary)] bg-[var(--wc-surface-lowest)]">
  Primary text on white background
</div>

// Or use shorthand Tailwind aliases (see below)
<div className="text-primary bg-white">
  Same result with cleaner class
</div>
```

---

## 🎨 Tailwind CSS Configuration

### Custom Utilities
```css
@layer components {
  /* Shadows */
  .shadow-card { box-shadow: 0 8px 24px rgba(2, 33, 110, 0.06); }
  .shadow-card-hover { box-shadow: 0 12px 40px rgba(2, 33, 110, 0.08); }
  .shadow-glow { box-shadow: 0 10px 30px rgba(33, 158, 188, 0.12); }
  .shadow-inner-light { box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03); }

  /* Typography */
  .text-body-sm { @apply text-sm; line-height: 1.4; }
  .text-body-md { @apply text-base; line-height: 1.6; }
  .text-body-lg { @apply text-lg; line-height: 1.6; }

  .text-label-sm { @apply text-xs font-bold uppercase; letter-spacing: 0.06em; }
  .text-label-md { @apply text-sm font-bold uppercase; }

  .text-title-lg { @apply text-lg font-bold; }
  .text-headline-lg { @apply text-2xl font-extrabold uppercase; }

  /* Text Colors */
  .text-on-surface { color: var(--wc-on-surface); }
  .text-on-surface-variant { color: var(--wc-on-surface-variant); }

  /* Cards */
  .wc-card {
    @apply rounded-xl border bg-white shadow-card;
    border-color: var(--wc-outline-variant);
  }

  /* Forms */
  .wc-input {
    @apply w-full rounded-lg px-4 py-3 shadow-sm;
    background-color: var(--wc-surface-lowest);
    border-color: var(--wc-outline-variant);
    color: var(--wc-on-surface);
  }

  .wc-input:focus {
    outline: none;
    border-color: var(--wc-primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--wc-primary) 8%, transparent);
  }

  /* Buttons */
  .wc-primary-btn {
    @apply inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold;
    background-color: var(--wc-primary);
    color: white;
  }

  .wc-primary-btn:hover {
    background-color: var(--wc-primary-container);
  }

  .wc-secondary-btn {
    @apply inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 font-bold;
    border-color: var(--wc-primary);
    color: var(--wc-primary);
  }

  .wc-secondary-btn:hover {
    background-color: color-mix(in srgb, var(--wc-primary) 5%, transparent);
  }

  /* Cards with glass effect */
  .wc-glass-card {
    @apply rounded-2xl backdrop-blur-xl shadow-xl;
    border-color: var(--wc-outline-variant);
    background-color: color-mix(in srgb, var(--wc-surface-lowest) 70%, transparent);
  }

  /* Section labels/badges */
  .wc-section-label {
    @apply inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--wc-primary) 10%, white),
      color-mix(in srgb, var(--wc-secondary-container) 24%, white)
    );
    border: 1px solid color-mix(in srgb, var(--wc-primary) 14%, white);
    color: var(--wc-primary);
  }

  /* Container utilities */
  .homepage-wide-container {
    width: min(100% - 32px, 1440px);
    margin-inline: auto;
  }

  @media (min-width: 768px) {
    .homepage-wide-container {
      width: min(100% - 48px, 1440px);
    }
  }
}
```

### Color Aliases (in tailwind.config.cjs)
For cleaner JSX, define color aliases:

```js
colors: {
  primary: 'var(--wc-primary)',
  'primary-container': 'var(--wc-primary-container)',
  secondary: 'var(--wc-secondary)',
  'secondary-container': 'var(--wc-secondary-container)',
  surface: 'var(--wc-surface)',
  'surface-low': 'var(--wc-surface-low)',
  background: 'var(--wc-bg)',
  // ... more colors
}
```

---

## 📐 Responsive Breakpoints

The project uses Tailwind's standard breakpoints:

```
sm  640px   - Small phones (landscape)
md  768px   - Tablets and larger phones
lg  1024px  - Desktops
xl  1280px  - Large desktops
2xl 1536px  - Ultra-wide displays
```

### Mobile-First Approach
Always start with mobile styles, then add breakpoint prefixes:

```tsx
// ✅ Mobile first (good)
<div className="text-sm md:text-base lg:text-lg">
  Responsive text size
</div>

// ❌ Desktop first (avoid)
<div className="lg:text-lg md:text-base text-sm">
  Bad order - confusing to read
</div>
```

### Common Responsive Patterns

**Grid Layout**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 col mobile, 2 tablet, 3 desktop */}
</div>
```

**Padding/Margin**
```tsx
<div className="px-4 sm:px-6 md:px-8 gap-3 sm:gap-4 lg:gap-6">
  {/* Scales spacing with screen size */}
</div>
```

**Typography**
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  {/* Grows smoothly from mobile to desktop */}
</h1>
```

**Display Toggle**
```tsx
<div className="hidden md:block">
  {/* Hidden on mobile, visible on tablets+ */}
</div>

<div className="md:hidden">
  {/* Visible on mobile, hidden on tablets+ */}
</div>
```

---

## 🎯 Spacing System

Use consistent spacing scale:

```
0    = 0px
0.5  = 2px    (px-0.5)
1    = 4px    (px-1)
2    = 8px    (px-2)
3    = 12px   (p-3)
4    = 16px   (p-4)
6    = 24px   (p-6)
8    = 32px   (p-8)
10   = 40px   (p-10)
12   = 48px   (p-12)
16   = 64px   (p-16)
20   = 80px   (p-20)
```

### Usage
```tsx
<div className="p-6">              {/* 24px padding */}
  <h2 className="mb-4">Title</h2>  {/* 16px margin bottom */}
  <p className="mt-3">Text</p>      {/* 12px margin top */}
</div>
```

---

## 🔤 Typography System

### Font Stack
```css
font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
```

Manrope is a modern geometric sans-serif - clean, premium, and legible at all sizes.

### Size Scale

```
xs  = 12px  (0.75rem)  - Labels, hints
sm  = 14px  (0.875rem) - Captions, small text
base = 16px (1rem)     - Body text, default
lg  = 18px  (1.125rem) - Section text
xl  = 20px  (1.25rem)  - Headings
2xl = 24px  (1.5rem)   - Large headings
3xl = 30px  (1.875rem) - Page titles
4xl = 36px  (2.25rem)  - Hero headlines
```

### Weight Scale
```
400 = normal    - Body text (default)
600 = semibold  - Emphasis
700 = bold      - Headings, buttons
800 = extrabold - Hero headlines
```

### Usage
```tsx
// Body text
<p className="text-base text-on-surface leading-7">Normal paragraph</p>

// Heading
<h2 className="text-2xl font-bold text-on-surface">Section Title</h2>

// Label/Badge
<span className="text-xs font-bold uppercase">LABEL</span>

// Hero
<h1 className="text-[clamp(2rem,11vw,3.6rem)] font-extrabold">
  Large responsive headline
</h1>
```

### Line Height
```
leading-none   = 1      (tight)
leading-tight  = 1.25   
leading-snug   = 1.375  
leading-normal = 1.5    (default)
leading-relaxed = 1.625
leading-loose  = 2      (spacious)
```

---

## 🎨 Component Styling Examples

### Button
```tsx
<button className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-container">
  Click Me
</button>
```

### Card
```tsx
<div className="wc-card p-6">
  <h3 className="text-title-lg text-on-surface">Card Title</h3>
  <p className="text-body-md text-on-surface-variant">Card content</p>
</div>
```

### Form Input
```tsx
<input 
  className="wc-input" 
  placeholder="Type here..."
  type="text"
/>
```

### Hero Section
```tsx
<section className="bg-gradient-to-r from-primary/5 via-white to-secondary-container/10 py-20">
  <div className="homepage-wide-container">
    <h1 className="text-[clamp(2rem,5vw,3.6rem)] font-extrabold text-on-surface leading-tight max-w-2xl">
      Eye-catching headline
    </h1>
    <p className="mt-6 text-lg text-on-surface-variant max-w-xl">
      Supporting description
    </p>
  </div>
</section>
```

---

## 📱 Mobile Hero Optimization

The hero section uses mobile-first responsive design:

```tsx
<div className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-10 lg:py-20">
  {/* Content stacks on mobile, side-by-side on lg+ */}
  <div className="min-w-0 text-center lg:text-left">
    <h1 className="text-[clamp(2rem,11vw,3.6rem)] font-extrabold leading-[1.05] sm:text-[clamp(2.2rem,4.2vw,3.6rem)] sm:leading-[0.98]">
      Responsive headline
    </h1>
  </div>
</div>
```

**Key Mobile Patterns:**
- `px-4 sm:px-6` - Padding scales with screen
- `text-center lg:text-left` - Alignment changes
- `w-full sm:w-auto` - Buttons full-width on mobile
- `grid-cols-1 lg:grid-cols-2` - Stacking to side-by-side
- `clamp()` - Fluid typography scaling

---

## 🌓 Dark Mode (Optional)

If dark mode support is needed:

```tsx
// In component
<div className="bg-white dark:bg-gray-900">
  Content
</div>

// Define dark mode colors in tailwind.config.cjs
dark: {
  colors: {
    primary: '#...',
    // override colors for dark mode
  }
}
```

---

## 🎬 Animation Classes

Framer Motion is used for complex animations. CSS-based animations:

```tsx
// Fade in on scroll
<motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
  Content
</motion.div>

// Hover effect
<motion.button whileHover={{ scale: 1.05 }}>
  Hover me
</motion.button>

// CSS transitions (simpler)
<div className="transition hover:shadow-lg">
  Content
</div>
```

---

## ✨ Premium Touches

### Subtle Gradients
```tsx
<div className="bg-gradient-to-r from-primary/10 to-secondary-container/5">
  Subtle gradient background
</div>
```

### Glass Effect
```tsx
<div className="wc-glass-card">
  Glass morphism card
</div>
```

### Shadow Hierarchy
```tsx
<div className="shadow-card hover:shadow-card-hover transition">
  Elevated with interactive shadow
</div>
```

### Rounded Corners
```
rounded-lg   = 8px    (default card)
rounded-xl   = 12px   (buttons, inputs)
rounded-2xl  = 16px   (featured card)
rounded-3xl  = 24px   (hero card)
rounded-full = 9999px (pills, badges)
```

---

## 🔍 Performance Tips

1. **Avoid inline styles** - Use Tailwind classes
2. **Use `clamp()`** - For fluid typography instead of multiple breakpoints
3. **Lazy load images** - Use next/image
4. **Minimize custom CSS** - Stick to Tailwind utilities
5. **Bundle analysis** - Check unused CSS

---

See [COMPONENTS.md](COMPONENTS.md) for component-specific styling and [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for design system context.
