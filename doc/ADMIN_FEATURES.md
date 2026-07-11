# Admin Features & Dashboard

## 🎯 Admin Access

**Route**: `/admin`  
**Authentication**: Required (admin role)  
**Layout**: Admin shell with sidebar navigation

---

## 📊 Admin Dashboard Home

**Location**: `app/admin/page.tsx`

Central hub showing key metrics and recent activities.

### Displayed Metrics
- **Total Students**: Count of enrolled learners
- **Active Courses**: Number of ongoing programs
- **Completions**: Graduated students count
- **Success Rate**: Percentage of active cohorts completing
- **Pending Applications**: New student applications
- **Pending Submissions**: Tasks waiting for review

### Quick Actions
- Create New Course
- Add Announcement
- Review Submissions
- View Student Progress
- Manage Team Members

### Recent Activities
- Student enrollments
- Submission completions
- Announcements posted
- Course updates
- Team member changes

---

## 👥 Students Manager

**Route**: `/admin/students`  
**Component**: `StudentsManager`

### Features

#### View All Students
- Sortable table with name, email, enrollment status
- Filter by course, status, enrollment date
- Search by name or email
- Pagination for large lists

#### Student Actions
- **View Profile**: Full student information
  - Name, email, phone, enrollment date
  - Current courses
  - Progress tracking
  - Submission history
  - Mentor feedback

- **Edit Information**: Update student details
  - Contact info
  - Emergency contact
  - Course enrollment
  - Status (active, suspended, completed)

- **Send Message**: Direct communication
  - In-app notifications
  - Email integration
  - Subject and message template

- **View Progress**: Detailed analytics
  - Course completion percentage
  - Task completion status
  - Assignment scores
  - Milestones reached
  - Time spent on each module

- **Bulk Actions**: Multiple student operations
  - Export to CSV
  - Send announcements
  - Update status
  - Generate reports

---

## 📝 Courses Manager

**Route**: `/admin/courses`  
**Component**: `CoursesManager`

### Features

#### Create Course
Form to add new training program:
- **Basic Info**
  - Course title
  - Description (rich text)
  - Thumbnail image
  - Duration (weeks)
  - Difficulty level (beginner, intermediate, advanced)

- **Enrollment Settings**
  - Max students (capacity)
  - Application required (yes/no)
  - Start date
  - End date

- **Curriculum**
  - Learning outcomes
  - Prerequisites
  - Skills covered
  - Certifications granted

- **Pricing** (if applicable)
  - Course fee
  - Discount options
  - Payment terms

#### Edit Course
- Update all course details
- Modify curriculum
- Change enrollment status
- Archive old courses

#### Publish/Archive
- Make courses public or hidden
- Control student visibility
- Manage multiple versions

#### Delete Course
- Soft delete (maintain history)
- Archive submissions and enrollments
- Option to restore

#### View Enrollment
- List of enrolled students
- Enrollment dates
- Current progress
- Completion status

---

## 📋 Tasks Manager

**Route**: `/admin/tasks`  
**Component**: `TasksManager`

### Features

#### Create Task (Assignment)
Form for adding assignments to courses:
- **Task Details**
  - Title
  - Description (instructions)
  - Due date
  - Points possible

- **Submission Settings**
  - Submission type (file, link, text, code)
  - Allow multiple submissions (yes/no)
  - Late submission allowed
  - Late penalty percentage

- **Grading Rubric** (optional)
  - Rubric items and weights
  - Scoring criteria
  - Points per criterion

- **Attachments**
  - Upload starter files
  - Add example solutions
  - Link to resources

#### View Submissions
- List of student submissions
- Filter by status (submitted, pending, graded)
- Sort by submission date
- Search by student name

#### Grade Submission
- Preview student work
- View all attachment types (files, videos, links)
- Score the submission (0-100)
- Add detailed feedback
- Provide recommendations

#### Send Feedback
- Notify student of grade
- Email with feedback
- Allow resubmission if configured

#### Bulk Operations
- Export submissions
- Grade multiple at once
- Send group feedback

---

## 📤 Submissions Review

**Route**: `/admin/submissions`  
**Component**: `SubmissionsReview`

### Features

#### Dashboard View
- Pending submissions count
- Overdue submissions alert
- Recent submissions feed

#### Grading Interface
- Student name and course
- Assignment details
- Submission content preview
  - File viewer (PDF, images, code)
  - Video embeds
  - Link previews
  - Text displays
- Grade input field
- Feedback text editor (rich text)
- Submission date and time

#### Scoring Options
- Numeric scores (0-100)
- Rubric-based scoring
- Letter grades (if configured)
- Pass/fail options

#### Feedback Actions
- Save as draft
- Submit grade and feedback
- Request resubmission
- Send to student with notification

#### Reports
- Submission completion rate by course
- Average grades by assignment
- Student performance trends
- Overdue submission alerts

---

## 📢 Announcements Manager

**Route**: `/admin/announcements`  
**Component**: `AnnouncementsManager`

### Features

#### Create Announcement
- **Content**
  - Title
  - Message (rich text editor)
  - Category (general, course-specific, deadline, etc.)

- **Targeting**
  - Recipient groups (all students, specific course, specific cohort)
  - Send to mentors/team only
  - Schedule sending (immediate or scheduled date)

- **Media**
  - Attach images
  - Embed videos
  - Add links

#### Send Announcement
- Immediate or scheduled sending
- Email notification integration
- In-app notification
- Push notifications (if app)

#### View History
- List of all announcements
- View engagement (opens, clicks)
- See recipient list
- Edit or delete past announcements

#### Templates
- Save announcement as template
- Reuse common announcements
- Customize template for each use

---

## ✅ Progress Manager

**Route**: `/admin/progress`  
**Component**: `ProgressManager`

### Features

#### Overall Statistics
- Total students trained
- Average completion rate
- Success rate (% graduating)
- Average time to completion
- Cohort breakdown

#### Course Analytics
- Enrollment count per course
- Completion rate per course
- Most popular courses
- Course dropout rate
- Difficulty assessment

#### Student Performance
- Leaderboard by score
- Performance distribution (histogram)
- Identify struggling students
- High achievers recognition

#### Progress Tracking
- Visual timeline per course
- Milestone completion dates
- Task completion rates
- Time spent on assignments

#### Reports Generation
- Export progress data
- PDF reports for stakeholders
- Monthly performance summaries
- Custom report builder

---

## 🎓 Completions Manager

**Route**: `/admin/completions`  
**Component**: `CompletionManager`

### Features

#### View Completed Students
- List of graduates with completion dates
- Certificates issued
- Final scores
- Career outcomes (if tracked)

#### Generate Certificates
- Template selection
- Automatic generation
- Email to graduate
- Print option

#### Completion Verification
- Verify all requirements met
- Confirm all tasks graded
- Check minimum score achieved
- Add completion notes

#### Alumni Management
- Track graduate job placements
- Success stories
- Alumni testimonials
- Reconnect for referrals

---

## 📧 Applications Manager

**Route**: `/admin/applications`  
**Component**: `ApplicationsManager`

### Features

#### View Pending Applications
- List of new applications
- Filter by course, status, date
- Sort by name or application date

#### Application Details
- Student information
- Course selection
- Cover letter/essay
- Experience level
- Contact information

#### Application Actions
- **Approve**: Add to course
  - Enrollment confirmation
  - Email student
  - Send welcome materials

- **Reject**: Decline application
  - Provide feedback (optional)
  - Suggest alternative course
  - Keep for future consideration

- **Request Information**: Ask for additional details
  - Follow-up questions
  - Document upload request

#### Email Student
- Approval/rejection notice
- Enrollment details
- Next steps
- Contact support info

#### Bulk Actions
- Approve/reject multiple
- Send group notifications
- Export applicants

---

## 👨‍💼 Team Members Manager

**Route**: `/admin/team-members`  
**Component**: `TeamMembersManager`

### Features

#### Manage Mentors
- Add new mentor/staff
- Assign to students
- Set expertise areas
- Configure availability

#### Edit Team Member
- Name, email, phone
- Title, bio, photo
- Courses assigned
- Student load

#### Permissions
- Set role (admin, mentor, staff)
- Configure feature access
- Approve submissions authority
- Analytics access level

#### Contact Info
- Send messages
- Schedule meetings
- View performance metrics

---

## 🛍️ Products Manager

**Route**: `/admin/products`  
**Component**: `ProductsManager`

### Features

#### Create Product
- Course certifications
- Training bundles
- Add-on services
- Career packages

#### Details
- Product name and description
- Pricing
- Included courses
- Benefits/features
- Target audience

#### Management
- Edit product details
- Activate/deactivate
- View purchase history
- Set inventory (if applicable)

---

## 📰 Promotional Popups Manager

**Route**: `/admin/promotional-popups`  
**Component**: `PromotionalPopupManager`

### Features

#### Create Campaign
- Popup title and message
- Call-to-action button
- Target page or context
- Display frequency

#### Campaign Settings
- Start and end dates
- Show to new visitors only
- Show after delay (seconds)
- Display count limit per session

#### Target Audience
- All visitors
- Logged-in students only
- Desktop/mobile specific
- Geographic targeting

#### Analytics
- View campaign impressions
- Click-through rate
- Conversion tracking
- A/B test results

#### Manage Campaigns
- Enable/disable active campaigns
- View performance
- Edit and reschedule
- Archive old campaigns

---

## 🏆 Trainees Manager

**Route**: `/admin/trainees`  
**Component**: `TraineesManager`

### Features

#### View Cohorts
- List of trainee cohorts by start date
- Cohort status (active, completed, pending)
- Count of students per cohort
- Completion rates

#### Cohort Details
- Cohort name and ID
- Course assigned
- Start date, end date
- Mentor assignments
- Enrollment list

#### Manage Cohort
- Create new cohort
- Edit cohort details
- Assign mentors
- Modify timeline
- View progress
- Send group announcements

#### Performance Analytics
- Cohort completion rate
- Average student score
- Assignment completion trends
- Milestone tracking
- Identify at-risk students

---

## Admin Server Actions

**Location**: `app/admin/actions.ts`

Server-side operations called by admin components:

```ts
// Course operations
async function createCourse(data: CourseInput)
async function updateCourse(id: string, data: Partial<CourseInput>)
async function deleteCourse(id: string)
async function publishCourse(id: string)

// Student operations
async function updateStudentStatus(studentId: string, status: string)
async function sendStudentMessage(studentId: string, message: string)
async function bulkUpdateStudents(studentIds: string[], updates: object)

// Task and submission operations
async function createTask(data: TaskInput)
async function submitGrade(submissionId: string, grade: number, feedback: string)
async function requestResubmission(submissionId: string, reason: string)

// Announcement operations
async function createAnnouncement(data: AnnouncementInput)
async function scheduleAnnouncement(id: string, sendAt: Date)
async function sendAnnouncement(id: string)

// Application operations
async function approveApplication(applicationId: string)
async function rejectApplication(applicationId: string, reason?: string)
async function requestApplicationInfo(applicationId: string, questions: string[])
```

---

## Access Control

Admin features require authentication and admin role:

```ts
// In route handler or server action
const { data: { user } } = await supabase.auth.getUser();
const isAdmin = await checkAdminRole(user?.id);

if (!isAdmin) {
  throw new Error('Unauthorized - Admin access required');
}
```

---

## Best Practices

1. **Always verify permissions** before allowing admin actions
2. **Log all changes** for audit trail
3. **Provide confirmation** before destructive actions
4. **Send notifications** to affected users
5. **Cache data** for performance
6. **Implement pagination** for large datasets
7. **Add search/filter** for easy navigation
8. **Show success/error** messages clearly
9. **Backup data** before bulk operations
10. **Monitor performance** of admin pages

---

See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) and [DATABASE.md](DATABASE.md) for related information.
