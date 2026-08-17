import { SeatReservationsManager } from "@/components/admin/seat-reservations-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function SeatReservationsPage() {
  await requireAdminPage("/admin/seat-reservations");
  return <SeatReservationsManager />;
}
