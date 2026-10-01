const fs = require('fs');
let c = fs.readFileSync('components/admin/admin-shell.tsx', 'utf8');

c = c.replace(
  '{ href: "/admin/prompts", label: "Prompts", icon: "auto_awesome", adminOnly: true },',
  '{ href: "/admin/personal-prompts", label: "My Prompts", icon: "stars", adminOnly: true },\n    { href: "/admin/prompts", label: "Public Prompts", icon: "auto_awesome", adminOnly: true },'
);

fs.writeFileSync('components/admin/admin-shell.tsx', c);
