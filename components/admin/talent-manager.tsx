/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeImageUrl } from "@/lib/image-url";
import type { TalentProfile } from "@/components/student/talent-portfolio-manager";

import { 
  fetchAllTalentServices,
  fetchTalentServices, 
  approveTalentProfile, 
  rejectTalentProfile, 
  toggleTalentWhatsApp, 
  toggleTalentServiceStatus, 
  deleteTalentService, 
  updateTalentRequestStatus 
} from "@/app/admin/talent-management/actions";

export function TalentManager({ initialProfiles, initialRequests = [] }: { initialProfiles: TalentProfile[], initialRequests?: any[] }) {
  const [profiles, setProfiles] = useState<TalentProfile[]>(initialProfiles);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "requests">("requests");
  const [requestStatusTab, setRequestStatusTab] = useState<"new" | "pending" | "completed">("new");
  const [viewingServicesFor, setViewingServicesFor] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const pendingProfiles = profiles.filter((p) => p.status === "pending");
  const approvedProfiles = profiles.filter((p) => p.status === "approved");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesText = (...values: Array<string | null | undefined>) => {
    if (!normalizedSearch) return true;
    return values.some((value) => value?.toLowerCase().includes(normalizedSearch));
  };
  const servicesByProfile = allServices.reduce<Record<string, any[]>>((acc, service) => {
    const talentId = service.talent_id as string | undefined;
    if (!talentId) return acc;
    acc[talentId] = [...(acc[talentId] || []), service];
    return acc;
  }, {});
  const filteredRequests = requests.filter((req) => matchesText(
    req.client_name,
    req.client_whatsapp,
    req.project_details,
    req.talent_services?.title,
    req.talent_services?.talent_profiles?.name,
  ));
  const requestGroups = {
    new: filteredRequests.filter((req) => req.status === "pending"),
    pending: filteredRequests.filter((req) => req.status === "in_progress"),
    completed: filteredRequests.filter((req) => req.status === "completed"),
  };
  const visibleRequests = requestGroups[requestStatusTab];
  const filteredPendingProfiles = pendingProfiles.filter((p) => matchesText(p.name, p.email, p.whatsapp_number));
  const filteredApprovedProfiles = approvedProfiles.filter((p) => {
    const serviceTitles = (servicesByProfile[p.id] || []).map((service) => service.title).join(" ");
    return matchesText(p.name, p.email, p.whatsapp_number, serviceTitles);
  });
  const pendingServiceCount = allServices.filter((service) => service.status === "inactive").length;
  const activeServiceCount = allServices.filter((service) => service.status === "active").length;

  const handleApprove = async (profile: TalentProfile) => {
    setToast(null);
    const { success, error } = await approveTalentProfile(profile.id);

    if (!success) {
      setToast({ type: "error", message: "Failed to approve application: " + error });
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
    const { success } = await rejectTalentProfile(id);
    if (!success) {
      setToast({ type: "error", message: "Failed to reject application." });
    } else {
      setToast({ type: "success", message: "Profile rejected." });
      setProfiles(profiles.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)));
    }
  };

  const handleToggleWhatsApp = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setToast(null);
    const { success } = await toggleTalentWhatsApp(id, currentStatus);
    if (!success) {
      setToast({ type: "error", message: "Failed to update status." });
    } else {
      setToast({ type: "success", message: `WhatsApp button ${newStatus ? "enabled" : "disabled"}.` });
      setProfiles(profiles.map((p) => (p.id === id ? { ...p, whatsapp_enabled: newStatus } : p)));
    }
  };

  const loadServices = async (profileId: string) => {
    setViewingServicesFor(profileId);
    const data = await fetchTalentServices(profileId);
    setServices(data || []);
  };

  const refreshAllServices = async () => {
    const data = await fetchAllTalentServices();
    setAllServices(data || []);
  };

  useEffect(() => {
    refreshAllServices();
  }, []);

  const handleToggleServiceStatus = async (serviceId: string, currentStatus: string) => {
    setToast(null);
    const { success, newStatus } = await toggleTalentServiceStatus(serviceId, currentStatus);
    if (!success) {
      setToast({ type: "error", message: "Failed to update service status." });
    } else {
      setToast({ type: "success", message: `Service is now ${newStatus}.` });
      setServices(services.map((s) => (s.id === serviceId ? { ...s, status: newStatus! } : s)));
      setAllServices(allServices.map((s) => (s.id === serviceId ? { ...s, status: newStatus! } : s)));
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Delete this service permanently?")) return;
    setToast(null);
    const { success } = await deleteTalentService(serviceId);
    if (!success) {
      setToast({ type: "error", message: "Failed to delete service." });
    } else {
      setToast({ type: "success", message: "Service deleted." });
      setServices(services.filter((s) => s.id !== serviceId));
      setAllServices(allServices.filter((s) => s.id !== serviceId));
    }
  };

  const handleUpdateReqStatus = async (reqId: string, newStatus: string) => {
    setToast(null);
    const { success } = await updateTalentRequestStatus(reqId, newStatus);
    if (!success) {
      setToast({ type: "error", message: "Failed to update request." });
    } else {
      setToast({ type: "success", message: `Request marked as ${newStatus}.` });
      setRequests(requests.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r)));
    }
  };

  return (
    <div className="relative space-y-4 p-4 lg:p-5">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900">Talent Management</h1>
          <p className="text-sm text-gray-500">Manage student portfolios, services, and client requests.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[640px]">
          {[
            ["New Requests", requestGroups.new.length, "bg-blue-50 text-blue-700"],
            ["Pending Work", requestGroups.pending.length, "bg-amber-50 text-amber-700"],
            ["Freelancers", approvedProfiles.length, "bg-slate-100 text-slate-700"],
            ["Service Queue", pendingServiceCount, "bg-emerald-50 text-emerald-700"],
          ].map(([label, value, tone]) => (
            <div key={label as string} className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
              <p className={`mt-1 inline-flex rounded-lg px-2 py-0.5 text-lg font-black ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm scrollbar-hide">
        <button
          onClick={() => { setActiveTab("requests"); setViewingServicesFor(null); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === "requests" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
        >
          Client Requests ({requests.filter(r => r.status === 'pending').length} New)
        </button>
        <button
          onClick={() => { setActiveTab("pending"); setViewingServicesFor(null); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === "pending" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
        >
          Pending Applications ({pendingProfiles.length})
        </button>
        <button
          onClick={() => { setActiveTab("approved"); setViewingServicesFor(null); }}
          className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === "approved" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
        >
          Freelancers Database ({approvedProfiles.length})
        </button>
      </div>

      <div className="sticky top-0 z-10 grid gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400">search</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search freelancer, phone, email, service, or request"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="button"
          onClick={refreshAllServices}
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Refresh Services
        </button>
      </div>

      {activeTab === "requests" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["new", `New Fresh Requests (${requestGroups.new.length})`],
              ["pending", `Pending Work (${requestGroups.pending.length})`],
              ["completed", `Completed (${requestGroups.completed.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRequestStatusTab(id as "new" | "pending" | "completed")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${requestStatusTab === id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleRequests.length === 0 ? (
            <EmptyState
              title={requestStatusTab === "new" ? "No new requests" : requestStatusTab === "pending" ? "No pending work" : "No completed requests"}
              description="Client service requests will appear here based on their current status."
              icon="inbox"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {visibleRequests.map((req) => (
                <div key={req.id} className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${req.status === 'pending' ? 'border-blue-300' : 'border-gray-200'}`}>
                  {req.status === 'pending' && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">NEW</div>}
                  {req.status === 'in_progress' && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">PENDING</div>}
                  {req.status === 'completed' && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">COMPLETED</div>}
                  
                  <div className="pr-20">
                    <h3 className="truncate font-bold text-gray-900">{req.client_name}</h3>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="font-semibold text-green-600">{req.client_whatsapp}</span>
                      <span className="text-gray-400">{new Date(req.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase text-gray-500">Project Requirements</p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-gray-700">{req.project_details}</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-blue-600">Requested Service</p>
                      <p className="line-clamp-1 text-sm font-bold text-gray-900">{req.talent_services?.title}</p>
                      <p className="mt-0.5 text-xs text-gray-600">Freelancer: {req.talent_services?.talent_profiles?.name}</p>
                    </div>
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                    <button 
                      onClick={() => {
                        const msg = encodeURIComponent(`Hello ${req.client_name},\n\nI am the Admin from We Connect. You requested the service "${req.talent_services?.title}" by ${req.talent_services?.talent_profiles?.name}.\n\nPlease let me know your requirements and we can finalize the payment details so I can assign the task to the freelancer.`);
                        window.open(`https://wa.me/${req.client_whatsapp.replace(/[^0-9]/g, "")}?text=${msg}`, "_blank");
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg bg-green-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600"
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
                      className="flex items-center justify-center gap-1 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">engineering</span>
                      Chat Freelancer
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateReqStatus(req.id, 'in_progress')}
                          className="flex-1 py-1.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Move to Pending
                        </button>
                        <button
                          onClick={() => handleUpdateReqStatus(req.id, 'completed')}
                          className="flex-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Mark Completed
                        </button>
                      </>
                    )}
                    {req.status === 'in_progress' && (
                      <button 
                        onClick={() => handleUpdateReqStatus(req.id, 'completed')}
                        className="flex-1 py-1.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Mark as Completed
                      </button>
                    )}
                    {req.status === 'completed' && (
                      <button
                        onClick={() => handleUpdateReqStatus(req.id, 'in_progress')}
                        className="flex-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Reopen as Pending
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
        <div className="space-y-2">
          {filteredPendingProfiles.length === 0 ? (
            <EmptyState title="No pending applications" description="There are no students waiting for portfolio approval." icon="check_circle" />
          ) : (
            filteredPendingProfiles.map((p) => (
              <div key={p.id} className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm md:flex-row">
                <div className="flex items-center gap-4">
                  {p.profile_picture_url ? (
                    <img src={normalizeImageUrl(p.profile_picture_url) || undefined} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
            {pendingServiceCount > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {pendingServiceCount} service{pendingServiceCount === 1 ? "" : "s"} waiting for admin activation. {activeServiceCount} active.
              </div>
            )}
            {filteredApprovedProfiles.length === 0 ? (
              <EmptyState title="No freelancers" description="Approve students from the pending tab to add them to the database." icon="assignment" />
            ) : (
              filteredApprovedProfiles.map((p) => (
                <div 
                  key={p.id} 
                  className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-colors ${viewingServicesFor === p.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => loadServices(p.id)}
                >
                  <div className="flex items-center gap-3">
                    {p.profile_picture_url ? (
                      <img src={normalizeImageUrl(p.profile_picture_url) || undefined} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400">person</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{p.whatsapp_number}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                      {(servicesByProfile[p.id] || []).length} services
                    </span>
                    {(servicesByProfile[p.id] || []).some((service) => service.status === "inactive") && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Needs approval</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      className={`flex-1 rounded border px-3 py-1.5 text-xs font-semibold transition-colors ${p.whatsapp_enabled ? 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200' : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleWhatsApp(p.id, p.whatsapp_enabled); }}
                    >
                      {p.whatsapp_enabled ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            {viewingServicesFor ? (
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 border-b pb-3 text-base font-bold text-gray-900">
                  Freelancer Details: {profiles.find(p => p.id === viewingServicesFor)?.name}
                </h3>
                {services.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    This freelancer hasn't added any services yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Services & Feedback</h4>
                    {services.map((service) => (
                      <div key={service.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          {service.image_url ? (
                            <img src={normalizeImageUrl(service.image_url) || undefined} alt={service.title} className="h-24 w-full rounded-lg border border-gray-200 object-cover sm:w-36" />
                          ) : (
                            <div className="flex h-24 w-full items-center justify-center rounded-lg bg-gray-200 text-gray-400 sm:w-36">
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
                            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{service.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {service.skills?.map((skill: string, i: number) => (
                                <span key={i} className="text-[10px] bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{skill}</span>
                              ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button 
                                className="px-3 py-1.5 border border-gray-300 bg-white rounded text-xs font-semibold hover:bg-gray-50 transition-colors"
                                onClick={() => handleToggleServiceStatus(service.id, service.status)}
                              >
                                {service.status === "active" ? "Deactivate Service" : "Activate Service"}
                              </button>
                              <button
                                className="px-3 py-1.5 border border-red-200 bg-white rounded text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                onClick={() => handleDeleteService(service.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
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
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-gray-400">
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
