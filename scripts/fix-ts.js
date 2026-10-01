const fs = require('fs');
let c = fs.readFileSync('app/admin/accounts-manager/actions.ts', 'utf8');

c = c.replace(/from\("am_accounts"\)/g, 'from("am_accounts" as any)');
c = c.replace(/from\("am_sellers"\)/g, 'from("am_sellers" as any)');
c = c.replace(/from\("am_clients"\)/g, 'from("am_clients" as any)');
c = c.replace(/from\("am_assignments"\)/g, 'from("am_assignments" as any)');
c = c.replace(/from\("am_bank_accounts"\)/g, 'from("am_bank_accounts" as any)');

fs.writeFileSync('app/admin/accounts-manager/actions.ts', c);
