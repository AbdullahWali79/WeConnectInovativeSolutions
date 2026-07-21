"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleDriveImagePreviews } from "@/components/admin/google-drive-image-previews";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Profile, StudentProject } from "@/lib/supabase/types";

function driveThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get("id");
    return id ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1200" : url;
  } catch { return url; }
}

export function StudentProjectsManager() {
  const supabase = createSupabaseBrowserClient();
  const [rows,setRows]=useState<StudentProject[]>([]);
  const [profiles,setProfiles]=useState<Pick<Profile,"id"|"full_name"|"email">[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<Record<string,string>>({});
  const [filter,setFilter]=useState("all");
  const [toast,setToast]=useState<ToastState>(null);

  const load=useCallback(async()=>{const [projects,students]=await Promise.all([supabase.from("student_projects").select("*").order("created_at",{ascending:false}),supabase.from("profiles").select("id,full_name,email")]); if(projects.error)setToast({type:"error",message:projects.error.message}); setRows((projects.data??[]) as StudentProject[]); setProfiles((students.data??[]) as Pick<Profile,"id"|"full_name"|"email">[]); setLoading(false)},[supabase]);
  useEffect(()=>{void load()},[load]);
  const names=useMemo(()=>new Map(profiles.map(p=>[p.id,p])),[profiles]);
  const visible=rows.filter(row=>filter==="all"||row.status===filter);

  async function review(row:StudentProject,status:"approved"|"rejected"){
    setBusy(row.id); const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from("student_projects").update({status,admin_feedback:feedback[row.id]?.trim()||null,reviewed_at:new Date().toISOString(),reviewed_by:user?.id,updated_at:new Date().toISOString()}).eq("id",row.id); setBusy(null); if(error)return setToast({type:"error",message:error.message}); setToast({type:"success",message:"Project "+status+"."}); await load();
  }

  async function publish(row:StudentProject){
    if(row.status!=="approved")return;
    setBusy(row.id); const student=names.get(row.student_id); const {data,error}=await supabase.from("products").insert({name:row.title,category:row.category,image_url:driveThumbnail(row.image_urls[0]??""),short_description:row.short_description,full_description:row.full_description,price_or_access_type:"Portfolio Project",badge:"new",product_link:row.live_url||row.github_url,features:row.technologies,status:"active",display_order:0,gallery_urls:row.image_urls,source_project_id:row.id,student_name:student?.full_name??"Student"}).select("id").single(); if(error){setBusy(null);return setToast({type:"error",message:error.message})} const update=await supabase.from("student_projects").update({promoted_product_id:data.id,updated_at:new Date().toISOString()}).eq("id",row.id); setBusy(null); if(update.error)return setToast({type:"error",message:update.error.message}); setToast({type:"success",message:"Project published on Products page."}); await load();
  }

  if(loading)return <LoadingState label="Loading student projects..."/>;
  return <div className="space-y-6"><PageHeader eyebrow="Portfolio Review" title="Student Projects" description="Approve student work, keep it as a project, or separately publish it to the public Products catalog."/>
    <div className="flex gap-2">{["all","submitted","approved","rejected"].map(value=><button key={value} onClick={()=>setFilter(value)} className={filter===value?"wc-primary-btn":"wc-secondary-btn"}>{value}</button>)}</div>
    <div className="grid gap-5">{visible.map(row=>{const student=names.get(row.student_id);return <article key={row.id} className="wc-card p-5"><div className="flex flex-col gap-3 lg:flex-row lg:justify-between"><div><div className="flex items-center gap-2"><h2 className="text-xl font-black">{row.title}</h2><StatusPill value={row.status}/></div><p className="mt-1 text-sm text-on-surface-variant">{student?.full_name??"Student"} · {student?.email} · {row.category}</p><p className="mt-3 max-w-3xl text-sm">{row.full_description||row.short_description}</p><div className="mt-3 flex gap-2"><a className="wc-secondary-btn" href={row.github_url} target="_blank" rel="noreferrer"><Icon name="code"/> GitHub</a>{row.live_url?<a className="wc-secondary-btn" href={row.live_url} target="_blank" rel="noreferrer"><Icon name="open_in_new"/> Live Demo</a>:null}</div></div>{row.promoted_product_id?<span className="h-fit rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Published as product</span>:null}</div>
      <GoogleDriveImagePreviews links={row.image_urls}/>
      <textarea className="wc-input mt-4 min-h-20" placeholder="Admin feedback" value={feedback[row.id]??row.admin_feedback??""} onChange={e=>setFeedback({...feedback,[row.id]:e.target.value})}/>
      <div className="mt-3 flex flex-wrap gap-2">{row.status==="submitted"?<><button disabled={busy===row.id} onClick={()=>void review(row,"approved")} className="wc-primary-btn"><Icon name="check"/> Approve</button><button disabled={busy===row.id} onClick={()=>void review(row,"rejected")} className="wc-secondary-btn"><Icon name="close"/> Reject</button></>:null}{row.status==="approved"&&!row.promoted_product_id?<button disabled={busy===row.id} onClick={()=>void publish(row)} className="wc-primary-btn"><Icon name="inventory_2"/> Publish as Product</button>:null}</div>
    </article>})}</div><Toast toast={toast} onClear={()=>setToast(null)}/></div>;
}