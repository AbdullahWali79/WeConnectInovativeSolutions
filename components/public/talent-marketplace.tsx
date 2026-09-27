/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Toast, type ToastState } from "@/components/toast";

export function TalentMarketplace({ services: initialServices }: { services: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  // Modal state
  const [selectedService, setSelectedService] = useState<any | null>(null);
  
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
    <div className="bg-gray-50 pb-20 relative">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Hero Section */}
      <div className="bg-[#023E7D] text-white pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/50 mix-blend-multiply"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
          <div className="flex-1">
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

          <div className="lg:mt-4">
            <Link href="/student/talent-portfolio" className="inline-flex items-center gap-2 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-[#023E7D] px-6 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-cyan-400/20 whitespace-nowrap">
              <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
              Only Freelancer can Apply
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center text-[#023E7D] mb-10">How It Works For Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">search</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">1. Find Freelancer</h3>
              <p className="text-sm text-gray-500">Search and filter to find the perfect freelancer for your project needs.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">2. Send Request</h3>
              <p className="text-sm text-gray-500">Review their portfolio and send a request with your WhatsApp number.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">3. Admin Management</h3>
              <p className="text-sm text-gray-500">Our Admin verifies the task, collects payment, and assigns it to the freelancer.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">4. Guaranteed Delivery</h3>
              <p className="text-sm text-gray-500">We take full responsibility for quality and timely delivery of your project.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
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
          <p className="text-gray-500">{sortedServices.length} services available</p>
        </div>

        {/* Services Grid */}
        {sortedServices.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedServices.map((service) => {
              const reviews = service.talent_reviews || [];
              const avgRating = calculateAverageRating(reviews);
              
              return (
                <div 
                  key={service.id} 
                  onClick={() => {
                    setSelectedService(service);
                    setShowHireForm(false);
                  }}
                  className="bg-white group rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                >
                  
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
                        <p className="text-xs text-gray-500 mt-0.5">Freelancer</p>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-gray-900 text-[15px] leading-snug mb-3 group-hover:underline line-clamp-2">
                      I will {service.title.toLowerCase().startsWith("i will") ? service.title.substring(6) : service.title}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-auto">
                      <span className="material-symbols-outlined text-yellow-400 text-[18px] filled">star</span>
                      <span className="font-bold text-gray-900 text-sm">{avgRating === 0 ? "New" : avgRating}</span>
                      {reviews.length > 0 && <span className="text-gray-400 text-sm">({reviews.length})</span>}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-xs text-gray-500 font-medium">STARTING AT</span>
                    
                    {service.talent_profiles?.whatsapp_enabled ? (
                      <button 
                        className="flex items-center gap-1.5 bg-[#023E7D] hover:bg-blue-800 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-colors"
                      >
                        Hire Me
                      </button>
                    ) : (
                      <span className="text-gray-900 font-bold">$Custom</span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Details Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative my-auto border border-gray-200">
            {/* Close button */}
            <button 
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 bg-gray-100/80 hover:bg-gray-200 rounded-full p-1.5 transition-colors z-10"
            >
              <span className="material-symbols-outlined block">close</span>
            </button>
            
            {/* Left Col: Media & Info */}
            <div className="md:w-3/5 bg-gray-50 overflow-y-auto">
              {selectedService.image_url ? (
                <img src={selectedService.image_url} alt={selectedService.title} className="w-full h-64 md:h-80 object-cover" />
              ) : (
                <div className="w-full h-64 md:h-80 bg-gray-200 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-gray-400">image</span>
                </div>
              )}
              
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  {selectedService.talent_profiles?.profile_picture_url ? (
                    <img src={selectedService.talent_profiles.profile_picture_url} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" alt="seller" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shadow-md border-2 border-white">
                      {selectedService.talent_profiles?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{selectedService.talent_profiles?.name}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-yellow-400 text-[18px] filled">star</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {calculateAverageRating(selectedService.talent_reviews) === 0 ? "New Seller" : calculateAverageRating(selectedService.talent_reviews)}
                      </span>
                      {selectedService.talent_reviews?.length > 0 && <span className="text-gray-500 text-sm">({selectedService.talent_reviews.length} reviews)</span>}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedService.title}</h2>
                <div className="prose prose-sm text-gray-600 mb-8 whitespace-pre-wrap">
                  {selectedService.description}
                </div>
                
                {selectedService.video_url && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Portfolio Video / Demo</h4>
                    <a href={selectedService.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-3 rounded-lg w-max border border-blue-100">
                      <span className="material-symbols-outlined">smart_display</span>
                      View Video URL
                    </a>
                  </div>
                )}
                
                <h4 className="font-semibold text-gray-900 mb-3">Skills & Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedService.skills?.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Reviews & Actions */}
            <div className="md:w-2/5 bg-white p-6 md:p-8 flex flex-col border-l border-gray-200 overflow-y-auto relative">
              
              {!showHireForm ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-center">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Interested in this service?</h3>
                    <p className="text-sm text-gray-600 mb-4">Send a request to our Admin with your requirements. We ensure 100% satisfaction and guarantee the delivery.</p>
                    {selectedService.talent_profiles?.whatsapp_enabled ? (
                      <button 
                        onClick={() => setShowHireForm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-[#023E7D] hover:bg-blue-800 text-white px-4 py-3 rounded-lg font-bold transition-all shadow-md"
                      >
                        Hire This Freelancer
                      </button>
                    ) : (
                      <div className="bg-gray-100 text-gray-500 py-2 rounded-md font-medium text-sm">Currently Unavailable</div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                      Reviews
                      <span className="text-sm font-normal text-gray-500">{selectedService.talent_reviews?.length || 0} total</span>
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4 max-h-[300px]">
                      {!selectedService.talent_reviews || selectedService.talent_reviews.length === 0 ? (
                        <div className="text-center text-gray-500 py-6 text-sm border border-dashed border-gray-200 rounded-lg">
                          No reviews yet. Be the first to leave one!
                        </div>
                      ) : (
                        selectedService.talent_reviews.map((rev: any) => (
                          <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{rev.client_name}</span>
                              <div className="flex text-yellow-400 text-sm">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={`material-symbols-outlined text-[14px] ${i < rev.rating ? "filled" : "text-gray-200"}`}>star</span>
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm">{rev.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-auto shrink-0">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm">Leave a Review</h4>
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div>
                          <input 
                            required 
                            type="text" 
                            placeholder="Your Name" 
                            value={reviewName}
                            onChange={e => setReviewName(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#023E7D] outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Rating:</span>
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
                        </div>
                        <div>
                          <textarea 
                            required 
                            placeholder="Share your experience working with this freelancer..." 
                            rows={2}
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#023E7D] outline-none resize-none"
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isSubmittingReview}
                          className="w-full bg-[#023E7D] text-white py-2 rounded-md font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                        >
                          {isSubmittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                /* HIRE FORM */
                <div className="flex flex-col h-full">
                  <button onClick={() => setShowHireForm(false)} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6">
                    <span className="material-symbols-outlined mr-1 text-[18px]">arrow_back</span>
                    Back to details
                  </button>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Request this Service</h3>
                  <p className="text-gray-600 text-sm mb-6">Fill out this form and our Admin will contact you on WhatsApp to finalize the deal securely.</p>
                  
                  <form onSubmit={handleSubmitHire} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                      <input 
                        required 
                        type="text" 
                        value={hireName}
                        onChange={e => setHireName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your WhatsApp Number</label>
                      <input 
                        required 
                        type="tel" 
                        value={hireWhatsApp}
                        onChange={e => setHireWhatsApp(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Details / Requirements</label>
                      <textarea 
                        required 
                        value={hireDetails}
                        onChange={e => setHireDetails(e.target.value)}
                        placeholder="Describe what you need the freelancer to do..."
                        rows={5}
                        className="w-full text-sm px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#023E7D] outline-none resize-none"
                      />
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 mt-4">
                      <span className="material-symbols-outlined text-blue-600">verified_user</span>
                      <p className="text-xs text-gray-600">
                        <strong>Admin Guarantee:</strong> Your payment is secured by our administration. The freelancer gets paid only upon successful delivery.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingHire}
                      className="w-full mt-4 flex justify-center items-center gap-2 bg-[#023E7D] hover:bg-blue-800 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                      {isSubmittingHire ? (
                        "Sending Request..."
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">send</span>
                          Send Request to Admin
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
