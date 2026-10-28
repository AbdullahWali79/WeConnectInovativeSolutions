import { PageHeader } from "@/components/page-header";
import { CampaignPortal } from "@/components/student/campaign-portal";

export const metadata = { robots: { index: false, follow: false } };

export default function StudentCampaignsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Client work"
        title="Social Media Campaigns"
        description="See the plan your teacher has shared, upload your video to your own Drive folder, and submit the published post link."
      />
      <CampaignPortal />
    </div>
  );
}
