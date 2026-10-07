const fs = require('fs');
let c = fs.readFileSync('components/admin/accounts-manager/accounts-manager.tsx', 'utf8');

const hookLogic = `const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom tool dropdown logic
  const uniqueTools = Array.from(new Set(accounts.map((a: any) => a.tool_name).filter(Boolean)));
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const toolDropdownRef = useRef<HTMLDivElement>(null);`;

if (!c.includes('const toolDropdownRef')) {
  c = c.replace('const dropdownRef = useRef<HTMLDivElement>(null);', hookLogic);
  
  const clickOutsideLogic = `const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(e.target as Node)) {
        setShowToolDropdown(false);
      }
    };`;
    
  c = c.replace(/const handleClickOutside = \(e: MouseEvent\) => \{[\s\S]*?\n    \};/, clickOutsideLogic);
}

const oldToolInput = `<div>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Tool Name</label>
                  <input required type="text" value={form.tool_name} onChange={e=>setForm({...form, tool_name: e.target.value})} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="ChatGPT, Canva..." />
                </div>`;

const newToolInput = `<div className="relative" ref={toolDropdownRef}>
                  <label className="mb-1 block text-xs font-bold text-gray-400">Tool Name</label>
                  <input required type="text" value={form.tool_name} onFocus={() => setShowToolDropdown(true)} onChange={e => { setForm({...form, tool_name: e.target.value}); setShowToolDropdown(true); }} className="w-full rounded-lg border border-[#2d3748] bg-[#161b22] p-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="ChatGPT, Canva..." />
                  {showToolDropdown && uniqueTools.filter((t:any) => t.toLowerCase().includes(form.tool_name.toLowerCase()) && t !== form.tool_name).length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-[#2d3748] bg-[#1e2532] shadow-xl custom-scrollbar">
                      {uniqueTools.filter((t:any) => t.toLowerCase().includes(form.tool_name.toLowerCase()) && t !== form.tool_name).map(t => (
                        <div 
                          key={t as string}
                          onClick={() => {
                            setForm({...form, tool_name: t as string});
                            setShowToolDropdown(false);
                          }}
                          className="cursor-pointer p-2 px-3 text-sm text-white hover:bg-[#2d3748] border-b border-[#2d3748] last:border-0"
                        >
                          {t as string}
                        </div>
                      ))}
                    </div>
                  )}
                </div>`;

c = c.replace(oldToolInput, newToolInput);

fs.writeFileSync('components/admin/accounts-manager/accounts-manager.tsx', c);
