import { SoftwareHousesManager } from "@/components/admin/software-houses-manager";

export const metadata = {
  title: "Software Houses – Admin | WeConnect",
  description: "Manage software houses for internship letter generation.",
};

export default function SoftwareHousesPage() {
  return <SoftwareHousesManager />;
}
