# WeConnect

WeConnect ek training management platform hai jo software-house ya institute ke 3-month training/internship workflow ko manage karta hai. Is software me public website, student portal, admin dashboard, teacher/sub-admin permissions, task submissions, progress tracking, completions, internship letters, email alerts, WhatsApp alerts, products, team members, trainees aur promotional popups ke modules included hain.

## Database

Is project me **Supabase** use ho raha hai.

- Database engine: **PostgreSQL**
- Platform: **Supabase managed cloud database**
- Authentication: **Supabase Auth**
- Authorization: **PostgreSQL Row Level Security (RLS) policies**
- Backend data access: **Supabase JS client**
- Server-side privileged access: **Supabase Service Role key**
- Migrations location: `supabase/migrations/`

Supabase project URL aur keys `.env.local` file se load hoti hain:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, RLS, SQL functions
- Zod validation
- Framer Motion animations
- React PDF renderer for internship letter PDF generation
- Google Script webhook based email notifications
- WhatsApp Cloud API notifications

## Main Features

### Public Website

- Landing page for WeConnect Innovation
- Public course catalog
- Course browsing and course details display
- Student application form
- Team members showcase
- Products catalog
- Trainees page
- Completed students showcase
- News page
- Contact page
- Privacy policy and terms pages
- Promotional popup display
- Public loading and error states

### Student Features

- Student login/signup through Supabase Auth
- Student dashboard
- Course enrollment visibility
- Assigned task list
- Task details page
- Task submission form
- Submission support for:
  - Explanation text
  - GitHub URL
  - Google Doc URL
  - Google Sheet URL
  - Image URL
  - Proof URL
- Student progress dashboard
- Progress percentage and score visibility
- Submission feedback visibility
- Approved/pending/rejected account status flow

### Admin Dashboard Features

- Admin dashboard overview
- Student management
- Application management
- Course management
- Task management
- Task resource management
- Submission review and grading
- Progress tracking
- Completed student management
- Internship letter generator
- Internship letter preview/PDF flow
- Announcement management
- Team member management
- Product management
- Trainee management
- Promotional popup management
- Notification settings
- Email alert settings
- WhatsApp alert settings
- Admin-only student password reset
- Admin-only student account deletion

### Teacher / Sub-Admin Features

- Teacher account creation by main admin
- Teacher profile update
- Teacher password reset
- Teacher status approve/reject
- Permission-based access control
- Module-level permissions for selected features
- Permission records stored in `user_permissions`
- Teachers can access only modules/actions allowed by admin

### Application Workflow

1. Student submits application from `/apply`.
2. Application is stored in `applications`.
3. Admin/allowed teacher reviews the application.
4. On approval:
   - Student profile can be approved.
   - Enrollment can be created.
   - Progress report can be initialized.
5. On rejection:
   - Application status becomes rejected.
   - Related student profile/enrollment status can be updated.

### Task and Submission Workflow

1. Admin/allowed teacher creates tasks for a student and course.
2. Student views assigned tasks from student portal.
3. Student submits task proof and links.
4. Submission status becomes `submitted`.
5. Admin/allowed teacher reviews submission.
6. Reviewer can add score, feedback, and status.
7. Database triggers refresh student progress automatically.

### Progress and Completion Workflow

- Progress is calculated from reviewed tasks.
- `progress_reports` stores:
  - total tasks
  - completed tasks
  - pending tasks
  - average score
  - progress percentage
- Admin can mark a course as completed.
- Completed students are saved in `completed_students`.
- Public showcase reads from `completed_student_showcase` view.

### Notification Features

Email notification support:

- New student registration/application alert
- Daily pending summary
- Email notification logs
- Admin mail settings
- Google Script mail webhook integration

WhatsApp notification support:

- WhatsApp registration alert
- Pending task summary alert
- Cron-based pending task alerts
- WhatsApp webhook verification route
- WhatsApp notification logs
- Admin WhatsApp settings

Required environment variables:

```env
GOOGLE_SCRIPT_MAIL_WEBHOOK=...
ADMIN_NOTIFICATION_EMAIL=...
MAIL_WEBHOOK_SECRET=...
CRON_SECRET=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ADMIN_NUMBER=...
WHATSAPP_API_VERSION=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
```

## Database Tables

Core Supabase tables used by this project:

| Table | Purpose |
| --- | --- |
| `profiles` | Auth users ki profile, role, status, email, phone |
| `course_categories` | Course categories |
| `courses` | Training courses |
| `applications` | Student course applications |
| `enrollments` | Student course enrollment records |
| `tasks` | Student/course assignments |
| `task_resources` | Task ke related resource links |
| `submissions` | Student task submissions |
| `progress_reports` | Student progress and average score |
| `completed_students` | Completed course records |
| `announcements` | Public/admin announcements |
| `promotional_popups` | Landing/student promotional popups |
| `team_members` | Public team member profiles |
| `products` | Public products/tools/templates catalog |
| `trainees` | Trainee tracking module |
| `user_permissions` | Teacher/sub-admin permissions |
| `admin_mail_settings` | Email notification settings |
| `email_notification_logs` | Email alert logs |
| `admin_notification_settings` | WhatsApp notification settings |
| `whatsapp_notification_logs` | WhatsApp alert logs |
| `internship_letters` | Internship letter records |

Database view:

| View | Purpose |
| --- | --- |
| `completed_student_showcase` | Public completed students list with student/course names |

Important SQL functions:

- `is_admin(user_id)`
- `is_admin_or_teacher(user_id)`
- `has_permission(target_user_id, target_permission_key)`
- `has_any_permission(target_user_id, target_permission_keys)`
- `can_request_student_access(target_email)`
- `refresh_student_progress(target_student_id, target_course_id)`
- `approve_application(application_id)`
- `reject_application(application_id)`
- `mark_course_completed(target_student_id, target_course_id)`
- `submit_task(...)`

## Access Control

Access control database level par RLS policies se enforce hota hai.

- Public users active courses, products, team members, public completed students aur active announcements dekh sakte hain.
- Students apni profile, enrollments, tasks, submissions aur progress dekh sakte hain.
- Admin complete management access rakhta hai.
- Teachers/sub-admins ko `user_permissions` ke through selected module access milta hai.
- Sensitive admin operations Supabase service role client se server-side run hoti hain.

## Main Routes

Public routes:

- `/`
- `/courses`
- `/apply`
- `/team`
- `/products`
- `/trainees`
- `/completed-students`
- `/news`
- `/contact`
- `/privacy-policy`
- `/terms`
- `/login`

Student routes:

- `/student`
- `/student/progress`
- `/student/tasks/[taskId]/submit`

Admin routes:

- `/admin`
- `/admin/applications`
- `/admin/students`
- `/admin/courses`
- `/admin/tasks`
- `/admin/submissions`
- `/admin/progress`
- `/admin/completions`
- `/admin/internship-letters`
- `/admin/announcements`
- `/admin/team-members`
- `/admin/products`
- `/admin/trainees`
- `/admin/promotional-popups`
- `/admin/subadmins`
- `/admin/notification-settings`
- `/admin/settings/notifications`

API and cron routes:

- `/api/whatsapp/webhook`
- `/api/whatsapp/send-registration-alert`
- `/api/whatsapp/send-pending-task-summary`
- `/api/cron/pending-task-alerts`
- `/api/cron/daily-pending-summary`

## Project Structure

```text
app/
  admin/                 Admin dashboard pages and server actions
  api/                   API, WhatsApp, and cron routes
  apply/                 Public student application flow
  auth/                  Supabase auth callback
  student/               Student dashboard and task submission pages
  courses/               Public course pages
  team/                  Public team page
  products/              Public products page
  trainees/              Public trainees page
  completed-students/    Public completed students page

components/
  admin/                 Admin UI modules
  public/                Public website components
  student/               Student portal components

lib/
  supabase/              Supabase clients, env, generated types
  mail/                  Email settings and sending logic
  whatsapp/              WhatsApp settings, templates, logging, client
  validations/           Zod schemas

supabase/
  migrations/            Database migrations
  seed.sql               Seed data
```

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` and add Supabase plus notification variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_SCRIPT_MAIL_WEBHOOK=optional-mail-webhook
ADMIN_NOTIFICATION_EMAIL=optional-admin-email
MAIL_WEBHOOK_SECRET=optional-mail-secret
CRON_SECRET=optional-cron-secret
WHATSAPP_ACCESS_TOKEN=optional-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=optional-phone-number-id
WHATSAPP_ADMIN_NUMBER=optional-admin-number
WHATSAPP_API_VERSION=v20.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=optional-webhook-token
```

Run development server:

```bash
npm run dev
```

Build production app:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Run lint:

```bash
npm run lint
```

## Database Setup

Supabase migrations are stored in:

```text
supabase/migrations/
```

If Supabase CLI is configured, push migrations with:

```bash
supabase db push
```

Seed/setup SQL files are also available:

- `supabase/seed.sql`
- `supabase/sql-editor-setup.sql`
- `supabase/admin-setup.sql`
- `supabase/ai-news-setup.sql`

## Notes

- This software is built as a Next.js web application.
- Main database is Supabase PostgreSQL, not MySQL or MongoDB.
- Supabase Auth handles login/signup.
- RLS policies protect table access.
- Admin and teacher permission checks are implemented both in server code and database policies.
- Notification modules depend on external credentials, so email/WhatsApp features need valid environment variables before production use.

## GitHub + jsDelivr File Storage

Uploaded media is stored in the configured GitHub repository under `uploads/` folders and served through jsDelivr. Supabase should store only public URLs and optional metadata, not uploaded file bytes or base64 data URLs.

Required server-side environment variables:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
GITHUB_CDN_BASE=https://cdn.jsdelivr.net/gh
MAX_UPLOAD_MB=10
```

Keep `GITHUB_TOKEN` server-only. Do not expose it with a `NEXT_PUBLIC_` prefix. The upload API route requires an authenticated approved user and only allows admin/teacher media types for admin areas.
