import { PublicHeader } from "@/components/public/public-header";
import { TeamMembersGrid, fallbackTeamMembers } from "@/components/public/team-members-grid";

export default function TeamPage() {
  return (
    <main className="bg-[#030B1C] text-white min-h-screen">
      <PublicHeader />
      <TeamMembersGrid initialMembers={fallbackTeamMembers} />
    </main>
  );
}
