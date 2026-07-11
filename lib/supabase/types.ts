export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "admin" | "teacher" | "student";
export type BrandingScope = "landing" | "admin" | "student";
export type ProfileStatus = "pending" | "approved" | "rejected";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type TaskStatus = "pending" | "in_progress" | "submitted" | "reviewed" | "revision_required" | "rejected";
export type TaskWorkflowType = "assigned" | "daily";
export type ResourceType = "video" | "google_doc" | "google_sheet" | "image" | "github" | "custom";
export type SubmissionStatus = "submitted" | "reviewed" | "revision_required" | "rejected";
export type CourseStatus = "active" | "inactive";
export type GenericStatus = "active" | "inactive";
export type ProductBadge = "premium" | "hot" | "new" | "free" | "paid";
export type TraineeStatus = "active" | "completed" | "pending" | "dropped";
export type HelpingVideoStatus = "active" | "inactive";
export type ClientHuntSpecialization =
  | "web_development"
  | "app_development"
  | "seo"
  | "gmb"
  | "social_media_marketing"
  | "automation"
  | "ecommerce"
  | "other";
export type ClientHuntLeadStatus = "pending" | "approved" | "rejected" | "duplicate";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  indeed_url: string | null;
  weak_areas: string | null;
  next_focus: string | null;
  follow_up_date: string | null;
  client_hunting_specialization: ClientHuntSpecialization | null;
  client_hunting_daily_target: number | null;
  role: Role;
  status: ProfileStatus;
  admin_status: "approved" | "active" | "completed" | "inactive" | null;
  is_fee_blocked?: boolean;
  fee_block_reason?: string | null;
  fee_blocked_at?: string | null;
  created_at: string;
};

export type UserPermission = {
  id: string;
  user_id: string;
  permission_key: string;
  enabled: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseCategory = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  duration: string | null;
  level: string | null;
  status: CourseStatus;
  created_at: string;
};

export type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  course_id: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  final_score: number;
  target_tasks: number;
  completed_at: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  course_id: string;
  student_id: string;
  workflow_type: TaskWorkflowType;
  title: string;
  description: string | null;
  deadline: string | null;
  max_score: number;
  status: TaskStatus;
  created_at: string;
};

export type TaskResource = {
  id: string;
  task_id: string;
  resource_type: ResourceType;
  title: string | null;
  url: string;
  created_at: string;
};

export type Submission = {
  id: string;
  task_id: string;
  student_id: string;
  explanation: string | null;
  github_url: string | null;
  google_doc_url: string | null;
  google_sheet_url: string | null;
  image_url: string | null;
  youtube_url: string | null;
  proof_url: string | null;
  proof_links?: string[] | null;
  status: SubmissionStatus;
  score: number;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

export type ProgressReport = {
  id: string;
  student_id: string;
  course_id: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  average_score: number;
  progress_percentage: number;
  target_tasks: number;
  updated_at: string;
};

export type TeacherCourseAssignment = {
  id: string;
  teacher_id: string;
  course_id: string;
  assigned_by: string | null;
  created_at: string;
};

export type StudentFeeStatus = "pending" | "paid" | "partial" | "overdue" | "waived";

export type StudentFeeRecord = {
  id: string;
  student_id: string;
  enrollment_id: string | null;
  course_id: string;
  month_key: string;
  amount_due: number;
  amount_paid: number;
  due_date: string | null;
  paid_at: string | null;
  status: StudentFeeStatus;
  payment_method: string | null;
  notes: string | null;
  blocked: boolean;
  blocked_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompletedStudent = {
  id: string;
  student_id: string;
  course_id: string;
  final_score: number;
  progress_percentage: number;
  is_public: boolean;
  completed_at: string;
};

export type InternshipLetterGender = "Male" | "Female";

export type InternshipLetter = {
  id: string;
  student_name: string;
  father_name: string;
  gender: InternshipLetterGender;
  student_id: string;
  internship_role: string;
  joining_date: string;
  completion_date: string;
  attendance_marks: number;
  technical_marks: number;
  total_marks: number;
  letter_date: string;
  hr_manager_name: string | null;
  ceo_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionalPopup = {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  show_on: "landing" | "student" | "both";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminMailSettings = {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  send_registration_alerts: boolean;
  send_daily_pending_summary: boolean;
  daily_summary_time: string;
  timezone: string;
  last_daily_summary_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailNotificationLog = {
  id: string;
  email_type: string;
  recipient_email: string;
  status: "sent" | "failed";
  payload: Json | null;
  error_message: string | null;
  sent_at: string;
};

export type FeedbackAudienceType = "student" | "client";
export type FeedbackStatus = "pending" | "approved" | "rejected";

export type FeedbackEntry = {
  id: string;
  audience_type: FeedbackAudienceType;
  category: string;
  name: string;
  email: string | null;
  phone: string | null;
  rating: number;
  title: string | null;
  message: string;
  status: FeedbackStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminNotificationSettings = {
  id: string;
  admin_user_id: string | null;
  whatsapp_number: string;
  registration_alert_enabled: boolean;
  pending_task_alert_enabled: boolean;
  pending_task_alert_time: string;
  pending_task_alert_timezone: string;
  pending_task_alert_frequency: "daily";
  registration_message_template: string;
  pending_summary_message_template: string;
  approved_student_message_template: string;
  last_pending_task_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppNotificationLog = {
  id: string;
  recipient_number: string;
  alert_type: string;
  template_name: string | null;
  message_body: string | null;
  status: "queued" | "sent" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "urgent";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  image_url: string | null;
  image_github_path?: string | null;
  image_github_url?: string | null;
  image_cdn_url?: string | null;
  portfolio_url: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  bio: string | null;
  reports_to: string | null;
  status: GenericStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  image_github_path?: string | null;
  image_github_url?: string | null;
  image_cdn_url?: string | null;
  short_description: string | null;
  full_description: string | null;
  price_or_access_type: string | null;
  badge: ProductBadge;
  product_link: string | null;
  features: string[] | null;
  status: GenericStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Blog = {
  id: string;
  title: string;
  slug: string;
  target_keyword: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_github_path?: string | null;
  cover_image_github_url?: string | null;
  cover_image_cdn_url?: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  display_order: number;
  published: boolean;
  featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Trainee = {
  id: string;
  name: string;
  email: string;
  course_id: string | null;
  enrollment_id: string | null;
  university?: string | null;
  training_duration?: string | null;
  assigned_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  progress_percentage: number;
  status: TraineeStatus;
  created_at: string;
  updated_at: string;
};

export type HelpingVideo = {
  id: string;
  title: string;
  youtube_url: string;
  description: string | null;
  status: HelpingVideoStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ManualEnrollment = {
  id: string;
  full_name: string;
  father_name: string | null;
  email: string | null;
  phone: string | null;
  course_name: string;
  internship_role: string | null;
  joining_date: string | null;
  completion_date: string | null;
  final_score: number;
  grade: string | null;
  attendance_marks: number;
  technical_marks: number;
  total_marks: number;
  certificate_issued: boolean;
  show_on_completed_page: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ManualEnrollmentComment = {
  id: string;
  enrollment_id: string;
  commenter_email: string;
  commenter_name: string;
  comment: string;
  created_at: string;
};

export type AdminSignatureSettings = {
  id: string;
  admin_user_id: string | null;
  signature_url: string | null;
  stamp_url: string | null;
  hr_signature_url: string | null;
  updated_at: string;
};

export type BrandingSettings = {
  id: string;
  scope: BrandingScope;
  logo_url: string | null;
  background_color: string;
  surface_color: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type BrandingSettingsSnapshot = Omit<BrandingSettings, "id"> & {
  id: string | null;
};

export type SoftwareHouse = {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  watermark_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  address: string | null;
  hr_manager_name: string | null;
  ceo_name: string | null;
  header_color1: string | null;
  header_color2: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type CompletedStudentShowcase = {
  id: string;
  student_id: string;
  course_id: string;
  student_name: string | null;
  student_email?: string | null;
  course_name: string | null;
  final_score: number | null;
  progress_percentage: number | null;
  completed_at: string | null;
};

export type ClientHuntScenario = {
  id: string;
  title: string;
  description: string | null;
  specialization: ClientHuntSpecialization;
  target_count: number;
  instructions: string | null;
  scenario_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientHuntLead = {
  id: string;
  student_id: string;
  scenario_id: string | null;
  specialization: ClientHuntSpecialization;
  target_areas: ClientHuntSpecialization[] | null;
  client_name: string;
  business_name: string;
  website_url: string | null;
  gmb_url: string | null;
  facebook_page_url: string | null;
  address: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  note: string | null;
  why_this_client: string | null;
  status: ClientHuntLeadStatus;
  reviewer_notes: string | null;
  duplicate_of_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Partial<UserPermission> & { user_id: string; permission_key: string };
        Update: Partial<UserPermission>;
        Relationships: [];
      };
      teacher_course_assignments: {
        Row: TeacherCourseAssignment;
        Insert: Partial<TeacherCourseAssignment> & { teacher_id: string; course_id: string };
        Update: Partial<TeacherCourseAssignment>;
        Relationships: [];
      };
      course_categories: {
        Row: CourseCategory;
        Insert: Partial<CourseCategory> & { name: string };
        Update: Partial<CourseCategory>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: Partial<Course> & { title: string };
        Update: Partial<Course>;
        Relationships: [];
      };
      applications: {
        Row: Application;
        Insert: Partial<Application> & { full_name: string; email: string; phone: string };
        Update: Partial<Application>;
        Relationships: [];
      };
      enrollments: {
        Row: Enrollment;
        Insert: Partial<Enrollment> & { student_id: string; course_id: string };
        Update: Partial<Enrollment>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & { course_id: string; student_id: string; title: string };
        Update: Partial<Task>;
        Relationships: [];
      };
      task_resources: {
        Row: TaskResource;
        Insert: Partial<TaskResource> & { task_id: string; url: string };
        Update: Partial<TaskResource>;
        Relationships: [];
      };
      submissions: {
        Row: Submission;
        Insert: Partial<Submission> & { task_id: string; student_id: string };
        Update: Partial<Submission>;
        Relationships: [];
      };
      progress_reports: {
        Row: ProgressReport;
        Insert: Partial<ProgressReport> & { student_id: string; course_id: string };
        Update: Partial<ProgressReport>;
        Relationships: [];
      };
      student_fee_records: {
        Row: StudentFeeRecord;
        Insert: Partial<StudentFeeRecord> & { student_id: string; course_id: string; month_key: string };
        Update: Partial<StudentFeeRecord>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & { title: string; message: string };
        Update: Partial<Announcement>;
        Relationships: [];
      };
      promotional_popups: {
        Row: PromotionalPopup;
        Insert: Partial<PromotionalPopup> & { title: string; message: string };
        Update: Partial<PromotionalPopup>;
        Relationships: [];
      };
      admin_mail_settings: {
        Row: AdminMailSettings;
        Insert: Partial<AdminMailSettings>;
        Update: Partial<AdminMailSettings>;
        Relationships: [];
      };
      email_notification_logs: {
        Row: EmailNotificationLog;
        Insert: Partial<EmailNotificationLog> & { email_type: string; recipient_email: string };
        Update: Partial<EmailNotificationLog>;
        Relationships: [];
      };
      feedback_entries: {
        Row: FeedbackEntry;
        Insert: Partial<FeedbackEntry> & { audience_type: FeedbackAudienceType; category: string; name: string; message: string };
        Update: Partial<FeedbackEntry>;
        Relationships: [];
      };
      admin_notification_settings: {
        Row: AdminNotificationSettings;
        Insert: Partial<AdminNotificationSettings>;
        Update: Partial<AdminNotificationSettings>;
        Relationships: [];
      };
      whatsapp_notification_logs: {
        Row: WhatsAppNotificationLog;
        Insert: Partial<WhatsAppNotificationLog> & { recipient_number: string; alert_type: string };
        Update: Partial<WhatsAppNotificationLog>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: Partial<TeamMember> & { name: string; role: string };
        Update: Partial<TeamMember>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string; category: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      blogs: {
        Row: Blog;
        Insert: Partial<Blog> & { title: string; slug: string; content: string };
        Update: Partial<Blog>;
        Relationships: [];
      };
      trainees: {
        Row: Trainee;
        Insert: Partial<Trainee> & { name: string; email: string };
        Update: Partial<Trainee>;
        Relationships: [];
      };
      helping_videos: {
        Row: HelpingVideo;
        Insert: Partial<HelpingVideo> & { title: string; youtube_url: string };
        Update: Partial<HelpingVideo>;
        Relationships: [];
      };
      manual_enrollments: {
        Row: ManualEnrollment;
        Insert: Partial<ManualEnrollment> & { full_name: string; course_name: string };
        Update: Partial<ManualEnrollment>;
        Relationships: [];
      };
      manual_enrollment_comments: {
        Row: ManualEnrollmentComment;
        Insert: Partial<ManualEnrollmentComment> & { enrollment_id: string; commenter_email: string; commenter_name: string; comment: string };
        Update: Partial<ManualEnrollmentComment>;
        Relationships: [];
      };
      admin_signature_settings: {
        Row: AdminSignatureSettings;
        Insert: Partial<AdminSignatureSettings>;
        Update: Partial<AdminSignatureSettings>;
        Relationships: [];
      };
      branding_settings: {
        Row: BrandingSettings;
        Insert: Partial<BrandingSettings> & { scope: BrandingScope };
        Update: Partial<BrandingSettings>;
        Relationships: [];
      };
      software_houses: {
        Row: SoftwareHouse;
        Insert: Partial<SoftwareHouse> & { name: string };
        Update: Partial<SoftwareHouse>;
        Relationships: [];
      };
      completed_students: {
        Row: CompletedStudent;
        Insert: Partial<CompletedStudent> & { student_id: string; course_id: string };
        Update: Partial<CompletedStudent>;
        Relationships: [];
      };
      client_hunt_scenarios: {
        Row: ClientHuntScenario;
        Insert: Partial<ClientHuntScenario> & { title: string; specialization: ClientHuntSpecialization };
        Update: Partial<ClientHuntScenario>;
        Relationships: [];
      };
      client_hunt_leads: {
        Row: ClientHuntLead;
        Insert:
          Partial<ClientHuntLead> & {
            student_id: string;
            specialization: ClientHuntSpecialization;
            client_name: string;
            business_name: string;
          };
        Update: Partial<ClientHuntLead>;
        Relationships: [];
      };
      internship_letters: {
        Row: InternshipLetter;
        Insert: Partial<InternshipLetter> & {
          student_name: string;
          father_name: string;
          gender: InternshipLetterGender;
          student_id: string;
          internship_role: string;
          joining_date: string;
          completion_date: string;
        };
        Update: Partial<InternshipLetter>;
        Relationships: [];
      };
    };
    Views: {
      completed_student_showcase: {
        Row: CompletedStudentShowcase;
        Relationships: [];
      };
    };
    Functions: {
      approve_application: {
        Args: { application_id: string };
        Returns: null;
      };
      can_request_student_access: {
        Args: { target_email: string };
        Returns: boolean;
      };
      has_permission: {
        Args: { target_user_id: string; target_permission_key: string };
        Returns: boolean;
      };
      has_any_permission: {
        Args: { target_user_id: string; target_permission_keys: string[] };
        Returns: boolean;
      };
      reject_application: {
        Args: { application_id: string };
        Returns: null;
      };
      mark_course_completed: {
        Args: { target_student_id: string; target_course_id: string };
        Returns: null;
      };
      refresh_student_progress: {
        Args: { target_student_id: string; target_course_id: string };
        Returns: null;
      };
      submit_task: {
        Args: {
          target_task_id: string;
          submission_explanation: string | null;
          submission_github_url?: string | null;
          submission_google_doc_url?: string | null;
          submission_google_sheet_url?: string | null;
          submission_image_url?: string | null;
          submission_youtube_url?: string | null;
          submission_proof_url?: string | null;
        };
        Returns: null;
      };
      submit_student_task: {
        Args: {
          target_course_id: string;
          task_title: string;
          task_description?: string | null;
          submission_explanation?: string | null;
          submission_github_url?: string | null;
          submission_google_doc_url?: string | null;
          submission_google_sheet_url?: string | null;
          submission_image_url?: string | null;
          submission_youtube_url?: string | null;
          submission_proof_url?: string | null;
          submission_proof_links?: Json | null;
        };
        Returns: string;
      };
      check_client_hunt_duplicate: {
        Args: {
          target_student_id: string;
          target_client_name?: string | null;
          target_business_name?: string | null;
          target_website_url?: string | null;
          target_gmb_url?: string | null;
          target_facebook_page_url?: string | null;
          target_address?: string | null;
          target_phone_number?: string | null;
          target_whatsapp_number?: string | null;
          target_email?: string | null;
        };
        Returns: {
          is_duplicate: boolean;
          match_type: string | null;
          match_value: string | null;
          matched_lead_id: string | null;
        }[];
      };
      submit_client_hunt_lead: {
        Args: {
          target_scenario_id: string | null;
          target_specialization: ClientHuntSpecialization;
          target_client_name: string;
          target_business_name: string;
          target_website_url?: string | null;
          target_gmb_url?: string | null;
          target_facebook_page_url?: string | null;
          target_address?: string | null;
          target_phone_number?: string | null;
          target_whatsapp_number?: string | null;
          target_email?: string | null;
          target_note?: string | null;
          target_why_this_client?: string | null;
          target_target_areas?: ClientHuntSpecialization[] | null;
        };
        Returns: string;
      };
      approve_client_hunt_lead: {
        Args: { target_lead_id: string };
        Returns: null;
      };
      bulk_approve_client_hunt_leads: {
        Args: { target_lead_ids: string[] };
        Returns: number;
      };
      reject_client_hunt_lead: {
        Args: { target_lead_id: string; reviewer_notes?: string | null };
        Returns: null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
