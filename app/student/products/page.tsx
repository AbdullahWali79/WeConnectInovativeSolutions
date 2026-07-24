import { redirect } from "next/navigation";
import { ProductsManager } from "@/components/admin/products-manager";
import { getCurrentUserProfile, getEffectivePermissions } from "@/lib/admin-access";
import { getWhatsAppSettingsOrDefaults } from "@/lib/whatsapp/settings";

export default async function StudentProductsPage() {
  const profile = await getCurrentUserProfile();
  const permissions = await getEffectivePermissions(profile);

  if (profile.role !== "student" || !permissions.includes("products.view")) {
    redirect("/student");
  }

  const whatsappSettings = await getWhatsAppSettingsOrDefaults(profile.id);

  return (
    <ProductsManager
      currentRole={profile.role}
      permissions={permissions}
      defaultWhatsAppNumber={whatsappSettings.whatsapp_number}
    />
  );
}
