import { ProductsCatalog, fallbackProducts } from "@/components/public/products-catalog";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProducts() {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return fallbackProducts;
      }

      return data;
    } catch (err) {
      console.error("Error fetching products:", err);
      return fallbackProducts;
    }
}

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <main className="bg-background text-on-background">
      <PublicHeader />
      <ProductsCatalog initialProducts={products} />
    </main>
  );
}
