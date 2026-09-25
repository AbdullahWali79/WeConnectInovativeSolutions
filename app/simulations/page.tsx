import { getPublicSimulationCategories } from "./actions";
import { PublicHeader } from "@/components/public/public-header";
import { PublicSimulationsClient } from "./client";

export default async function SimulationsPage() {
  const { data: categories } = await getPublicSimulationCategories();

  return (
    <main>
      <PublicHeader />
      <div className="container mx-auto px-4 py-8 min-h-screen pt-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Interactive Simulations</h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Practice your programming logic and understand complex concepts through hands-on, interactive simulations.
          </p>
        </div>

        <PublicSimulationsClient categories={categories || []} />
      </div>
    </main>
  );
}
