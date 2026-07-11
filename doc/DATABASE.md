# Database Schema & Data Model

## 🗄️ Supabase Database Overview

**Database Type**: PostgreSQL  
**Location**: Supabase (managed cloud PostgreSQL)  
**Authentication**: JWT-based access control  
**Real-time**: Enabled via Supabase Realtime

---

## 📊 Core Tables

### Users Table
Extends Supabase `auth.users` with profile information.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  profile_picture_url text,
  bio text,
  role text DEFAULT 'student', -- 'student', 'mentor', 'admin'
  date_of_birth date,
  gender text,
  address text,
  city text,
  country text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

**Roles**:
- `student` - Enrolled learner
- `mentor` - Provides feedback
- `admin` - Platform administrator

---

### Courses Table
Training programs and certifications.

```sql
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  thumbnail_url text,
  cover_image_url text,
  duration_weeks integer,
  difficulty_level text, -- 'beginner', 'intermediate', 'advanced'
  price decimal(10, 2),
  max_students integer,
  requires_application boolean DEFAULT false,
  status text DEFAULT 'draft', -- 'draft', 'active', 'archived'
  learning_outcomes jsonb, -- Array of learning objectives
  skills_covered text[],
  prerequisites text,
  certifications_granted text[],
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_difficulty ON courses(difficulty_level);
CREATE INDEX idx_courses_slug ON courses(slug);
```

---

### Enrollments Table
Records student enrollment in courses.

```sql
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status text DEFAULT 'active', -- 'active', 'completed', 'dropped', 'suspended'
  start_date date,
  expected_end_date date,
  completion_date date,
  progress_percentage integer DEFAULT 0,
  final_score decimal(5, 2),
  enrolled_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Indexes
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

---

### Tasks Table
Individual assignments within courses.

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  instructions text,
  due_date timestamp,
  points_possible integer DEFAULT 100,
  submission_type text, -- 'file', 'text', 'link', 'code'
  allow_late_submission boolean DEFAULT false,
  late_penalty_percent integer DEFAULT 0,
  rubric jsonb, -- Scoring rubric definition
  attachments jsonb, -- Links to starter files, examples
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_course ON tasks(course_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

### Submissions Table
Student task submissions.

```sql
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_content text, -- Text/code content
  file_urls text[], -- Array of uploaded file URLs
  submission_links jsonb, -- Links submitted
  submitted_at timestamp DEFAULT now(),
  resubmitted_at timestamp,
  resubmission_count integer DEFAULT 0,
  is_late boolean DEFAULT false
);

-- Indexes
CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
```

---

### Feedback Table
Mentor scores and feedback on submissions.

```sql
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES users(id),
  score integer, -- 0-100
  letter_grade text, -- A, B, C, D, F (optional)
  rubric_scores jsonb, -- Individual rubric item scores
  feedback_text text,
  strengths text,
  areas_for_improvement text,
  recommendations text,
  submitted_at timestamp DEFAULT now(),
  student_notified_at timestamp
);

-- Indexes
CREATE INDEX idx_feedback_submission ON feedback(submission_id);
CREATE INDEX idx_feedback_mentor ON feedback(mentor_id);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at);
```

---

### Progress Table
Tracks student progress and milestones.

```sql
CREATE TABLE progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tasks_completed integer DEFAULT 0,
  tasks_total integer,
  average_score decimal(5, 2),
  week_number integer,
  last_activity_at timestamp,
  milestones_reached jsonb, -- Array of milestone dates
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_progress_enrollment ON progress(enrollment_id);
CREATE INDEX idx_progress_course ON progress(course_id);
```

---

### Applications Table
Student applications to courses.

```sql
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id),
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'waitlist'
  experience_level text, -- 'beginner', 'intermediate', 'advanced'
  cover_letter text,
  essay text,
  documents jsonb, -- URLs of uploaded documents
  applied_at timestamp DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by uuid REFERENCES users(id),
  rejection_reason text,
  UNIQUE(student_id, course_id)
);

-- Indexes
CREATE INDEX idx_applications_course ON applications(course_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);
```

---

### Announcements Table
Platform-wide or course-specific announcements.

```sql
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text, -- 'general', 'course', 'deadline', 'achievement'
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  target_audience text, -- 'all', 'students', 'mentors', 'specific_cohort'
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  scheduled_for timestamp,
  sent_at timestamp,
  image_url text,
  video_url text,
  attachments jsonb
);

-- Indexes
CREATE INDEX idx_announcements_course ON announcements(course_id);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);
CREATE INDEX idx_announcements_scheduled_for ON announcements(scheduled_for);
```

---

### Team Members Table
Mentors, instructors, and staff profiles.

```sql
CREATE TABLE team_members (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title text, -- 'Senior Mentor', 'Instructor', 'Course Lead'
  bio text,
  expertise text[], -- ['React', 'Node.js', 'Databases']
  courses_assigned uuid[],
  students_assigned uuid[],
  availability text, -- JSON availability schedule
  social_links jsonb, -- LinkedIn, Twitter, GitHub
  verification_status text DEFAULT 'pending', -- 'pending', 'verified'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_team_members_title ON team_members(title);
CREATE INDEX idx_team_members_verification_status ON team_members(verification_status);
```

---

### Products Table
Certifications, bundles, add-on services.

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  product_type text, -- 'certification', 'bundle', 'addon', 'workshop'
  price decimal(10, 2),
  included_courses uuid[],
  benefits text[],
  target_audience text,
  duration_value integer,
  duration_unit text, -- 'weeks', 'months'
  status text DEFAULT 'active', -- 'active', 'inactive', 'discontinued'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_product_type ON products(product_type);
```

---

### News Table
Blog posts, updates, success stories.

```sql
CREATE TABLE news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  featured_image_url text,
  author_id uuid REFERENCES users(id),
  category text, -- 'news', 'success_story', 'update', 'tutorial'
  tags text[],
  published boolean DEFAULT false,
  published_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_news_published_at ON news(published_at);
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_category ON news(category);
```

---

### Promotions Table
Marketing campaigns and promotional popups.

```sql
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  campaign_type text, -- 'popup', 'banner', 'email', 'discount'
  content jsonb,
  call_to_action_text text,
  call_to_action_link text,
  target_context text, -- 'landing', 'courses', 'apply'
  show_to_new_visitors_only boolean DEFAULT true,
  delay_seconds integer DEFAULT 5,
  display_frequency text, -- 'once', 'once_per_session', 'every_visit'
  start_date timestamp,
  end_date timestamp,
  status text DEFAULT 'draft', -- 'draft', 'active', 'paused', 'ended'
  impressions_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_start_date ON promotions(start_date);
```

---

## 🔐 Row-Level Security (RLS) Policies

Enable RLS on tables to control data access:

```sql
-- Users can only see their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Students can only see enrollments they're part of
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_view_own_enrollments ON enrollments
  FOR SELECT USING (
    auth.uid() = student_id 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Submissions visible to student and mentor
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_view_own_submission ON submissions
  FOR SELECT USING (
    auth.uid() = student_id 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'mentor')
  );
```

---

## 🔗 Relationships

### One-to-Many
- User → Enrollments (one user, many enrollments)
- Course → Tasks (one course, many tasks)
- Task → Submissions (one task, many submissions)
- Submission → Feedback (one submission, one feedback)
- Enrollment → Progress (one enrollment, one progress)

### Many-to-Many (via junction tables)
- Team Members ↔ Courses (mentors teach multiple courses)
- Students ↔ Courses (via enrollments)

---

## 📈 Query Examples

### Get Student Progress
```sql
SELECT 
  e.id,
  c.title,
  e.progress_percentage,
  p.average_score,
  p.tasks_completed,
  p.tasks_total
FROM enrollments e
JOIN courses c ON e.course_id = c.id
LEFT JOIN progress p ON e.id = p.enrollment_id
WHERE e.student_id = $1
ORDER BY e.enrolled_at DESC;
```

### Get Task Submissions with Feedback
```sql
SELECT 
  s.id,
  s.submitted_at,
  u.full_name,
  f.score,
  f.feedback_text
FROM submissions s
JOIN users u ON s.student_id = u.id
LEFT JOIN feedback f ON s.id = f.submission_id
WHERE s.task_id = $1
ORDER BY s.submitted_at DESC;
```

### Cohort Completion Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) as total,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*),
    2
  ) as completion_rate
FROM enrollments
WHERE course_id = $1;
```

---

## 🔄 Data Sync & Updates

### Automatic Updates
- `updated_at` triggers on every table modification
- `progress_percentage` calculated from task submissions
- `average_score` calculated from feedback scores

### Scheduled Tasks
- Update `last_activity_at` based on submissions
- Calculate cohort statistics nightly
- Archive old data periodically
- Send overdue reminders

---

## 🛡️ Data Integrity

### Constraints
- Unique constraints on email, slug fields
- Foreign keys with cascade delete
- Check constraints on numeric fields (0-100 scores)
- Not-null constraints on required fields

### Indexes for Performance
- Frequently filtered fields (status, dates)
- Foreign key columns
- Sorting fields (created_at, updated_at)
- Search fields (email, slug, title)

---

## 📋 Migrations

**Location**: `supabase/migrations/`

Each migration file contains SQL for:
1. Creating tables
2. Setting up indexes
3. Enabling RLS
4. Creating policies
5. Seeding initial data

**Run migrations:**
```bash
supabase db push
```

---

## 🔧 Database Maintenance

### Regular Tasks
- Backup data (automated by Supabase)
- Vacuum and analyze tables (automatic)
- Monitor query performance
- Review and update indexes
- Archive old records

### Common Operations
```sql
-- Clear all test data
TRUNCATE enrollments, submissions, feedback CASCADE;

-- Export student progress report
COPY (SELECT * FROM progress) TO STDOUT;

-- Update student status
UPDATE enrollments SET status = 'completed' 
WHERE enrollment_id = $1 AND DATE(completion_date) = CURRENT_DATE;
```

---

## 🚀 Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Enable RLS** on all tables containing sensitive data
3. **Create indexes** on frequently queried columns
4. **Use transactions** for multi-step operations
5. **Monitor query performance** with EXPLAIN ANALYZE
6. **Archive old data** to keep tables performant
7. **Validate data** in application layer before saving
8. **Backup regularly** before major operations
9. **Document schema changes** in migration files
10. **Test queries** before running in production

---

See [INSTALLATION.md](INSTALLATION.md) for database setup and [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for context.
