/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { CmsElement, CmsLink } from "@/components/cms/cms-element";

import { useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeImageUrl } from "@/lib/image-url";

export function TalentMarketplace({ services: initialServices }: { services: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  // Modal state
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  
  // Review form state
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Hire form state
  const [showHireForm, setShowHireForm] = useState(false);
  const [hireName, setHireName] = useState("");
  const [hireWhatsApp, setHireWhatsApp] = useState("");
  const [hireDetails, setHireDetails] = useState("");
  const [isSubmittingHire, setIsSubmittingHire] = useState(false);

  const [toast, setToast] = useState<ToastState>(null);
  const supabase = createSupabaseBrowserClient();

  const categories = useMemo(() => {
    const allSkills = services.flatMap((s) => s.skills || []);
    const unique = Array.from(new Set(allSkills));
    return ["All", ...unique.slice(0, 10)];
  }, [services]);

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || (s.skills && s.skills.includes(activeCategory));
    return matchesSearch && matchesCategory;
  });

  const calculateAverageRating = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    
    setIsSubmittingReview(true);
    const { data, error } = await supabase.from("talent_reviews" as any).insert({
      service_id: selectedService.id,
      client_name: reviewName,
      rating: reviewRating,
      comment: reviewComment
    }).select().single();
    
    setIsSubmittingReview(false);
    
    if (error) {
      setToast({ type: "error", message: "Failed to submit review." });
    } else {
      setToast({ type: "success", message: "Review submitted successfully!" });
      
      const updatedService = {
        ...selectedService,
        talent_reviews: [data, ...(selectedService.talent_reviews || [])]
      };
      setSelectedService(updatedService);
      setServices(services.map(s => s.id === updatedService.id ? updatedService : s));
      
      setReviewName("");
      setReviewRating(5);
      setReviewComment("");
    }
  };

  const handleSubmitHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    
    setIsSubmittingHire(true);
    const { error } = await supabase.from("talent_requests" as any).insert({
      service_id: selectedService.id,
      client_name: hireName,
      client_whatsapp: hireWhatsApp,
      project_details: hireDetails
    });
    
    setIsSubmittingHire(false);
    
    if (error) {
      setToast({ type: "error", message: "Failed to send request: " + error.message });
    } else {
      setToast({ type: "success", message: "Request sent successfully! Our Admin will contact you on WhatsApp shortly." });
      setShowHireForm(false);
      setHireName("");
      setHireWhatsApp("");
      setHireDetails("");
    }
  };

  const sortedServices = [...filteredServices].sort((a, b) => {
    const aRating = parseFloat(calculateAverageRating(a.talent_reviews) as string);
    const bRating = parseFloat(calculateAverageRating(b.talent_reviews) as string);
    return bRating - aRating;
  });

  return (
    <CmsElement cmsId="baf20e61-0" as="div" className="bg-gray-50 pb-20 relative">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Hero Section */}
      <CmsElement cmsId="baf20e61-1" as="div" className="bg-[#023E7D] text-white pt-32 pb-20 px-6 relative overflow-hidden">
        <CmsElement cmsId="baf20e61-2" as="div" className="absolute inset-0 bg-blue-900/50 mix-blend-multiply"></CmsElement>
        <CmsElement cmsId="baf20e61-3" as="div" className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></CmsElement>
        <CmsElement cmsId="baf20e61-4" as="div" className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></CmsElement>
        
        <CmsElement cmsId="baf20e61-5" as="div" className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
          <CmsElement cmsId="baf20e61-6" as="div" className="flex-1">
            <CmsElement cmsId="baf20e61-7" as="h1" className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-3xl leading-tight">
              Find the perfect <CmsElement cmsId="baf20e61-8" as="span" className="text-cyan-400 font-serif italic">freelance services</CmsElement> for your business
            </CmsElement>
            
            <CmsElement cmsId="baf20e61-9" as="div" className="max-w-2xl bg-white rounded-lg p-2 flex shadow-xl">
              <CmsElement cmsId="baf20e61-10" as="div" className="flex items-center px-4 text-gray-400">
                <CmsElement cmsId="baf20e61-11" as="span" className="material-symbols-outlined">search</CmsElement>
              </CmsElement>
              <input 
                type="text" 
                placeholder="What service are you looking for today?" 
                className="flex-1 w-full bg-transparent text-gray-900 py-3 outline-none text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <CmsElement cmsId="baf20e61-12" as="button" className="bg-[#023E7D] hover:bg-blue-800 text-white px-8 py-3 rounded-md font-semibold transition-colors">
                Search
              </CmsElement>
            </CmsElement>
            
            <CmsElement cmsId="baf20e61-13" as="div" className="flex items-center gap-4 mt-8 flex-wrap">
              <CmsElement cmsId="baf20e61-14" as="span" className="text-sm font-semibold text-gray-300">Popular:</CmsElement>
              {categories.slice(1, 5).map(cat => (
                <CmsElement cmsId="baf20e61-15" as="button" instance={String(cat)} key={cat} onClick={() => setActiveCategory(cat)} className="text-sm border border-white/30 rounded-full px-4 py-1 hover:bg-white hover:text-[#023E7D] transition-colors">
                  {cat}
                </CmsElement>
              ))}
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="baf20e61-16" as="div" className="lg:mt-4">
            <CmsLink cmsId="baf20e61-17" href="/student/talent-portfolio" className="inline-flex items-center gap-2 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-[#023E7D] px-6 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-cyan-400/20 whitespace-nowrap">
              <CmsElement cmsId="baf20e61-18" as="span" className="material-symbols-outlined text-[20px]">workspace_premium</CmsElement>
              Only Freelancer can Apply
            </CmsLink>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      {/* How it works */}
      <CmsElement cmsId="baf20e61-19" as="div" className="bg-white border-b border-gray-200">
        <CmsElement cmsId="baf20e61-20" as="div" className="max-w-7xl mx-auto px-4 py-12">
          <CmsElement cmsId="baf20e61-21" as="h2" className="text-2xl font-bold text-center text-[#023E7D] mb-10">How It Works For Clients</CmsElement>
          <CmsElement cmsId="baf20e61-22" as="div" className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <CmsElement cmsId="baf20e61-23" as="div" className="text-center">
              <CmsElement cmsId="baf20e61-24" as="div" className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CmsElement cmsId="baf20e61-25" as="span" className="material-symbols-outlined text-3xl">search</CmsElement>
              </CmsElement>
              <CmsElement cmsId="baf20e61-26" as="h3" className="font-bold text-gray-900 mb-2">1. Find Freelancer</CmsElement>
              <CmsElement cmsId="baf20e61-27" as="p" className="text-sm text-gray-500">Search and filter to find the perfect freelancer for your project needs.</CmsElement>
            </CmsElement>
            <CmsElement cmsId="baf20e61-28" as="div" className="text-center">
              <CmsElement cmsId="baf20e61-29" as="div" className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CmsElement cmsId="baf20e61-30" as="span" className="material-symbols-outlined text-3xl">assignment_turned_in</CmsElement>
              </CmsElement>
              <CmsElement cmsId="baf20e61-31" as="h3" className="font-bold text-gray-900 mb-2">2. Send Request</CmsElement>
              <CmsElement cmsId="baf20e61-32" as="p" className="text-sm text-gray-500">Review their portfolio and send a request with your WhatsApp number.</CmsElement>
            </CmsElement>
            <CmsElement cmsId="baf20e61-33" as="div" className="text-center">
              <CmsElement cmsId="baf20e61-34" as="div" className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CmsElement cmsId="baf20e61-35" as="span" className="material-symbols-outlined text-3xl">admin_panel_settings</CmsElement>
              </CmsElement>
              <CmsElement cmsId="baf20e61-36" as="h3" className="font-bold text-gray-900 mb-2">3. Admin Management</CmsElement>
              <CmsElement cmsId="baf20e61-37" as="p" className="text-sm text-gray-500">Our Admin verifies the task, collects payment, and assigns it to the freelancer.</CmsElement>
            </CmsElement>
            <CmsElement cmsId="baf20e61-38" as="div" className="text-center">
              <CmsElement cmsId="baf20e61-39" as="div" className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CmsElement cmsId="baf20e61-40" as="span" className="material-symbols-outlined text-3xl">verified</CmsElement>
              </CmsElement>
              <CmsElement cmsId="baf20e61-41" as="h3" className="font-bold text-gray-900 mb-2">4. Guaranteed Delivery</CmsElement>
              <CmsElement cmsId="baf20e61-42" as="p" className="text-sm text-gray-500">We take full responsibility for quality and timely delivery of your project.</CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      <CmsElement cmsId="baf20e61-43" as="div" className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        {/* Category Tabs */}
        <CmsElement cmsId="baf20e61-44" as="div" className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-200 mb-8">
          {categories.map((cat) => (
            <CmsElement cmsId="baf20e61-45" as="button" instance={String(cat)}
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap pb-4 font-medium text-sm transition-colors border-b-2 ${
                activeCategory === cat 
                  ? "border-[#023E7D] text-[#023E7D]" 
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {cat}
            </CmsElement>
          ))}
        </CmsElement>

        {/* Results Info */}
        <CmsElement cmsId="baf20e61-46" as="div" className="mb-6">
          <CmsElement cmsId="baf20e61-47" as="h2" className="text-2xl font-bold text-gray-900">
            {activeCategory === "All" ? "Explore All Services" : `${activeCategory} Services`}
          </CmsElement>
          <CmsElement cmsId="baf20e61-48" as="p" className="text-gray-500">{sortedServices.length} services available</CmsElement>
        </CmsElement>

        {/* Services Grid */}
        {sortedServices.length === 0 ? (
          <CmsElement cmsId="baf20e61-49" as="div" className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <CmsElement cmsId="baf20e61-50" as="div" className="text-6xl mb-4">🔍</CmsElement>
            <CmsElement cmsId="baf20e61-51" as="h3" className="text-xl font-bold text-gray-900 mb-2">No services found</CmsElement>
            <CmsElement cmsId="baf20e61-52" as="p" className="text-gray-500">Try adjusting your search or category filter.</CmsElement>
          </CmsElement>
        ) : (
          <CmsElement cmsId="baf20e61-53" as="div" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedServices.map((service) => {
              const reviews = service.talent_reviews || [];
              const avgRating = calculateAverageRating(reviews);
              
              return (
                <CmsElement cmsId="baf20e61-54" as="div" instance={String(service.id)}
                  key={service.id} 
                  onClick={() => {
                    setSelectedService(service);
                    setShowHireForm(false);
                  }}
                  className="bg-white group rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                >
                  
                  {/* Thumbnail */}
                  <CmsElement cmsId="baf20e61-55" as="div" className="relative h-48 w-full overflow-hidden bg-gray-100">
                    {service.image_url ? (
                      <CmsElement cmsId="baf20e61-56" as="img"
                        src={normalizeImageUrl(service.image_url) || undefined} 
                        alt={service.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <CmsElement cmsId="baf20e61-57" as="div" className="w-full h-full flex items-center justify-center text-gray-300">
                        <CmsElement cmsId="baf20e61-58" as="span" className="material-symbols-outlined text-5xl">design_services</CmsElement>
                      </CmsElement>
                    )}
                    {/* YouTube Icon Overlay if video exists */}
                    {service.video_url && (
                      <CmsElement cmsId="baf20e61-59" as="div" className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm">
                        <CmsElement cmsId="baf20e61-60" as="span" className="material-symbols-outlined text-red-600 text-sm">play_arrow</CmsElement>
                      </CmsElement>
                    )}
                  </CmsElement>

                  <CmsElement cmsId="baf20e61-61" as="div" className="p-4 flex-1 flex flex-col">
                    {/* Seller Info */}
                    <CmsElement cmsId="baf20e61-62" as="div" className="flex items-center gap-3 mb-3">
                      {service.talent_profiles?.profile_picture_url ? (
                        <CmsElement cmsId="baf20e61-63" as="img" src={normalizeImageUrl(service.talent_profiles.profile_picture_url) || undefined} className="w-8 h-8 rounded-full object-cover border border-gray-200" alt={service.talent_profiles.name || "Freelancer"} />
                      ) : (
                        <CmsElement cmsId="baf20e61-64" as="div" className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {service.talent_profiles?.name?.charAt(0) || "U"}
                        </CmsElement>
                      )}
                      <CmsElement cmsId="baf20e61-65" as="div">
                        <CmsElement cmsId="baf20e61-66" as="p" className="font-semibold text-sm text-gray-900 leading-none">{service.talent_profiles?.name}</CmsElement>
                        <CmsElement cmsId="baf20e61-67" as="p" className="text-xs text-gray-500 mt-0.5">Freelancer</CmsElement>
                      </CmsElement>
                    </CmsElement>

                    {/* Title */}
                    <CmsElement cmsId="baf20e61-68" as="h3" className="font-medium text-gray-900 text-[15px] leading-snug mb-3 group-hover:underline line-clamp-2">
                      I will {service.title.toLowerCase().startsWith("i will") ? service.title.substring(6) : service.title}
                    </CmsElement>
                    
                    {/* Rating */}
                    <CmsElement cmsId="baf20e61-69" as="div" className="flex items-center gap-1 mt-auto">
                      <CmsElement cmsId="baf20e61-70" as="span" className="material-symbols-outlined text-yellow-400 text-[18px] filled">star</CmsElement>
                      <CmsElement cmsId="baf20e61-71" as="span" className="font-bold text-gray-900 text-sm">{avgRating === 0 ? "New" : avgRating}</CmsElement>
                      {reviews.length > 0 && <CmsElement cmsId="baf20e61-72" as="span" className="text-gray-400 text-sm">({reviews.length})</CmsElement>}
                    </CmsElement>
                  </CmsElement>

                  {/* Footer Action */}
                  <CmsElement cmsId="baf20e61-73" as="div" className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <CmsElement cmsId="baf20e61-74" as="span" className="text-xs text-gray-500 font-medium">STARTING AT</CmsElement>
                    
                    {service.talent_profiles?.whatsapp_enabled ? (
                      <CmsElement cmsId="baf20e61-75" as="button"
                        className="flex items-center gap-1.5 bg-[#023E7D] hover:bg-blue-800 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                      >
                        Hire Me
                      </CmsElement>
                    ) : (
                      <CmsElement cmsId="baf20e61-76" as="span" className="text-gray-900 font-bold">$Custom</CmsElement>
                    )}
                  </CmsElement>

                </CmsElement>
              );
            })}
          </CmsElement>
        )}
      </CmsElement>

      {/* Service Details Modal */}
      {selectedService && (
        <CmsElement cmsId="baf20e61-77" as="div" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <CmsElement cmsId="baf20e61-78" as="div" className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative my-auto border border-gray-200">
            {/* Close button */}
            <CmsElement cmsId="baf20e61-79" as="button"
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 bg-gray-100/80 hover:bg-gray-200 rounded-full p-1.5 transition-colors z-10"
            >
              <CmsElement cmsId="baf20e61-80" as="span" className="material-symbols-outlined block">close</CmsElement>
            </CmsElement>
            
            {/* Left Col: Media & Info */}
            <CmsElement cmsId="baf20e61-81" as="div" className="md:w-3/5 bg-gray-50 overflow-y-auto">
              {selectedService.image_url ? (
                <CmsElement cmsId="baf20e61-82" as="button"
                  type="button"
                  onClick={() => setZoomImageUrl(normalizeImageUrl(selectedService.image_url))}
                  className="group relative block w-full overflow-hidden bg-gray-100 text-left"
                  aria-label="Zoom service image"
                >
                  <CmsElement cmsId="baf20e61-83" as="img" src={normalizeImageUrl(selectedService.image_url) || undefined} alt={selectedService.title} className="h-64 w-full object-cover md:h-80" />
                  <CmsElement cmsId="baf20e61-84" as="span" className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white opacity-90 transition group-hover:bg-black">
                    <CmsElement cmsId="baf20e61-85" as="span" className="material-symbols-outlined text-[16px]">zoom_in</CmsElement>
                    Click to zoom
                  </CmsElement>
                </CmsElement>
              ) : (
                <CmsElement cmsId="baf20e61-86" as="div" className="w-full h-64 md:h-80 bg-gray-200 flex items-center justify-center">
                  <CmsElement cmsId="baf20e61-87" as="span" className="material-symbols-outlined text-6xl text-gray-400">image</CmsElement>
                </CmsElement>
              )}
              
              <CmsElement cmsId="baf20e61-88" as="div" className="p-6 md:p-8">
                <CmsElement cmsId="baf20e61-89" as="div" className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  {selectedService.talent_profiles?.profile_picture_url ? (
                    <CmsElement cmsId="baf20e61-90" as="img" src={normalizeImageUrl(selectedService.talent_profiles.profile_picture_url) || undefined} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" alt={selectedService.talent_profiles.name || "Freelancer"} />
                  ) : (
                    <CmsElement cmsId="baf20e61-91" as="div" className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shadow-md border-2 border-white">
                      {selectedService.talent_profiles?.name?.charAt(0) || "U"}
                    </CmsElement>
                  )}
                  <CmsElement cmsId="baf20e61-92" as="div">
                    <CmsElement cmsId="baf20e61-93" as="h4" className="font-bold text-gray-900 text-lg">{selectedService.talent_profiles?.name}</CmsElement>
                    <CmsElement cmsId="baf20e61-94" as="div" className="flex items-center gap-1 mt-1">
                      <CmsElement cmsId="baf20e61-95" as="span" className="material-symbols-outlined text-yellow-400 text-[18px] filled">star</CmsElement>
                      <CmsElement cmsId="baf20e61-96" as="span" className="font-bold text-gray-900 text-sm">
                        {calculateAverageRating(selectedService.talent_reviews) === 0 ? "New Seller" : calculateAverageRating(selectedService.talent_reviews)}
                      </CmsElement>
                      {selectedService.talent_reviews?.length > 0 && <CmsElement cmsId="baf20e61-97" as="span" className="text-gray-500 text-sm">({selectedService.talent_reviews.length} reviews)</CmsElement>}
                    </CmsElement>
                  </CmsElement>
                </CmsElement>

                <CmsElement cmsId="baf20e61-98" as="h2" className="text-2xl font-bold text-gray-900 mb-4">{selectedService.title}</CmsElement>
                <CmsElement cmsId="baf20e61-99" as="div" className="prose prose-sm text-gray-600 mb-8 whitespace-pre-wrap">
                  {selectedService.description}
                </CmsElement>
                
                {selectedService.video_url && (
                  <CmsElement cmsId="baf20e61-100" as="div" className="mb-6">
                    <CmsElement cmsId="baf20e61-101" as="h4" className="font-semibold text-gray-900 mb-2">Portfolio Video / Demo</CmsElement>
                    <CmsElement cmsId="baf20e61-102" as="a" href={selectedService.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg w-max border border-blue-100">
                      <CmsElement cmsId="baf20e61-103" as="span" className="material-symbols-outlined">smart_display</CmsElement>
                      View Video URL
                    </CmsElement>
                  </CmsElement>
                )}
                
                <CmsElement cmsId="baf20e61-104" as="h4" className="font-semibold text-gray-900 mb-3">Skills & Expertise</CmsElement>
                <CmsElement cmsId="baf20e61-105" as="div" className="flex flex-wrap gap-2">
                  {selectedService.skills?.map((skill: string, idx: number) => (
                    <CmsElement cmsId="baf20e61-106" as="span" instance={String(idx)} key={idx} className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </CmsElement>
                  ))}
                </CmsElement>
              </CmsElement>
            </CmsElement>

            {/* Right Col: Reviews & Actions */}
            <CmsElement cmsId="baf20e61-107" as="div" className="md:w-2/5 bg-white p-6 md:p-8 flex flex-col border-l border-gray-200 overflow-y-auto relative">
              
              {!showHireForm ? (
                <>
                  <CmsElement cmsId="baf20e61-108" as="div" className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-center">
                    <CmsElement cmsId="baf20e61-109" as="h3" className="font-bold text-gray-900 mb-2 text-lg">Interested in this service?</CmsElement>
                    <CmsElement cmsId="baf20e61-110" as="p" className="text-sm text-gray-600 mb-4">Send a request to our Admin with your requirements. We ensure 100% satisfaction and guarantee the delivery.</CmsElement>
                    {selectedService.talent_profiles?.whatsapp_enabled ? (
                      <CmsElement cmsId="baf20e61-111" as="button"
                        onClick={() => setShowHireForm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-[#023E7D] hover:bg-blue-800 text-white px-4 py-3 rounded-lg font-bold transition-all shadow-md"
                      >
                        Hire This Freelancer
                      </CmsElement>
                    ) : (
                      <CmsElement cmsId="baf20e61-112" as="div" className="bg-gray-100 text-gray-500 py-2 rounded-md font-medium text-sm">Currently Unavailable</CmsElement>
                    )}
                  </CmsElement>

                  <CmsElement cmsId="baf20e61-113" as="div" className="flex-1 flex flex-col">
                    <CmsElement cmsId="baf20e61-114" as="h3" className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                      Reviews
                      <CmsElement cmsId="baf20e61-115" as="span" className="text-sm font-normal text-gray-500">{selectedService.talent_reviews?.length || 0} total</CmsElement>
                    </CmsElement>
                    
                    <CmsElement cmsId="baf20e61-116" as="div" className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4 max-h-[300px]">
                      {!selectedService.talent_reviews || selectedService.talent_reviews.length === 0 ? (
                        <CmsElement cmsId="baf20e61-117" as="div" className="text-center text-gray-500 py-6 text-sm border border-dashed border-gray-200 rounded-lg">
                          No reviews yet. Be the first to leave one!
                        </CmsElement>
                      ) : (
                        selectedService.talent_reviews.map((rev: any) => (
                          <CmsElement cmsId="baf20e61-118" as="div" instance={String(rev.id)} key={rev.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                            <CmsElement cmsId="baf20e61-119" as="div" className="flex justify-between items-start mb-1">
                              <CmsElement cmsId="baf20e61-120" as="span" className="font-semibold text-gray-900 text-sm">{rev.client_name}</CmsElement>
                              <CmsElement cmsId="baf20e61-121" as="div" className="flex text-yellow-400 text-sm">
                                {[...Array(5)].map((_, i) => (
                                  <CmsElement cmsId="baf20e61-122" as="span" instance={String(i)} key={i} className={`material-symbols-outlined text-[14px] ${i < rev.rating ? "filled" : "text-gray-200"}`}>star</CmsElement>
                                ))}
                              </CmsElement>
                            </CmsElement>
                            <CmsElement cmsId="baf20e61-123" as="p" className="text-gray-600 text-sm">{rev.comment}</CmsElement>
                          </CmsElement>
                        ))
                      )}
                    </CmsElement>

                    <CmsElement cmsId="baf20e61-124" as="div" className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-auto shrink-0">
                      <CmsElement cmsId="baf20e61-125" as="h4" className="font-bold text-gray-900 mb-3 text-sm">Leave a Review</CmsElement>
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <CmsElement cmsId="baf20e61-126" as="div">
                          <input 
                            required 
                            type="text" 
                            placeholder="Your Name" 
                            value={reviewName}
                            onChange={e => setReviewName(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#023E7D] outline-none"
                          />
                        </CmsElement>
                        <CmsElement cmsId="baf20e61-127" as="div" className="flex items-center gap-2">
                          <CmsElement cmsId="baf20e61-128" as="span" className="text-sm text-gray-700">Rating:</CmsElement>
                          <select 
                            value={reviewRating} 
                            onChange={e => setReviewRating(Number(e.target.value))}
                            className="text-sm border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-[#023E7D]"
                          >
                            <option value={5}>5 Stars</option>
                            <option value={4}>4 Stars</option>
                            <option value={3}>3 Stars</option>
                            <option value={2}>2 Stars</option>
                            <option value={1}>1 Star</option>
                          </select>
                        </CmsElement>
                        <CmsElement cmsId="baf20e61-129" as="div">
                          <textarea 
                            required 
                            placeholder="Share your experience working with this freelancer..." 
                            rows={2}
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#023E7D] outline-none resize-none"
                          />
                        </CmsElement>
                        <CmsElement cmsId="baf20e61-130" as="button"
                          type="submit" 
                          disabled={isSubmittingReview}
                          className="w-full bg-[#023E7D] text-white py-2 rounded-md font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                        >
                          {isSubmittingReview ? "Submitting..." : "Submit Review"}
                        </CmsElement>
                      </form>
                    </CmsElement>
                  </CmsElement>
                </>
              ) : (
                /* HIRE FORM */
                <CmsElement cmsId="baf20e61-131" as="div" className="flex flex-col h-full">
                  <CmsElement cmsId="baf20e61-132" as="button" onClick={() => setShowHireForm(false)} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6">
                    <CmsElement cmsId="baf20e61-133" as="span" className="material-symbols-outlined mr-1 text-[18px]">arrow_back</CmsElement>
                    Back to details
                  </CmsElement>
                  
                  <CmsElement cmsId="baf20e61-134" as="h3" className="text-2xl font-bold text-gray-900 mb-2">Request this Service</CmsElement>
                  <CmsElement cmsId="baf20e61-135" as="p" className="text-gray-600 text-sm mb-6">Fill out this form and our Admin will contact you on WhatsApp to finalize the deal securely.</CmsElement>
                  
                  <form onSubmit={handleSubmitHire} className="space-y-4">
                    <CmsElement cmsId="baf20e61-136" as="div">
                      <CmsElement cmsId="baf20e61-137" as="label" className="block text-sm font-medium text-gray-700 mb-1">Your Name</CmsElement>
                      <input 
                        required 
                        type="text" 
                        value={hireName}
                        onChange={e => setHireName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none"
                      />
                    </CmsElement>
                    <CmsElement cmsId="baf20e61-138" as="div">
                      <CmsElement cmsId="baf20e61-139" as="label" className="block text-sm font-medium text-gray-700 mb-1">Your WhatsApp Number</CmsElement>
                      <input 
                        required 
                        type="tel" 
                        value={hireWhatsApp}
                        onChange={e => setHireWhatsApp(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none"
                      />
                    </CmsElement>
                    <CmsElement cmsId="baf20e61-140" as="div">
                      <CmsElement cmsId="baf20e61-141" as="label" className="block text-sm font-medium text-gray-700 mb-1">Project Details / Requirements</CmsElement>
                      <textarea 
                        required 
                        value={hireDetails}
                        onChange={e => setHireDetails(e.target.value)}
                        placeholder="Describe what you need the freelancer to do..."
                        rows={5}
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none resize-none"
                      />
                    </CmsElement>
                    
                    <CmsElement cmsId="baf20e61-142" as="div" className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 mt-4">
                      <CmsElement cmsId="baf20e61-143" as="span" className="material-symbols-outlined text-blue-600">verified_user</CmsElement>
                      <CmsElement cmsId="baf20e61-144" as="p" className="text-xs text-gray-600">
                        <CmsElement cmsId="baf20e61-145" as="strong">Admin Guarantee:</CmsElement> Your payment is secured by our administration. The freelancer gets paid only upon successful delivery.
                      </CmsElement>
                    </CmsElement>

                    <CmsElement cmsId="baf20e61-146" as="button"
                      type="submit" 
                      disabled={isSubmittingHire}
                      className="w-full mt-4 flex justify-center items-center gap-2 bg-[#023E7D] hover:bg-blue-800 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                      {isSubmittingHire ? (
                        "Sending Request..."
                      ) : (
                        <>
                          <CmsElement cmsId="baf20e61-147" as="span" className="material-symbols-outlined text-[20px]">send</CmsElement>
                          Send Request to Admin
                        </>
                      )}
                    </CmsElement>
                  </form>
                </CmsElement>
              )}

            </CmsElement>
          </CmsElement>
        </CmsElement>
      )}

      {zoomImageUrl && (
        <CmsElement cmsId="baf20e61-148" as="div"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomImageUrl(null)}
        >
          <CmsElement cmsId="baf20e61-149" as="button"
            type="button"
            onClick={() => setZoomImageUrl(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close image zoom"
          >
            <CmsElement cmsId="baf20e61-150" as="span" className="material-symbols-outlined block">close</CmsElement>
          </CmsElement>
          <CmsElement cmsId="baf20e61-151" as="img"
            src={zoomImageUrl}
            alt={selectedService?.title || "Service preview"}
            className="max-h-[92vh] max-w-[96vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </CmsElement>
      )}
    </CmsElement>
  );
}
