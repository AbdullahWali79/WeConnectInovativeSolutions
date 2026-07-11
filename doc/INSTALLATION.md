# Installation & Setup Guide

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn/pnpm)
- **Git**: Version control
- **Supabase Account**: For database and authentication
- **Environment Variables**: API keys and configuration

---

## 🚀 Initial Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd next
```

### 2. Install Dependencies
```bash
npm install
```

All dependencies are defined in `package.json`:
- **Frontend Framework**: Next.js 15.3, React 19
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Database**: Supabase JS SDK with SSR support
- **Utilities**: Zod (validation), Framer Motion (animations)
- **Linting**: ESLint with Next.js config
- **TypeScript**: TypeScript 5.8 with strict setup

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# API Endpoints (if any)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

**Note**: `NEXT_PUBLIC_*` variables are exposed to the client. Keep service role keys private.

---

## 📦 Available Scripts

### Development
```bash
npm run dev
```
Starts the Next.js development server on `http://localhost:3000` with hot reloading.

### Production Build
```bash
npm run build
```
Compiles the project for production and optimizes assets.

### Production Start
```bash
npm start
```
Runs the production-ready server.

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality and style compliance.

---

## 🗄️ Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the project URL and Anon Key

2. **Run Database Migrations**
   ```bash
   # Migrations are in supabase/migrations/
   # Apply them via Supabase SQL Editor or CLI
   ```

3. **Load Seed Data** (optional)
   - Run `supabase/seed.sql` to populate test data
   - Alternative seeds available:
     - `admin-setup.sql` - Admin initial data
     - `ai-news-setup.sql` - News content setup
     - `student-email-login-update.sql` - Email auth config

4. **Key Tables Created**
   - users (authentication)
   - courses
   - enrollments
   - tasks
   - submissions
   - feedback
   - progress
   - applications
   - announcements
   - team_members
   - products
   - promotions
   - news

---

## 🔐 Authentication Setup

### Supabase Auth Configuration

1. **Enable Auth Providers**
   - Email/Password (default)
   - OAuth providers (Google, GitHub, etc.) - optional
   - Configure redirect URLs: `http://localhost:3000/auth/callback`

2. **JWT Secret**
   - Supabase automatically manages JWT secrets
   - Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

3. **Protected Routes**
   - Admin routes: Check user role in middleware
   - Student routes: Verify enrollment status
   - Public routes: No authentication required

---

## 🎨 Tailwind CSS Configuration

The project uses Tailwind CSS with a custom color system.

Key configuration in `tailwind.config.cjs`:
- Custom color variables from CSS custom properties
- Rounded utilities (lg, xl, 2xl, 3xl)
- Shadow utilities (card, hover, glow)
- Typography utilities (body-sm, body-md, label-sm, headline-lg)
- Dark mode support (optional)

---

## 📝 TypeScript Configuration

Configuration in `tsconfig.json`:
- **Target**: ES2017 (modern browsers)
- **Module**: ESNext with Node resolution
- **Strict Mode**: Disabled by default (can enable for stricter checks)
- **Path Alias**: `@/*` maps to root directory
- **JSX**: Preserve (Next.js handles compilation)

---

## 🔧 Development Tips

### Hot Reload
- Changes to components automatically reload in browser
- Styling changes (CSS/Tailwind) appear instantly
- Server-side code changes require restart

### Debugging
- Use browser DevTools for client-side debugging
- Enable Next.js debug output: `DEBUG=next:* npm run dev`
- Check server logs in terminal

### Performance
- Use next/image for optimized images
- Implement code splitting via dynamic imports
- Monitor bundle size with `npm run build`

### Testing
- Add Jest/React Testing Library as needed
- Create `__tests__` or `.test.ts` files
- Run tests: `npm test` (needs configuration)

---

## 📦 Building for Production

### Build Process
```bash
npm run build
```

This:
1. Compiles TypeScript
2. Optimizes React components
3. Bundles and minifies assets
4. Generates static pages where possible
5. Creates `.next` directory

### Deployment
```bash
npm start
```

Serves the production build. Deploy to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS EC2, Heroku, DigitalOcean**
- **Docker containers**

---

## 🚨 Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
```

**Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Supabase connection fails**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` has correct permissions
- Ensure firewall allows connection to Supabase servers

**Build fails**
```bash
npm run lint  # Check for lint errors
npm run build # See full build error
```

---

## 📚 Next Steps

- Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for architecture details
- Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for component organization
- Check [COMPONENTS.md](COMPONENTS.md) for available components
- See [ADMIN_FEATURES.md](ADMIN_FEATURES.md) for admin dashboard details
- Review [STYLING.md](STYLING.md) for design system guidelines
