import { getMailSettingsOrDefaults } from "./mail-settings";
import { getApplicationSiteUrl, sendGoogleScriptMail } from "./google-script-mailer";

export type StudentRegistrationAlertInput = {
  studentName: string;
  studentEmail: string;
  courseName?: string | null;
  registeredAt?: string;
};

export async function sendStudentRegistrationAlert(input: StudentRegistrationAlertInput) {
  const settings = await getMailSettingsOrDefaults();

  if (settings.send_registration_alerts === false) {
    return { skipped: true, reason: "Student registration alerts are disabled by admin" };
  }

  await sendGoogleScriptMail({
    type: "new_student_registration",
    studentName: input.studentName,
    studentEmail: input.studentEmail,
    courseName: input.courseName || "Not selected",
    registeredAt: input.registeredAt || new Date().toISOString(),
    adminDashboardUrl: `${getApplicationSiteUrl()}/admin/applications`,
    emailHeading: "New Student Registration",
    emailSummary:
      "A new student has successfully registered on the WeConnect platform and is awaiting review.",
  }, {
    recipientEmail: settings.admin_email,
  });

  return { success: true };
}
