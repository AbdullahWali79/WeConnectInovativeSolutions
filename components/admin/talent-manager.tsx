/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EmptyState } from "@/components/empty-state";
import { Toast, type ToastState } from "@/components/toast";
import type { TalentProfile, TalentService } from "@/components/student/talent-portfolio-manager";

export function TalentManager({ initialProfiles, initialRequests = [] }: { initialProfiles: TalentProfile[], initialRequests?: any[] }) {
  const supabase = createSupabaseBrowserClient();
  const [profiles, setProfiles] = useState<TalentProfile[]>(initialProfiles);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "requests">("requests");
  const [viewingServicesFor, setViewingServicesFor] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const pendingProfiles = profiles.filter((p) => p.status === "pending");
  const approvedProfiles = profiles.filter((p) => p.status === "approved");

  const handleApprove = async (profile: TalentProfile) => {
    setToast(null);
    const { error } = await supabase
      .from("talent_profiles" as any)
      .update({ status: "approved" })
      .eq("id", profile.id);

    if (error) {
      setToast({ type: "error", message: "Failed to approve application: " + error.message });
      return;
    }

    setToast({ type: "success", message: "Profile approved!" });
    setProfiles(profiles.map((p) => (p.id === profile.id ? { ...p, status: "approved" } : p)));

    if (profile.whatsapp_number) {
      const msg = encodeURIComponent(`Hello ${profile.name},\n\nYour application to build a Talent Portfolio on our platform has been APPROVED!\n\nYou can now log in and add your services to your portfolio.`);
      const whatsappUrl = `https://wa.me/${profile.whatsapp_number.replace(/[^0-9]/g, "")}?text=${msg}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this application?")) return;
    setToast(null);
    const { error } = await supabase
      .from("talent_profiles" as any)
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) {
      setToast({ type: "error", message: "Failed to reject application." });
    } else {
      setToast({ type: "success", message: "Profile rejected." });
      setProfiles(profiles.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)));
    }
  };

  const handleToggleWhatsApp = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setToast(null);
    const { error } = await supabase
      .from("talent_profiles" as any)
      .update({ whatsapp_enabled: newStatus })
      .eq("id", id);
    if (error) {
      setToast({ type: "error", message: "Failed to update status." });
    } else {
      setToast({ type: "success", message: `WhatsApp button ${newStatus ? "enabled" : "disabled"}.` });
      setProfiles(profiles.map((p) => (p.id === id ? { ...p, whatsapp_enabled: newStatus } : p)));
    }
  };

  const loadServices = async (profileId: string) => {
    setViewingServicesFor(profileId);
    // Include reviews so admin can check client feedback
    const { data } = await supabase
      .from("talent_services" as any)
      .select(`
        *,
        talent_reviews (*)
      `)
      .eq("talent_id", profileId);
    if (data) setServices(data);
  };

  const handleToggleServiceStatus = async (serviceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setToast(null);
    const { error } = await supabase
      .from("talent_services" as any)
      .update({ status: newStatus })
      .eq("id", serviceId);
    if (error) {
      setToast({ type: "error", message: "Failed to update service status." });
    } else {
      setToast({ type: "success", message: `Service is now ${newStatus}.` });
      setServices(services.map((s) => (s.id === serviceId ? { ...s, status: newStatus } : s)));
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Delete this service permanently?")) return;
    setToast(null);
    const { error } = await supabase.from("talent_services" as any).delete().eq("id", serviceId);
    if (error) {
      setToast({ type: "error", message: "Failed to delete service." });
    } else {
      setToast({ type: "success", message: "Service deleted." });
      setServices(services.filter((s) => s.id !== serviceId));
    }
  };

  const handleUpdateReqStatus = async (reqId: string, newStatus: string) => {
    setToast(null);
    const { error } = await supabase
      .from("talent_requests" as any)
      .update({ status: newStatus })
      .eq("id", reqId);
    if (error) {
      setToast({ type: "error", message: "Failed to update request." });
    } else {
      setToast({ type: "success", message: `Request marked as ${newStatus}.` });
      setRequests(requests.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r)));
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Management</h1>
          <p className="text-gray-500">Manage student portfolios, services, and client requests.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => { setActiveTab("requests"); setViewingServicesFor(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "requests" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Client Requests ({requests.filter(r => r.status === 'pending').length} New)
        </button>
        <button
          onClick={() => { setActiveTab("pending"); setViewingServicesFor(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "pending" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Pending Applications ({pendingProfiles.length})
        </button>
        <button
          onClick={() => { setActiveTab("approved"); setViewingServicesFor(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "approved" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Freelancers Database ({approvedProfiles.length})
        </button>
      </div>

      {activeTab === "requests" && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <EmptyState title="No client requests" description="When clients request a service, they will appear here." icon="inbox" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div key={req.id} className={`bg-white p-5 rounded-xl border ${req.status === 'pending' ? 'border-blue-300 shadow-md' : 'border-gray-200 shadow-sm'} flex flex-col gap-3 relative overflow-hidden`}>
                  {req.status === 'pending' && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">NEW</div>}
                  {req.status === 'completed' && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">COMPLETED</div>}
                  
                  <div>
                    <h3 className="font-bold text-gray-900">{req.client_name}</h3>
                    <p className="text-sm font-medium text-green-600">{req.client_whatsapp}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 font-semibold uppercase">Project Requirements</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.project_details}</p>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-semibold uppercase">Requested Service</p>
                      <p className="text-sm font-bold text-gray-900">{req.talent_services?.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">Freelancer: {req.talent_services?.talent_profiles?.name}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        const msg = encodeURIComponent(`Hello ${req.client_name},\n\nI am the Admin from We Connect. You requested the service "${req.talent_services?.title}" by ${req.talent_services?.talent_profiles?.name}.\n\nPlease let me know your requirements and we can finalize the payment details so I can assign the task to the freelancer.`);
                        window.open(`https://wa.me/${req.client_whatsapp.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      Chat Client
                    </button>
                    <button 
                      onClick={() => {
                        const freelancerPhone = req.talent_services?.talent_profiles?.whatsapp_number || "";
                        const msg = encodeURIComponent(`Hello ${req.talent_services?.talent_profiles?.name},\n\nI have a new client project for your service "${req.talent_services?.title}".\n\nClient Name: ${req.client_name}\nRequirements:\n${req.project_details}\n\nCan you do this and what is your timeline/cost?`);
                        window.open(`https://wa.me/${freelancerPhone.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">engineering</span>
                      Chat Freelancer
                    </button>
                  </div>

                  <div className="flex gap-2 mt-1">
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateReqStatus(req.id, 'completed')}
                        className="flex-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingProfiles.length === 0 ? (
            <EmptyState title="No pending applications" description="There are no students waiting for portfolio approval." icon="check_circle" />
          ) : (
            pendingProfiles.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  {p.profile_picture_url ? (
                    <img src={p.profile_picture_url} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-400">person</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.email} • {p.whatsapp_number}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors" onClick={() => handleReject(p.id)}>Reject</button>
                  <button className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors" onClick={() => handleApprove(p)}>Approve & Notify</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "approved" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {approvedProfiles.length === 0 ? (
              <EmptyState title="No freelancers" description="Approve students from the pending tab to add them to the database." icon="assignment" />
            ) : (
              approvedProfiles.map((p) => (
                <div 
                  key={p.id} 
                  className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-colors ${viewingServicesFor === p.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => loadServices(p.id)}
                >
                  <div className="flex items-center gap-3">
                    {p.profile_picture_url ? (
                      <img src={p.profile_picture_url} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400">person</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{p.whatsapp_number}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button 
                      className={`flex-1 text-xs py-1.5 px-3 rounded border font-semibold transition-colors ${p.whatsapp_enabled ? 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleWhatsApp(p.id, p.whatsapp_enabled); }}
                    >
                      {p.whatsapp_enabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-2">
            {viewingServicesFor ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-y-auto max-h-[800px]">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">
                  Freelancer Details: {profiles.find(p => p.id === viewingServicesFor)?.name}
                </h3>
                {services.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    This freelancer hasn't added any services yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h4 className="font-semibold text-gray-700">Services & Feedback</h4>
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-4 shadow-sm bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {service.image_url ? (
                            <img src={service.image_url} alt={service.title} className="w-full sm:w-40 h-28 object-cover rounded-lg border border-gray-200" />
                          ) : (
                            <div className="w-full sm:w-40 h-28 bg-gray-200 flex items-center justify-center rounded-lg text-gray-400">
                              <span className="material-symbols-outlined text-3xl">image</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900">{service.title}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {service.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {service.skills?.map((skill: string, i: number) => (
                                <span key={i} className="text-[10px] bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{skill}</span>
                              ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button 
                                className="px-3 py-1.5 border border-gray-300 bg-white rounded text-xs font-semibold hover:bg-gray-50 transition-colors"
                                onClick={() => handleToggleServiceStatus(service.id, service.status)}
                              >
                                {service.status === "active" ? "Deactivate Service" : "Activate Service"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="mt-2 bg-white p-3 rounded-lg border border-gray-200">
                          <h5 className="text-xs font-bold text-gray-700 uppercase mb-2 flex justify-between">
                            Client Feedback
                            <span className="text-gray-500 font-normal">{service.talent_reviews?.length || 0} Reviews</span>
                          </h5>
                          {!service.talent_reviews || service.talent_reviews.length === 0 ? (
                            <p className="text-xs text-gray-400">No feedback yet.</p>
                          ) : (
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                              {service.talent_reviews.map((r: any) => (
                                <div key={r.id} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                  <div className="flex justify-between font-semibold text-gray-800">
                                    {r.client_name}
                                    <span className="text-yellow-500 flex items-center">{r.rating} <span className="material-symbols-outlined text-[12px] filled ml-0.5">star</span></span>
                                  </div>
                                  <p className="text-gray-600 mt-0.5">{r.comment}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-2 text-gray-300">swipe_right</span>
                <p>Select a freelancer to view their full record and feedback</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
