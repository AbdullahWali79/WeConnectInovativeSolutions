import { ProductsCatalog, fallbackProducts } from "@/components/public/products-catalog";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getWhatsAppSettingsOrDefaults } from "@/lib/whatsapp/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProducts() {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,image_url,image_github_path,image_github_url,image_cdn_url,short_description,full_description,price_or_access_type,badge,features,gallery_urls,source_project_id,student_name,status,display_order,created_at,updated_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return fallbackProducts;
      }

      return data.map((product) => ({ ...product, product_link: null }));
    } catch (err) {
      console.error("Error fetching products:", err);
      return fallbackProducts;
    }
}

export default async function ProductsPage() {
  const [products, whatsappSettings] = await Promise.all([
    getProducts(),
    getWhatsAppSettingsOrDefaults(),
  ]);
  return (
    <main className="bg-background text-on-background">
      <PublicHeader />
      <ProductsCatalog initialProducts={products} whatsappNumber={whatsappSettings.whatsapp_number} />
    </main>
  );
}
