import { AccessDenied } from "@/components/admin/access-denied";
import { ProductsManager } from "@/components/admin/products-manager";
import { requirePermissionPage } from "@/lib/admin-access";
import { getWhatsAppSettingsOrDefaults } from "@/lib/whatsapp/settings";

export default async function AdminProductsPage() {
  const access = await requirePermissionPage("/admin/products", "products.view");

  if (!access.granted) {
    return <AccessDenied description="Product access has not been enabled for this teacher account." />;
  }

  const whatsappSettings = await getWhatsAppSettingsOrDefaults(access.profile.id);

  return <ProductsManager currentRole={access.profile.role} permissions={access.permissions} defaultWhatsAppNumber={whatsappSettings.whatsapp_number} />;
}
