/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EmptyState } from "@/components/empty-state";
import { Toast, type ToastState } from "@/components/toast";
import type { TalentProfile, TalentService } from "@/components/student/talent-portfolio-manager";

export function TalentManager({ initialProfiles }: { initialProfiles: TalentProfile[] }) {
  const supabase = createSupabaseBrowserClient();
  const [profiles, setProfiles] = useState<TalentProfile[]>(initialProfiles);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [viewingServicesFor, setViewingServicesFor] = useState<string | null>(null);
  const [services, setServices] = useState<TalentService[]>([]);
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

    // Send WhatsApp Message logic (Redirect)
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
    const { data } = await supabase
      .from("talent_services" as any)
      .select("*")
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

  return (
    <div className="p-6 space-y-6 relative">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Management</h1>
          <p className="text-gray-500">Manage student portfolios and services.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab("pending"); setViewingServicesFor(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === "pending" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Pending Applications ({pendingProfiles.length})
        </button>
        <button
          onClick={() => { setActiveTab("approved"); setViewingServicesFor(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === "approved" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Approved Portfolios ({approvedProfiles.length})
        </button>
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2">
            {approvedProfiles.length === 0 ? (
              <EmptyState title="No approved portfolios" description="Approve students from the pending tab." icon="assignment" />
            ) : (
              approvedProfiles.map((p) => (
                <div 
                  key={p.id} 
                  className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-colors ${viewingServicesFor === p.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => loadServices(p.id)}
                >
                  <div className="flex items-center gap-3">
                    {p.profile_picture_url ? (
                      <img src={p.profile_picture_url} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
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

          <div className="lg:col-span-2">
            {viewingServicesFor ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-4">
                  Services for {profiles.find(p => p.id === viewingServicesFor)?.name}
                </h3>
                {services.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    This student hasn't added any services yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row gap-4 relative">
                        {service.image_url ? (
                          <img src={service.image_url} alt={service.title} className="w-full sm:w-32 h-24 object-cover rounded-md" />
                        ) : (
                          <div className="w-full sm:w-32 h-24 bg-gray-100 flex items-center justify-center rounded-md text-gray-400">
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
                          <div className="flex gap-1 mt-2">
                            {service.skills?.map((skill, i) => (
                              <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{skill}</span>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button 
                              className="px-3 py-1.5 border border-gray-200 rounded text-xs font-semibold hover:bg-gray-50 transition-colors"
                              onClick={() => handleToggleServiceStatus(service.id, service.status)}
                            >
                              {service.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <button 
                              className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-xs font-semibold hover:bg-red-50 transition-colors"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-2 text-gray-300">swipe_right</span>
                <p>Select a student to view their services</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
