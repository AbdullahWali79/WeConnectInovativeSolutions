import { PublicHeader } from "@/components/public/public-header";
import { TeamMembersGrid, fallbackTeamMembers } from "@/components/public/team-members-grid";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Our AI Automation & Software Team",
  description: "Meet the team delivering AI automation, workflow integration and custom software solutions for businesses worldwide.",
  path: "/team",
});

export default function TeamPage() {
  return (
    <main className="bg-[var(--wc-bg)] text-on-surface min-h-screen">
      <PublicHeader />
      <TeamMembersGrid initialMembers={fallbackTeamMembers} />
    </main>
  );
}
