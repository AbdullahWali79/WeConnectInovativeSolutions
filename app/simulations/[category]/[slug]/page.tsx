import { getPublicSimulationBySlug } from "../../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";

export default async function SimulationExecutionPage({ 
  params 
}: { 
  params: { category: string; slug: string } 
}) {
  const { data: simulation, success } = await getPublicSimulationBySlug(params.category, params.slug);

  if (!success || !simulation) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />
      
      <div className="flex-1 flex flex-col pt-20">
        <div className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm flex items-center gap-4">
          <Link href="/simulations" className="text-gray-500 hover:text-gray-900 font-medium text-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Simulations
          </Link>
          <div className="h-4 w-px bg-gray-300"></div>
          <span className="text-sm text-gray-500">{simulation.simulation_categories.name}</span>
          <span className="text-gray-400">/</span>
          <h1 className="font-semibold text-gray-900">{simulation.title}</h1>
        </div>

        <div className="flex-1 p-0 m-0 bg-white relative">
          <iframe 
            srcDoc={simulation.html_script} 
            className="absolute inset-0 w-full h-full border-0"
            title={simulation.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </main>
  );
}
