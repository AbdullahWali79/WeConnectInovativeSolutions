import { AccessDenied } from "@/components/admin/access-denied";
import { requirePermissionPage } from "@/lib/admin-access";
import { CampaignsManager } from "@/components/admin/social-media-campaigns/campaigns-manager";

export default async function SocialMediaCampaignsPage() {
  const access = await requirePermissionPage("/admin/social-media-campaigns", "social_campaigns.view");

  if (!access.granted) {
    return <AccessDenied description="You do not have permission to access Social Media Campaigns." />;
  }

  return <CampaignsManager role={access.profile.role} />;
}
