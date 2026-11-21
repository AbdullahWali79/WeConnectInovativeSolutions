import { PageHeader } from "@/components/page-header";
import { CampaignPortal } from "@/components/student/campaign-portal";

export const metadata = { robots: { index: false, follow: false } };

export default function StudentCampaignsPage() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="hidden sm:block">
        <PageHeader
          eyebrow="Client work"
          title="Social Media Campaigns"
          description="See the plan your teacher has shared, collaborate with your team, and submit your daily work."
        />
      </div>
      <CampaignPortal />
    </div>
  );
}
