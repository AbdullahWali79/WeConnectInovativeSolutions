"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { ProductVideoPreview } from "@/components/product-video-preview";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { cleanExternalUrl, splitExternalUrls } from "@/lib/image-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Product, ProductBadge, Profile, StudentProject } from "@/lib/supabase/types";

function driveThumbnail(url: string) {
  try {
    const parsed = new URL(cleanExternalUrl(url));
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get("id");
    return id ? "https://lh3.googleusercontent.com/d/" + encodeURIComponent(id) + "=w1600" : cleanExternalUrl(url);
  } catch {
    return cleanExternalUrl(url);
  }
}

type ProductDraft = {
  name: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  visitorLink: string;
  accessType: string;
  badge: ProductBadge;
  status: Product["status"];
  featuresText: string;
  imageLinksText: string;
  videoUrl: string;
  showInBranding: boolean;
};

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function urlLines(value: string) {
  return splitExternalUrls(value);
}

function draftFrom(row: StudentProject, product?: Product): ProductDraft {
  return {
    name: product?.name ?? row.title,
    category: product?.category ?? row.category,
    shortDescription: product?.short_description ?? row.short_description ?? "",
    fullDescription: product?.full_description ?? row.full_description ?? "",
    visitorLink: product?.product_link ?? "",
    accessType: product?.price_or_access_type ?? "Portfolio Project",
    badge: product?.badge ?? "new",
    status: product?.status ?? "active",
    featuresText: (product?.features ?? row.technologies).join("\n"),
    imageLinksText: (product?.gallery_urls?.length ? product.gallery_urls : row.image_urls).join("\n"),
    videoUrl: product?.video_url ?? row.live_url ?? "",
    showInBranding: product?.show_in_branding ?? false,
  };
}

export function StudentProjectsManager({ initialStudentId }: { initialStudentId?: string } = {}) {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<StudentProject[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<Pick<Profile, "id" | "full_name" | "email">[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    const [projectsResult, studentsResult, productsResult] = await Promise.all([
      supabase.from("student_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
    ]);
    if (projectsResult.error) setToast({ type: "error", message: projectsResult.error.message });
    if (productsResult.error) setToast({ type: "error", message: productsResult.error.message });
    setRows((projectsResult.data ?? []) as StudentProject[]);
    setProfiles((studentsResult.data ?? []) as Pick<Profile, "id" | "full_name" | "email">[]);
    setProducts((productsResult.data ?? []) as Product[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-student-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_projects" }, () => { void load(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [load, supabase]);

  const names = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function ensureDraft(row: StudentProject) {
    setDrafts((current) => current[row.id]
      ? current
      : { ...current, [row.id]: draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined) });
  }

  function updateDraft<K extends keyof ProductDraft>(id: string, field: K, value: ProductDraft[K]) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function review(row: StudentProject, status: "approved" | "rejected" | "revision_required") {
    const reviewFeedback = feedback[row.id]?.trim() || row.admin_feedback?.trim() || "";
    if (status === "revision_required" && !reviewFeedback) {
      return setToast({ type: "error", message: "Write improvement comments before sending the project back to the student." });
    }
    setBusy(row.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_projects").update({
      status,
      admin_feedback: reviewFeedback || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    setBusy(null);
    if (error) return setToast({ type: "error", message: error.message });
    setExpandedIds((current) => current.filter((id) => id !== row.id));
    setToast({
      type: "success",
      message: status === "revision_required"
        ? "Project returned to the student for improvement."
        : "Project " + status + ".",
    });
    await load();
  }

  async function bulkReview(status: "approved" | "rejected" | "revision_required") {
    if (!selectedIds.length) return;
    if (status === "revision_required") {
      const missingFeedback = selectedIds.some((id) => {
        const row = rows.find(r => r.id === id);
        const reviewFeedback = feedback[id]?.trim() || row?.admin_feedback?.trim() || "";
        return !reviewFeedback;
      });
      if (missingFeedback) {
        return setToast({ type: "error", message: "Write improvement comments for all selected projects before sending them back." });
      }
    }

    setBusy("bulk");
    const { data: { user } } = await supabase.auth.getUser();
    
    const updates = selectedIds.map(async (id) => {
      const row = rows.find(r => r.id === id);
      const reviewFeedback = feedback[id]?.trim() || row?.admin_feedback?.trim() || "";
      return supabase.from("student_projects").update({
        status,
        admin_feedback: reviewFeedback || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    });

    await Promise.all(updates);
    
    setBusy(null);
    setSelectedIds([]);
    setExpandedIds((current) => current.filter((id) => !selectedIds.includes(id)));
    setToast({
      type: "success",
      message: `${selectedIds.length} projects ${status === "revision_required" ? "returned for improvement" : status}.`,
    });
    await load();
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSelectAll(visibleIds: string[]) {
    if (selectedIds.length === visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  }

  async function saveProduct(row: StudentProject) {
    if (row.status !== "approved") return;
    const draft = drafts[row.id] ?? draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined);
    const imageUrls = urlLines(draft.imageLinksText);
    const features = lines(draft.featuresText);
    if (!draft.name.trim() || !draft.category.trim()) {
      return setToast({ type: "error", message: "Product title and category are required." });
    }
    if (draft.visitorLink.trim()) {
      try { new URL(draft.visitorLink.trim()); } catch { return setToast({ type: "error", message: "Visitor link must be a complete URL, for example https://wa.me/923001234567." }); }
    }
    if (draft.videoUrl.trim()) {
      try { new URL(draft.videoUrl.trim()); } catch { return setToast({ type: "error", message: "Video link must be a complete YouTube, Google Drive, or direct video URL." }); }
    }
    setBusy(row.id);
    const student = names.get(row.student_id);
    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      image_url: imageUrls[0] ? driveThumbnail(imageUrls[0]) : null,
      short_description: draft.shortDescription.trim() || null,
      full_description: draft.fullDescription.trim() || null,
      price_or_access_type: draft.accessType.trim() || null,
      badge: draft.badge,
      product_link: draft.visitorLink.trim() || null,
      features,
      status: draft.status,
      display_order: 0,
      gallery_urls: imageUrls,
      video_url: draft.videoUrl.trim() || null,
      show_in_branding: draft.showInBranding,
      source_project_id: row.id,
      student_name: student?.full_name ?? "Student",
      updated_at: new Date().toISOString(),
    };

    if (row.promoted_product_id) {
      const { error } = await supabase.from("products").update(payload).eq("id", row.promoted_product_id);
      setBusy(null);
      if (error) return setToast({ type: "error", message: error.message });
      setToast({ type: "success", message: "Published product updated." });
      await load();
      return;
    }

    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) {
      setBusy(null);
      return setToast({ type: "error", message: error.message });
    }
    const update = await supabase.from("student_projects").update({ promoted_product_id: data.id, updated_at: new Date().toISOString() }).eq("id", row.id);
    setBusy(null);
    if (update.error) return setToast({ type: "error", message: update.error.message });
    setToast({ type: "success", message: "Project published on Products page." });
    await load();
  }

  const studentRows = rows.filter((row) => !initialStudentId || row.student_id === initialStudentId);
  const selectedStudent = initialStudentId ? names.get(initialStudentId) : null;
  const filterOptions = [
    { value: "all", label: "All", count: studentRows.length },
    { value: "submitted", label: "Submitted / Resubmitted", count: studentRows.filter((row) => row.status === "submitted").length },
    { value: "revision_required", label: "Needs Improvement", count: studentRows.filter((row) => row.status === "revision_required").length },
    { value: "approved", label: "Approved", count: studentRows.filter((row) => row.status === "approved" && !row.promoted_product_id).length },
    { value: "published", label: "Published", count: studentRows.filter((row) => Boolean(row.promoted_product_id)).length },
    { value: "rejected", label: "Rejected", count: studentRows.filter((row) => row.status === "rejected").length },
  ];
  const visible = studentRows
    .filter((row) => {
      if (filter === "published") return Boolean(row.promoted_product_id);
      if (filter === "approved") return row.status === "approved" && !row.promoted_product_id;
      return filter === "all" || row.status === filter;
    })
    .filter((row) => {
      const query = search.trim().toLocaleLowerCase();
      if (!query) return true;
      const student = names.get(row.student_id);
      return [row.title, row.category, row.status, student?.full_name, student?.email]
        .some((value) => value?.toLocaleLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filter === "submitted") {
        const aResubmitted = Boolean(a.admin_feedback && !a.reviewed_at);
        const bResubmitted = Boolean(b.admin_feedback && !b.reviewed_at);
        if (aResubmitted !== bResubmitted) return aResubmitted ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (filter !== "approved") return 0;
      const aReviewed = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
      const bReviewed = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
      return bReviewed - aReviewed;
    });

  function toggleExpanded(row: StudentProject) {
    setExpandedIds((current) => current.includes(row.id) ? current.filter((item) => item !== row.id) : [...current, row.id]);
    ensureDraft(row);
  }

  if (loading) return <LoadingState label="Loading student projects..." />;

  const resubmittedCount = studentRows.filter((row) => row.status === "submitted" && row.admin_feedback && !row.reviewed_at).length;

  return <div className="space-y-6">
    <PageHeader eyebrow="Portfolio Review" title="Student Projects" description="Review student work, then customize exactly what visitors see before publishing it as a product." />
    {initialStudentId ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Selected student</p>
        <p className="mt-1 font-bold text-on-surface">{selectedStudent?.full_name ?? "Student"} <span className="font-normal text-on-surface-variant">{selectedStudent?.email ? `(${selectedStudent.email})` : ""}</span></p>
        <p className="mt-1 text-sm text-on-surface-variant">Only this student&apos;s {studentRows.length} projects are shown below.</p>
      </div>
      <a href="/admin/student-reports" className="wc-secondary-btn inline-flex"><Icon name="arrow_back" /> Back to student reports</a>
    </div> : null}

    {resubmittedCount ? <button type="button" onClick={() => setFilter("submitted")} className="flex w-full items-center justify-between gap-4 rounded-xl border border-sky-300 bg-sky-50 p-4 text-left text-sky-950">
      <span><strong>{resubmittedCount} improved {resubmittedCount === 1 ? "project has" : "projects have"} been resubmitted</strong><span className="mt-1 block text-sm">Open the Submitted / Resubmitted tab to review and approve the updated work.</span></span>
      <Icon name="arrow_forward" />
    </button> : null}

    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={filter === option.value ? "wc-primary-btn" : "wc-secondary-btn"}>
        {option.label} <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">{option.count}</span>
      </button>)}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-4">
      <label className="relative block w-full max-w-xl">
        <span className="sr-only">Search projects in the selected tab</span>
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="search"
          className="wc-input pl-12"
          placeholder="Search by project, student, email, or category..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-2 px-4 shadow-sm">
          <span className="text-sm font-bold text-primary">{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <button disabled={busy === "bulk"} onClick={() => void bulkReview("approved")} className="wc-primary-btn text-sm py-1 min-h-0"><Icon name="check" className="text-[18px]" /> Approve</button>
            <button disabled={busy === "bulk"} onClick={() => void bulkReview("revision_required")} className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"><Icon name="rate_review" className="text-[18px]" /> Need Improvement</button>
            <button disabled={busy === "bulk"} onClick={() => void bulkReview("rejected")} className="wc-secondary-btn text-sm py-1 min-h-0"><Icon name="close" className="text-[18px]" /> Reject</button>
          </div>
        </div>
      )}
    </div>

    {visible.length > 0 && (
      <div className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-on-surface-variant bg-surface-container-low/50 rounded-lg border border-outline-variant/50">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            className="h-5 w-5 cursor-pointer rounded border-2 border-primary/50 text-primary accent-primary hover:border-primary transition-colors" 
            checked={selectedIds.length === visible.length && visible.length > 0}
            onChange={() => toggleSelectAll(visible.map(r => r.id))}
          />
          Select All
        </label>
      </div>
    )}

    <div className="grid gap-3">
      {visible.length ? visible.map((row) => {
        const student = names.get(row.student_id);
        const expanded = expandedIds.includes(row.id);
        const draft = drafts[row.id] ?? draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined);
        const previewLinks = urlLines(draft.imageLinksText);
        const isSelected = selectedIds.includes(row.id);
        return <article key={row.id} className={`wc-card overflow-hidden transition-colors ${isSelected ? "border-primary/40 bg-primary/5" : ""}`}>
          <div className={`flex w-full items-center gap-3 p-3 sm:p-4 hover:bg-surface-container-low/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
            <label className="flex shrink-0 cursor-pointer p-2 rounded-full hover:bg-primary/10 transition-colors">
              <input 
                type="checkbox" 
                className="h-5 w-5 cursor-pointer rounded border-2 border-primary/50 text-primary accent-primary hover:border-primary transition-colors shadow-sm" 
                checked={isSelected}
                onChange={() => toggleSelection(row.id)}
              />
            </label>
            <button type="button" onClick={() => toggleExpanded(row)} className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-black">{row.title}</h2>
                  <StatusPill value={row.status} />
                  {row.status === "submitted" && row.admin_feedback && !row.reviewed_at ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">Resubmitted</span> : null}
                  {row.promoted_product_id ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Published</span> : null}
                </div>
                <p className="mt-0.5 truncate text-xs sm:text-sm text-on-surface-variant">{student?.full_name ?? "Student"} &middot; {student?.email} &middot; {row.category}</p>
                {row.status === "submitted" && row.admin_feedback && !row.reviewed_at ? <p className="mt-0.5 text-[10px] font-semibold text-sky-700">Updated {new Date(row.updated_at).toLocaleString()}</p> : null}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
                {expanded ? "Collapse" : "Expand"}<Icon name={expanded ? "expand_less" : "expand_more"} />
              </span>
            </button>
          </div>

          {expanded ? <div className="border-t border-outline-variant p-4 sm:p-5">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low/30 p-3 sm:p-4 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Original student submission</p>
              <p className="leading-relaxed text-on-surface/80">{row.full_description || row.short_description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.github_url ? <a className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors" href={row.github_url} target="_blank" rel="noreferrer"><Icon name="code" className="text-[16px]" /> GitHub</a> : null}
                {row.live_url ? <a className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors" href={row.live_url} target="_blank" rel="noreferrer"><Icon name="open_in_new" className="text-[16px]" /> {/(youtube\.com|youtu\.be)/i.test(row.live_url) ? "YouTube" : "Live Demo"}</a> : null}
              </div>
              {row.live_url ? <div className="mt-3 max-w-2xl overflow-hidden rounded-lg border border-outline-variant/50">
                <ProductVideoPreview url={row.live_url} title={`${row.title} submitted video`} />
              </div> : null}
            </div>

            {row.status === "approved" ? <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-primary">{row.promoted_product_id ? "Edit Published Product" : "Customize Before Publishing"}</h3>
                  <p className="text-xs text-on-surface-variant">Only these details and the visitor link will appear on the public Products page.</p>
                </div>
                {row.promoted_product_id ? <a className="wc-secondary-btn text-sm py-1.5 min-h-0" href="/products" target="_blank" rel="noreferrer"><Icon name="inventory_2" className="text-[18px]" /> View Product</a> : null}
              </div>

              <div className="rounded-lg bg-surface p-4 border border-outline-variant/50 shadow-sm">
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
                  <label className="space-y-1 md:col-span-2"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Product title</span><input className="wc-input text-sm py-1.5 px-3 h-9" value={draft.name} onChange={(event) => updateDraft(row.id, "name", event.target.value)} /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Category</span><input className="wc-input text-sm py-1.5 px-3 h-9" value={draft.category} onChange={(event) => updateDraft(row.id, "category", event.target.value)} /></label>
                  
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Access type</span><input className="wc-input text-sm py-1.5 px-3 h-9" value={draft.accessType} onChange={(event) => updateDraft(row.id, "accessType", event.target.value)} /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Badge</span><select className="wc-input text-sm py-1.5 px-3 h-9" value={draft.badge} onChange={(event) => updateDraft(row.id, "badge", event.target.value as ProductBadge)}><option value="new">New</option><option value="premium">Premium</option><option value="hot">Hot</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Public status</span><select className="wc-input text-sm py-1.5 px-3 h-9" value={draft.status} onChange={(event) => updateDraft(row.id, "status", event.target.value as Product["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>

                  <div className="col-span-full border-t border-outline-variant/30 my-1"></div>

                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Short description</span><textarea className="wc-input text-sm py-2 px-3 min-h-[60px]" value={draft.shortDescription} onChange={(event) => updateDraft(row.id, "shortDescription", event.target.value)} /></label>
                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Full description</span><textarea className="wc-input text-sm py-2 px-3 min-h-[100px]" value={draft.fullDescription} onChange={(event) => updateDraft(row.id, "fullDescription", event.target.value)} /></label>
                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Features / technologies - one per line</span><textarea className="wc-input text-sm py-2 px-3 min-h-[80px]" value={draft.featuresText} onChange={(event) => updateDraft(row.id, "featuresText", event.target.value)} /></label>

                  <div className="col-span-full border-t border-outline-variant/30 my-1"></div>

                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Visitor button link</span><input className="wc-input text-sm py-1.5 px-3 h-9" placeholder="https://wa.me/923001234567 or any public URL" value={draft.visitorLink} onChange={(event) => updateDraft(row.id, "visitorLink", event.target.value)} /><span className="block text-[10px] text-on-surface-variant">Student GitHub is not published. Visitors open only this admin-selected link.</span></label>
                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Public product video</span><input className="wc-input text-sm py-1.5 px-3 h-9" type="url" placeholder="YouTube, public Google Drive video, or direct MP4/WebM URL" value={draft.videoUrl} onChange={(event) => updateDraft(row.id, "videoUrl", event.target.value)} /><span className="block text-[10px] text-on-surface-variant">You can keep, replace, or remove the student&apos;s submitted video before publishing.</span></label>
                  <label className="space-y-1 md:col-span-3"><span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Product image links - one per line</span><textarea className="wc-input text-sm py-2 px-3 min-h-[80px]" placeholder="Google Drive or direct image URL, one per line" value={draft.imageLinksText} onChange={(event) => updateDraft(row.id, "imageLinksText", event.target.value)} /><span className="block text-[10px] text-on-surface-variant">Add, remove, replace, or reorder links. The first image becomes the product cover.</span></label>
                  
                  <label className="flex items-center gap-3 rounded-lg border border-outline-variant/50 p-3 md:col-span-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-2 border-primary/50 text-primary accent-primary" checked={draft.showInBranding} onChange={(event) => updateDraft(row.id, "showInBranding", event.target.checked)} />
                    <span className="text-sm"><strong>Also show in Branding</strong> &middot; <span className="text-on-surface-variant">The product remains in {draft.category || "its original category"} and also appears under Branding.</span></span>
                  </label>
                </div>
              </div>

              {draft.videoUrl ? <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-outline-variant"><ProductVideoPreview url={draft.videoUrl} title={`${draft.name} public video preview`} /></div> : null}
              <GoogleDriveImagePreviews links={previewLinks} />
              <button disabled={busy === row.id} onClick={() => void saveProduct(row)} className="wc-primary-btn mt-4 text-sm py-2 min-h-0"><Icon name="save" className="text-[18px]" /> {row.promoted_product_id ? "Save Product Changes" : "Publish Customized Product"}</button>
            </div> : null}

            <div className="mt-4 rounded-lg bg-surface-container-low/30 border border-outline-variant/50 p-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Admin Feedback</span>
                <textarea className="wc-input text-sm py-2 px-3 min-h-[60px]" placeholder="Write feedback here before returning for improvement..." value={feedback[row.id] ?? row.admin_feedback ?? ""} onChange={(event) => setFeedback({ ...feedback, [row.id]: event.target.value })} />
              </label>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {row.status === "submitted" ? <>
                <button disabled={busy === row.id} onClick={() => void review(row, "approved")} className="wc-primary-btn text-sm py-2 min-h-0"><Icon name="check" className="text-[18px]" /> Approve</button>
                <button disabled={busy === row.id} onClick={() => void review(row, "revision_required")} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"><Icon name="rate_review" className="text-[18px]" /> Need Improvement</button>
                <button disabled={busy === row.id} onClick={() => void review(row, "rejected")} className="wc-secondary-btn text-sm py-2 min-h-0"><Icon name="close" className="text-[18px]" /> Reject</button>
              </> : null}
              {row.status === "approved" && !row.promoted_product_id ? <button disabled={busy === row.id} onClick={() => void review(row, "revision_required")} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"><Icon name="rate_review" className="text-[18px]" /> Need Improvement</button> : null}
            </div>
          </div> : null}
        </article>;
      }) : <div className="wc-card p-8 text-center text-sm text-on-surface-variant">No projects match this filter.</div>}
    </div>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}
