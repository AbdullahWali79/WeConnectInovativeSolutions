import { getSimulationCategories, createSimulation } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CreateSimulationPage() {
  const { data: categories } = await getSimulationCategories();

  async function handleSubmit(formData: FormData) {
    "use server";
    await createSimulation(formData);
    redirect("/admin/simulations");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/simulations" className="text-gray-500 hover:text-gray-900">&larr; Back</Link>
        <h1 className="text-2xl font-bold">Add New Simulation</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form action={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input 
              type="text" 
              name="title" 
              required 
              className="w-full border border-gray-300 rounded px-3 py-2" 
              placeholder="e.g. If-Else Basics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select 
              name="category_id" 
              required 
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select a category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">HTML / JS Code</label>
            <p className="text-sm text-gray-500 mb-2">Write complete HTML code. It will be embedded inside an iframe.</p>
            <textarea 
              name="html_script" 
              required 
              rows={15}
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm" 
              placeholder="<html><body>...</body></html>"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Save Simulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
