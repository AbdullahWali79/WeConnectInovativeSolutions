import { redirect } from "next/navigation";
import { GoogleFormProjectSettingsPanel } from "@/components/admin/google-form-project-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";

export default async function GoogleFormProjectSettingsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/settings/google-form-project");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  return <GoogleFormProjectSettingsPanel />;
}

