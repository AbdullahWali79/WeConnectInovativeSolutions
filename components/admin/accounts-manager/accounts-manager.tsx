/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { 
  fetchAccountsData, addSeller, addClient, addSharedAccount, 
  deleteSharedAccount, assignClientToAccount, updateAssignmentPayment, 
  removeAssignment, addBankAccount, deleteBankAccount, importClients 
} from "@/app/admin/accounts-manager/actions";
import { Icon } from "@/components/icon";

export function AccountsManager() {
  const [toast, setToast] = useState<ToastState>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toolFilter, setToolFilter] = useState("All");

  // Modals state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isSharedAccountsModalOpen, setIsSharedAccountsModalOpen] = useState(false);
  const [isAddSellerModalOpen, setIsAddSellerModalOpen] = useState(false);

  // Expanded Accounts
  const [expandedAccs, setExpandedAccs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  
  const handleImportCsv = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      const headers = lines[0].split(",");

      const firstNameIdx = headers.findIndex((h) => h.includes("First Name"));
      const middleNameIdx = headers.findIndex((h) => h.includes("Middle Name"));
      const lastNameIdx = headers.findIndex((h) => h.includes("Last Name"));
      const phone1Idx = headers.findIndex((h) => h === "Phone 1 - Value");
      const email1Idx = headers.findIndex((h) => h === "E-mail 1 - Value");
      const orgIdx = headers.findIndex((h) => h === "Organization Name");
      const labelsIdx = headers.findIndex((h) => h === "Labels");

      const importedClients = [];

      for (let i = 1; i < lines.length; i++) {
        const rowStr = lines[i];
        const row = [];
        let insideQuote = false;
        let currentVal = "";
        for (const char of rowStr) {
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            row.push(currentVal);
            currentVal = "";
          } else {
            currentVal += char;
          }
        }
        row.push(currentVal);

        if (row.length < 5) continue;

        const fn = row[firstNameIdx] || "";
        const mn = row[middleNameIdx] || "";
        const ln = row[lastNameIdx] || "";
        const name = [fn, mn, ln].filter(Boolean).join(" ");
        
        const phone = row[phone1Idx] ? row[phone1Idx].replace(/"/g, "") : null;
        const email = row[email1Idx] ? row[email1Idx].replace(/"/g, "") : null;
        const company = row[orgIdx] ? row[orgIdx].replace(/"/g, "") : null;
        const labels = row[labelsIdx] ? row[labelsIdx].replace(/"/g, "") : null;

        if (!name && !phone && !email) continue;

        importedClients.push({
          name: name || "Unknown Contact",
          phone: phone || null,
          email: email || null,
          company: company || null,
          labels: labels || null,
        });
      }

      if (importedClients.length > 0) {
        setToast({ type: "success", message: `Processing ${importedClients.length} contacts...` });
        const res = await importClients(importedClients);
        if (res.success) {
          setToast({ type: "success", message: `Successfully imported ${res.inserted} new contacts!` });
          loadData();
        } else {
          setToast({ type: "error", message: res.error || "Import failed" });
        }
      } else {
        setToast({ type: "error", message: "No valid contacts found in CSV." });
      }
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  async function loadData() {
    setLoading(true);
    const res = await fetchAccountsData();
    if (res.success) {
      setAccounts(res.accounts || []);
      setSellers(res.sellers || []);
      setClients(res.clients || []);
      setBanks(res.banks || []);
    } else {
      setToast({ type: "error", message: res.error || "Failed to load data" });
    }
    setLoading(false);
  }

  const toggleExpand = (id: string) => {
    setExpandedAccs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string) => {
    setToast({ type: "success", message: "Copied to clipboard!" });
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const expiringCount = accounts.filter(a => a.status === 'expiring_soon').length;
  const expiredCount = accounts.filter(a => a.status === 'expired').length;

  // Filtered Accounts
  const filteredAccounts = accounts.filter(a => {
    if (statusFilter !== "All" && a.status !== statusFilter.toLowerCase()) return false;
    if (toolFilter !== "All" && !a.tool_name.toLowerCase().includes(toolFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.tool_name.toLowerCase().includes(q) || 
             (a.login_email && a.login_email.toLowerCase().includes(q)) ||
             a.am_assignments?.some((as:any) => as.am_clients?.name.toLowerCase().includes(q) || as.am_clients?.phone?.includes(q));
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Header section matching the screenshot */}
      <div className="rounded-xl bg-primary p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Accounts Workspace</h1>
          <p className="text-sm text-blue-100">Accounts aur clients popup me add karein. Neeche records clean layout me milenge.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setIsAddAccountModalOpen(true)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50 flex items-center gap-2">
            <Icon name="key" className="text-[18px]" />
            Add Shared Account
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} className="hidden" />
            <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">
              <Icon name={importing ? "sync" : "upload_file"} className={`text-[18px] ${importing ? "animate-spin" : ""}`} />
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button onClick={() => setIsAddClientModalOpen(true)} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">
            <Icon name="person_add" className="text-[18px]" />
            Add Client
          </button>
          <button onClick={() => setIsSharedAccountsModalOpen(true)} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">
            <Icon name="account_balance" className="text-[18px]" />
            Bank Accounts
          </button>
          <button onClick={() => setIsAddSellerModalOpen(true)} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">
            <Icon name="sell" className="text-[18px]" />
            Add Seller
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="wc-card p-5">
          <p className="text-xs font-bold text-gray-500 tracking-wider mb-2">ALL ACCOUNTS</p>
          <p className="text-3xl font-bold text-primary">{accounts.length}</p>
        </div>
        <div className="wc-card p-5">
          <p className="text-xs font-bold text-gray-500 tracking-wider mb-2">ACTIVE</p>
          <p className="text-3xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="wc-card p-5">
          <p className="text-xs font-bold text-gray-500 tracking-wider mb-2">EXPIRING SOON</p>
          <p className="text-3xl font-bold text-amber-600">{expiringCount}</p>
        </div>
        <div className="wc-card p-5">
          <p className="text-xs font-bold text-gray-500 tracking-wider mb-2">EXPIRED</p>
          <p className="text-3xl font-bold text-red-500">{expiredCount}</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Search Accounts</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-500 text-[20px]" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tool, login, plan, or client" 
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option>All</option>
            <option>Active</option>
            <option>Expiring Soon</option>
            <option>Expired</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Tool Filter</label>
          <select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option>All</option>
            {Array.from(new Set(accounts.map(a => a.tool_name))).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Accounts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="wc-card text-center py-10 text-gray-500">
            No accounts found. Add one to get started!
          </div>
        ) : (
          filteredAccounts.map(acc => (
            <div key={acc.id} className="wc-card flex flex-col overflow-hidden">
              {/* Header row */}
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-gray-900 font-bold text-sm">{acc.tool_name} • {acc.login_email}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      acc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      acc.status === 'expiring_soon' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {acc.status.toUpperCase()}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200">{acc.share_type}</span>
                    {acc.end_date && (
                      <span className="text-xs text-gray-500 font-medium">Expires: {new Date(acc.end_date).toLocaleDateString()}</span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                      {acc.am_assignments?.length || 0} client(s)
                    </span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => toggleExpand(acc.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50 flex items-center gap-1">
                     {expandedAccs[acc.id] ? "Collapse" : "Expand"} <Icon name={expandedAccs[acc.id] ? "expand_less" : "expand_more"} className="text-[16px]" />
                   </button>
                   <button 
                    onClick={async () => {
                      if(confirm("Delete this account permanently?")) {
                        const res = await deleteSharedAccount(acc.id);
                        if(res.success) { setToast({type:'success', message:'Deleted!'}); loadData(); }
                        else setToast({type:'error', message: res.error || 'Failed to delete'});
                      }
                    }} 
                    className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                     <Icon name="delete" className="text-[18px]" />
                   </button>
                 </div>
              </div>

              {/* Expanded details */}
              {expandedAccs[acc.id] && (
                <div className="flex flex-col gap-6 border-t border-gray-200 bg-gray-50 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">ACCESS</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center rounded-lg border border-gray-200 bg-white p-2.5">
                          <span className="text-sm text-gray-700">{acc.login_email}</span>
                          <CopyButton text={acc.login_email} baseClassName="text-gray-400 hover:bg-blue-50 hover:text-blue-600" copiedClassName="bg-emerald-50 text-emerald-600" onCopied={() => handleCopy(acc.login_email)} />
                        </div>
                        <div className="flex justify-between items-center rounded-lg border border-gray-200 bg-white p-2.5">
                          <span className="text-sm text-gray-700">{acc.login_password}</span>
                          <CopyButton text={acc.login_password} baseClassName="text-gray-400 hover:bg-blue-50 hover:text-blue-600" copiedClassName="bg-emerald-50 text-emerald-600" onCopied={() => handleCopy(acc.login_password)} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">SHARING</h4>
                      <p className="text-sm text-gray-700 mb-1">{acc.am_assignments?.length || 0} used / {acc.total_slots} total</p>
                      <p className="text-sm text-gray-700 mb-1">{acc.total_slots - (acc.am_assignments?.length || 0)} slot(s) remaining</p>
                      {acc.start_date && acc.end_date && (
                        <p className="text-xs text-gray-500 mt-3">{acc.start_date} to {acc.end_date}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">PURCHASE</h4>
                      <p className="text-sm text-gray-700 mb-1">{acc.am_sellers?.name || "No seller linked"}</p>
                      <p className="text-xs text-gray-500">Buy price: {acc.buy_price} | Buy date: {acc.buy_date || "N/A"}</p>
                    </div>
                  </div>

                  {/* Linked Clients */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-blue-700 flex items-center gap-1">
                        <Icon name="link" className="text-[18px]" /> Linked Clients
                      </h4>
                      <button onClick={() => {
                          const cid = prompt("Enter Client ID to assign (For now, use DB directly or next update will add dropdown)");
                          if (cid) {
                             assignClientToAccount(acc.id, cid, 'pending', 0).then(res => {
                               if(res.success) { setToast({type:'success', message:'Assigned!'}); loadData(); }
                             });
                          }
                      }} className="rounded bg-blue-600 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-700">
                        Assign Client
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {acc.am_assignments?.map((as:any) => (
                        <div key={as.id} className="flex justify-between items-center rounded-xl border border-gray-200 bg-white p-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-gray-900 text-sm">{as.am_clients?.name}</h5>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${as.payment_status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                {as.payment_status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{as.am_clients?.phone || as.am_clients?.whatsapp || 'No Phone'}</p>
                            {as.pending_amount > 0 && <p className="mt-1 text-[10px] text-amber-600">Pending: {as.pending_amount}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => {
                               const msg = encodeURIComponent(`Hi ${as.am_clients?.name},\nHere is your access for ${acc.tool_name}:\nEmail: ${acc.login_email}\nPass: ${acc.login_password}\nExpires: ${acc.end_date}`);
                               const phone = (as.am_clients?.whatsapp || as.am_clients?.phone || "").replace(/[^0-9]/g, "");
                               if(phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                               else alert("No WhatsApp number found");
                            }} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 flex items-center gap-1">
                              <Icon name="chat" className="text-[14px]" /> Share Access
                            </button>
                            <button onClick={async () => {
                              const amount = prompt("Update pending amount:", as.pending_amount);
                              if (amount !== null) {
                                const status = parseInt(amount) > 0 ? 'pending' : 'cleared';
                                const res = await updateAssignmentPayment(as.id, status, parseInt(amount));
                                if (res.success) { setToast({type:'success', message:'Updated!'}); loadData(); }
                              }
                            }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50">
                              Payment
                            </button>
                            <button onClick={async () => {
                              if(confirm("Remove this client from this account?")) {
                                const res = await removeAssignment(as.id);
                                if(res.success) { setToast({type:'success', message:'Removed!'}); loadData(); }
                              }
                            }} className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50">
                              <Icon name="close" className="text-[16px]" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!acc.am_assignments || acc.am_assignments.length === 0) && (
                        <p className="col-span-2 text-xs text-gray-500">No clients assigned to this account yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Seller Modal */}
      {isAddSellerModalOpen && (
        <AddSellerModal onClose={() => setIsAddSellerModalOpen(false)} onSave={() => { setIsAddSellerModalOpen(false); loadData(); setToast({type:'success', message:'Seller added'}); }} />
      )}

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <AddClientModal onClose={() => setIsAddClientModalOpen(false)} onSave={() => { setIsAddClientModalOpen(false); loadData(); setToast({type:'success', message:'Client added'}); }} />
      )}

      {/* Add Shared Account Modal */}
      {isAddAccountModalOpen && (
        <AddAccountModal sellers={sellers} onClose={() => setIsAddAccountModalOpen(false)} onSave={() => { setIsAddAccountModalOpen(false); loadData(); setToast({type:'success', message:'Account added'}); }} />
      )}
      
      {/* Shared Bank Accounts Modal */}
      {isSharedAccountsModalOpen && (
        <BankAccountsModal banks={banks} reload={loadData} onClose={() => setIsSharedAccountsModalOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// MODALS
// ---------------------------------------------------------

export function CopyButton({ text, baseClassName, copiedClassName, title, showLabel = false, onCopied }: {
  text: string;
  baseClassName: string;
  copiedClassName: string;
  title?: string;
  showLabel?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    onCopied?.();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : title}
      aria-label={copied ? "Copied" : title ?? "Copy"}
      className={`inline-flex items-center gap-1 rounded-lg p-1.5 text-sm font-semibold transition-all duration-200 ${copied ? copiedClassName : baseClassName}`}
    >
      <Icon name={copied ? "check" : "content_copy"} className={`text-sm transition-transform duration-200 ${copied ? "scale-110" : ""}`} />
      {showLabel && <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>}
      {!showLabel && copied && <span className="text-xs">Copied!</span>}
    </button>
  );
}

function AddSellerModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ name: "", platform: "", phone: "", whatsapp: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = await addSeller(form);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Add Seller</h2>
              <p className="text-xs text-gray-500">Jis seller/provider se account buy hota hai uski details yahan save karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Seller Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Seller / provider name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Platform</label>
                <input type="text" value={form.platform} onChange={e=>setForm({...form, platform: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Facebook, WhatsApp, website..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="seller@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={3} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Seller terms, reliability, payment account, renewal notes"></textarea>
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="seller-form" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Seller"}
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddClientModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", company: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = await addClient(form);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="group" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Add Client</h2>
              <p className="text-xs text-gray-500">Manual entry support.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Client Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Type name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="client@example.com" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Company / Notes</label>
              <input type="text" value={form.company} onChange={e=>setForm({...form, company: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-2" placeholder="Agency / Client tag" />
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Optional notes"></textarea>
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="client-form" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Client"}
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ sellers, onClose, onSave }: { sellers: any[], onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ 
    tool_name: "", label: "", link: "", seller_id: "", buy_price: 0, buy_date: "", purchase_notes: "",
    login_email: "", login_password: "", linked_mail: "", linked_mail_password: "",
    plan_type: "", extra_notes: "", share_type: "Shared", status: "active", total_slots: 1,
    start_date: "", end_date: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave = { ...form };
    if (!dataToSave.seller_id) delete (dataToSave as any).seller_id;
    if (!dataToSave.buy_date) delete (dataToSave as any).buy_date;
    if (!dataToSave.start_date) delete (dataToSave as any).start_date;
    if (!dataToSave.end_date) delete (dataToSave as any).end_date;

    const res = await addSharedAccount(dataToSave);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Add Shared Account</h2>
              <p className="text-xs text-gray-500">Tool, credentials, expiry dates yahan se manage karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="account-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Tool Name</label>
                <input required type="text" value={form.tool_name} onChange={e=>setForm({...form, tool_name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="ChatGPT, Canva, CapCut..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Account Label</label>
                  <input type="text" value={form.label} onChange={e=>setForm({...form, label: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Main shared account / Personal" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Account Link</label>
                  <input type="text" value={form.link} onChange={e=>setForm({...form, link: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="https://chatgpt.com/" />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
               <h3 className="mb-2 text-xs font-bold text-blue-700 tracking-wider">PURCHASE / SELLER</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Bought From Seller</label>
                    <select value={form.seller_id} onChange={e=>setForm({...form, seller_id: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      <option value="">No seller selected</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Buy Price</label>
                    <input type="number" value={form.buy_price} onChange={e=>setForm({...form, buy_price: parseInt(e.target.value)||0})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                 </div>
                 <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Buy Date</label>
                    <input type="date" value={form.buy_date} onChange={e=>setForm({...form, buy_date: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                 </div>
               </div>
               <div>
                 <input type="text" value={form.purchase_notes} onChange={e=>setForm({...form, purchase_notes: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Seller package, renewal terms, payment reference" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Tool Login / Email</label>
                <input required type="text" value={form.login_email} onChange={e=>setForm({...form, login_email: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Any email or login text" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Tool Login Password</label>
                <input required type="text" value={form.login_password} onChange={e=>setForm({...form, login_password: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Password" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Linked Mail</label>
                <input type="text" value={form.linked_mail} onChange={e=>setForm({...form, linked_mail: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Gmail ya koi bhi mail" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Linked Mail Password</label>
                <input type="text" value={form.linked_mail_password} onChange={e=>setForm({...form, linked_mail_password: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Mail password" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Plan Type</label>
                <input type="text" value={form.plan_type} onChange={e=>setForm({...form, plan_type: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Premium, Pro, Plus" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Extra Notes / Login Text</label>
                <input type="text" value={form.extra_notes} onChange={e=>setForm({...form, extra_notes: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Share Type</label>
                  <select value={form.share_type} onChange={e=>setForm({...form, share_type: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                  </select>
               </div>
               <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Account Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
               </div>
               <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">Total Slots</label>
                  <input type="number" min="1" value={form.total_slots} onChange={e=>setForm({...form, total_slots: parseInt(e.target.value)||1})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Start Date</label>
                <input type="date" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">End Date</label>
                <input type="date" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="account-form" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Account"}
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function BankAccountsModal({ banks, reload, onClose }: { banks: any[], reload: () => void, onClose: () => void }) {
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_title: "", details: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = await addBankAccount(form);
    if(res.success) {
      setForm({ bank_name: "", account_number: "", account_title: "", details: "" });
      reload();
    } else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="account_balance" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Shared Accounts Directory</h2>
              <p className="text-xs text-gray-500">Account/number add karein, search karein, aur details copy karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[500px]">
          {/* Add Form */}
          <div className="w-full overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 md:w-1/3">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Add Shared Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account / Bank Name</label>
                <input required type="text" value={form.bank_name} onChange={e=>setForm({...form, bank_name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Meezan Bank..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account Number / IBAN</label>
                <input required type="text" value={form.account_number} onChange={e=>setForm({...form, account_number: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="0321..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account Holder / Title</label>
                <input required type="text" value={form.account_title} onChange={e=>setForm({...form, account_title: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Details (Optional)</label>
                <textarea value={form.details} onChange={e=>setForm({...form, details: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Branch code, etc"></textarea>
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                {saving ? "Adding..." : "+ Add"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="w-full overflow-y-auto bg-white p-4 md:w-2/3">
             <div className="space-y-2">
               {banks.map(b => (
                 <div key={b.id} className="group flex justify-between items-center rounded-lg border-b border-gray-100 p-3 transition-colors hover:bg-gray-50">
                   <div>
                     <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                       <Icon name="expand_more" className="text-gray-500 text-sm" /> {b.bank_name}
                     </h4>
                     <p className="text-xs text-gray-500 pl-6">{b.account_number} • {b.account_title}</p>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <CopyButton
                       text={`${b.bank_name}\nTitle: ${b.account_title}\nAcc: ${b.account_number}`}
                       baseClassName="bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                       copiedClassName="bg-emerald-50 text-emerald-600"
                       title="Copy Info"
                       showLabel
                     />
                     <button onClick={async () => {
                       if(confirm("Delete this bank account?")) {
                         await deleteBankAccount(b.id);
                         reload();
                       }
                     }} className="rounded bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600">
                       <Icon name="delete" className="text-sm" />
                     </button>
                   </div>
                 </div>
               ))}
               {banks.length === 0 && <p className="text-center text-gray-500 text-sm py-10">No bank accounts added.</p>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
