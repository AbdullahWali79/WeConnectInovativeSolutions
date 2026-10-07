const fs = require('fs');
let c = fs.readFileSync('components/admin/accounts-manager/accounts-manager.tsx', 'utf8');

if (!c.includes('saveSharedAccountWithClients')) {
    c = c.replace(
        'addBankAccount, deleteBankAccount, importClients \n} from "@/app/admin/accounts-manager/actions";',
        'addBankAccount, deleteBankAccount, importClients, saveSharedAccountWithClients \n} from "@/app/admin/accounts-manager/actions";'
    );
}

// Add accountToEdit state
if (!c.includes('const [accountToEdit, setAccountToEdit]')) {
    c = c.replace(
        'const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);',
        'const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);\n  const [accountToEdit, setAccountToEdit] = useState<any>(null);'
    );
}

// Update the Add Account button
c = c.replace(
    '<button onClick={() => setIsAddAccountModalOpen(true)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50 flex items-center gap-2">',
    '<button onClick={() => { setAccountToEdit(null); setIsAddAccountModalOpen(true); }} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50 flex items-center gap-2">'
);

// Add an Edit button to the accounts list 
// Look for `<div className="flex items-center gap-3">` inside the account mapping
// We'll replace the existing Action buttons area. Wait, how do actions look like right now?
// There's a `<div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 justify-end">` where Assign Client is.
// Actually, I can just replace the whole `<div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 justify-end">` with one that has an Edit button.
c = c.replace(
    '<div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 justify-end">',
    `<div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 justify-end">
                      <button onClick={() => { setAccountToEdit(acc); setIsAddAccountModalOpen(true); }} className="rounded bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-300 flex items-center gap-1">
                        <Icon name="edit" className="text-[14px]" /> Edit Account
                      </button>`
);

// Remove the old Assign Client prompt button
const assignRegex = /<button onClick=\{\(\) => \{\s*const cid = prompt[^]*?Assign Client\s*<\/button>/g;
c = c.replace(assignRegex, '');

// Update the modal rendering
const oldModalRender = `{isAddAccountModalOpen && (
        <AddAccountModal sellers={sellers} onClose={() => setIsAddAccountModalOpen(false)} onSave={() => { setIsAddAccountModalOpen(false); loadData(); setToast({type:'success', message:'Account added'}); }} />
      )}`;
const newModalRender = `{isAddAccountModalOpen && (
        <AccountFormModal account={accountToEdit} clients={clients} sellers={sellers} onClose={() => setIsAddAccountModalOpen(false)} onSave={() => { setIsAddAccountModalOpen(false); loadData(); setToast({type:'success', message:'Account saved successfully'}); }} />
      )}`;
c = c.replace(oldModalRender, newModalRender);

// Replace the AddAccountModal component with AccountFormModal
const startModalStr = `function AddAccountModal({ sellers, onClose, onSave }: { sellers: any[], onClose: () => void, onSave: () => void }) {`;
const startIdx = c.indexOf(startModalStr);
if (startIdx !== -1) {
    const endModalStr = `function AddClientModal`;
    const endIdx = c.indexOf(endModalStr);
    
    const accountFormModalCode = `function AccountFormModal({ account, clients, sellers, onClose, onSave }: { account?: any, clients: any[], sellers: any[], onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ 
    id: account?.id || "",
    tool_name: account?.tool_name || "", label: account?.label || "", link: account?.link || "", seller_id: account?.seller_id || "", 
    buy_price: account?.buy_price || 0, buy_date: account?.buy_date || "", purchase_notes: account?.purchase_notes || "",
    login_email: account?.login_email || "", login_password: account?.login_password || "", 
    linked_mail: account?.linked_mail || "", linked_mail_password: account?.linked_mail_password || "",
    plan_type: account?.plan_type || "", extra_notes: account?.extra_notes || "", 
    share_type: account?.share_type || "Shared", status: account?.status || "active", 
    total_slots: account?.total_slots || 1, start_date: account?.start_date || "", end_date: account?.end_date || ""
  });
  
  const [selectedClients, setSelectedClients] = useState<any[]>(
    account?.am_assignments ? account.am_assignments.map((a: any) => ({
      client_id: a.client_id,
      name: a.am_clients?.name || "Unknown",
      payment_status: a.payment_status || "Pending",
      pending_amount: a.pending_amount || 0,
      notes: a.notes || ""
    })) : []
  );
  
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave = { ...form };
    if (!dataToSave.id) delete (dataToSave as any).id;
    if (!dataToSave.seller_id) delete (dataToSave as any).seller_id;
    if (!dataToSave.buy_date) delete (dataToSave as any).buy_date;
    if (!dataToSave.start_date) delete (dataToSave as any).start_date;
    if (!dataToSave.end_date) delete (dataToSave as any).end_date;

    const res = await saveSharedAccountWithClients(dataToSave, selectedClients);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  const handleSelectClient = (c: any) => {
    if (!selectedClients.some(sc => sc.client_id === c.id)) {
      setSelectedClients([...selectedClients, {
        client_id: c.id,
        name: c.name,
        payment_status: "Pending",
        pending_amount: 0,
        notes: ""
      }]);
    }
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(clientSearch))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-[#2d3748] bg-[#1e2532] shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center border-b border-[#2d3748] bg-[#161b22] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/30 text-emerald-500">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-white">{account ? "Edit Shared Account" : "Add Shared Account"}</h2>
              <p className="text-xs text-gray-400">Tool, credentials, expiry dates, aur linked clients yahan se manage karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="account-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Tool Name</label>
                  <input required type="text" value={form.tool_name} onChange={e=>setForm({...form, tool_name: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="ChatGPT, Canva..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Label (Optional)</label>
                  <input type="text" value={form.label} onChange={e=>setForm({...form, label: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Server 1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Tool Login / Email</label>
                  <input type="text" value={form.login_email} onChange={e=>setForm({...form, login_email: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Tool Login Password</label>
                  <input type="text" value={form.login_password} onChange={e=>setForm({...form, login_password: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Linked Mail</label>
                  <input type="text" value={form.linked_mail} onChange={e=>setForm({...form, linked_mail: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Linked Mail Password</label>
                  <input type="text" value={form.linked_mail_password} onChange={e=>setForm({...form, linked_mail_password: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Share Type</label>
                  <select value={form.share_type} onChange={e=>setForm({...form, share_type: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500">
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Account Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500">
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Total Slots</label>
                  <input type="number" value={form.total_slots} onChange={e=>setForm({...form, total_slots: parseInt(e.target.value)})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" min="1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">End Date</label>
                  <input type="date" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* CLIENT LINKING SECTION */}
              <div className="pt-4 border-t border-[#2d3748]">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-white">Link Clients</label>
                  <span className="text-xs text-gray-400">Google contacts import ke baad clients yahan milenge</span>
                </div>
                
                <div className="relative" ref={dropdownRef}>
                  <div 
                    onClick={() => setShowClientDropdown(true)}
                    className="w-full min-h-[42px] rounded-lg border border-[#2d3748] bg-[#161b22] p-2 flex flex-wrap gap-2 items-center cursor-text"
                  >
                    {selectedClients.length === 0 && !showClientDropdown && (
                      <span className="text-sm text-gray-500 select-none">Search and select clients...</span>
                    )}
                    {selectedClients.map((sc, i) => (
                      <span key={i} className="flex items-center gap-1 rounded bg-emerald-900/30 text-emerald-500 px-2 py-1 text-xs font-medium">
                        {sc.name}
                        <Icon name="close" className="text-[14px] cursor-pointer hover:text-white" onClick={(e:any) => { e.stopPropagation(); setSelectedClients(selectedClients.filter((_, idx) => idx !== i)); }} />
                      </span>
                    ))}
                    {showClientDropdown && (
                      <input 
                        autoFocus
                        type="text" 
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none placeholder-gray-600"
                        placeholder="Type to search..."
                      />
                    )}
                  </div>
                  
                  {showClientDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#2d3748] bg-[#1e2532] shadow-xl custom-scrollbar">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400 text-center">No clients found</div>
                      ) : (
                        filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectClient(c)}
                            className="cursor-pointer p-3 hover:bg-[#2d3748] border-b border-[#2d3748] last:border-0"
                          >
                            <div className="text-sm font-bold text-white">{c.name}</div>
                            {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedClients.length > 0 && (
                  <div className="mt-4 rounded-lg border border-[#2d3748] bg-[#161b22] p-4">
                    <h3 className="text-xs font-bold text-white mb-3">Payment Status per Client</h3>
                    <div className="space-y-3">
                      {selectedClients.map((sc, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-1/3 text-sm font-medium text-white truncate" title={sc.name}>{sc.name}</div>
                          <select 
                            value={sc.payment_status} 
                            onChange={(e) => {
                              const newArr = [...selectedClients];
                              newArr[i].payment_status = e.target.value;
                              setSelectedClients(newArr);
                            }}
                            className="w-1/3 rounded border border-[#2d3748] bg-[#1e2532] p-2 text-xs text-white outline-none focus:border-emerald-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Cleared">Cleared</option>
                            <option value="Advance">Advance</option>
                          </select>
                          <input 
                            type="number" 
                            value={sc.pending_amount} 
                            onChange={(e) => {
                              const newArr = [...selectedClients];
                              newArr[i].pending_amount = parseInt(e.target.value) || 0;
                              setSelectedClients(newArr);
                            }}
                            className="w-1/3 rounded border border-[#2d3748] bg-[#1e2532] p-2 text-xs text-white outline-none focus:border-emerald-500"
                            placeholder="Amount"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-400">Notes</label>
                <textarea value={form.extra_notes} onChange={e=>setForm({...form, extra_notes: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500" rows={2} placeholder="Sharing details, special notes..." />
              </div>

            </div>
          </form>
        </div>
        <div className="flex justify-start gap-3 border-t border-[#2d3748] bg-[#161b22] p-4">
          <button form="account-form" disabled={saving} type="submit" className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 flex items-center gap-2">
            <Icon name={saving ? "sync" : "save"} className={\`text-[18px] \${saving ? "animate-spin" : ""}\`} />
            {saving ? "Saving..." : (account ? "Update Account" : "Save Account")}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#2d3748] px-6 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-[#2d3748]">
            <Icon name="close" className="text-[18px] inline-block mr-1" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

\n\n`;

    c = c.substring(0, startIdx) + accountFormModalCode + c.substring(endIdx);
}

fs.writeFileSync('components/admin/accounts-manager/accounts-manager.tsx', c);
