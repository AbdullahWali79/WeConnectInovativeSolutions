const fs = require('fs');
let c = fs.readFileSync('app/admin/accounts-manager/actions.ts', 'utf8');
c += `

export async function importClients(clients: any[]) {
  const supabase = createSupabaseServiceClient();
  const { data: existing } = await supabase.from("am_clients" as any).select("name, phone");
  
  const newClients = clients.filter(c => {
    if (!c.name) return false;
    const isDup = existing?.some((e: any) => e.name === c.name || (e.phone && c.phone && e.phone === c.phone));
    return !isDup;
  });

  if (newClients.length === 0) return { success: true, inserted: 0 };

  const { error } = await supabase.from("am_clients" as any).insert(newClients);
  if (error) return { success: false, error: error.message };
  return { success: true, inserted: newClients.length };
}
`;
fs.writeFileSync('app/admin/accounts-manager/actions.ts', c);
