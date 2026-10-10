/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { fetchPersonalPrompts, addPersonalPrompt, updatePersonalPrompt, deletePersonalPrompt } from "@/app/admin/personal-prompts/actions";
import { Icon } from "@/components/icon";

export function PersonalPrompts() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [editData, setEditData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetchPersonalPrompts();
    if (res.success) {
      setPrompts(res.prompts || []);
    } else {
      setToast({ type: "error", message: res.error || "Failed to load data" });
    }
    setLoading(false);
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ type: "success", message: "Copied to clipboard!" });
  };

  const filteredPrompts = prompts.filter(p => {
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || 
             p.category.toLowerCase().includes(q) || 
             (p.tags && p.tags.toLowerCase().includes(q));
    }
    return true;
  });

  const categories = Array.from(new Set(prompts.map(p => p.category)));

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Header section */}
      <div className="rounded-xl bg-primary p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">My Personal Prompts</h1>
          <p className="text-sm text-blue-100">Save and organize your frequently used AI prompts.</p>
        </div>
        <button onClick={() => { setEditData(null); setIsModalOpen(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Icon name="auto_awesome" className="text-[18px]" />
          Add Prompt
        </button>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Search Prompts</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-500 text-[20px]" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or tag..." 
              className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-4 text-gray-900 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      
      {/* Prompts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-400">Loading prompts...</div>
        ) : filteredPrompts.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
            No prompts found.
          </div>
        ) : (
          filteredPrompts.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col relative shadow-sm hover:shadow transition">
              {p.is_favorite && <Icon name="star" className="absolute top-4 right-4 text-yellow-500 text-[20px]" />}
              
              <div className="mb-4 pr-8">
                <span className="text-[10px] font-bold tracking-wider text-emerald-500 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-800/30 mb-2 inline-block">
                  {p.category.toUpperCase()}
                </span>
                <h3 className="text-lg font-bold leading-tight text-gray-900">{p.title}</h3>
                {p.tags && (
                  <p className="text-xs text-gray-400 mt-1">Tags: {p.tags}</p>
                )}
              </div>

              <div className="space-y-3 flex-1 mb-4">
                {(p.prompts_data || []).map((pt: any, i: number) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xs font-bold text-gray-300">{pt.label || `Prompt Text ${i + 1}`}</h4>
                      <button onClick={() => handleCopy(pt.text)} className="text-gray-500 hover:text-gray-300 ml-2 shrink-0">
                        <Icon name="content_copy" className="text-[16px]" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{pt.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-800 pt-3 mt-auto">
                 <button 
                  onClick={async () => {
                    const newFav = !p.is_favorite;
                    await updatePersonalPrompt(p.id, { is_favorite: newFav });
                    loadData();
                  }} 
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:bg-gray-800 flex items-center gap-1">
                   <Icon name={p.is_favorite ? "star_outline" : "star"} className="text-[16px]" /> 
                   {p.is_favorite ? "Unfavorite" : "Favorite"}
                 </button>
                 <button 
                  onClick={() => { setEditData(p); setIsModalOpen(true); }} 
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-400 hover:bg-blue-900/30 flex items-center gap-1">
                   <Icon name="edit" className="text-[16px]" /> Edit
                 </button>
                 <button 
                  onClick={async () => {
                    if(confirm("Delete this prompt?")) {
                      await deletePersonalPrompt(p.id);
                      loadData();
                    }
                  }} 
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-900/30 flex items-center gap-1">
                   <Icon name="delete" className="text-[16px]" /> Delete
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <AddPromptModal 
          editData={editData} 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { setIsModalOpen(false); loadData(); setToast({type:'success', message: editData ? 'Updated!' : 'Saved!'}); }} 
        />
      )}
    </div>
  );
}

function AddPromptModal({ editData, onClose, onSave }: { editData: any, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ 
    category: editData?.category || "", 
    title: editData?.title || "", 
    tags: editData?.tags || "", 
    is_favorite: editData?.is_favorite || false 
  });
  const [promptsData, setPromptsData] = useState<any[]>(editData?.prompts_data || [{ label: "", text: "" }]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave = { ...form, prompts_data: promptsData.filter(p => p.text.trim() !== "") };

    let res;
    if (editData?.id) {
      res = await updatePersonalPrompt(editData.id, dataToSave);
    } else {
      res = await addPersonalPrompt(dataToSave);
    }
    
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  const addPromptText = () => {
    setPromptsData([...promptsData, { label: "", text: "" }]);
  };

  const updatePromptText = (index: number, field: string, value: string) => {
    const newData = [...promptsData];
    newData[index][field] = value;
    setPromptsData(newData);
  };

  const removePromptText = (index: number) => {
    if (promptsData.length > 1) {
      setPromptsData(promptsData.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="auto_awesome" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">{editData ? "Edit Prompt" : "Add Prompt"}</h2>
              <p className="text-xs text-gray-500">Same topic ke liye multiple prompts save karein with tags and template placeholders.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="prompt-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Category</label>
              <input required type="text" value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" placeholder="e.g. Assignments, Research, Emails" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Topic / Title</label>
              <input required type="text" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" placeholder="Same topic par multiple prompts save kar sakte hain" />
              <p className="text-xs text-gray-500 mt-1">Ek hi topic ke neeche multiple prompts allowed hain.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Tags</label>
              <input type="text" value={form.tags} onChange={e=>setForm({...form, tags: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" placeholder="comma separated tags" />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer w-max">
              <input type="checkbox" checked={form.is_favorite} onChange={e=>setForm({...form, is_favorite: e.target.checked})} className="rounded bg-white border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm font-bold text-gray-700">Mark as favorite</span>
            </label>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Prompt Texts</h3>
                  <p className="text-xs text-gray-500">Aik hi topic ke neeche jitne prompt texts chahen add ya edit kar sakte hain.</p>
                </div>
                <button type="button" onClick={addPromptText} className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                  <Icon name="add" className="text-[16px]" /> Add Prompt Text
                </button>
              </div>

              <div className="space-y-4">
                {promptsData.map((pt, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                    {promptsData.length > 1 && (
                      <button type="button" onClick={() => removePromptText(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Icon name="close" className="text-[18px]" />
                      </button>
                    )}
                    <h4 className="mb-1 block text-xs font-bold text-gray-600">Prompt Text {index + 1}</h4>
                    <textarea 
                      required
                      value={pt.text} 
                      onChange={e=>updatePromptText(index, "text", e.target.value)} 
                      rows={4} 
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 mb-3 resize-none" 
                      placeholder="Write the full prompt here. Example: Write feedback for {{student_name}} on {{assignment_name}}."
                    ></textarea>
                    
                    <label className="mb-1 block text-xs font-bold text-gray-600">Label for Prompt Text {index + 1}</label>
                    <input 
                      type="text" 
                      value={pt.label} 
                      onChange={e=>updatePromptText(index, "label", e.target.value)} 
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" 
                      placeholder="LinkedIn Post, Logo Output, Website Copy" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="prompt-form" disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 flex items-center gap-2">
            <Icon name="save" className="text-[18px]" /> {saving ? "Saving..." : "Save Prompt"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 flex items-center gap-2">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
