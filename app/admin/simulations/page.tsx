import Link from "next/link";
import { getSimulationCategories, getSimulations } from "./actions";
import { AdminSimulationsClient } from "./client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SimulationsAdminPage() {
  const { data: simulations } = await getSimulations();
  const { data: categories } = await getSimulationCategories();
  
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("simulation_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col bg-gray-50/50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interactive Simulations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage categories and HTML simulation scripts.</p>
        </div>
        <Link 
          href="/admin/simulations/create" 
          className="bg-[#0664B9] hover:bg-[#05539a] transition-colors text-white px-5 py-2.5 rounded-md font-medium shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Add Simulation
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        <AdminSimulationsClient 
          simulations={simulations || []} 
          categories={categories || []} 
          requests={requests || []}
        />
      </div>
    </div>
  );
}
