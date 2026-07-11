# Components Guide

## 📚 Shared Components

### Icon Component
**Location**: `components/icon.tsx`

Wrapper for Material Symbols Outlined icons.

```tsx
import { Icon } from '@/components/icon';

export function MyComponent() {
  return <Icon name="home" className="text-2xl text-blue-600" />;
}
```

**Common Icon Names:**
- `home`, `dashboard`, `settings`
- `arrow_forward`, `arrow_back`
- `check`, `close`, `edit`, `delete`
- `school`, `verified_user`, `trending_up`
- `workspace_premium`, `payments`
- `auto_awesome`, `fact_check`, `linked_services`, `monitoring`

---

### Empty State Component
**Location**: `components/empty-state.tsx`

Displays when no data is available.

```tsx
import { EmptyState } from '@/components/empty-state';

export function CoursesView() {
  if (!courses.length) {
    return (
      <EmptyState 
        icon="school"
        title="No Courses Found"
        description="Check back soon for new training programs"
      />
    );
  }
  // ... render courses
}
```

---

### Loading State Component
**Location**: `components/loading-state.tsx`

Generic loading spinner/skeleton.

```tsx
import { LoadingState } from '@/components/loading-state';

export function DataGrid() {
  return isLoading ? <LoadingState /> : <div>{/* content */}</div>;
}
```

---

### Page Header Component
**Location**: `components/page-header.tsx`

Consistent page title and breadcrumb.

```tsx
import { PageHeader } from '@/components/page-header';

export function CoursesPage() {
  return (
    <>
      <PageHeader 
        title="Courses"
        description="Browse available training programs"
        backLink="/admin"
      />
      {/* page content */}
    </>
  );
}
```

---

### Status Pill Component
**Location**: `components/status-pill.tsx`

Badge for status indicators.

```tsx
import { StatusPill } from '@/components/status-pill';

export function StudentCard({ status }) {
  return (
    <div>
      <h3>Student Name</h3>
      <StatusPill status={status} />
      {/* "active", "completed", "pending", "rejected" */}
    </div>
  );
}
```

---

### Toast Component
**Location**: `components/toast.tsx`

Notification/alert display.

```tsx
import { showToast } from '@/components/toast';

function handleSave() {
  try {
    // save logic
    showToast('Changes saved successfully', 'success');
  } catch (error) {
    showToast('Failed to save changes', 'error');
  }
}
```

---

### Theme Provider Component
**Location**: `components/theme-provider.tsx`

Wraps app for theme/dark mode support.

```tsx
// In root layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 🎯 Public Components

### Public Header Component
**Location**: `components/public/public-header.tsx`

Navigation bar for public pages with logo, menu, and CTA.

```tsx
import { PublicHeader } from '@/components/public/public-header';

export default function LandingPage() {
  return (
    <>
      <PublicHeader />
      {/* page content */}
    </>
  );
}
```

**Features:**
- Sticky positioning
- Responsive menu
- Search functionality
- CTA button
- Progress indicator

---

### Course Card Component
**Location**: `components/public/course-card.tsx`

Individual course display card.

```tsx
import { CourseCard } from '@/components/public/course-card';

const course = {
  id: '123',
  title: 'React Development',
  description: 'Learn modern React...',
  duration: '3 months',
  level: 'Intermediate',
  students: 45
};

export function CourseGrid() {
  return <CourseCard course={course} />;
}
```

**Props:**
- `course`: Course data object
- `onSelect`: Callback when clicked
- `highlight`: Boolean for featured state

---

### Course Carousel Component
**Location**: `components/public/course-carousel.tsx`

Horizontal scrolling course slider.

```tsx
import { CourseCarousel } from '@/components/public/course-carousel';

export function CoursesSection({ courses }) {
  return <CourseCarousel courses={courses} />;
}
```

**Features:**
- Framer Motion animations
- Snap scrolling on mobile
- Auto-play option
- Responsive sizing

---

### Career Pathway Component
**Location**: `components/public/career-pathway.tsx`

Visualizes the training → internship → job journey.

```tsx
import CareerPathway from '@/components/public/career-pathway';

export default function LandingPage() {
  return (
    <>
      {/* other sections */}
      <CareerPathway />
    </>
  );
}
```

**Displays:**
- Training phase
- Internship milestone
- Job readiness step
- Success stories

---

### Animations Component
**Location**: `components/public/animations.tsx`

Reusable Framer Motion animation wrappers.

```tsx
import { FadeIn, StaggerContainer, StaggerItem, AnimatedCounter } from '@/components/public/animations';

export function Section() {
  return (
    <StaggerContainer className="space-y-4">
      <StaggerItem>
        <h2>Title</h2>
      </StaggerItem>
      <StaggerItem>
        <p>Content with stagger delay</p>
      </StaggerItem>
    </StaggerContainer>
  );
}
```

**Available Animations:**
- `FadeIn`: Fade-in effect on scroll
- `StaggerContainer`: Container for staggered children
- `StaggerItem`: Individual item with delay
- `AnimatedCounter`: Number counter animation
- `FloatingOrbs`: Background floating elements
- `ScrollProgress`: Page scroll progress bar

---

### Application Form Component
**Location**: `components/public/application-form.tsx`

Student application submission form.

```tsx
import { ApplicationForm } from '@/components/public/application-form';

export function ApplyPage() {
  return <ApplicationForm onSuccess={() => navigate('/thank-you')} />;
}
```

**Fields:**
- Full name
- Email
- Phone
- Course selection
- Experience level
- Essay/motivation
- Terms acceptance

---

### Promo Popup Component
**Location**: `components/public/promo-popup.tsx`

Marketing pop-up overlay.

```tsx
import { PromoPopup } from '@/components/public/promo-popup';

export default function Page() {
  return (
    <>
      <PromoPopup context="landing" />
      {/* page content */}
    </>
  );
}
```

**Props:**
- `context`: Type of page ('landing', 'courses', etc.)
- `delay`: Milliseconds before showing
- `campaign`: Specific campaign ID

---

### Team Members Grid Component
**Location**: `components/public/team-members-grid.tsx`

Display mentors and staff in grid layout.

```tsx
import { TeamMembersGrid } from '@/components/public/team-members-grid';

export function TeamPage({ members }) {
  return <TeamMembersGrid members={members} />;
}
```

**Member Object:**
```tsx
{
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  expertise: string[];
  social?: { linkedin?: string; twitter?: string };
}
```

---

### Trainees Board Component
**Location**: `components/public/trainees-board.tsx`

Displays current cohort information.

```tsx
import { TraineesBoard } from '@/components/public/trainees-board';

export function TraineesPage({ cohort }) {
  return <TraineesBoard cohort={cohort} />;
}
```

---

### Public Page Loading Component
**Location**: `components/public/public-page-loading.tsx`

Skeleton loader matching public page layout.

```tsx
import { PublicPageLoading } from '@/components/public/public-page-loading';

export default function CoursesPage() {
  return isLoading ? <PublicPageLoading /> : <CourseBrowser />;
}
```

---

## 👤 Student Components

### Student Dashboard Component
**Location**: `components/student/student-dashboard.tsx`

Main student home page with overview.

```tsx
import { StudentDashboard } from '@/components/student/student-dashboard';

export default function StudentHome() {
  return <StudentDashboard user={currentUser} />;
}
```

**Shows:**
- Current courses
- Active tasks
- Progress overview
- Upcoming deadlines
- Mentor feedback

---

### Student Progress Component
**Location**: `components/student/student-progress.tsx`

Visual progress tracking.

```tsx
import { StudentProgress } from '@/components/student/student-progress';

export function ProgressPage({ enrollments }) {
  return <StudentProgress enrollments={enrollments} />;
}
```

**Displays:**
- Overall completion percentage
- Week-by-week progress
- Task completion status
- Scores and feedback

---

### Task Submission Form Component
**Location**: `components/student/task-submission-form.tsx`

Form for submitting assignments.

```tsx
import { TaskSubmissionForm } from '@/components/student/task-submission-form';

export function TaskPage({ task }) {
  return (
    <TaskSubmissionForm 
      task={task}
      onSubmit={handleSubmit}
    />
  );
}
```

**Supports:**
- File uploads
- Link submissions
- Video embeds
- Code snippets
- Text responses

---

### Student Shell Component
**Location**: `components/student/student-shell.tsx`

Layout wrapper for student pages.

```tsx
// Used in app/student/layout.tsx
import { StudentShell } from '@/components/student/student-shell';

export default function StudentLayout({ children }) {
  return <StudentShell>{children}</StudentShell>;
}
```

**Provides:**
- Navigation sidebar
- User profile menu
- Responsive layout

---

## ⚙️ Admin Components

### Admin Dashboard Component
**Location**: `components/admin/admin-dashboard.tsx`

Overview and quick actions.

```tsx
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default function AdminHome() {
  return <AdminDashboard />;
}
```

**Shows:**
- Key metrics (students, courses, completions)
- Recent activities
- Quick action buttons
- System status

---

### Admin Shell Component
**Location**: `components/admin/admin-shell.tsx`

Layout wrapper with sidebar navigation.

```tsx
// Used in app/admin/layout.tsx
import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
```

---

### Courses Manager Component
**Location**: `components/admin/courses-manager.tsx`

CRUD operations for courses.

```tsx
import { CoursesManager } from '@/components/admin/courses-manager';

export default function CoursesAdminPage() {
  return <CoursesManager />;
}
```

---

### Students Manager Component
**Location**: `components/admin/students-manager.tsx`

Manage student accounts and enrollments.

```tsx
import { StudentsManager } from '@/components/admin/students-manager';

export default function StudentsPage() {
  return <StudentsManager />;
}
```

**Features:**
- View all students
- Filter by course/status
- Edit student info
- View progress
- Send messages

---

### Submissions Review Component
**Location**: `components/admin/submissions-review.tsx`

Score and provide feedback on task submissions.

```tsx
import { SubmissionsReview } from '@/components/admin/submissions-review';

export default function SubmissionsPage() {
  return <SubmissionsReview />;
}
```

**Features:**
- List of pending submissions
- File/content preview
- Scoring interface
- Feedback editor
- Send feedback to student

---

### More Admin Components
- `announcements-manager.tsx` - Broadcast messages
- `applications-manager.tsx` - Review applications
- `tasks-manager.tsx` - Create assignments
- `progress-manager.tsx` - View analytics
- `team-members-manager.tsx` - Staff management
- `products-manager.tsx` - Certifications
- `promotional-popup-manager.tsx` - Campaigns

---

## 🎨 Component Props Pattern

All components follow consistent patterns:

```tsx
// Type your props
interface ComponentProps {
  /** Descriptive JSDoc comment */
  title: string;
  /** Optional prop with default */
  variant?: 'primary' | 'secondary';
  /** Callback function */
  onAction?: () => void;
  /** Children support */
  children?: React.ReactNode;
}

// Document and export
/**
 * Description of component purpose
 * @param props - Component props
 * @returns Rendered component
 */
export function Component({ title, variant = 'primary', onAction, children }: ComponentProps) {
  return (
    // JSX
  );
}
```

---

## 🔄 Server vs Client Components

**Server Components** (default):
- Data fetching directly in component
- No interactivity needed
- Use Supabase server client
- Pass data to client components

```tsx
// app/courses/page.tsx
import { getCourses } from '@/lib/courses';

export default async function CoursesPage() {
  const courses = await getCourses();
  return <CourseGrid courses={courses} />;
}
```

**Client Components** (with `'use client'`):
- Interactive elements
- React hooks (useState, useEffect, etc.)
- Form handling
- Event listeners

```tsx
// components/public/application-form.tsx
'use client';

import { useState } from 'react';

export function ApplicationForm() {
  const [formData, setFormData] = useState({});
  
  return <form>{/* form fields */}</form>;
}
```

---

## 📱 Responsive Component Props

Use Tailwind responsive classes in className:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Single column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

For complex responsive logic:
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

if (isMobile) {
  return <MobileVersion />;
}
return <DesktopVersion />;
```

---

## 🎯 Best Practices

1. **Keep components focused** - One responsibility per component
2. **Extract props** - Don't hardcode data
3. **Use TypeScript** - Always define prop types
4. **Document with JSDoc** - Explain purpose and usage
5. **Test responsiveness** - Check all breakpoints
6. **Optimize performance** - Use React.memo, useMemo for heavy components
7. **Follow naming** - Use descriptive, semantic names
8. **Accessibility** - Use semantic HTML, ARIA labels
9. **Consistency** - Follow project patterns and conventions
10. **DRY** - Extract repeated patterns into utility functions

---

See [STYLING.md](STYLING.md) for styling components and [ADMIN_FEATURES.md](ADMIN_FEATURES.md) for admin-specific component details.
