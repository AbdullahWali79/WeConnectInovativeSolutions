"use client";
import { CmsElement, CmsLink } from "@/components/cms/cms-element";

import { useState, useTransition } from "react";
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
    <CmsElement cmsId="7d5e571f-0" as="div">
      {/* Category Filter Pills */}
      {categories && categories.length > 0 && (
        <CmsElement cmsId="7d5e571f-1" as="div" className="flex flex-wrap justify-center gap-3 mb-12">
          <CmsElement cmsId="7d5e571f-2" as="button"
            onClick={() => setActiveFilter("all")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
              activeFilter === "all"
                ? "bg-[#0664B9] text-white border-[#0664B9] shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0664B9] hover:text-[#0664B9]"
            }`}
          >
            All Topics
          </CmsElement>
          {categories.map(cat => (
            <CmsElement cmsId="7d5e571f-3" as="button" instance={String(cat.id)}
              key={cat.id}
              onClick={() => setActiveFilter(cat.slug)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeFilter === cat.slug
                  ? "bg-[#0664B9] text-white border-[#0664B9] shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#0664B9] hover:text-[#0664B9]"
              }`}
            >
              {cat.name}
            </CmsElement>
          ))}
        </CmsElement>
      )}

      {/* Categories & Simulations List */}
      <CmsElement cmsId="7d5e571f-4" as="div" className="space-y-12">
        {filteredCategories?.map((cat: Category) => (
          <CmsElement cmsId="7d5e571f-5" as="div" instance={String(cat.id)} key={cat.id} id={cat.slug} className="scroll-mt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CmsElement cmsId="7d5e571f-6" as="div" className="mb-6 border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <CmsElement cmsId="7d5e571f-7" as="div">
                <CmsElement cmsId="7d5e571f-8" as="h2" className="text-2xl font-bold text-gray-900 tracking-tight">{cat.name}</CmsElement>
                {cat.description && <CmsElement cmsId="7d5e571f-9" as="p" className="text-gray-500 mt-1 text-sm">{cat.description}</CmsElement>}
              </CmsElement>
              <CmsElement cmsId="7d5e571f-10" as="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="bg-[#0664B9]/10 text-[#0664B9] hover:bg-[#0664B9] hover:text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-sm font-semibold whitespace-nowrap border border-[#0664B9]/20 hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Request Topic
              </CmsElement>
            </CmsElement>
            
            <CmsElement cmsId="7d5e571f-11" as="div" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {cat.simulations.map((sim: Simulation) => (
                <CmsLink cmsId="7d5e571f-12" instance={String(sim.id)}
                  key={sim.id}
                  href={`/simulations/${cat.slug}/${sim.slug}`}
                  className="group relative block"
                >
                  <CmsElement cmsId="7d5e571f-13" as="div" className="absolute inset-0 bg-gradient-to-br from-[#0664B9]/40 to-blue-300/40 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition duration-500"></CmsElement>
                  <CmsElement cmsId="7d5e571f-14" as="div" className="relative h-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group-hover:border-[#0664B9]/50 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    
                    {/* Decorative background element */}
                    <CmsElement cmsId="7d5e571f-15" as="div" className="absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-[#0664B9]/10 to-transparent rounded-full group-hover:scale-150 transition-transform duration-700 ease-out"></CmsElement>

                    <CmsElement cmsId="7d5e571f-16" as="div" className="relative z-10">
                      <CmsElement cmsId="7d5e571f-17" as="div" className="flex items-start gap-3 mb-3">
                        <CmsElement cmsId="7d5e571f-18" as="div" className="w-10 h-10 shrink-0 bg-gradient-to-br from-[#0664B9]/10 to-[#0664B9]/5 text-[#0664B9] rounded-xl flex items-center justify-center group-hover:bg-[#0664B9] group-hover:text-white transition-all duration-300 shadow-sm border border-[#0664B9]/10">
                           <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                        </CmsElement>
                        <CmsElement cmsId="7d5e571f-19" as="h3" className="font-bold text-[17px] text-gray-900 group-hover:text-[#0664B9] transition-colors duration-300 leading-tight pt-1">{sim.title}</CmsElement>
                      </CmsElement>
                      <CmsElement cmsId="7d5e571f-20" as="p" className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                        Master {sim.title} with interactive, hands-on practice.
                      </CmsElement>
                    </CmsElement>
                    
                    <CmsElement cmsId="7d5e571f-21" as="div" className="relative z-10 flex items-center justify-between text-xs font-bold text-[#0664B9] border-t border-gray-50 pt-3">
                      <CmsElement cmsId="7d5e571f-22" as="span" className="flex items-center gap-1 group-hover:tracking-wide transition-all duration-300">START PRACTICE</CmsElement>
                      <CmsElement cmsId="7d5e571f-23" as="span" className="group-hover:translate-x-1.5 transition-transform duration-300 bg-[#0664B9] text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                      </CmsElement>
                    </CmsElement>
                  </CmsElement>
                </CmsLink>
              ))}
            </CmsElement>
          </CmsElement>
        ))}
        {(!filteredCategories || filteredCategories.length === 0) && (
          <CmsElement cmsId="7d5e571f-24" as="div" className="text-center text-gray-500 py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <CmsElement cmsId="7d5e571f-25" as="div" className="text-4xl mb-4">🚀</CmsElement>
            <CmsElement cmsId="7d5e571f-26" as="h3" className="text-xl font-semibold text-gray-900 mb-2">Simulations Coming Soon</CmsElement>
            <CmsElement cmsId="7d5e571f-27" as="p" className="mb-6">No simulations have been added yet for this topic. Check back later!</CmsElement>
            <CmsElement cmsId="7d5e571f-28" as="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="bg-[#0664B9] text-white px-6 py-2.5 rounded-full shadow-md hover:bg-blue-700 transition-all duration-300 inline-flex items-center gap-2 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Request for Simulation
            </CmsElement>
          </CmsElement>
        )}
      </CmsElement>

      {/* Request Modal */}
      {isRequestModalOpen && (
        <CmsElement cmsId="7d5e571f-29" as="div" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <CmsElement cmsId="7d5e571f-30" as="div" className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <CmsElement cmsId="7d5e571f-31" as="div" className="flex justify-between items-center mb-6">
              <CmsElement cmsId="7d5e571f-32" as="h2" className="text-2xl font-bold text-gray-900">Request a Simulation</CmsElement>
              <CmsElement cmsId="7d5e571f-33" as="button" onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </CmsElement>
            </CmsElement>
            
            {reqSuccess ? (
              <CmsElement cmsId="7d5e571f-34" as="div" className="text-center py-8">
                <CmsElement cmsId="7d5e571f-35" as="div" className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </CmsElement>
                <CmsElement cmsId="7d5e571f-36" as="h3" className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</CmsElement>
                <CmsElement cmsId="7d5e571f-37" as="p" className="text-gray-500">Thank you. Our team will review your request and build a simulation for it soon!</CmsElement>
              </CmsElement>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <CmsElement cmsId="7d5e571f-38" as="p" className="text-gray-600 mb-6">Don&apos;t see the topic you want to practice? Let us know what you need!</CmsElement>
                
                {reqError && <CmsElement cmsId="7d5e571f-39" as="div" className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{reqError}</CmsElement>}
                
                <CmsElement cmsId="7d5e571f-40" as="div" className="grid grid-cols-2 gap-4">
                  <CmsElement cmsId="7d5e571f-41" as="div">
                    <CmsElement cmsId="7d5e571f-42" as="label" className="block text-sm font-semibold text-gray-700 mb-1">Your Name</CmsElement>
                    <input required type="text" value={reqForm.userName} onChange={e => setReqForm({...reqForm, userName: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="John Doe" />
                  </CmsElement>
                  <CmsElement cmsId="7d5e571f-43" as="div">
                    <CmsElement cmsId="7d5e571f-44" as="label" className="block text-sm font-semibold text-gray-700 mb-1">Email <CmsElement cmsId="7d5e571f-45" as="span" className="font-normal text-gray-400">(optional)</CmsElement></CmsElement>
                    <input type="email" value={reqForm.email} onChange={e => setReqForm({...reqForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="john@example.com" />
                  </CmsElement>
                </CmsElement>

                <CmsElement cmsId="7d5e571f-46" as="div">
                  <CmsElement cmsId="7d5e571f-47" as="label" className="block text-sm font-semibold text-gray-700 mb-1">Topic / Subject</CmsElement>
                  <input required type="text" value={reqForm.topic} onChange={e => setReqForm({...reqForm, topic: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all" placeholder="e.g. C++ Pointers, React Hooks..." />
                </CmsElement>

                <CmsElement cmsId="7d5e571f-48" as="div">
                  <CmsElement cmsId="7d5e571f-49" as="label" className="block text-sm font-semibold text-gray-700 mb-1">Description <CmsElement cmsId="7d5e571f-50" as="span" className="font-normal text-gray-400">(optional)</CmsElement></CmsElement>
                  <textarea value={reqForm.description} onChange={e => setReqForm({...reqForm, description: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0664B9]/20 focus:border-[#0664B9] outline-none transition-all resize-none" placeholder="What specific concepts are you struggling with?"></textarea>
                </CmsElement>

                <CmsElement cmsId="7d5e571f-51" as="div" className="pt-4">
                  <CmsElement cmsId="7d5e571f-52" as="button" type="submit" disabled={isPending} className="w-full bg-[#0664B9] text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center">
                    {isPending ? "Submitting..." : "Submit Request"}
                  </CmsElement>
                </CmsElement>
              </form>
            )}
          </CmsElement>
        </CmsElement>
      )}
    </CmsElement>
  );
}
