/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server actions for the admin personal vault.
 *
 * IMPORTANT: all secret values (passwords, links, API keys, notes) arrive
 * here already encrypted by the browser (see lib/vault-crypto.ts).  These
 * actions only persist / return the opaque encrypted blobs.  The server
 * therefore never sees plaintext secrets and never sees the PIN.
 *
 * The PIN is verified on the client: the client fetches the stored
 * `pin_salt`, hashes the entered PIN the same way, and compares it to the
 * stored `pin_hash` (see actions below).
 */

export type VaultPinRow = {
  pin_hash: string;
  pin_salt: string;
  key_salt: string;
};

/** Return the current user's PIN row, or null if no PIN has been set yet. */
export async function getVaultPin(): Promise<{ success: boolean; pin?: VaultPinRow | null; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { data, error } = await (supabase as any)
    .from("admin_vault_pins")
    .select("pin_hash,pin_salt,key_salt")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, pin: (data ?? null) as VaultPinRow | null };
}

/** Create or replace the PIN for the current user. */
export async function setVaultPin(pinHash: string, pinSalt: string, keySalt: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase as any)
    .from("admin_vault_pins")
    .upsert({ user_id: user.id, pin_hash: pinHash, pin_salt: pinSalt, key_salt: keySalt, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  return { success: !error, error: error?.message };
}

/** Fetch every vault item for the current user, newest first. */
export async function fetchVaultItems(): Promise<{ success: boolean; items?: any[]; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { data, error } = await (supabase as any)
    .from("admin_vault_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, items: data || [] };
}

export async function addVaultItem(data: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase as any)
    .from("admin_vault_items")
    .insert({ ...data, user_id: user.id });

  return { success: !error, error: error?.message };
}

export async function updateVaultItem(id: string, data: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase as any)
    .from("admin_vault_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  return { success: !error, error: error?.message };
}

export async function deleteVaultItem(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" };

  const { error } = await (supabase as any)
    .from("admin_vault_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { success: !error, error: error?.message };
}
