import { CampaignPortal } from "@/components/student/campaign-portal";

export const metadata = { robots: { index: false, follow: false } };

export default function StudentCampaignsPage() {
  return (
    <div className="w-full">
      <CampaignPortal />
    </div>
  );
}
