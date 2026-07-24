# WeConnect - Training Management Platform

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-blue?style=for-the-badge&logo=tailwind-css)

WeConnect is a comprehensive training management platform designed specifically for software houses and educational institutes. It streamlines the management of 3-month training and internship workflows, offering dedicated portals for students, administrators, and instructors.

With built-in tracking for tasks, applications, and completions, along with automated notifications (Email and WhatsApp), WeConnect ensures a seamless educational and operational experience.

## ✨ Key Features

### 🏢 Public Platform
* **Landing & Showcase:** Course catalogs, team members, completed students, and trainee showcases.
* **Applicant Portal:** Intuitive student application and enrollment forms.
* **Resources:** Products/Tools catalog, news, and dynamic promotional popups.

### 🎓 Student Portal
* **Dashboard & Tracking:** Real-time progress tracking, enrollment visibility, and feedback viewing.
* **Task Management:** Assigned task lists with detailed views.
* **Versatile Submissions:** Submit text, GitHub URLs, Google Docs/Sheets, images, and proof URLs.

### 🛡️ Admin & Teacher Dashboard
* **User Management:** Complete lifecycle management for students, applications, teachers, and sub-admins.
* **Curriculum Management:** Course, task, and resource management.
* **Grading & Reviews:** Comprehensive submission reviewing, grading, and automated progress recalibrations.
* **Certifications:** Integrated internship letter generation and PDF previews.
* **Granular Access Control:** Role-Based Access Control (RBAC) allowing module-level permissions for sub-admins/teachers.
* **Notification Controls:** Configure WhatsApp and Email automated alerts.

## 🛠️ Technology Stack

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion
* **Backend / Database:** Supabase (PostgreSQL, Auth, RLS, Edge Functions)
* **Validation:** Zod
* **PDF Generation:** React PDF Renderer
* **Notifications:** Google Script Webhooks (Email), WhatsApp Cloud API
* **File Storage:** GitHub API + jsDelivr CDN

## ⚙️ Core Workflows

1. **Application Flow:** Students apply -> Admin/Teacher reviews -> On approval, an enrollment and progress report are automatically generated.
2. **Task Workflow:** Admin assigns tasks -> Student submits proof -> Admin grades and provides feedback -> Progress is dynamically updated.
3. **Progress & Completion:** Average scores and completion percentages are tracked. Admins can graduate students and generate internship certificates.

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm, yarn, or pnpm
* Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AbdullahWali79/WeConnectInovativeSolutions.git
   cd WeConnectInovativeSolutions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory and configure the following variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Email Notifications (Google Script Webhook)
   GOOGLE_SCRIPT_MAIL_WEBHOOK=your-mail-webhook
   ADMIN_NOTIFICATION_EMAIL=your-admin-email
   MAIL_WEBHOOK_SECRET=your-mail-secret

   # WhatsApp Notifications
   WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_ADMIN_NUMBER=your-admin-number
   WHATSAPP_API_VERSION=v20.0
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-token

   # Cron Setup
   CRON_SECRET=your-cron-secret

   # GitHub Storage (for Media)
   GITHUB_TOKEN=your-github-token
   GITHUB_OWNER=your-github-owner
   GITHUB_REPO=your-github-repo
   GITHUB_BRANCH=main
   GITHUB_CDN_BASE=https://cdn.jsdelivr.net/gh
   MAX_UPLOAD_MB=10
   ```

4. **Database Migration**
   Initialize your Supabase database utilizing the provided migrations and seed files:
   ```bash
   supabase db push
   ```
   *(Seed scripts available in `supabase/` directory for initial data setup).*

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 🗄️ Database Architecture

The project relies heavily on **Supabase** (PostgreSQL) and utilizes **Row Level Security (RLS)** to enforce access control at the database level. 

Key Tables:
* `profiles`, `user_permissions` - Identity and Access Management
* `courses`, `course_categories`, `tasks`, `task_resources` - Curriculum
* `applications`, `enrollments`, `submissions`, `progress_reports`, `completed_students` - Student Lifecycle
* `internship_letters` - Certification Records

*Note: All sensitive administrative actions run securely server-side using the Supabase Service Role client.*

## 📂 Project Structure

```text
app/
├── admin/                 # Admin dashboard pages and server actions
├── api/                   # API, WhatsApp webhooks, and cron routes
├── apply/                 # Public student application flow
├── auth/                  # Supabase authentication callback
├── student/               # Student dashboard and task submission pages
└── [public_routes]/       # Various public pages (courses, team, products, etc.)

components/                # Reusable UI components segregated by domain
lib/                       # Configurations, clients (Supabase, Mail, WhatsApp), & validations
supabase/                  # Database migrations, RLS policies, and seed data
```

## ☁️ Media Storage (GitHub + jsDelivr)

WeConnect implements a custom, cost-effective media storage solution. Uploaded media (such as task proofs or admin resources) is pushed securely to a designated `uploads/` directory on GitHub using the GitHub REST API. Media is then rapidly served via the **jsDelivr CDN**. Supabase only stores the resulting public CDN URLs.
