import { requireAdminPage } from "@/lib/admin-access";
import { getLandingVideoSettings } from "@/lib/landing-video";
import { LandingVideoManager } from "@/components/admin/landing-video-manager";

export const metadata = {
  title: "Intro Video Settings | Admin | WeConnect",
  description: "Manage the landing page intro video link, visibility, and section details.",
};

export default async function AdminIntroVideoSettingsPage() {
  await requireAdminPage("/admin/settings/intro-video");
  const settings = await getLandingVideoSettings();

  return (
    <div className="mx-auto max-w-6xl">
      <LandingVideoManager initialSettings={settings} />
    </div>
  );
}
