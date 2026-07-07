import { unstable_cache } from "next/cache";
import { ProductsCatalog, fallbackProducts } from "@/components/public/products-catalog";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const revalidate = 300;

const getProducts = unstable_cache(
  async () => {
    try {
      const supabase = createSupabasePublicClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return fallbackProducts;
      }

      return data;
    } catch (err) {
      console.error("Error fetching products:", err);
      return fallbackProducts;
    }
  },
  ["public-products"],
  { revalidate },
);

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <main className="bg-background text-on-background">
      <PublicHeader />
      <ProductsCatalog initialProducts={products} />
    </main>
  );
}
