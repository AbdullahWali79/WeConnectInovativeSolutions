import { getPublicSimulationCategories } from "./actions";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";

type Simulation = {
  id: string;
  title: string;
  slug: string;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  simulations: Simulation[];
};

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

        <div className="space-y-16">
          {categories?.map((cat: Category) => (
            <div key={cat.id} id={cat.slug} className="scroll-mt-24">
              <div className="mb-8 border-b border-gray-100 pb-4">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{cat.name}</h2>
                {cat.description && <p className="text-gray-500 mt-2 text-lg">{cat.description}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cat.simulations.map((sim: Simulation) => (
                  <Link 
                    key={sim.id}
                    href={`/simulations/${cat.slug}/${sim.slug}`}
                    className="group relative block"
                  >
                    <div className="absolute inset-0 bg-[#0664B9] rounded-2xl blur opacity-0 group-hover:opacity-10 transition duration-300"></div>
                    <div className="relative h-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group-hover:border-[#0664B9]/30 group-hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 bg-[#0664B9]/10 text-[#0664B9] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                           <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 mb-2">{sim.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-6">
                          Interactive hands-on session to master {sim.title} concepts.
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold text-[#0664B9]">
                        <span>Start Practice</span>
                        <span className="group-hover:translate-x-1 transition-transform bg-[#0664B9]/10 px-2 py-1 rounded-md">→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {(!categories || categories.length === 0) && (
            <div className="text-center text-gray-500 py-16 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Simulations Coming Soon</h3>
              <p>No simulations have been added yet. Check back later!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
