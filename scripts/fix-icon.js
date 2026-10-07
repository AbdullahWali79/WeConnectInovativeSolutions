const fs = require('fs');
let c = fs.readFileSync('components/admin/accounts-manager/accounts-manager.tsx', 'utf8');

c = c.replace(
  '<Icon name="close" className="text-[14px] cursor-pointer hover:text-white" onClick={(e:any) => { e.stopPropagation(); setSelectedClients(selectedClients.filter((_, idx) => idx !== i)); }} />',
  '<span className="cursor-pointer hover:text-white inline-flex" onClick={(e:any) => { e.stopPropagation(); setSelectedClients(selectedClients.filter((_, idx) => idx !== i)); }}><Icon name="close" className="text-[14px]" /></span>'
);

fs.writeFileSync('components/admin/accounts-manager/accounts-manager.tsx', c);
