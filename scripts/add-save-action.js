const fs = require('fs');
let c = fs.readFileSync('app/admin/accounts-manager/actions.ts', 'utf8');

c += `
export async function saveSharedAccountWithClients(accountData: any, assignmentsData: any[]) {
  const supabase = createSupabaseServiceClient();
  let accountId = accountData.id;

  if (accountId) {
    const { error } = await supabase.from("am_accounts" as any).update(accountData).eq("id", accountId);
    if (error) return { success: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("am_accounts" as any).insert(accountData).select("id").single();
    if (error) return { success: false, error: error.message };
    accountId = data.id;
  }

  await supabase.from("am_assignments" as any).delete().eq("account_id", accountId);

  if (assignmentsData.length > 0) {
    const newAssignments = assignmentsData.map(a => ({
      account_id: accountId,
      client_id: a.client_id,
      payment_status: a.payment_status,
      pending_amount: a.pending_amount || 0,
      notes: a.notes || null,
      assigned_date: a.assigned_date || new Date().toISOString()
    }));
    const { error } = await supabase.from("am_assignments" as any).insert(newAssignments);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}
`;
fs.writeFileSync('app/admin/accounts-manager/actions.ts', c);
