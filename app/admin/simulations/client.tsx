"use client";

import Link from "next/link";
import { useState } from "react";
import { createSimulationCategory } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AdminSimulationsClient({ simulations, categories }: { simulations: any[], categories: any[] }) {
  const [searchSimulations, setSearchSimulations] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchCategories, setSearchCategories] = useState("");

  const filteredSimulations = simulations?.filter((sim) => {
    const matchesSearch = sim.title.toLowerCase().includes(searchSimulations.toLowerCase());
    const matchesCat = filterCategory === "all" || sim.category_id === filterCategory;
    return matchesSearch && matchesCat;
  }) || [];

  const filteredCategories = categories?.filter((cat) => 
    cat.name.toLowerCase().includes(searchCategories.toLowerCase())
  ) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Categories Section (Compact) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col max-h-[calc(100vh-140px)]">
        <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
          Categories
          <span className="bg-gray-100 text-xs px-2 py-1 rounded-full text-gray-600">{categories?.length || 0}</span>
        </h2>
        
        <form action={async (formData) => {
          await createSimulationCategory(formData);
          (document.getElementById("catForm") as HTMLFormElement)?.reset();
        }} id="catForm" className="flex gap-2 mb-4">
          <input 
            type="text" 
            name="name" 
            placeholder="New Category Name" 
            required 
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button type="submit" className="bg-gray-800 hover:bg-gray-900 transition-colors text-white px-3 py-1.5 rounded text-sm font-medium">
            Add
          </button>
        </form>

        <div className="mb-3">
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchCategories}
            onChange={(e) => setSearchCategories(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="overflow-y-auto pr-1 flex-1 space-y-2">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="flex justify-between items-center p-2.5 bg-gray-50/80 hover:bg-gray-100 rounded border border-gray-100 transition-colors group">
              <span className="text-sm font-medium text-gray-800">{cat.name}</span>
              <span className="text-gray-400 text-xs font-mono group-hover:text-gray-500">{cat.slug}</span>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-gray-400 text-sm italic text-center py-4">No categories match.</div>
          )}
        </div>
      </div>

      {/* Simulations Section */}
      <div className="lg:col-span-8 bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col max-h-[calc(100vh-140px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            All Simulations
            <span className="bg-gray-100 text-xs px-2 py-1 rounded-full text-gray-600">{filteredSimulations.length}</span>
          </h2>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <input 
              type="text" 
              placeholder="Search simulations..." 
              value={searchSimulations}
              onChange={(e) => setSearchSimulations(e.target.value)}
              className="flex-1 sm:w-48 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSimulations.map((sim) => (
              <div key={sim.id} className="p-4 border border-gray-200 rounded-lg flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all group bg-white">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1" title={sim.title}>
                    {sim.title}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-2 inline-block font-medium border border-gray-200">
                    {sim.simulation_categories?.name || "Uncategorized"}
                  </span>
                </div>
                <div className="flex justify-end border-t border-gray-50 pt-3 mt-1">
                  <Link 
                    href={`/admin/simulations/${sim.id}/edit`}
                    className="text-sm text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 px-3 py-1 rounded transition-colors font-medium"
                  >
                    Edit Script
                  </Link>
                </div>
              </div>
            ))}
            {filteredSimulations.length === 0 && (
              <div className="col-span-full text-center py-10">
                <div className="text-4xl mb-2 opacity-50">🔍</div>
                <p className="text-gray-500 text-sm">No simulations match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
