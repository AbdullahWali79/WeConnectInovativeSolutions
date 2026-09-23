import Link from "next/link";
import { getSimulationCategories, getSimulations, createSimulationCategory } from "./actions";

export default async function SimulationsAdminPage() {
  const { data: simulations } = await getSimulations();
  const { data: categories } = await getSimulationCategories();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Interactive Simulations</h1>
        <Link 
          href="/admin/simulations/create" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          + Add Simulation
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          <form action={async (formData) => {
            "use server";
            await createSimulationCategory(formData);
          }} className="flex gap-2 mb-4">
            <input 
              type="text" 
              name="name" 
              placeholder="New Category Name" 
              required 
              className="flex-1 border border-gray-300 rounded px-3 py-2"
            />
            <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded">
              Add
            </button>
          </form>
          
          <ul className="space-y-2">
            {categories?.map((cat) => (
              <li key={cat.id} className="flex justify-between p-3 bg-gray-50 rounded border border-gray-100">
                <span>{cat.name}</span>
                <span className="text-gray-500 text-sm">{cat.slug}</span>
              </li>
            ))}
            {(!categories || categories.length === 0) && (
              <li className="text-gray-500 italic">No categories found.</li>
            )}
          </ul>
        </div>

        {/* Simulations Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">All Simulations</h2>
          <ul className="space-y-3">
            {simulations?.map((sim) => (
              <li key={sim.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-lg">{sim.title}</h3>
                  <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded mt-1 inline-block">
                    {sim.simulation_categories?.name}
                  </span>
                </div>
                <Link 
                  href={`/admin/simulations/${sim.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </li>
            ))}
            {(!simulations || simulations.length === 0) && (
              <li className="text-gray-500 italic">No simulations found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
