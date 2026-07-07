"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendStudentRegistrationAlert } from "@/lib/mail/send-student-registration-alert";

export type SubmitStudentApplicationInput = {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  course_id: string;
  message?: string;
};

type SubmitStudentApplicationResult =
  | { success: true; error: null; warning?: string }
  | { success: false; error: string };

const emailPattern = /^\S+@\S+\.\S+$/;

export async function submitStudentApplication(input: SubmitStudentApplicationInput): Promise<SubmitStudentApplicationResult> {
  const fullName = input.full_name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const password = input.password || "";
  const courseId = input.course_id.trim();
  const message = input.message?.trim() || null;

  if (!fullName || !email || !phone || !courseId || password.length < 6) {
    return { success: false, error: "Full name, email, phone, password (min 6), and course are required." };
  }

  if (!emailPattern.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { data: existingUser } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existingUser) {
    return { success: false, error: "An account with this email already exists. Please log in or use a different email." };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      role: "student",
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || "Failed to create student account." };
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    phone,
    role: "student",
    status: "pending",
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { success: false, error: profileError.message || "Failed to create student profile." };
  }

  const { data: course } = await supabaseAdmin.from("courses").select("title").eq("id", courseId).maybeSingle();
  const { error: appError } = await supabaseAdmin.from("applications").insert({
    full_name: fullName,
    email,
    phone,
    course_id: courseId,
    message,
  });

  if (appError) {
    return { success: false, error: appError.message };
  }

  const warnings: string[] = [];

  try {
    await sendStudentRegistrationAlert({
      studentName: fullName,
      studentEmail: email,
      courseName: course?.title ?? "Not selected",
      registeredAt: new Date().toISOString(),
    });
  } catch (mailError) {
    console.error("Student registration email failed", mailError);
    warnings.push(`admin email failed: ${mailError instanceof Error ? mailError.message : "Unknown mail error"}`);
  }

  if (warnings.length > 0) {
    return {
      success: true,
      error: null,
      warning: `Application submitted, but ${warnings.join("; ")}.`,
    };
  }

  return { success: true, error: null };
}
