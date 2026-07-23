"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Product, ProductBadge, Profile, StudentProject } from "@/lib/supabase/types";

function driveThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get("id");
    return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1200" : url;
  } catch {
    return url;
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
};

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function draftFrom(row: StudentProject, product?: Product): ProductDraft {
  return {
    name: product?.name ?? row.title,
    category: product?.category ?? row.category,
    shortDescription: product?.short_description ?? row.short_description ?? "",
    fullDescription: product?.full_description ?? row.full_description ?? "",
    visitorLink: product?.product_link ?? row.live_url ?? "",
    accessType: product?.price_or_access_type ?? "Portfolio Project",
    badge: product?.badge ?? "new",
    status: product?.status ?? "active",
    featuresText: (product?.features ?? row.technologies).join("\n"),
    imageLinksText: (product?.gallery_urls?.length ? product.gallery_urls : row.image_urls).join("\n"),
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

  const names = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function ensureDraft(row: StudentProject) {
    setDrafts((current) => current[row.id]
      ? current
      : { ...current, [row.id]: draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined) });
  }

  function updateDraft(id: string, field: keyof ProductDraft, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function review(row: StudentProject, status: "approved" | "rejected") {
    setBusy(row.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("student_projects").update({
      status,
      admin_feedback: feedback[row.id]?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    setBusy(null);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Project " + status + "." });
    await load();
  }

  async function saveProduct(row: StudentProject) {
    if (row.status !== "approved") return;
    const draft = drafts[row.id] ?? draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined);
    const imageUrls = lines(draft.imageLinksText);
    const features = lines(draft.featuresText);
    if (!draft.name.trim() || !draft.category.trim()) {
      return setToast({ type: "error", message: "Product title and category are required." });
    }
    if (draft.visitorLink.trim()) {
      try { new URL(draft.visitorLink.trim()); } catch { return setToast({ type: "error", message: "Visitor link must be a complete URL, for example https://wa.me/923001234567." }); }
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
    { value: "submitted", label: "Submitted", count: rows.filter((row) => row.status === "submitted").length },
    { value: "approved", label: "Approved", count: rows.filter((row) => row.status === "approved" && !row.promoted_product_id).length },
    { value: "published", label: "Published", count: rows.filter((row) => Boolean(row.promoted_product_id)).length },
    { value: "rejected", label: "Rejected", count: rows.filter((row) => row.status === "rejected").length },
  ];
  const visible = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "published") return Boolean(row.promoted_product_id);
    if (filter === "approved") return row.status === "approved" && !row.promoted_product_id;
    return row.status === filter;
  });

  function toggleExpanded(row: StudentProject) {
    setExpandedIds((current) => current.includes(row.id) ? current.filter((item) => item !== row.id) : [...current, row.id]);
    ensureDraft(row);
  }

  if (loading) return <LoadingState label="Loading student projects..." />;

  return <div className="space-y-6">
    <PageHeader eyebrow="Portfolio Review" title="Student Projects" description="Review student work, then customize exactly what visitors see before publishing it as a product." />

    <div className="flex flex-wrap gap-2">
      {filterOptions.map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={filter === option.value ? "wc-primary-btn" : "wc-secondary-btn"}>
        {option.label} <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">{option.count}</span>
      </button>)}
    </div>

    <div className="grid gap-4">
      {visible.length ? visible.map((row) => {
        const student = names.get(row.student_id);
        const expanded = expandedIds.includes(row.id);
        const draft = drafts[row.id] ?? draftFrom(row, row.promoted_product_id ? productById.get(row.promoted_product_id) : undefined);
        const previewLinks = lines(draft.imageLinksText);
        return <article key={row.id} className="wc-card overflow-hidden">
          <button type="button" onClick={() => toggleExpanded(row)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-surface-container-low">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-black">{row.title}</h2>
                <StatusPill value={row.status} />
                {row.promoted_product_id ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Published as product</span> : null}
              </div>
              <p className="mt-1 truncate text-sm text-on-surface-variant">{student?.full_name ?? "Student"} &middot; {student?.email} &middot; {row.category}</p>
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
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Access type</span><input className="wc-input" value={draft.accessType} onChange={(event) => updateDraft(row.id, "accessType", event.target.value)} /></label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Badge</span><select className="wc-input" value={draft.badge} onChange={(event) => updateDraft(row.id, "badge", event.target.value)}><option value="new">New</option><option value="premium">Premium</option><option value="hot">Hot</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
                <label className="space-y-1"><span className="text-xs font-bold uppercase">Public status</span><select className="wc-input" value={draft.status} onChange={(event) => updateDraft(row.id, "status", event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Features / technologies - one per line</span><textarea className="wc-input min-h-28" value={draft.featuresText} onChange={(event) => updateDraft(row.id, "featuresText", event.target.value)} /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase">Product image links - one per line</span><textarea className="wc-input min-h-32" placeholder="Google Drive or direct image URL, one per line" value={draft.imageLinksText} onChange={(event) => updateDraft(row.id, "imageLinksText", event.target.value)} /><span className="block text-xs text-on-surface-variant">Add, remove, replace, or reorder links. The first image becomes the product cover.</span></label>
              </div>

              <GoogleDriveImagePreviews links={previewLinks} />
              <button disabled={busy === row.id} onClick={() => void saveProduct(row)} className="wc-primary-btn mt-4"><Icon name="save" /> {row.promoted_product_id ? "Save Product Changes" : "Publish Customized Product"}</button>
            </div> : null}

            <textarea className="wc-input mt-4 min-h-20" placeholder="Admin feedback" value={feedback[row.id] ?? row.admin_feedback ?? ""} onChange={(event) => setFeedback({ ...feedback, [row.id]: event.target.value })} />
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === "submitted" ? <>
                <button disabled={busy === row.id} onClick={() => void review(row, "approved")} className="wc-primary-btn"><Icon name="check" /> Approve</button>
                <button disabled={busy === row.id} onClick={() => void review(row, "rejected")} className="wc-secondary-btn"><Icon name="close" /> Reject</button>
              </> : null}
            </div>
          </div> : null}
        </article>;
      }) : <div className="wc-card p-8 text-center text-sm text-on-surface-variant">No projects match this filter.</div>}
    </div>
    <Toast toast={toast} onClear={() => setToast(null)} />
  </div>;
}
