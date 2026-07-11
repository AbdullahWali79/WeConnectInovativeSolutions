import type { Application } from "@/lib/supabase/types";

export type ApprovedStudentMessageInput = Pick<Application, "full_name" | "phone" | "email"> & {
  courseName?: string | null;
  status?: string | null;
};

export const defaultApprovedStudentWhatsappTemplate = [
  "Hello {{student_name}},",
  "",
  "Welcome to WeConnect Innovation!",
  "Course: {{course_name}}.",
  "Your admission has been approved.",
  "You may now join WeConnect Software House.",
  "Address: Sharqi Colony, back side of Cookooz Cafe, near Main Masjid.",
  "",
  "Your internship record will begin once you submit your fee payment and upload your GitHub repository link.",
  "Please also share a screenshot of the payment receipt.",
  "Jazz Cash: 03046983794",
  "Account Title: Muhammad Abdullah",
].join("\n");

export const defaultRegistrationWhatsAppTemplate = [
  "Hello,",
  "",
  "A new student registration has been received.",
  "",
  "Student Name: {{student_name}}",
  "Course: {{course_name}}",
  "Phone: {{phone}}",
  "Status: {{status}}",
  "",
  "Please review this application from the admin panel.",
].join("\n");

export const defaultPendingSummaryWhatsAppTemplate = [
  "Hello,",
  "",
  "Daily pending task summary:",
  "",
  "Total Pending Tasks: {{total_pending_tasks}}",
  "Overdue Tasks: {{overdue_tasks}}",
  "Submitted but Ungraded: {{submitted_but_ungraded}}",
  "Date: {{date_label}}",
  "",
  "Please review them from the admin dashboard.",
].join("\n");

export function normalizeTemplateText(value: string | null | undefined) {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

export function renderWhatsAppTemplate(template: string, variables: Record<string, string | number | null | undefined>) {
  const normalized = normalizeTemplateText(template);
  const fallback = normalizeTemplateText(defaultApprovedStudentWhatsappTemplate);
  const source = normalized || fallback;

  return source.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === null || value === undefined || value === "" ? "" : String(value);
  });
}

export function buildApprovedStudentWhatsAppMessage(
  application: Pick<Application, "full_name" | "phone" | "email">,
  courseTitle?: string | null,
  template = defaultApprovedStudentWhatsappTemplate,
) {
  return renderWhatsAppTemplate(template, {
    student_name: application.full_name,
    course_name: courseTitle || "Not selected",
    phone: application.phone,
    email: application.email,
    status: "Approved",
  });
}

export function buildApprovedStudentWhatsAppPreview(template: string) {
  return renderWhatsAppTemplate(template, {
    student_name: "Ali Khan",
    course_name: "Python Development Pro Bootcamp",
    phone: "+92xxxxxxxxxx",
    email: "ali@example.com",
    status: "Approved",
  });
}

export function buildRegistrationWhatsAppPreview(template: string) {
  return renderWhatsAppTemplate(template, {
    student_name: "Ali Khan",
    course_name: "Web Development",
    phone: "+92xxxxxxxxxx",
    status: "Pending Review",
  });
}

export function buildPendingSummaryWhatsAppPreview(template: string) {
  return renderWhatsAppTemplate(template, {
    total_pending_tasks: 12,
    overdue_tasks: 3,
    submitted_but_ungraded: 4,
    date_label: new Date().toLocaleDateString("en-PK"),
  });
}
