"use server";

import { sendStudentRegistrationAlert } from "@/lib/mail/send-student-registration-alert";

type StudentSignupAlertInput = {
  userId: string;
  email: string;
};

type StudentSignupAlertResult =
  | { success: true; error: null; warning?: string }
  | { success: false; error: string };

export async function sendStudentSignupAlert(input: StudentSignupAlertInput): Promise<StudentSignupAlertResult> {
  try {
    const email = input.email.trim().toLowerCase();

    if (!input.userId || !/^\S+@\S+\.\S+$/.test(email)) {
      return { success: false, error: "Valid signup user details are required." };
    }

    await sendStudentRegistrationAlert({
      studentName: email,
      studentEmail: email,
      courseName: "Student account signup",
      registeredAt: new Date().toISOString(),
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send signup email alert." };
  }
}
