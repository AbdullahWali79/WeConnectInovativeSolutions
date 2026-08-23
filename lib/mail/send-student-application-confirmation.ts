import { getApplicationSiteUrl, sendGoogleScriptMail } from "./google-script-mailer";

export type StudentApplicationConfirmationInput = {
  studentName: string;
  studentEmail: string;
  courseName?: string | null;
  appliedAt?: string;
};

export async function sendStudentApplicationConfirmation(input: StudentApplicationConfirmationInput) {
  const courseName = input.courseName || "Selected course";

  await sendGoogleScriptMail(
    {
      // Keep the deployed webhook's existing registration template contract while
      // directing this personalized copy to the student's own email address.
      type: "new_student_registration",
      audience: "student",
      emailHeading: "Welcome to We Connect Innovative Solutions",
      emailSummary: `Hi ${input.studentName}, your application for ${courseName} has been received successfully. Our team will review it and notify you after approval. You can use the password you created to log in once your application is approved.`,
      studentName: input.studentName,
      studentEmail: input.studentEmail,
      courseName,
      applicationStatus: "Pending review",
      appliedAt: input.appliedAt || new Date().toISOString(),
      loginUrl: `${getApplicationSiteUrl()}/login`,
      supportUrl: `${getApplicationSiteUrl()}/contact`,
    },
    { recipientEmail: input.studentEmail },
  );

  return { success: true };
}
