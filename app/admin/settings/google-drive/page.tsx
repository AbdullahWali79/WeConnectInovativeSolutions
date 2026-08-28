import { redirect } from "next/navigation";
import { GoogleDriveSettingsPanel } from "@/components/admin/google-drive-settings";
import { getCurrentUserProfile } from "@/lib/admin-access";

export default async function GoogleDriveSettingsPage() {
  const profile = await getCurrentUserProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin/settings/google-drive");
  if (profile.role !== "admin" || profile.status !== "approved") redirect("/admin");
  return <GoogleDriveSettingsPanel />;
}

