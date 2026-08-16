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

export function StudentProjectsManager() {
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

  const filterOptions = [
    { value: "all", label: "All", count: rows.length },
    { value: "submitted", label: "Submitted / Resubmitted", count: rows.filter((row) => row.status === "submitted").length },
    { value: "revision_required", label: "Needs Improvement", count: rows.filter((row) => row.status === "revision_required").length },
    { value: "approved", label: "Approved", count: rows.filter((row) => row.status === "approved" && !row.promoted_product_id).length },
    { value: "published", label: "Published", count: rows.filter((row) => Boolean(row.promoted_product_id)).length },
    { value: "rejected", label: "Rejected", count: rows.filter((row) => row.status === "rejected").length },
  ];
  const visible = rows
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

  const resubmittedCount = rows.filter((row) => row.status === "submitted" && row.admin_feedback && !row.reviewed_at).length;

  return <div className="space-y-6">
    <PageHeader eyebrow="Portfolio Review" title="Student Projects" description="Review student work, then customize exactly what visitors see before publishing it as a product." />

    {resubmittedCount ? <button type="button" onClick={() => setFilter("submitted")} className="flex w-full items-center justify-between gap-4 rounded-xl border border-sky-300 bg-sky-50 p-4 text-left text-sky-950">
      <span><strong>{resubmittedCount} improved {resubmittedCount === 1 ? "project has" : "projects have"} been resubmitted</strong><span className="mt-1 block text-sm">Open the Submitted / Resubmitted tab to review and approve the updated work.</span></span>
      <Icon name="arrow_forward" />
    </button> : null}

    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={filter === option.value ? "wc-primary-btn" : "wc-secondary-btn"}>
        {option.label} <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">{option.count}</span>
      </button>)}
    </div>

    <label className="relative block max-w-xl">
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

    <div className="grid gap-4">
      {visible.length ? visible.map((row) => {
        const student = names.get(row.student_id);
        const expanded = expandedIds.includes(row.id);
        const draft = drafts[row.id] ?? draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined);
        const previewLinks = urlLines(draft.imageLinksText);
        return <article key={row.id} className="wc-card overflow-hidden">
          <button type="button" onClick={() => toggleExpanded(row)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-surface-container-low">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-black">{row.title}</h2>
                <StatusPill value={row.status} />
                {row.status === "submitted" && row.admin_feedback && !row.reviewed_at ? <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">Resubmitted after improvements</span> : null}
                {row.promoted_product_id ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Published as product</span> : null}
              </div>
              <p className="mt-1 truncate text-sm text-on-surface-variant">{student?.full_name ?? "Student"} &middot; {student?.email} &middot; {row.category}</p>
              {row.status === "submitted" && row.admin_feedback && !row.reviewed_at ? <p className="mt-1 text-xs font-semibold text-sky-700">Updated {new Date(row.updated_at).toLocaleString()}</p> : null}
            </div>
            <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-primary">
              {expanded ? "Collapse" : "Expand"}<Icon name={expanded ? "expand_less" : "expand_more"} />
            </span>
          </button>

          {expanded ? <div className="border-t border-outline-variant p-5">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Original student submission - admin only</p>
              <p className="mt-2 text-sm leading-6">{row.full_description || row.short_description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.github_url ? <a className="wc-secondary-btn" href={row.github_url} target="_blank" rel="noreferrer"><Icon name="code" /> Student GitHub</a> : null}
                {row.live_url ? <a className="wc-secondary-btn" href={row.live_url} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> {/(youtube\.com|youtu\.be)/i.test(row.live_url) ? "Student YouTube" : "Student Live Demo"}</a> : null}
              </div>
              {row.live_url ? <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-outline-variant">
                <ProductVideoPreview url={row.live_url} title={`${row.title} submitted video`} />
              </div> : null}
            </div>

            {row.status === "approved" ? <div className="mt-5 rounded-xl border border-primary/30 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{row.promoted_product_id ? "Edit Published Product" : "Customize Before Publishing"}</h3>
                  <p className="text-sm text-on-surface-variant">Only these details and the visitor link will appear on the public Products page.</p>
                </div>
                {row.promoted_product_id ? <a className="wc-secondary-btn" href="/products" target="_blank" rel="noreferrer"><Icon name="inventory_2" /> View Product</a> : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Product title</span><input className="wc-input" value={draft.name} onChange={(event) => updateDraft(row.id, "name", event.target.value)} /></label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Category</span><input className="wc-input" value={draft.category} onChange={(event) => updateDraft(row.id, "category", event.target.value)} /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Short description</span><textarea className="wc-input min-h-20" value={draft.shortDescription} onChange={(event) => updateDraft(row.id, "shortDescription", event.target.value)} /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Full description</span><textarea className="wc-input min-h-36" value={draft.fullDescription} onChange={(event) => updateDraft(row.id, "fullDescription", event.target.value)} /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Visitor button link</span><input className="wc-input" placeholder="https://wa.me/923001234567 or any public URL" value={draft.visitorLink} onChange={(event) => updateDraft(row.id, "visitorLink", event.target.value)} /><span className="block text-xs text-on-surface-variant">Student GitHub is not published. Visitors open only this admin-selected link.</span></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Public product video</span><input className="wc-input" type="url" placeholder="YouTube, public Google Drive video, or direct MP4/WebM URL" value={draft.videoUrl} onChange={(event) => updateDraft(row.id, "videoUrl", event.target.value)} /><span className="block text-xs text-on-surface-variant">You can keep, replace, or remove the student&apos;s submitted video before publishing.</span></label>
                <label className="flex items-center gap-3 rounded-lg border border-outline-variant p-4 md:col-span-2">
                  <input type="checkbox" className="h-5 w-5 accent-primary" checked={draft.showInBranding} onChange={(event) => updateDraft(row.id, "showInBranding", event.target.checked)} />
                  <span><strong>Also show in Branding</strong><span className="block text-xs text-on-surface-variant">The product remains in {draft.category || "its original category"} and also appears under Branding.</span></span>
                </label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Access type</span><input className="wc-input" value={draft.accessType} onChange={(event) => updateDraft(row.id, "accessType", event.target.value)} /></label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Badge</span><select className="wc-input" value={draft.badge} onChange={(event) => updateDraft(row.id, "badge", event.target.value as ProductBadge)}><option value="new">New</option><option value="premium">Premium</option><option value="hot">Hot</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Public status</span><select className="wc-input" value={draft.status} onChange={(event) => updateDraft(row.id, "status", event.target.value as Product["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Features / technologies - one per line</span><textarea className="wc-input min-h-28" value={draft.featuresText} onChange={(event) => updateDraft(row.id, "featuresText", event.target.value)} /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Product image links - one per line</span><textarea className="wc-input min-h-32" placeholder="Google Drive or direct image URL, one per line" value={draft.imageLinksText} onChange={(event) => updateDraft(row.id, "imageLinksText", event.target.value)} /><span className="block text-xs text-on-surface-variant">Add, remove, replace, or reorder links. The first image becomes the product cover.</span></label>
              </div>

              {draft.videoUrl ? <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-outline-variant"><ProductVideoPreview url={draft.videoUrl} title={`${draft.name} public video preview`} /></div> : null}
              <GoogleDriveImagePreviews links={previewLinks} />
              <button disabled={busy === row.id} onClick={() => void saveProduct(row)} className="wc-primary-btn mt-4"><Icon name="save" /> {row.promoted_product_id ? "Save Product Changes" : "Publish Customized Product"}</button>
            </div> : null}

            <textarea className="wc-input mt-4 min-h-20" placeholder="Admin feedback" value={feedback[row.id] ?? row.admin_feedback ?? ""} onChange={(event) => setFeedback({ ...feedback, [row.id]: event.target.value })} />
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === "submitted" ? <>
                <button disabled={busy === row.id} onClick={() => void review(row, "approved")} className="wc-primary-btn"><Icon name="check" /> Approve</button>
                <button disabled={busy === row.id} onClick={() => void review(row, "revision_required")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-100 px-5 py-3 font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"><Icon name="rate_review" /> Need Improvement</button>
                <button disabled={busy === row.id} onClick={() => void review(row, "rejected")} className="wc-secondary-btn"><Icon name="close" /> Reject</button>
              </> : null}
              {row.status === "approved" && !row.promoted_product_id ? <button disabled={busy === row.id} onClick={() => void review(row, "revision_required")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-100 px-5 py-3 font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50"><Icon name="rate_review" /> Need Improvement</button> : null}
            </div>
          </div> : null}
        </article>;
      }) : <div className="wc-card p-8 text-center text-sm text-on-surface-variant">No projects match this filter.</div>}
    </div>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}
