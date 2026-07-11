# WeConnect Documentation

Complete documentation for the WeConnect Innovation educational platform.

---

## 📚 Documentation Structure

### Getting Started
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Project summary, features, architecture, and design system
- **[INSTALLATION.md](INSTALLATION.md)** - Setup guide, environment configuration, dependencies, and troubleshooting
- **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** - Directory organization, file naming, module resolution, and data flow

### Development
- **[COMPONENTS.md](COMPONENTS.md)** - Complete component guide with examples and usage patterns
- **[STYLING.md](STYLING.md)** - Design system, Tailwind configuration, typography, colors, and responsive design
- **[DATABASE.md](DATABASE.md)** - Database schema, tables, relationships, queries, and data integrity

### Admin & Features
- **[ADMIN_FEATURES.md](ADMIN_FEATURES.md)** - Admin dashboard, student management, course management, grading, and reporting

---

## 🚀 Quick Links

### For New Developers
1. Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for project context
2. Follow [INSTALLATION.md](INSTALLATION.md) to set up locally
3. Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md) to understand code organization
4. Check [COMPONENTS.md](COMPONENTS.md) to see available components
5. Study [STYLING.md](STYLING.md) for design and styling patterns

### For Frontend Work
- [COMPONENTS.md](COMPONENTS.md) - Component library and patterns
- [STYLING.md](STYLING.md) - Tailwind, colors, typography, responsive design
- [FILE_STRUCTURE.md](FILE_STRUCTURE.md) - App and component organization

### For Backend/Admin Work
- [ADMIN_FEATURES.md](ADMIN_FEATURES.md) - Dashboard features and operations
- [DATABASE.md](DATABASE.md) - Schema, tables, and queries
- [INSTALLATION.md](INSTALLATION.md) - Supabase setup and environment

### For Deployment
- [INSTALLATION.md](INSTALLATION.md) - Build and deployment instructions
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Tech stack and architecture

---

## 🎯 Common Tasks

### Create a New Page/Route
1. Create folder in `app/` directory
2. Add `page.tsx` and `layout.tsx`
3. See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for examples
4. Use existing components from [COMPONENTS.md](COMPONENTS.md)
5. Follow styling from [STYLING.md](STYLING.md)

### Create a New Component
1. Create file in `components/` directory
2. Define TypeScript props interface
3. Use Tailwind classes from [STYLING.md](STYLING.md)
4. Document with JSDoc comments
5. See [COMPONENTS.md](COMPONENTS.md) for patterns

### Add a Database Table
1. Create migration in `supabase/migrations/`
2. Follow naming convention from [DATABASE.md](DATABASE.md)
3. Add indexes and RLS policies
4. Test locally before pushing to production
5. Document in [DATABASE.md](DATABASE.md)

### Add Admin Feature
1. Create component in `components/admin/`
2. Add route in `app/admin/`
3. Implement in [ADMIN_FEATURES.md](ADMIN_FEATURES.md)
4. Add server actions in `app/admin/actions.ts`
5. Test access control and permissions

---

## 📊 Project Stats

- **Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase
- **Pages**: 20+ routes (public, student, admin)
- **Components**: 30+ reusable components
- **Database Tables**: 13 core tables
- **Lines of Code**: 1000+ components, utilities, and server actions
- **CSS**: Tailwind-based responsive design with custom utilities

---

## 🎨 Key Features

### Student Features
✅ Course enrollment and browsing  
✅ Task submission system  
✅ Progress tracking dashboard  
✅ Mentor feedback and scoring  
✅ Career pathway visualization  

### Admin Features
✅ Course and task management  
✅ Student management and analytics  
✅ Submission grading interface  
✅ Progress monitoring  
✅ Announcement broadcasting  

### Public Features
✅ Landing page with hero section  
✅ Course catalog  
✅ News and updates  
✅ Team showcase  
✅ Application portal  

---

## 🔐 Security & Authentication

- **Authentication**: Supabase Auth with JWT
- **Authorization**: Role-based access control (student, mentor, admin)
- **Data Protection**: Row-level security (RLS) on sensitive tables
- **Encryption**: Passwords hashed by Supabase
- **HTTPS**: All connections encrypted

See [DATABASE.md](DATABASE.md) for RLS policies and [INSTALLATION.md](INSTALLATION.md) for auth setup.

---

## 📱 Responsive Design

- **Mobile First**: 320px - 430px optimization
- **Tablet**: 768px breakpoint
- **Desktop**: 1024px+ with max-width 1440px container
- **Hero Section**: Fully mobile-optimized with centered stacking
- **Typography**: Fluid scaling with `clamp()`
- **Components**: Responsive grid and flex layouts

See [STYLING.md](STYLING.md) for responsive patterns and breakpoints.

---

## 🎯 Design System

### Colors
- **Primary**: Navy blue (`#00216e`) - CTAs and interactive elements
- **Secondary**: Gold (`#ffd24a`) - Accents and highlights
- **Surfaces**: Light blue gradients for layering
- **Text**: Navy and slate gray for readability

### Typography
- **Font**: Manrope - Modern, clean, premium
- **Scale**: Responsive sizing from 12px to 4xl
- **Weights**: 400 (normal), 600 (semibold), 700 (bold), 800 (extrabold)
- **Line Height**: Optimized for readability

### Components
- **Buttons**: Primary, secondary, with hover states
- **Cards**: Shadow hierarchy with glass effects
- **Forms**: Consistent inputs with focus states
- **Spacing**: 4px-based scale for consistency

See [STYLING.md](STYLING.md) for complete design system.

---

## 🛠️ Development Tools

### Scripts
```bash
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint check
```

### Technologies
- **Framework**: Next.js 15.3 with App Router
- **Language**: TypeScript 5.8
- **UI Framework**: React 19
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL)
- **Animation**: Framer Motion
- **Validation**: Zod
- **Icons**: Material Symbols

See [INSTALLATION.md](INSTALLATION.md) for detailed setup.

---

## 📖 File Reference

### Core App Routes
- `app/page.tsx` - Landing page with hero section
- `app/admin/` - Admin dashboard (protected)
- `app/student/` - Student dashboard (protected)
- `app/courses/` - Public course browsing
- `app/apply/` - Application portal
- `app/login/` - Authentication
- `app/news/` - Blog and updates
- `app/team/` - Team showcase
- `app/contact/` - Contact page

### Core Components
- `components/admin/` - Admin interface components
- `components/public/` - Public-facing components
- `components/student/` - Student dashboard components
- `components/shared/` - Reusable utility components

### Utilities
- `lib/supabase/` - Database client configurations
- `lib/utils.ts` - Helper functions
- `lib/news.ts` - News content logic

### Configuration
- `tailwind.config.cjs` - Tailwind theming
- `tsconfig.json` - TypeScript config
- `next.config.ts` - Next.js config
- `postcss.config.mjs` - CSS processing

### Database
- `supabase/migrations/` - Database schema migrations
- `supabase/seed.sql` - Test data
- `supabase/*.sql` - Setup scripts

---

## 🤝 Contributing

When adding new features:

1. **Document your changes**
   - Update relevant MD files in `/doc`
   - Add JSDoc comments in code
   - Update this README if structure changes

2. **Follow conventions**
   - Component naming: PascalCase
   - File naming: kebab-case for CSS, camelCase for utilities
   - TypeScript: Always define prop types
   - Styling: Use Tailwind classes from [STYLING.md](STYLING.md)

3. **Test responsiveness**
   - Check all breakpoints (320px, 375px, 430px, 768px, 1024px)
   - Verify on mobile, tablet, and desktop
   - Test with real content

4. **Optimize performance**
   - Use React.memo for expensive components
   - Implement code splitting
   - Optimize images with next/image
   - Monitor bundle size

5. **Maintain accessibility**
   - Use semantic HTML
   - Add ARIA labels where needed
   - Ensure keyboard navigation
   - Test with screen readers

---

## 🐛 Troubleshooting

### Common Issues

**Build fails**
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm install`
- Check TypeScript errors: `npx tsc --noEmit`

**Supabase connection error**
- Verify environment variables in `.env.local`
- Check Supabase project is active
- Ensure firewall allows connection

**Styling not applying**
- Restart dev server: `npm run dev`
- Check Tailwind config is correct
- Verify class syntax is valid
- Check responsive prefixes (sm:, md:, lg:)

**Component not rendering**
- Check component is exported correctly
- Verify imports use @ alias
- Look for console errors
- Test in browser DevTools

See [INSTALLATION.md](INSTALLATION.md) for more troubleshooting.

---

## 📞 Support & Resources

### Documentation
- [Project Overview](PROJECT_OVERVIEW.md) - Architecture and features
- [Installation Guide](INSTALLATION.md) - Setup and deployment
- [File Structure](FILE_STRUCTURE.md) - Code organization
- [Components Guide](COMPONENTS.md) - Component library
- [Styling Guide](STYLING.md) - Design system
- [Database Guide](DATABASE.md) - Schema and queries
- [Admin Features](ADMIN_FEATURES.md) - Dashboard operations

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Framer Motion](https://www.framer.com/motion)

---

## 📄 License

© 2024 WeConnect Innovation. All rights reserved.

---

## 🎉 Getting Help

- **General Questions**: Check relevant documentation files
- **Component Issues**: See [COMPONENTS.md](COMPONENTS.md)
- **Styling Problems**: See [STYLING.md](STYLING.md)
- **Database Questions**: See [DATABASE.md](DATABASE.md)
- **Setup Issues**: See [INSTALLATION.md](INSTALLATION.md)
- **Architecture**: See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

---

**Last Updated**: May 2024  
**Version**: 1.0  
**Maintainer**: WeConnect Team
