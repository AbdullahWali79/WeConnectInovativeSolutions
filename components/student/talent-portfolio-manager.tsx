/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EmptyState } from "@/components/empty-state";
import { Toast, type ToastState } from "@/components/toast";
import { normalizeImageUrl } from "@/lib/image-url";
import { addTalentService } from "@/app/student/talent-portfolio/actions";

export type TalentProfile = {
  id: string;
  name: string;
  email: string | null;
  whatsapp_number: string | null;
  profile_picture_url: string | null;
  status: "pending" | "approved" | "rejected";
  whatsapp_enabled: boolean;
};

export type TalentService = {
  id: string;
  talent_id: string;
  title: string;
  description: string | null;
  skills: string[];
  image_url: string | null;
  video_url: string | null;
  status: "active" | "inactive";
};

export function TalentPortfolioManager({ talentProfile: initialProfile, userId }: { talentProfile: TalentProfile | null; userId: string }) {
  const supabase = createSupabaseBrowserClient();
  const [profile, setProfile] = useState<TalentProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<TalentService[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Setup Form State
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number || "");
  const [pictureUrl, setPictureUrl] = useState(profile?.profile_picture_url || "");

  // Service Form State
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceSkills, setServiceSkills] = useState("");
  const [serviceImage, setServiceImage] = useState("");
  const [serviceVideo, setServiceVideo] = useState("");

  useEffect(() => {
    if (profile?.status === "approved") {
      fetchServices();
    }
  }, [profile]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("talent_services" as any)
      .select("*")
      .eq("talent_id", userId)
      .order("created_at", { ascending: false });
    if (data) setServices(data);
  };

  const formatImageUrl = (url: string) => {
    return normalizeImageUrl(url) || "";
  };

  const handleUpdateProfilePicture = async (newUrl: string) => {
    if (!profile) return;
    setLoading(true);
    const formattedUrl = formatImageUrl(newUrl);
    const { error } = await supabase
      .from("talent_profiles" as any)
      .update({ profile_picture_url: formattedUrl })
      .eq("id", profile.id);
    setLoading(false);
    if (error) {
      setToast({ type: "error", message: "Failed to update profile picture." });
    } else {
      setProfile({ ...profile, profile_picture_url: formattedUrl });
      setToast({ type: "success", message: "Profile picture updated." });
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    const formattedUrl = formatImageUrl(pictureUrl);
    const { error } = await supabase.from("talent_profiles" as any).insert({
      id: userId,
      name,
      email,
      whatsapp_number: whatsapp,
      profile_picture_url: formattedUrl,
      status: "pending",
    });

    setLoading(false);
    if (error) {
      setToast({ type: "error", message: "Failed to submit application: " + error.message });
    } else {
      setToast({ type: "success", message: "Application submitted successfully!" });
      setProfile({
        id: userId,
        name,
        email,
        whatsapp_number: whatsapp,
        profile_picture_url: formattedUrl,
        status: "pending",
        whatsapp_enabled: true,
      });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    
    const skillsArray = serviceSkills.split(",").map((s) => s.trim()).filter(Boolean);
    const formattedServiceImage = formatImageUrl(serviceImage);

    const result = await addTalentService({
      title: serviceTitle,
      description: serviceDesc,
      skills: skillsArray,
      imageUrl: formattedServiceImage,
      videoUrl: serviceVideo,
    });

    setLoading(false);
    if (!result.success) {
      setToast({ type: "error", message: "Failed to add service: " + result.error });
    } else {
      setToast({ type: "success", message: "Service submitted for admin approval." });
      setServices([result.service, ...services]);
      setIsAddingService(false);
      setServiceTitle("");
      setServiceDesc("");
      setServiceSkills("");
      setServiceImage("");
      setServiceVideo("");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    setToast(null);
    const { error } = await supabase.from("talent_services" as any).delete().eq("id", serviceId);
    if (error) {
      setToast({ type: "error", message: "Failed to delete service." });
    } else {
      setToast({ type: "success", message: "Service deleted." });
      setServices(services.filter((s) => s.id !== serviceId));
    }
  };

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 mt-10 relative">
        <Toast toast={toast} onClear={() => setToast(null)} />
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Talent Portfolio</h2>
          <p className="text-gray-500 mt-1">Apply to build your CV and showcase your services to clients.</p>
        </div>
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1234567890" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Clients will use this number to contact you.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
            <input value={pictureUrl} onChange={(e) => setPictureUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">Paste a Google Drive or public image link.</p>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    );
  }

  if (profile.status === "pending") {
    return (
      <div className="relative">
        <Toast toast={toast} onClear={() => setToast(null)} />
        <EmptyState
          title="Application Under Review"
          description="Your talent portfolio application has been submitted and is currently being reviewed by the admin. Please check back later."
          icon="hourglass_empty"
        />
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="relative">
        <Toast toast={toast} onClear={() => setToast(null)} />
        <EmptyState
          title="Application Rejected"
          description="Unfortunately, your application to build a talent portfolio was rejected."
          icon="cancel"
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 relative">
      <Toast toast={toast} onClear={() => setToast(null)} />
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            title="Click to update profile picture"
            onClick={() => {
              const newUrl = window.prompt("Enter image URL (Must be a direct image link or a public Google Drive share link):", profile.profile_picture_url || "");
              if (newUrl !== null) handleUpdateProfilePicture(newUrl.trim());
            }}
            className="relative group w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {profile.profile_picture_url ? (
              <img src={formatImageUrl(profile.profile_picture_url)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">person</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-colors">
               <span className="material-symbols-outlined text-white text-xl">edit</span>
            </div>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-gray-500">{profile.email} • {profile.whatsapp_number}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Portfolio Active
          </span>
          {!profile.whatsapp_enabled && (
            <p className="text-xs text-red-500 mt-1">WhatsApp contact disabled by admin.</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">
          My Services <span className="text-sm font-normal text-gray-500 ml-2">({services.length}/3)</span>
        </h3>
        {services.length < 3 ? (
          <button onClick={() => setIsAddingService(!isAddingService)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors">
            <span className="material-symbols-outlined mr-2 text-sm">add</span>
            Add Service
          </button>
        ) : (
          <span className="text-sm text-red-500 font-medium bg-red-50 px-3 py-1.5 rounded-md border border-red-100">Maximum 3 services allowed</span>
        )}
      </div>

      {isAddingService && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-top-4">
          <h4 className="font-semibold text-lg mb-4">Add New Service</h4>
          <form onSubmit={handleAddService} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Title</label>
              <input required value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} placeholder="e.g. Modern Web Development" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea required value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="Describe what you offer..." rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills / Tags (comma separated)</label>
              <input required value={serviceSkills} onChange={(e) => setServiceSkills(e.target.value)} placeholder="React, Node.js, UI/UX" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input value={serviceImage} onChange={(e) => setServiceImage(e.target.value)} placeholder="https://drive.google.com/... or public image link" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube/Drive)</label>
                <input value={serviceVideo} onChange={(e) => setServiceVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setIsAddingService(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{loading ? "Saving..." : "Save Service"}</button>
            </div>
          </form>
        </div>
      )}

      {services.length === 0 && !isAddingService ? (
        <EmptyState title="No services added yet" description="Click 'Add Service' to start showcasing your skills to clients." icon="inventory_2" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              {service.image_url ? (
                <img src={formatImageUrl(service.image_url)} alt={service.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl">image</span>
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <h4 className="font-bold text-lg text-gray-900 mb-2">{service.title}</h4>
                <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">{service.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {service.skills?.map((skill, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className={`text-xs font-semibold ${service.status === "active" ? "text-green-600" : "text-gray-500"}`}>
                    {service.status.toUpperCase()}
                  </span>
                  <button onClick={() => handleDeleteService(service.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-md transition-colors text-sm font-medium">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
