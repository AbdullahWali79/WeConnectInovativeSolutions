/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { 
  fetchAccountsData, addSeller, addClient, addSharedAccount, 
  deleteSharedAccount, assignClientToAccount, updateAssignmentPayment, 
  removeAssignment, addBankAccount, deleteBankAccount 
} from "@/app/admin/accounts-manager/actions";
import { Icon } from "@/components/icon";

export function AccountsManager() {
  const [toast, setToast] = useState<ToastState>(null);
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
    navigator.clipboard.writeText(text);
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
      <div className="bg-[#1e2330] rounded-xl p-6 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Accounts Workspace</h1>
          <p className="text-sm text-gray-400">Accounts aur clients popup me add karein. Neeche records clean layout me milenge.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setIsAddAccountModalOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Icon name="key" className="text-[18px]" />
            Add Shared Account
          </button>
          <button onClick={() => setIsAddClientModalOpen(true)} className="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Icon name="person_add" className="text-[18px]" />
            Add Client
          </button>
          <button onClick={() => setIsSharedAccountsModalOpen(true)} className="px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Icon name="account_balance" className="text-[18px]" />
            Bank Accounts
          </button>
          <button onClick={() => setIsAddSellerModalOpen(true)} className="px-4 py-2 border border-emerald-900/50 text-emerald-500 hover:bg-emerald-900/30 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Icon name="sell" className="text-[18px]" />
            Add Seller
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">ALL ACCOUNTS</p>
          <p className="text-3xl font-bold text-white">{accounts.length}</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">ACTIVE</p>
          <p className="text-3xl font-bold text-emerald-500">{activeCount}</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">EXPIRING SOON</p>
          <p className="text-3xl font-bold text-yellow-500">{expiringCount}</p>
        </div>
        <div className="bg-[#1e2330] rounded-xl p-5 border border-gray-800">
          <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">EXPIRED</p>
          <p className="text-3xl font-bold text-red-400">{expiredCount}</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Search Accounts</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-500 text-[20px]" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tool, login, plan, or client" 
              className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500">
            <option>All</option>
            <option>Active</option>
            <option>Expiring Soon</option>
            <option>Expired</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Tool Filter</label>
          <select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} className="w-full bg-[#1e2330] border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-blue-500">
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
          <div className="text-center py-10 text-gray-400">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-[#1e2330] rounded-xl border border-gray-800">
            No accounts found. Add one to get started!
          </div>
        ) : (
          filteredAccounts.map(acc => (
            <div key={acc.id} className="bg-[#1e2330] border border-gray-800 rounded-xl flex flex-col overflow-hidden">
              {/* Header row */}
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-white font-bold text-sm">{acc.tool_name} • {acc.login_email}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      acc.status === 'active' ? 'bg-emerald-900/30 text-emerald-500 border-emerald-800/50' :
                      acc.status === 'expiring_soon' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-800/50' :
                      'bg-red-900/30 text-red-500 border-red-800/50'
                    }`}>
                      {acc.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">{acc.share_type}</span>
                    {acc.end_date && (
                      <span className="text-xs text-gray-400 font-medium">Expires: {new Date(acc.end_date).toLocaleDateString()}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-800 text-gray-300 border border-gray-700">
                      {acc.am_assignments?.length || 0} client(s)
                    </span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => toggleExpand(acc.id)} className="px-3 py-1.5 border border-gray-700 rounded-lg text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-1">
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
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/30">
                     <Icon name="delete" className="text-[18px]" />
                   </button>
                 </div>
              </div>

              {/* Expanded details */}
              {expandedAccs[acc.id] && (
                <div className="p-5 border-t border-gray-800 bg-[#151923] flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">ACCESS</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[#1e2330] p-2.5 rounded-lg border border-gray-800">
                          <span className="text-sm text-gray-300">{acc.login_email}</span>
                          <button onClick={() => handleCopy(acc.login_email)} className="text-gray-500 hover:text-gray-300"><Icon name="content_copy" className="text-sm" /></button>
                        </div>
                        <div className="flex justify-between items-center bg-[#1e2330] p-2.5 rounded-lg border border-gray-800">
                          <span className="text-sm text-gray-300">{acc.login_password}</span>
                          <button onClick={() => handleCopy(acc.login_password)} className="text-gray-500 hover:text-gray-300"><Icon name="content_copy" className="text-sm" /></button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">SHARING</h4>
                      <p className="text-sm text-gray-300 mb-1">{acc.am_assignments?.length || 0} used / {acc.total_slots} total</p>
                      <p className="text-sm text-gray-300 mb-1">{acc.total_slots - (acc.am_assignments?.length || 0)} slot(s) remaining</p>
                      {acc.start_date && acc.end_date && (
                        <p className="text-xs text-gray-500 mt-3">{acc.start_date} to {acc.end_date}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">PURCHASE</h4>
                      <p className="text-sm text-gray-300 mb-1">{acc.am_sellers?.name || "No seller linked"}</p>
                      <p className="text-xs text-gray-500">Buy price: {acc.buy_price} | Buy date: {acc.buy_date || "N/A"}</p>
                    </div>
                  </div>

                  {/* Linked Clients */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                        <Icon name="link" className="text-[18px]" /> Linked Clients
                      </h4>
                      <button onClick={() => {
                          const cid = prompt("Enter Client ID to assign (For now, use DB directly or next update will add dropdown)");
                          if (cid) {
                             assignClientToAccount(acc.id, cid, 'pending', 0).then(res => {
                               if(res.success) { setToast({type:'success', message:'Assigned!'}); loadData(); }
                             });
                          }
                      }} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded">
                        Assign Client
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {acc.am_assignments?.map((as:any) => (
                        <div key={as.id} className="bg-[#1e2330] p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-gray-200 text-sm">{as.am_clients?.name}</h5>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${as.payment_status === 'pending' ? 'bg-orange-900/30 text-orange-500 border border-orange-800/50' : 'bg-emerald-900/30 text-emerald-500 border border-emerald-800/50'}`}>
                                {as.payment_status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{as.am_clients?.phone || as.am_clients?.whatsapp || 'No Phone'}</p>
                            {as.pending_amount > 0 && <p className="text-[10px] text-orange-400 mt-1">Pending: {as.pending_amount}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => {
                               const msg = encodeURIComponent(`Hi ${as.am_clients?.name},\nHere is your access for ${acc.tool_name}:\nEmail: ${acc.login_email}\nPass: ${acc.login_password}\nExpires: ${acc.end_date}`);
                               const phone = (as.am_clients?.whatsapp || as.am_clients?.phone || "").replace(/[^0-9]/g, "");
                               if(phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                               else alert("No WhatsApp number found");
                            }} className="px-3 py-1.5 border border-emerald-900 text-emerald-500 rounded-lg text-xs font-semibold hover:bg-emerald-900/20 flex items-center gap-1">
                              <Icon name="chat" className="text-[14px]" /> Share Access
                            </button>
                            <button onClick={async () => {
                              const amount = prompt("Update pending amount:", as.pending_amount);
                              if (amount !== null) {
                                const status = parseInt(amount) > 0 ? 'pending' : 'cleared';
                                const res = await updateAssignmentPayment(as.id, status, parseInt(amount));
                                if (res.success) { setToast({type:'success', message:'Updated!'}); loadData(); }
                              }
                            }} className="px-3 py-1.5 border border-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-800">
                              Payment
                            </button>
                            <button onClick={async () => {
                              if(confirm("Remove this client from this account?")) {
                                const res = await removeAssignment(as.id);
                                if(res.success) { setToast({type:'success', message:'Removed!'}); loadData(); }
                              }
                            }} className="p-1.5 text-red-500 hover:bg-red-900/20 rounded-lg">
                              <Icon name="close" className="text-[16px]" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!acc.am_assignments || acc.am_assignments.length === 0) && (
                        <p className="text-xs text-gray-600 col-span-2">No clients assigned to this account yet.</p>
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
      <div className="bg-[#1e2330] border border-gray-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#151923]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-500">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Add Seller</h2>
              <p className="text-xs text-gray-400">Jis seller/provider se account buy hota hai uski details yahan save karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Seller Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Seller / provider name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Platform</label>
                <input type="text" value={form.platform} onChange={e=>setForm({...form, platform: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Facebook, WhatsApp, website..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="03001234567" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="03001234567" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="seller@example.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={3} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Seller terms, reliability, payment account, renewal notes"></textarea>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#151923] flex gap-3">
          <button type="submit" form="seller-form" disabled={saving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm flex items-center gap-2">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Seller"}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold rounded-lg text-sm flex items-center gap-2">
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
      <div className="bg-[#1e2330] border border-gray-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#151923]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-500">
              <Icon name="group" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Add Client</h2>
              <p className="text-xs text-gray-400">Manual entry support.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Client Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="Type name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="03001234567" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="03001234567" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="client@example.com" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Company / Notes</label>
              <input type="text" value={form.company} onChange={e=>setForm({...form, company: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none mb-2" placeholder="Agency / Client tag" />
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="Optional notes"></textarea>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#151923] flex gap-3">
          <button type="submit" form="client-form" disabled={saving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm flex items-center gap-2">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Client"}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold rounded-lg text-sm flex items-center gap-2">
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
      <div className="bg-[#1e2330] border border-gray-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#151923]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-500">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Add Shared Account</h2>
              <p className="text-xs text-gray-400">Tool, credentials, expiry dates yahan se manage karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="account-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Tool Name</label>
                <input required type="text" value={form.tool_name} onChange={e=>setForm({...form, tool_name: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="ChatGPT, Canva, CapCut..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Account Label</label>
                  <input type="text" value={form.label} onChange={e=>setForm({...form, label: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Main shared account / Personal" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Account Link</label>
                  <input type="text" value={form.link} onChange={e=>setForm({...form, link: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="https://chatgpt.com/" />
                </div>
              </div>
            </div>

            <div className="border border-emerald-900/40 bg-emerald-900/5 rounded-xl p-4 space-y-4">
               <h3 className="text-xs font-bold text-emerald-500 tracking-wider mb-2">PURCHASE / SELLER</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Bought From Seller</label>
                    <select value={form.seller_id} onChange={e=>setForm({...form, seller_id: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none">
                      <option value="">No seller selected</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Buy Price</label>
                    <input type="number" value={form.buy_price} onChange={e=>setForm({...form, buy_price: parseInt(e.target.value)||0})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Buy Date</label>
                    <input type="date" value={form.buy_date} onChange={e=>setForm({...form, buy_date: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
                 </div>
               </div>
               <div>
                 <input type="text" value={form.purchase_notes} onChange={e=>setForm({...form, purchase_notes: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Seller package, renewal terms, payment reference" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Tool Login / Email</label>
                <input required type="text" value={form.login_email} onChange={e=>setForm({...form, login_email: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Any email or login text" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Tool Login Password</label>
                <input required type="text" value={form.login_password} onChange={e=>setForm({...form, login_password: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Password" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Linked Mail</label>
                <input type="text" value={form.linked_mail} onChange={e=>setForm({...form, linked_mail: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Gmail ya koi bhi mail" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Linked Mail Password</label>
                <input type="text" value={form.linked_mail_password} onChange={e=>setForm({...form, linked_mail_password: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Mail password" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Plan Type</label>
                <input type="text" value={form.plan_type} onChange={e=>setForm({...form, plan_type: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Premium, Pro, Plus" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Extra Notes / Login Text</label>
                <input type="text" value={form.extra_notes} onChange={e=>setForm({...form, extra_notes: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Share Type</label>
                  <select value={form.share_type} onChange={e=>setForm({...form, share_type: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none">
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Account Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Total Slots</label>
                  <input type="number" min="1" value={form.total_slots} onChange={e=>setForm({...form, total_slots: parseInt(e.target.value)||1})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">End Date</label>
                <input type="date" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 outline-none" />
              </div>
            </div>

          </form>
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#151923] flex gap-3">
          <button type="submit" form="account-form" disabled={saving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm flex items-center gap-2">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Account"}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold rounded-lg text-sm flex items-center gap-2">
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
      <div className="bg-[#1e2330] border border-gray-700 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#151923]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-500">
              <Icon name="account_balance" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Shared Accounts Directory</h2>
              <p className="text-xs text-gray-400">Account/number add karein, search karein, aur details copy karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <Icon name="close" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[500px]">
          {/* Add Form */}
          <div className="w-full md:w-1/3 border-r border-gray-800 p-4 overflow-y-auto bg-[#1a1e2a]">
            <h3 className="font-bold text-white mb-4 text-sm">Add Shared Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Account / Bank Name</label>
                <input required type="text" value={form.bank_name} onChange={e=>setForm({...form, bank_name: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="Meezan Bank..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Account Number / IBAN</label>
                <input required type="text" value={form.account_number} onChange={e=>setForm({...form, account_number: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="0321..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Account Holder / Title</label>
                <input required type="text" value={form.account_title} onChange={e=>setForm({...form, account_title: e.target.value})} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Details (Optional)</label>
                <textarea value={form.details} onChange={e=>setForm({...form, details: e.target.value})} rows={2} className="w-full bg-[#151923] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="Branch code, etc"></textarea>
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm w-full">
                {saving ? "Adding..." : "+ Add"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="w-full md:w-2/3 p-4 overflow-y-auto bg-[#1e2330]">
             <div className="space-y-2">
               {banks.map(b => (
                 <div key={b.id} className="flex justify-between items-center p-3 border-b border-gray-800 hover:bg-gray-800/50 rounded-lg group">
                   <div>
                     <h4 className="font-bold text-white text-sm flex items-center gap-2">
                       <Icon name="expand_more" className="text-gray-500 text-sm" /> {b.bank_name}
                     </h4>
                     <p className="text-xs text-gray-400 pl-6">{b.account_number} • {b.account_title}</p>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => navigator.clipboard.writeText(`${b.bank_name}\nTitle: ${b.account_title}\nAcc: ${b.account_number}`)} className="p-1.5 text-gray-400 hover:text-white rounded bg-gray-800" title="Copy Info">
                       <Icon name="content_copy" className="text-sm" />
                     </button>
                     <button onClick={async () => {
                       if(confirm("Delete this bank account?")) {
                         await deleteBankAccount(b.id);
                         reload();
                       }
                     }} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-red-900/30">
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
