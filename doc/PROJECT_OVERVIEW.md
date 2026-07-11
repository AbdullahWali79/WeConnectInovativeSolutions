# WeConnect Innovation - Project Overview

## 📋 Project Summary

**WeConnect** is a comprehensive educational platform designed for software-house training programs. It provides a structured 3-month training pathway that connects students with practical assignments, mentor feedback, progress tracking, and career-focused project work.

### Key Purpose
- Enable students to learn through **practical assignments** with real-world projects
- Provide **mentor feedback** and guidance on task submissions
- Track **learning progress** with structured milestones
- Build a **career pathway** from training → internship → job readiness
- Manage **courses, certifications, and job placements**

---

## 🎯 Core Features

### For Students
- **Course Enrollment**: Browse and apply for available training courses
- **Task Submission**: Submit assignments with support for various media (video, docs, links)
- **Progress Tracking**: Visual dashboard showing learning progress, current tasks, and milestones
- **Mentor Feedback**: Receive scored reviews and constructive feedback
- **Career Pathway**: Clear progression from training through paid internship
- **Job Placement**: Track readiness and job opportunity access

### For Administrators
- **Dashboard Management**: Central hub for all platform operations
- **Course Management**: Create, update, and manage course content
- **Student Management**: Monitor enrollment, progress, and completions
- **Task Management**: Create and manage assignments for courses
- **Application Review**: Process and approve student applications
- **Submissions Review**: Score and provide feedback on student work
- **Progress Monitoring**: Track cohort performance and completion rates
- **Announcements**: Broadcast updates and important information
- **Team Management**: Manage mentor and staff accounts
- **Reports**: View analytics on students, completions, and training outcomes

### Public Features
- **Landing Page**: Showcase program benefits with compelling hero section
- **Course Browser**: Catalog view of all available courses
- **News Section**: Latest training updates and success stories
- **Team Members Grid**: Display mentors and team members
- **Career Pathway Visualization**: Show training journey and outcomes
- **Application Portal**: Streamlined apply page for prospective students
- **Completed Students Showcase**: Highlight graduate achievements
- **Contact & Support**: Direct communication channels
- **Privacy & Terms**: Legal documentation

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.3, React 19, TypeScript
- **Styling**: Tailwind CSS 3.4, PostCSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR support
- **Forms**: Zod for validation
- **Animation**: Framer Motion
- **Icons**: Material Symbols
- **Development**: Node.js environment with ESLint

### Project Structure
```
next/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard and management
│   ├── auth/              # Authentication flows
│   ├── student/           # Student dashboard
│   ├── courses/           # Public course browsing
│   ├── apply/             # Application portal
│   ├── login/             # Login page
│   ├── news/              # News section
│   ├── team/              # Team showcase
│   ├── products/          # Product listings
│   ├── trainees/          # Trainee management
│   ├── completed-students/# Graduation showcase
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── admin/             # Admin-specific components
│   ├── public/            # Public-facing components
│   ├── student/           # Student-specific components
│   └── shared/            # Shared utility components
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase client configurations
│   ├── utils.ts           # Helper utilities
│   └── news.ts            # News fetching logic
├── public/                # Static assets
├── supabase/              # Database migrations and seeds
│   ├── migrations/        # Database migrations
│   └── *.sql             # Setup scripts
├── tailwind.config.cjs    # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies
└── next.config.ts         # Next.js configuration
```

---

## 🎨 Design System

### Color Palette
- **Primary**: `#00216e` (Deep Space Blue) - Main CTA and interactive elements
- **Primary Container**: `#0033a0` (Darker Blue) - Hover states
- **Secondary**: `#6a4700` (Princeton Orange) - Accents
- **Secondary Container**: `#ffd24a` (Amber Flame) - Highlights and badges
- **Surface Colors**: Various blues/whites for layering
- **Text**: Navy (`#071A3B`) and slate gray (`#2b3d67`)

### Typography
- **Font Family**: Manrope (modern, clean sans-serif)
- **Headline Large**: 2rem, 800 weight, uppercase
- **Title Large**: 1.125rem, 700 weight
- **Body Large**: 1.125rem, 1.6 line-height
- **Labels**: Small caps, 700 weight, uppercase tracking

### Component Pattern
- Rounded corners (lg, xl, 3xl) for modern feel
- Subtle shadows for depth
- Glass-morphism effects on cards
- Smooth transitions and hover states
- Navy/gold premium branding

---

## 📱 Responsive Design

- **Mobile First**: 320px, 375px, 430px screens optimized
- **Tablets**: 768px and up breakpoints
- **Desktop**: Full-width 1440px container
- **Hero Section**: Mobile-optimized with centered stacking
- **Responsive Typography**: Using clamp() for fluid scaling
- **Adaptive Layouts**: Grid and flex adjustments per breakpoint

---

## 🔐 Authentication & Access Control

- **SSR-Ready**: Server-side rendering with Supabase Auth
- **Role-Based**: Admin vs. Student vs. Public access tiers
- **Protected Routes**: Admin dashboard requires authentication
- **Public Access**: Landing page, courses, news available to all
- **Callback Handling**: OAuth integration via auth/callback

---

## 📊 Database Entities

Main Supabase tables:
- **users**: Student and admin accounts
- **courses**: Training course definitions
- **enrollments**: Student course registrations
- **tasks**: Assignment definitions per course
- **submissions**: Student task submissions
- **feedback**: Mentor scores and reviews
- **progress**: Tracking completion and milestones
- **applications**: Student applications to program
- **announcements**: Platform-wide messaging
- **team_members**: Mentor and staff profiles
- **products**: Training products/certifications
- **promotions**: Marketing campaigns
- **news**: Blog posts and updates

---

## 🚀 Getting Started

See [INSTALLATION.md](INSTALLATION.md) for setup instructions.

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for detailed file organization.
