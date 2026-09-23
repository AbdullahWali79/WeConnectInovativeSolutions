import { getPublicSimulationCategories } from "./actions";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";

export default async function SimulationsPage() {
  const { data: categories } = await getPublicSimulationCategories();

  return (
    <main>
      <PublicHeader />
      <div className="container mx-auto px-4 py-12 min-h-screen pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">Interactive Simulations</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice your programming logic and understand complex concepts through hands-on, interactive simulations.
          </p>
        </div>

        <div className="space-y-12">
          {categories?.map((cat: any) => (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">{cat.name}</h2>
                {cat.description && <p className="text-gray-600 mt-1">{cat.description}</p>}
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cat.simulations.map((sim: any) => (
                  <Link 
                    key={sim.id}
                    href={`/simulations/${cat.slug}/${sim.slug}`}
                    className="block group"
                  >
                    <div className="h-full p-5 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">{sim.title}</h3>
                        <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded text-xs font-medium">Practice</span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        Click to start the interactive session for {sim.title}.
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {(!categories || categories.length === 0) && (
            <div className="text-center text-gray-500 py-12">
              <p>No simulations available at the moment. Check back later!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
