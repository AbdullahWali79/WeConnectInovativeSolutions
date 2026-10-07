const fs = require('fs');
let c = fs.readFileSync('components/admin/accounts-manager/accounts-manager.tsx', 'utf8');

if (!c.includes('import { importClients } from "@/app/admin/accounts-manager/actions";')) {
    c = c.replace(
        'deleteSharedAccount, assignClientToAccount, updateAssignmentPayment, \n  removeAssignment, addBankAccount, deleteBankAccount \n} from "@/app/admin/accounts-manager/actions";',
        'deleteSharedAccount, assignClientToAccount, updateAssignmentPayment, \n  removeAssignment, addBankAccount, deleteBankAccount, importClients \n} from "@/app/admin/accounts-manager/actions";'
    );
}

// Add state for lock and file import
if (!c.includes('const [unlocked, setUnlocked] = useState(false);')) {
    c = c.replace(
        'const [toast, setToast] = useState<ToastState>(null);',
        `const [toast, setToast] = useState<ToastState>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);`
    );
}

// Add import CSV parser
if (!c.includes('const handleImportCsv = async')) {
    c = c.replace('async function loadData() {', `
  const handleImportCsv = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\\n").filter(l => l.trim() !== "");
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
        for (let char of rowStr) {
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
        setToast({ type: "success", message: \`Processing \${importedClients.length} contacts...\` });
        const res = await importClients(importedClients);
        if (res.success) {
          setToast({ type: "success", message: \`Successfully imported \${res.inserted} new contacts!\` });
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

  async function loadData() {`);
}

// Add the button to the UI
if (!c.includes('type="file" ref={fileInputRef}')) {
    c = c.replace(
        '<button onClick={() => setIsAddClientModalOpen(true)} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">',
        `<input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} className="hidden" />
            <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">
              <Icon name={importing ? "sync" : "upload_file"} className={\`text-[18px] \${importing ? "animate-spin" : ""}\`} />
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button onClick={() => setIsAddClientModalOpen(true)} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 flex items-center gap-2">`
    );
}

// Add the lock screen
if (!c.includes('if (!unlocked) return (')) {
    c = c.replace(
        'return (\n    <div className="flex h-full flex-col bg-[#0d1117]">',
        `if (!unlocked) return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0d1117] p-4">
      <div className="bg-[#161b22] border border-white/10 p-8 rounded-2xl w-full max-w-sm text-center shadow-xl">
        <Icon name="lock" className="text-4xl text-emerald-500 mb-4 inline-block" />
        <h2 className="text-xl font-bold text-white mb-2">Accounts Manager</h2>
        <p className="text-sm text-gray-400 mb-6">Enter password to unlock this module</p>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (password === 'Abdullah123@') setUnlocked(true);
              else alert('Incorrect password');
            }
          }}
          placeholder="Password" 
          className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-emerald-500" 
        />
        <button 
          onClick={() => {
            if (password === 'Abdullah123@') setUnlocked(true);
            else alert('Incorrect password');
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
        >
          Unlock Module
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">`
    );
}

fs.writeFileSync('components/admin/accounts-manager/accounts-manager.tsx', c);
