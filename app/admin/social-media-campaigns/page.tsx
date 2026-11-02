import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { CampaignsManager } from "@/components/admin/social-media-campaigns/campaigns-manager";
import { loadCampaignWorkspace } from "@/lib/social-campaigns-data";

export default async function SocialMediaCampaignsPage() {
  const access = await requirePermissionPage("/admin/social-media-campaigns", "social_campaigns.view");

  if (!access.granted) {
    return <AccessDenied description="You do not have permission to access Social Media Campaigns." />;
  }

  // Fetch during the server render so the list is painted with the page instead
  // of showing a spinner while a client-side server action round trips.
  const workspace = await loadCampaignWorkspace({
    teacherId: access.profile.role === "teacher" ? access.profile.id : null,
  });

  return (
    <CampaignsManager
      role={access.profile.role}
      initialCampaigns={workspace.success ? workspace.campaigns : []}
      initialTeachers={workspace.success ? workspace.teachers : []}
      initialError={workspace.success ? "" : workspace.error}
    />
  );
}
