const fs = require('fs'); 
let c = fs.readFileSync('components/admin/admin-shell.tsx', 'utf8'); 
c = c.replace(
  'id: "finance", label: "Finance", icon: "payments", items: [', 
  'id: "finance", label: "Finance & Sales", icon: "payments", items: [\n    { href: "/admin/accounts-manager", label: "Accounts Manager", icon: "manage_accounts", adminOnly: true },'
); 
fs.writeFileSync('components/admin/admin-shell.tsx', c);
