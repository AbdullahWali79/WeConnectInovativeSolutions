# File Structure & Organization

## 📂 Directory Map

### `/app` - Next.js App Router Pages
The Next.js 15 App Router implements file-based routing. Each folder represents a route.

```
app/
├── page.tsx               # Root landing page (/
├── layout.tsx             # Root layout wrapper
├── globals.css            # Global styles (color vars, utilities)
├── loading.tsx            # Loading skeleton for root

├── admin/                 # Admin dashboard (/admin)
│   ├── page.tsx          # Admin dashboard home
│   ├── layout.tsx        # Admin shell wrapper
│   ├── actions.ts        # Server actions for admin operations
│   ├── announcements/    # Manage announcements
│   ├── applications/     # Review student applications
│   ├── completions/      # Track student completions
│   ├── courses/          # Manage course content
│   ├── products/         # Manage products/certifications
│   ├── progress/         # View student progress
│   ├── promotional-popups/ # Manage pop-up campaigns
│   ├── students/         # Manage student accounts
│   ├── submissions/      # Review task submissions
│   ├── tasks/            # Create/manage assignments
│   ├── team-members/     # Manage mentors and staff
│   └── trainees/         # Track trainee cohorts

├── auth/
│   └── callback/         # OAuth callback handler

├── student/              # Student dashboard (/student)
│   ├── page.tsx         # Student home
│   ├── layout.tsx       # Student shell wrapper
│   ├── progress/        # View learning progress
│   └── tasks/           # View assigned tasks

├── apply/                # Application portal (/apply)
│   ├── page.tsx         # Apply form
│   └── loading.tsx

├── courses/              # Course browsing (/courses)
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx

├── login/                # Login page (/login)
│   ├── page.tsx
│   └── login-client.tsx # Client-side login form

├── news/                 # News section (/news)
│   ├── page.tsx
│   └── loading.tsx

├── team/                 # Team showcase (/team)
│   ├── page.tsx
│   └── loading.tsx

├── products/             # Products listing (/products)
│   ├── page.tsx
│   └── loading.tsx

├── trainees/             # Trainees view (/trainees)
│   ├── page.tsx
│   └── loading.tsx

├── completed-students/   # Graduates showcase (/completed-students)
│   ├── page.tsx
│   └── loading.tsx

├── contact/              # Contact page (/contact)
│   ├── page.tsx
│   └── loading.tsx

├── privacy-policy/       # Privacy policy (/privacy-policy)
│   └── page.tsx

└── terms/                # Terms of service (/terms)
    └── page.tsx
```

**Routing Pattern:**
- `page.tsx` = Route component
- `layout.tsx` = Shared wrapper for route and children
- `loading.tsx` = Streaming fallback
- `error.tsx` = Error boundary
- `actions.ts` = Server-side form actions

---

### `/components` - Reusable Components

```
components/
├── admin/
│   ├── admin-dashboard.tsx        # Main admin dashboard
│   ├── admin-shell.tsx            # Admin layout wrapper
│   ├── announcements-manager.tsx  # Create/edit announcements
│   ├── applications-manager.tsx   # Review and approve applications
│   ├── completion-manager.tsx     # Track completions
│   ├── courses-manager.tsx        # Manage courses
│   ├── products-manager.tsx       # Manage products
│   ├── progress-manager.tsx       # View progress charts
│   ├── promotional-popup-manager.tsx # Campaign manager
│   ├── students-manager.tsx       # Student account management
│   ├── submissions-review.tsx     # Score submissions
│   ├── tasks-manager.tsx          # Create assignments
│   ├── team-members-manager.tsx   # Manage team
│   └── trainees-manager.tsx       # Manage trainees

├── public/
│   ├── animations.tsx              # Reusable animations (FadeIn, StaggerContainer, etc.)
│   ├── application-form.tsx        # Student application form
│   ├── career-pathway.tsx          # Career journey visualization
│   ├── course-browser.tsx          # Course browsing interface
│   ├── course-card.tsx             # Individual course card
│   ├── course-carousel.tsx         # Course slider
│   ├── products-catalog.tsx        # Products showcase
│   ├── promo-popup.tsx             # Marketing pop-up
│   ├── public-header.tsx           # Navigation header
│   ├── public-page-loading.tsx     # Loading skeleton
│   ├── team-members-grid.tsx       # Team showcase grid
│   ├── trainees-board.tsx          # Trainees display
│   └── training-journey.tsx        # Journey timeline

├── student/
│   ├── student-dashboard.tsx       # Student home
│   ├── student-progress.tsx        # Progress visualization
│   ├── student-shell.tsx           # Student layout
│   └── task-submission-form.tsx    # Submit assignments

├── shared/
│   ├── empty-state.tsx             # Empty state placeholder
│   ├── icon.tsx                    # Material Symbols wrapper
│   ├── loading-state.tsx           # Generic loading spinner
│   ├── page-header.tsx             # Page title/header
│   ├── status-pill.tsx             # Status badge
│   ├── theme-provider.tsx          # Theme context/provider
│   └── toast.tsx                   # Toast notifications
```

**Component Design:**
- Functional React components with TypeScript
- Props interface for type safety
- Server components by default (Next.js 15)
- Client components use `'use client'` directive
- Tailwind CSS for styling
- Accessible (ARIA labels, semantic HTML)

---

### `/lib` - Utility Functions & Helpers

```
lib/
├── supabase/
│   ├── browser.ts         # Browser-side Supabase client
│   ├── server.ts          # Server-side Supabase client
│   ├── public.ts          # Public (unauthenticated) client
│   └── env.ts             # Environment variable validation

├── utils.ts               # General utility functions
│   - cn() - Tailwind class merging
│   - formatDate()
│   - formatCurrency()
│   - capitalize()
│   - throttle/debounce
│   - Type guards

└── news.ts                # News fetching logic
    - fetchNews()
    - getNewsById()
    - formatNewsContent()
```

**Supabase Client Pattern:**
- `browser.ts` - Used in client components (with auth)
- `server.ts` - Used in server components/actions (with service role)
- `public.ts` - Used for public data (no auth required)
- `env.ts` - Centralized environment config

---

### `/public` - Static Assets

```
public/
├── favicon.ico            # Favicon
├── logo.png              # Brand logo
├── logo-dark.png         # Dark mode logo
├── hero-image.png        # Hero section background
├── course-*.png          # Course thumbnails
├── team-members/         # Team member photos
├── success-stories/      # Graduate testimonials
└── icons/                # SVG icons
```

**Asset Guidelines:**
- Use next/image for optimization
- Compress images with TinyPNG/SVGO
- Use WebP format when possible
- Keep file sizes under 500KB

---

### `/supabase` - Database Layer

```
supabase/
├── migrations/
│   ├── 001_create_users_table.sql
│   ├── 002_create_courses_table.sql
│   ├── 003_create_enrollments_table.sql
│   ├── ...
│   └── schema_version.md

├── seed.sql                        # Initial test data
├── admin-setup.sql                 # Admin user creation
├── ai-news-setup.sql               # News content
├── student-email-login-update.sql  # Auth config
└── disapprove-approved-student-update.sql # Status updates
```

**Migration Strategy:**
- One SQL file per feature/table
- Numbered sequentially (001, 002, ...)
- Never modify existing migrations
- Create new migrations for schema changes
- Test migrations locally before production

---

### Root Configuration Files

```
├── next.config.ts        # Next.js build configuration
│   - Image optimization
│   - Webpack config
│   - Environment variables

├── tailwind.config.cjs    # Tailwind CSS theme
│   - Custom colors from CSS vars
│   - Extended utilities
│   - Custom components
│   - Plugins (forms)

├── postcss.config.mjs     # PostCSS plugins
│   - Tailwind CSS
│   - Autoprefixer
│   - Other CSS processors

├── tsconfig.json          # TypeScript compiler options
│   - Target: ES2017
│   - Path aliases: @/*
│   - Strict mode: false
│   - JSX: preserve

├── eslint.config.mjs      # ESLint rules
│   - Next.js rules
│   - React best practices
│   - TypeScript support

├── package.json           # Project manifest
│   - Dependencies
│   - Scripts
│   - Version info

└── README.md              # Project readme
```

---

## 🎯 Naming Conventions

### File Naming
- **Components**: PascalCase (`AdminDashboard.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Styles**: kebab-case (`hero-section.css`)
- **Types**: PascalCase (`User.ts`, `UserProps.ts`)

### Component Structure
```tsx
// 1. Imports
import React from 'react';
import { SomeType } from '@/lib/types';

// 2. Type definitions
interface ComponentProps {
  title: string;
  onClick: () => void;
}

// 3. Component
export function MyComponent({ title, onClick }: ComponentProps) {
  return <div>{title}</div>;
}

// 4. Default export
export default MyComponent;
```

---

## 📦 Module Resolution

- **Absolute imports** use `@/` alias (maps to root)
- **Relative imports** for components in same folder
- **Index files** for exporting multiple items from folder

Example:
```tsx
// ✅ Good: Absolute imports
import { Button } from '@/components/shared/button';
import { formatDate } from '@/lib/utils';

// ❌ Avoid: Relative from root
import Button from '../../../components/shared/button';
```

---

## 🔄 Data Flow

### Server-Side Rendering (SSR)
1. Server component fetches data from Supabase
2. Data passed as props to client components
3. Client hydrates with initial state
4. Interactive elements become responsive

### Server Actions
1. Form submitted to server action in `actions.ts`
2. Server validates and processes data
3. Database updated via Supabase
4. Response sent to client
5. Page revalidated and re-rendered

### Client-Side Data Fetching
- Used in client components with `'use client'`
- Fetch on mount with useState/useEffect
- Show loading state while fetching
- Handle errors with try/catch

---

## 🎨 Asset Organization

Keep assets organized by feature:
```
public/
├── images/
│   ├── hero/
│   ├── courses/
│   ├── team/
│   └── testimonials/
├── icons/
├── videos/
└── fonts/
```

See [STYLING.md](STYLING.md) for more on asset management and styling.
