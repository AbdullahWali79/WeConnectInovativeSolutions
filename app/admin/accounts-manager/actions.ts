/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminOnly } from "@/lib/admin-access";

export async function fetchAccountsData() {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();

  const [
    { data: accounts, error: errAcct },
    { data: sellers, error: errSel },
    { data: clients, error: errClt },
    { data: banks, error: errBnk },
    { data: subscriptions, error: errSub },
    { data: followups, error: errFollowup }
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
        am_clients ( id, name, phone, whatsapp, email, company, notes, labels, marketing_opt_in, marketing_opt_in_source )
      )
    `).order("created_at", { ascending: false }),
    supabase.from("am_sellers" as any).select("*").order("name"),
    supabase.from("am_clients" as any).select("*").order("name"),
    supabase.from("am_bank_accounts" as any).select("*").order("bank_name"),
    supabase.from("am_client_subscriptions" as any).select("*").order("end_date", { ascending: false }),
    supabase.from("am_renewal_followups" as any).select("*").order("contacted_at", { ascending: false })
  ]);

  if (errAcct || errSel || errClt || errBnk || errSub || errFollowup) {
    console.error("Error fetching accounts data", { errAcct, errSel, errClt, errBnk, errSub, errFollowup });
    return { success: false, error: errSub || errFollowup ? "Apply the accounts renewal migration, then reload." : "Failed to load data" };
  }

  return { 
    success: true, 
    accounts: accounts || [], 
    sellers: sellers || [], 
    clients: clients || [],
    banks: banks || [],
    subscriptions: subscriptions || [],
    followups: followups || []
  };
}

export async function addSeller(data: any) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_sellers" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function addClient(data: any) {
  await requireAdminOnly();
  if (data.marketing_opt_in && !String(data.marketing_opt_in_source || "").trim()) {
    return { success: false, error: "Record how the client agreed to WhatsApp renewal offers." };
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_clients" as any).insert({
    ...data,
    marketing_opt_in_at: data.marketing_opt_in ? new Date().toISOString() : null,
    marketing_opt_in_source: data.marketing_opt_in ? String(data.marketing_opt_in_source).trim() : null,
  });
  return { success: !error, error: error?.message };
}

export async function updateClient(id: string, data: any) {
  await requireAdminOnly();
  if (data.marketing_opt_in && !String(data.marketing_opt_in_source || "").trim()) {
    return { success: false, error: "Record how the client agreed to WhatsApp renewal offers." };
  }
  const supabase = createSupabaseServiceClient();
  const { data: prior, error: readError } = await supabase.from("am_clients" as any).select("marketing_opt_in, marketing_opt_in_at").eq("id", id).single();
  if (readError) return { success: false, error: readError.message };
  const next = { ...data };
  next.marketing_opt_in_source = data.marketing_opt_in ? String(data.marketing_opt_in_source).trim() : null;
  if (Boolean(data.marketing_opt_in) !== Boolean((prior as any).marketing_opt_in)) {
    next.marketing_opt_in_at = data.marketing_opt_in ? new Date().toISOString() : null;
  }
  const { error } = await supabase.from("am_clients" as any).update(next).eq("id", id);
  return { success: !error, error: error?.message };
}

export async function addSharedAccount(data: any) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_accounts" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteSharedAccount(id: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_accounts" as any).delete().eq("id", id);
  return { success: !error, error: error?.message };
}

export async function assignClientToAccount(accountId: string, clientId: string, paymentStatus: string, pendingAmount: number) {
  await requireAdminOnly();
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
  await requireAdminOnly();
  if (!assignmentId || !["pending", "cleared"].includes(paymentStatus) ||
      !Number.isFinite(pendingAmount) || pendingAmount < 0 ||
      (paymentStatus === "cleared" && pendingAmount !== 0) ||
      (paymentStatus === "pending" && pendingAmount === 0)) {
    return { success: false, error: "Enter a valid remaining balance, or mark the payment paid." };
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("am_assignments" as any).update({
    payment_status: paymentStatus,
    pending_amount: pendingAmount
  }).eq("id", assignmentId).select("id, payment_status, pending_amount").maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Payment record was not found." };
  const assignment = data as unknown as { id: string; payment_status: string; pending_amount: number };
  return { success: true, assignment };
}

export async function removeAssignment(assignmentId: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_assignments" as any).delete().eq("id", assignmentId);
  return { success: !error, error: error?.message };
}

export async function addBankAccount(data: any) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_bank_accounts" as any).insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteBankAccount(id: string) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_bank_accounts" as any).delete().eq("id", id);
  return { success: !error, error: error?.message };
}


export async function importClients(clients: any[]) {
  await requireAdminOnly();
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

export async function saveSharedAccountWithClients(accountData: any, assignmentsData: any[]) {
  await requireAdminOnly();
  const supabase = createSupabaseServiceClient();
  let accountId = accountData.id;

  if (accountId) {
    const { error } = await supabase.from("am_accounts" as any).update(accountData).eq("id", accountId);
    if (error) return { success: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("am_accounts" as any).insert(accountData).select("id").single();
    if (error) return { success: false, error: error.message };
    accountId = (data as any).id;
  }

  const { data: existing, error: existingError } = await supabase.from("am_assignments" as any)
    .select("id, client_id").eq("account_id", accountId);
  if (existingError) return { success: false, error: existingError.message };

  const incoming = new Set(assignmentsData.map((assignment) => assignment.client_id));
  if (incoming.size !== assignmentsData.length) return { success: false, error: "A client is linked more than once." };

  for (const assignment of assignmentsData) {
    const paymentStatus = String(assignment.payment_status || "pending").toLowerCase();
    if (!["pending", "cleared", "advance"].includes(paymentStatus)) {
      return { success: false, error: "Choose a valid payment status." };
    }
    const payload = {
      payment_status: paymentStatus,
      pending_amount: paymentStatus === "pending" ? Math.max(0, Number(assignment.pending_amount) || 0) : 0,
      notes: assignment.notes || null,
    };
    const prior = ((existing || []) as any[]).find((row) => row.client_id === assignment.client_id);
    const query = prior
      ? supabase.from("am_assignments" as any).update(payload).eq("id", prior.id)
      : supabase.from("am_assignments" as any).insert({
          ...payload, account_id: accountId, client_id: assignment.client_id,
          assigned_date: assignment.assigned_date || new Date().toISOString().slice(0, 10),
        });
    const { error } = await query;
    if (error) return { success: false, error: error.message };
  }

  for (const assignment of (existing || []) as any[]) {
    if (incoming.has(assignment.client_id)) continue;
    const { error } = await supabase.from("am_assignments" as any).delete().eq("id", assignment.id);
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

export async function recordClientSubscription(input: {
  id?: string;
  client_id: string;
  account_id: string | null;
  tool_name: string;
  start_date: string;
  end_date: string;
  paid_amount: number | null;
}) {
  await requireAdminOnly();
  if (!input.client_id || !input.tool_name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.end_date) || input.end_date < input.start_date ||
      (input.paid_amount !== null && (!Number.isFinite(input.paid_amount) || input.paid_amount < 0))) {
    return { success: false, error: "Enter a client, tool, valid dates and a non-negative amount." };
  }
  const supabase = createSupabaseServiceClient();
  const { id, ...details } = input;
  const payload = { ...details, tool_name: input.tool_name.trim(), source: "manual" };
  const query = id
    ? supabase.from("am_client_subscriptions" as any).update(payload).eq("id", id).eq("source", "legacy")
    : supabase.from("am_client_subscriptions" as any).insert(payload);
  const { data, error } = await query.select("id").single();
  if (!error && !data) return { success: false, error: "Subscription was not found." };
  return { success: !error, error: error?.message };
}

export async function recordRenewalFollowup(input: {
  client_id: string;
  tool_name: string;
  outcome: "contacted" | "interested" | "not_interested";
  notes: string;
  next_follow_up_date: string | null;
}) {
  const profile = await requireAdminOnly();
  if (!input.client_id || !input.tool_name.trim() ||
      !["contacted", "interested", "not_interested"].includes(input.outcome) ||
      (input.next_follow_up_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.next_follow_up_date))) {
    return { success: false, error: "Complete the follow-up details." };
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("am_renewal_followups" as any).insert({
    client_id: input.client_id,
    tool_name: input.tool_name.trim(),
    outcome: input.outcome,
    notes: input.notes.trim() || null,
    next_follow_up_date: input.next_follow_up_date,
    created_by: profile.id,
  });
  return { success: !error, error: error?.message };
}
