"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CLIENT_HUNTING_PRIMARY_TARGET_OPTIONS, getClientHuntSpecializationLabel, normalizeClientHuntSpecializations, type ClientHuntSpecialization } from "@/lib/client-hunting";
import { normalizeAnyUrl } from "@/lib/profile-links";
import type { ClientHuntLead, ClientHuntScenario, Profile } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

type LeadForm = {
  scenarioId: string;
  specialization: ClientHuntSpecialization;
  targetAreas: ClientHuntSpecialization[];
  clientName: string;
  businessName: string;
  websiteUrl: string;
  gmbUrl: string;
  facebookPageUrl: string;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  note: string;
  whyThisClient: string;
};

const emptyForm: LeadForm = {
  scenarioId: "",
  specialization: "web_development",
  targetAreas: [],
  clientName: "",
  businessName: "",
  websiteUrl: "",
  gmbUrl: "",
  facebookPageUrl: "",
  address: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  note: "",
  whyThisClient: "",
};

export function ClientHuntingBoard() {
  const supabase = createSupabaseBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scenarios, setScenarios] = useState<ClientHuntScenario[]>([]);
  const [leads, setLeads] = useState<ClientHuntLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      userResult,
      scenarioResult,
      leadResult,
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("client_hunt_scenarios").select("*").eq("is_active", true).order("scenario_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("client_hunt_leads").select("*").order("submitted_at", { ascending: false }),
    ]);

    const userId = userResult.data.user?.id;
    if (userId) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProfile(profileData as Profile | null);
    } else {
      setProfile(null);
    }

    setScenarios(scenarioResult.data ?? []);
    setLeads(leadResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentScenario = useMemo(() => {
    if (!profile?.client_hunting_specialization) {
      return scenarios.find((scenario) => (scenario.specialization as string) === "all") ?? scenarios[0] ?? null;
    }
    const sharedScenario = scenarios.find((scenario) => (scenario.specialization as string) === "all");
    const matched = scenarios.find((scenario) => scenario.specialization === profile.client_hunting_specialization);
    return matched ?? sharedScenario ?? scenarios[0] ?? null;
  }, [profile?.client_hunting_specialization, scenarios]);

  useEffect(() => {
    if (profile?.client_hunting_specialization) {
      setForm((current) => (
        current.specialization === profile.client_hunting_specialization
          ? current
          : { ...current, specialization: profile.client_hunting_specialization }
      ));
    }
  }, [profile?.client_hunting_specialization]);

  useEffect(() => {
    if (!currentScenario) {
      return;
    }

    setForm((current) => (
      current.targetAreas.length > 0
        ? current
        : { ...current, targetAreas: [currentScenario.specialization] }
    ));
  }, [currentScenario]);

  const currentLeads = useMemo(() => {
    if (!currentScenario) return [];
    return leads.filter((lead) => lead.scenario_id === currentScenario.id);
  }, [currentScenario, leads]);

  const myLeads = useMemo(() => currentLeads.filter((lead) => lead.student_id === profile?.id), [currentLeads, profile?.id]);
  const totalApprovedClientHunts = useMemo(
    () => leads.filter((lead) => lead.student_id === profile?.id && lead.status === "approved").length,
    [leads, profile?.id],
  );
  const approvedCount = myLeads.filter((lead) => lead.status === "approved").length;
  const pendingCount = myLeads.filter((lead) => lead.status === "pending").length;
  const rejectedCount = myLeads.filter((lead) => lead.status === "rejected").length;
  const dailyTarget = Math.max(profile?.client_hunting_daily_target ?? 3, 1);
  const remainingTarget = Math.max(dailyTarget - approvedCount, 0);
  const completionPercent = Math.min(100, Math.round((approvedCount / dailyTarget) * 100));

  function patchForm(patch: Partial<LeadForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function toggleTargetArea(value: ClientHuntSpecialization) {
    setForm((current) => {
      const nextAreas = current.targetAreas.includes(value)
        ? current.targetAreas.filter((item) => item !== value)
        : [...current.targetAreas, value];
      return {
        ...current,
        targetAreas: nextAreas,
        specialization: nextAreas[0] ?? current.specialization,
      };
    });
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setToast({ type: "error", message: "Student profile could not be loaded." });
      return;
    }
    if (!currentScenario) {
      setToast({ type: "error", message: "No active scenario available right now." });
      return;
    }

    if (!form.clientName.trim() || !form.businessName.trim()) {
      setToast({ type: "error", message: "Client name and business name are required." });
      return;
    }

    setSaving(true);

    const websiteUrl = normalizeAnyUrl(form.websiteUrl);
    const gmbUrl = normalizeAnyUrl(form.gmbUrl);
    const facebookPageUrl = normalizeAnyUrl(form.facebookPageUrl);
    const targetAreas = normalizeClientHuntSpecializations(form.targetAreas.length > 0 ? form.targetAreas : [form.specialization]);

    const duplicateResult = await supabase.rpc("check_client_hunt_duplicate", {
      target_student_id: profile.id,
      target_client_name: form.clientName.trim(),
      target_business_name: form.businessName.trim(),
      target_website_url: websiteUrl || null,
      target_gmb_url: gmbUrl || null,
      target_facebook_page_url: facebookPageUrl || null,
      target_address: form.address.trim() || null,
      target_phone_number: form.phoneNumber.trim() || null,
      target_whatsapp_number: form.whatsappNumber.trim() || null,
      target_email: form.email.trim() || null,
    });

    const duplicate = duplicateResult.data?.[0];
    if (duplicate?.is_duplicate) {
      setSaving(false);
      setToast({ type: "error", message: `Already added: ${duplicate.match_type} matched ${duplicate.match_value}.` });
      return;
    }

    const { error } = await supabase.rpc("submit_client_hunt_lead", {
      target_scenario_id: currentScenario.id,
      target_specialization: form.specialization,
      target_client_name: form.clientName.trim(),
      target_business_name: form.businessName.trim(),
      target_website_url: websiteUrl || null,
      target_gmb_url: gmbUrl || null,
      target_facebook_page_url: facebookPageUrl || null,
      target_address: form.address.trim() || null,
      target_phone_number: form.phoneNumber.trim() || null,
      target_whatsapp_number: form.whatsappNumber.trim() || null,
      target_email: form.email.trim() || null,
      target_note: form.note.trim() || null,
      target_why_this_client: form.whyThisClient.trim() || null,
      target_target_areas: targetAreas,
    });

    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Lead submitted for admin review." });
    setForm({
      ...emptyForm,
      specialization: profile.client_hunting_specialization ?? currentScenario.specialization,
      targetAreas: [currentScenario.specialization],
    });
    await loadData();
  }

  if (loading) return <LoadingState label="Loading client hunting board..." />;

  const visibleLeads = myLeads.filter((lead) => lead.status !== "approved");

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <PageHeader
        eyebrow="Client Hunting"
        title="Daily lead submissions"
        description="Submit your daily client target for the active scenario. Approved details are hidden from your view."
        action={<Link href="/student/profile" className="wc-secondary-btn">Set Specialization</Link>}
      />

      {!profile?.client_hunting_specialization ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="mt-0.5 text-xl text-amber-600" />
            <div>
              <p className="font-bold">Specialization not set</p>
              <p className="mt-1 text-sm">Choose your specialization and daily target in My Profile once, then both values stay saved for future client hunting.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <Stat label="Current Target" value={dailyTarget} icon="flag" dark />
        <Stat label="Overall Approved" value={totalApprovedClientHunts} icon="insights" />
        <Stat label="Pending" value={pendingCount} icon="pending_actions" />
        <Stat label="Rejected" value={rejectedCount} icon="close" />
        <Stat label="Target remaining" value={remainingTarget} icon="flag" />
      </div>

      {currentScenario ? (
        <div className="mb-6 rounded-3xl border border-primary/10 bg-[linear-gradient(135deg,rgba(238,244,255,0.95),rgba(255,255,255,0.98))] p-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{getClientHuntSpecializationLabel(currentScenario.specialization)}</p>
              <h2 className="mt-1 text-2xl font-black text-on-surface">{currentScenario.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{currentScenario.description ?? "No description provided."}</p>
              {currentScenario.instructions ? <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm text-on-surface">{currentScenario.instructions}</p> : null}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Progress</p>
              <p className="mt-1 text-3xl font-black text-primary">{completionPercent}%</p>
              <p className="text-sm text-on-surface-variant">{approvedCount}/{dailyTarget} approved</p>
              <div className="mt-3 h-2 w-56 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="No active scenario" description="Admin will publish the next daily brief here." icon="event_note" />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={submitLead} className="wc-card p-5">
          <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-on-surface-variant">
            <p className="font-bold text-on-surface">Manual entry only</p>
            <p className="mt-1">
              Fill the fields yourself. Add your Google Maps or GMB link in the same way as website and Facebook links.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="wc-label">Client name *</span>
              <input className="wc-input mt-2" value={form.clientName} onChange={(event) => patchForm({ clientName: event.target.value })} required />
            </label>
            <label className="block">
              <span className="wc-label">Business name *</span>
              <input className="wc-input mt-2" value={form.businessName} onChange={(event) => patchForm({ businessName: event.target.value })} required />
            </label>
            <label className="block">
              <span className="wc-label">Website link</span>
              <input className="wc-input mt-2" type="text" value={form.websiteUrl} onChange={(event) => patchForm({ websiteUrl: event.target.value })} placeholder="www.example.com or https://example.com" />
            </label>
            <label className="block">
              <span className="wc-label">Google Maps / GMB link</span>
              <input
                className="wc-input mt-2"
                type="text"
                value={form.gmbUrl}
                onChange={(event) => patchForm({ gmbUrl: event.target.value })}
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
              />
            </label>
            <label className="block">
              <span className="wc-label">Facebook page</span>
              <input className="wc-input mt-2" type="text" value={form.facebookPageUrl} onChange={(event) => patchForm({ facebookPageUrl: event.target.value })} placeholder="facebook.com/... or https://facebook.com/..." />
            </label>
            <label className="block">
              <span className="wc-label">Email</span>
              <input className="wc-input mt-2" type="email" value={form.email} onChange={(event) => patchForm({ email: event.target.value })} />
            </label>
            <label className="block">
              <span className="wc-label">Phone number</span>
              <input className="wc-input mt-2" value={form.phoneNumber} onChange={(event) => patchForm({ phoneNumber: event.target.value })} />
            </label>
            <label className="block">
              <span className="wc-label">WhatsApp number</span>
              <input className="wc-input mt-2" value={form.whatsappNumber} onChange={(event) => patchForm({ whatsappNumber: event.target.value })} />
            </label>
            <label className="block md:col-span-2">
              <span className="wc-label">Address</span>
              <textarea className="wc-input mt-2 min-h-24" value={form.address} onChange={(event) => patchForm({ address: event.target.value })} />
            </label>

            <label className="block md:col-span-2">
              <span className="wc-label">Why this client?</span>
              <textarea className="wc-input mt-2 min-h-24" value={form.whyThisClient} onChange={(event) => patchForm({ whyThisClient: event.target.value })} />
            </label>
            <label className="block md:col-span-2">
              <span className="wc-label">Weak points / note</span>
              <textarea className="wc-input mt-2 min-h-24" value={form.note} onChange={(event) => patchForm({ note: event.target.value })} placeholder="Example: no SEO, poor GMB profile, outdated website" />
            </label>
            <div className="md:col-span-2 rounded-2xl border border-outline-variant bg-surface-lowest p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">Target areas</p>
                  <p className="text-xs text-on-surface-variant">Check every service this client can be targeted for.</p>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant">
                  Selected: {form.targetAreas.length > 0 ? `${form.targetAreas.length} area${form.targetAreas.length === 1 ? "" : "s"}` : "none"}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CLIENT_HUNTING_PRIMARY_TARGET_OPTIONS.map((option) => {
                  const checked = form.targetAreas.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        checked ? "border-primary bg-primary/5 text-on-surface" : "border-outline-variant bg-white text-on-surface-variant hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={checked}
                        onChange={() => toggleTargetArea(option.value)}
                      />
                      <span className="font-semibold">{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                Primary tag: <span className="font-semibold text-on-surface">{getClientHuntSpecializationLabel(form.specialization)}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              Your specialization stays saved in profile: {getClientHuntSpecializationLabel(profile?.client_hunting_specialization)}
            </p>
            <button disabled={saving || !currentScenario} className="wc-primary-btn">
              <Icon name="send" className="text-lg" />
              {saving ? "Submitting..." : "Submit Lead"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          {approvedCount > 0 ? (
            <div className="wc-card border border-green-200 bg-green-50 p-5 text-green-950">
              <div className="flex items-start gap-3">
                <Icon name="check_circle" className="mt-0.5 text-xl text-green-600" />
                <div>
                  <p className="font-black">Client hunt approved</p>
                  <p className="mt-1 text-sm leading-6">
                    Aap ka client hunt approve ho gaya hai. Admin details safe rakhta hai, lekin student view me approved record ab show nahi hoga.
                  </p>
                  <p className="mt-2 text-xs font-semibold">
                    Next day ka brief ya naya keyword wait karein. Naya hunt admin ke next scenario ke sath aayega.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="wc-card p-5">
            <h3 className="text-base font-bold text-on-surface">Submission rules</h3>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li>• Submit your daily target per day.</li>
              <li>• Duplicate email, phone, website, GMB, Facebook, business name, or address gets blocked.</li>
              <li>• Approved leads are hidden from your view after review.</li>
            </ul>
          </div>

          <div className="wc-card p-5">
            <h3 className="text-base font-bold text-on-surface">My submissions</h3>
            <div className="mt-4 space-y-3">
              {visibleLeads.length === 0 ? (
                <EmptyState
                  title={approvedCount > 0 ? "Approved record hidden" : "No submissions yet"}
                  description={approvedCount > 0 ? "Your approved client hunt is hidden from your list. Wait for the next day brief or new keyword." : "Start with the active scenario above."}
                  icon="assignment"
                />
              ) : (
                visibleLeads.slice(0, 8).map((lead) => (
                  <div key={lead.id} className="rounded-2xl bg-surface-container-low p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-on-surface">{lead.business_name}</p>
                        <p className="text-xs text-on-surface-variant">{lead.client_name}</p>
                      </div>
                      <StatusPill value={lead.status} />
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-on-surface-variant">
                      <p>Specialization: {getClientHuntSpecializationLabel(lead.specialization)}</p>
                      {lead.target_areas?.length ? (
                        <p>Target areas: {lead.target_areas.map((area) => getClientHuntSpecializationLabel(area)).join(", ")}</p>
                      ) : null}
                      <p>Submitted: {formatDateTime(lead.submitted_at)}</p>
                      {lead.status === "rejected" ? <p className="text-error">Reason: {lead.reviewer_notes ?? "Not provided"}</p> : null}
                      <p>Website: {lead.website_url ?? "Empty"}</p>
                      <p>Phone: {lead.phone_number ?? "Empty"}</p>
                      <p>Email: {lead.email ?? "Empty"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="wc-card p-5">
            <h3 className="text-base font-bold text-on-surface">Privacy note</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Approved leads are hidden on your side. Admin can still review the record, filter it, and keep the full details saved.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value, icon, dark }: { label: string; value: string | number; icon: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-xl bg-primary p-4 text-white shadow-card" : "wc-card p-4"}>
      <div className={dark ? "mb-3 inline-flex rounded-xl bg-white/15 p-2" : "mb-3 inline-flex rounded-xl bg-surface-container p-2 text-primary"}>
        <Icon name={icon} className="text-lg" />
      </div>
      <p className={dark ? "text-xs font-bold text-blue-100" : "text-xs font-bold text-on-surface-variant"}>{label}</p>
      <p className={dark ? "text-2xl font-black text-white" : "text-2xl font-black text-primary"}>{value}</p>
    </div>
  );
}
