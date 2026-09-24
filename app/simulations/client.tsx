"use client";

import { useState } from "react";
import Link from "next/link";

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

export function PublicSimulationsClient({ categories }: { categories: Category[] }) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredCategories = activeFilter === "all" 
    ? categories 
    : categories.filter(c => c.slug === activeFilter);

  return (
    <div>
      {/* Category Filter Pills */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
              activeFilter === "all"
                ? "bg-[#0664B9] text-white border-[#0664B9] shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0664B9] hover:text-[#0664B9]"
            }`}
          >
            All Topics
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.slug)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeFilter === cat.slug
                  ? "bg-[#0664B9] text-white border-[#0664B9] shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#0664B9] hover:text-[#0664B9]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Categories & Simulations List */}
      <div className="space-y-16">
        {filteredCategories?.map((cat: Category) => (
          <div key={cat.id} id={cat.slug} className="scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        {(!filteredCategories || filteredCategories.length === 0) && (
          <div className="text-center text-gray-500 py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Simulations Coming Soon</h3>
            <p>No simulations have been added yet for this topic. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}
