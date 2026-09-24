"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitSimulationRequest } from "./actions";

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
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reqForm, setReqForm] = useState({ userName: "", email: "", topic: "", description: "" });
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState("");

  const filteredCategories = activeFilter === "all" 
    ? categories 
    : categories.filter(c => c.slug === activeFilter);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError("");
    startTransition(async () => {
      const res = await submitSimulationRequest(reqForm);
      if (res.success) {
        setReqSuccess(true);
        setReqForm({ userName: "", email: "", topic: "", description: "" });
        setTimeout(() => {
          setIsRequestModalOpen(false);
          setReqSuccess(false);
        }, 3000);
      } else {
        setReqError(res.error || "Failed to submit request. Please try again.");
      }
    });
  };

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

      {/* Floating Request Button */}
      <button
        onClick={() => setIsRequestModalOpen(true)}
        className="fixed bottom-8 right-8 bg-[#0664B9] text-white p-4 rounded-full shadow-2xl hover:scale-105 hover:bg-blue-700 transition-all duration-300 z-40 flex items-center gap-2 font-bold"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        <span className="hidden sm:inline">Request Topic</span>
      </button>

      {/* Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Request a Simulation</h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            {reqSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-500">Thank you. Our team will review your request and build a simulation for it soon!</p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <p className="text-gray-600 mb-6">Don't see the topic you want to practice? Let us know what you need!</p>
                
                {reqError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{reqError}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
                    <input required type="text" value={reqForm.userName} onChange={e => setReqForm({...reqForm, userName: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="font-normal text-gray-400">(optional)</span></label>
                    <input type="email" value={reqForm.email} onChange={e => setReqForm({...reqForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="john@example.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Topic / Subject</label>
                  <input required type="text" value={reqForm.topic} onChange={e => setReqForm({...reqForm, topic: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="e.g. C++ Pointers, React Hooks..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={reqForm.description} onChange={e => setReqForm({...reqForm, description: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all resize-none" placeholder="What specific concepts are you struggling with?"></textarea>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isPending} className="w-full bg-[#0664B9] text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center">
                    {isPending ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
