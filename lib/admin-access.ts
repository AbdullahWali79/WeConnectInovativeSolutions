import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  ALL_PERMISSION_KEYS,
  isAdminOnlyPermissionKey,
  isPermissionKey,
  type PermissionKey,
} from "@/lib/admin-permissions";
import type { Profile } from "@/lib/supabase/types";

export type AdminAccessResult = {
  granted: boolean;
  profile: Profile;
  permissions: PermissionKey[];
};

function authErrorMessage() {
  return "Unauthorized. Your account does not have access to this action.";
}

function normalizePermissions(permissionKeys: readonly string[]) {
  return Array.from(new Set(permissionKeys.filter(isPermissionKey)));
}

const STUDENT_PRODUCT_PERMISSION_KEYS: PermissionKey[] = [
  "products.view",
  "products.create",
  "products.edit",
];

async function isActivePaidStudent(userId: string) {
  const supabaseAdmin = createSupabaseServiceClient();
  const { data: enrollments, error: enrollmentError } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", "active");

  if (enrollmentError) throw new Error(enrollmentError.message);
  const courseIds = Array.from(new Set((enrollments ?? []).map((enrollment) => enrollment.course_id)));
  if (courseIds.length === 0) return false;

  const { data: fees, error: feeError } = await supabaseAdmin
    .from("student_fee_records")
    .select("course_id,status,updated_at")
    .eq("student_id", userId)
    .in("course_id", courseIds)
    .order("updated_at", { ascending: false });

  if (feeError) throw new Error(feeError.message);
  const latestStatusByCourse = new Map<string, string>();
  for (const fee of fees ?? []) {
    if (!latestStatusByCourse.has(fee.course_id)) latestStatusByCourse.set(fee.course_id, fee.status);
  }

  return courseIds.some((courseId) => ["paid", "waived"].includes(latestStatusByCourse.get(courseId) ?? ""));
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  let user = authResult.data.user;

  if (authResult.error || !user) {
    const refreshResult = await supabase.auth.refreshSession();
    user = refreshResult.data.user ?? refreshResult.data.session?.user ?? null;

    if (refreshResult.error || !user) {
      throw new Error(
        "Your login session has expired. Sign out, sign in again, and retry this action.",
      );
    }
  }

  const { data: profile, error: profileError } = await createSupabaseServiceClient()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Your admin profile could not be verified.");
  }

  return profile as Profile;
}

export async function getEnabledPermissionsForUser(userId: string) {
  const supabaseAdmin = createSupabaseServiceClient();
  const { data, error } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key, enabled")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  return normalizePermissions((data ?? []).map((row) => row.permission_key));
}

export async function getEffectivePermissions(profile: Profile) {
  if (profile.status === "approved" && profile.role === "admin") {
    return [...ALL_PERMISSION_KEYS];
  }

  if (profile.status !== "approved") {
    return [];
  }

  if (profile.role === "student") {
    if (!(await isActivePaidStudent(profile.id))) return [];
    const enabledPermissions = await getEnabledPermissionsForUser(profile.id);
    return enabledPermissions.filter((permission) => STUDENT_PRODUCT_PERMISSION_KEYS.includes(permission));
  }

  if (profile.role !== "teacher") return [];

  return getEnabledPermissionsForUser(profile.id);
}

export async function isMainAdmin(userId: string) {
  const supabaseAdmin = createSupabaseServiceClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role,status")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === "admin" && data.status === "approved";
}

export async function hasPermission(userId: string, permissionKey: PermissionKey) {
  if (await isMainAdmin(userId)) {
    return true;
  }

  if (isAdminOnlyPermissionKey(permissionKey)) {
    return false;
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role,status")
    .eq("id", userId)
    .single();

  if (profileError || !profile || profile.status !== "approved") {
    return false;
  }

  if (profile.role === "student") {
    if (!STUDENT_PRODUCT_PERMISSION_KEYS.includes(permissionKey) || !(await isActivePaidStudent(userId))) {
      return false;
    }
  } else if (profile.role !== "teacher") {
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from("user_permissions")
    .select("id")
    .eq("user_id", userId)
    .eq("permission_key", permissionKey)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function requirePermission(permissionKey: PermissionKey) {
  const profile = await getCurrentUserProfile();

  if (profile.status !== "approved") {
    throw new Error(authErrorMessage());
  }

  if (profile.role === "admin") {
    return profile;
  }

  if (!["teacher", "student"].includes(profile.role) || !(await hasPermission(profile.id, permissionKey))) {
    throw new Error(authErrorMessage());
  }

  return profile;
}

export async function requireAdminOnly() {
  const profile = await getCurrentUserProfile();

  if (profile.status !== "approved" || profile.role !== "admin") {
    throw new Error(authErrorMessage());
  }

  return profile;
}

export async function requireAdminPage(nextPath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${nextPath}`);
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/admin");
  }

  return {
    granted: true,
    profile,
    permissions: await getEffectivePermissions(profile),
  } satisfies AdminAccessResult;
}

export async function requirePermissionPage(nextPath: string, permissionKey: PermissionKey): Promise<AdminAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${nextPath}`);
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  if (!profile || profile.status !== "approved" || !["admin", "teacher"].includes(profile.role)) {
    redirect("/student");
  }

  const permissions = await getEffectivePermissions(profile);
  const granted = profile.role === "admin" || permissions.includes(permissionKey);

  return { granted, profile, permissions };
}
