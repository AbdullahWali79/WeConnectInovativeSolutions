import { AccessDenied } from "@/components/admin/access-denied";
import { ProductsManager } from "@/components/admin/products-manager";
import { requirePermissionPage } from "@/lib/admin-access";

export default async function AdminProductsPage() {
  const access = await requirePermissionPage("/admin/products", "products.view");

  if (!access.granted) {
    return <AccessDenied description="Product access has not been enabled for this teacher account." />;
  }

  return <ProductsManager currentRole={access.profile.role} permissions={access.permissions} />;
}
