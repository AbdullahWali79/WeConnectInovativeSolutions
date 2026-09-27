/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export function TalentMarketplace({ services }: { services: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => {
    const allSkills = services.flatMap((s) => s.skills || []);
    const unique = Array.from(new Set(allSkills));
    return ["All", ...unique.slice(0, 10)]; // show top 10 categories for tabs
  }, [services]);

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || (s.skills && s.skills.includes(activeCategory));
    return matchesSearch && matchesCategory;
  });

  const handleWhatsApp = (number: string, serviceTitle: string) => {
    const msg = encodeURIComponent(`Hi, I saw your service "${serviceTitle}" on the Talent Portfolio and I'm interested in working with you.`);
    window.open(`https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <div className="bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-[#023E7D] text-white pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/50 mix-blend-multiply"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-3xl leading-tight">
            Find the perfect <span className="text-cyan-400 font-serif italic">freelance services</span> for your business
          </h1>
          
          <div className="max-w-2xl bg-white rounded-lg p-2 flex shadow-xl">
            <div className="flex items-center px-4 text-gray-400">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input 
              type="text" 
              placeholder="What service are you looking for today?" 
              className="flex-1 w-full bg-transparent text-gray-900 py-3 outline-none text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="bg-[#023E7D] hover:bg-blue-800 text-white px-8 py-3 rounded-md font-semibold transition-colors">
              Search
            </button>
          </div>
          
          <div className="flex items-center gap-4 mt-8 flex-wrap">
            <span className="text-sm font-semibold text-gray-300">Popular:</span>
            {categories.slice(1, 5).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="text-sm border border-white/30 rounded-full px-4 py-1 hover:bg-white hover:text-[#023E7D] transition-colors">
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Category Tabs */}
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-200 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap pb-4 font-medium text-sm transition-colors border-b-2 ${
                activeCategory === cat 
                  ? "border-[#023E7D] text-[#023E7D]" 
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeCategory === "All" ? "Explore All Services" : `${activeCategory} Services`}
          </h2>
          <p className="text-gray-500">{filteredServices.length} services available</p>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <div key={service.id} className="bg-white group rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer">
                
                {/* Thumbnail */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                  {service.image_url ? (
                    <img 
                      src={service.image_url} 
                      alt={service.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-5xl">design_services</span>
                    </div>
                  )}
                  {/* YouTube Icon Overlay if video exists */}
                  {service.video_url && (
                    <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm">
                      <span className="material-symbols-outlined text-red-600 text-sm">play_arrow</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  {/* Seller Info */}
                  <div className="flex items-center gap-3 mb-3">
                    {service.talent_profiles?.profile_picture_url ? (
                      <img src={service.talent_profiles.profile_picture_url} className="w-8 h-8 rounded-full object-cover border border-gray-200" alt="seller" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {service.talent_profiles?.name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900 leading-none">{service.talent_profiles?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Top Rated Seller</p>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-medium text-gray-900 text-[15px] leading-snug mb-3 hover:underline line-clamp-2">
                    I will {service.title.toLowerCase().startsWith("i will") ? service.title.substring(6) : service.title}
                  </h3>
                  
                  {/* Rating (Static 5.0 for now) */}
                  <div className="flex items-center gap-1 mt-auto">
                    <span className="material-symbols-outlined text-yellow-400 text-[18px] filled">star</span>
                    <span className="font-bold text-gray-900 text-sm">5.0</span>
                    <span className="text-gray-400 text-sm">(12+)</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-medium">STARTING AT</span>
                  
                  {service.talent_profiles?.whatsapp_enabled ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(service.talent_profiles.whatsapp_number, service.title); }}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      Contact
                    </button>
                  ) : (
                    <span className="text-gray-900 font-bold">$Custom</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
