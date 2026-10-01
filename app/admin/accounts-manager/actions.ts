"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function fetchAccountsData() {
  const supabase = createSupabaseServiceClient();

  const [
    { data: accounts, error: errAcct },
    { data: sellers, error: errSel },
    { data: clients, error: errClt },
    { data: banks, error: errBnk }
  ] = await Promise.all([
    supabase.from("am_accounts" as any).select(`
      *,
      am_sellers ( name ),
      am_assignments (
        id,
        assigned_date,
        payment_status,
        pending_amount,
        notes,
        client_id,
        am_clients ( name, phone, whatsapp, labels )
      )
    `).order("created_at", { ascending: false }),
    supabase.from("am_sellers" as any).select("*").order("name"),
    supabase.from("am_clients" as any).select("*").order("name"),
    supabase.from("am_bank_accounts" as any).select("*").order("bank_name")
  ]);

  if (errAcct || errSel || errClt || errBnk) {
    console.error("Error fetching accounts data", { errAcct, errSel, errClt, errBnk });
    return { success: false, error: "Failed to load data" };
  }

  // Update statuses dynamically based on date if needed, though they are stored in DB.
  // For now we'll just return what's in DB.
  return { 
    success: true, 
    accounts: accounts || [], 
    sellers: sellers || [], 
    clients: clients || [],
    banks: banks || []
  };
}

export async function addSeller(data: any) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_sellers" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function addClient(data: any) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_clients" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function addSharedAccount(data: any) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_accounts" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteSharedAccount(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_accounts" as any).delete().eq("id", id);
  return { success: !error, error: error?.message };
}

export async function assignClientToAccount(accountId: string, clientId: string, paymentStatus: string, pendingAmount: number) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_assignments" as any).insert({
    account_id: accountId,
    client_id: clientId,
    payment_status: paymentStatus,
    pending_amount: pendingAmount
  });
  return { success: !error, error: error?.message };
}

export async function updateAssignmentPayment(assignmentId: string, paymentStatus: string, pendingAmount: number) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_assignments" as any).update({
    payment_status: paymentStatus,
    pending_amount: pendingAmount
  }).eq("id", assignmentId);
  return { success: !error, error: error?.message };
}

export async function removeAssignment(assignmentId: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_assignments" as any).delete().eq("id", assignmentId);
  return { success: !error, error: error?.message };
}

export async function addBankAccount(data: any) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_bank_accounts" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteBankAccount(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_bank_accounts" as any).delete().eq("id", id);
  return { success: !error, error: error?.message };
}
