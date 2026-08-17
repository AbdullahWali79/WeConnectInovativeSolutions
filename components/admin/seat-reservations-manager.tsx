"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Settings = { total_seats: number; default_fine: number; cancellation_minutes: number; grace_minutes: number; block_on_unpaid_fine: boolean };
type Slot = { id: string; slot_date: string; start_time: string; end_time: string; capacity: number | null; is_active: boolean; notes: string | null };
type Reservation = { id: string; slot_id: string; student_id: string; status: string; created_at: string; profiles: { full_name: string | null; email: string | null } | null };
type Fine = { id: string; reservation_id: string; student_id: string; amount: number; status: string };

const today = new Date().toISOString().slice(0, 10);
const defaultSettings: Settings = { total_seats: 20, default_fine: 500, cancellation_minutes: 60, grace_minutes: 30, block_on_unpaid_fine: true };

export function SeatReservationsManager() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState(defaultSettings);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [form, setForm] = useState({ slot_date: today, start_time: "09:00", end_time: "13:00", capacity: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [settingsResult, slotsResult, reservationsResult, finesResult] = await Promise.all([
      supabase.from("seat_reservation_settings").select("total_seats,default_fine,cancellation_minutes,grace_minutes,block_on_unpaid_fine").eq("id", true).single(),
      supabase.from("seat_slots").select("*").gte("slot_date", today).order("slot_date").order("start_time"),
      supabase.from("seat_reservations").select("id,slot_id,student_id,status,created_at,profiles!seat_reservations_student_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("seat_fines").select("id,reservation_id,student_id,amount,status"),
    ]);
    const error = settingsResult.error || slotsResult.error || reservationsResult.error || finesResult.error;
    if (error) setToast({ type: "error", message: error.message });
    if (settingsResult.data) setSettings(settingsResult.data as Settings);
    setSlots((slotsResult.data ?? []) as Slot[]);
    setReservations((reservationsResult.data ?? []) as unknown as Reservation[]);
    setFines((finesResult.data ?? []) as Fine[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const { error } = await supabase.from("seat_reservation_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", true);
    setSaving(false);
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Reservation settings saved." });
  }

  async function createSlot(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const { error } = await supabase.from("seat_slots").insert({ ...form, capacity: form.capacity ? Number(form.capacity) : null, notes: form.notes.trim() || null });
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "New seat slot created." }); setForm((current) => ({ ...current, notes: "" })); await loadData();
  }

  async function updateReservation(reservation: Reservation, status: "checked_in" | "no_show" | "cancelled") {
    const payload = { status, checked_in_at: status === "checked_in" ? new Date().toISOString() : null, cancelled_at: status === "cancelled" ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("seat_reservations").update(payload).eq("id", reservation.id);
    if (error) return setToast({ type: "error", message: error.message });
    if (status === "no_show") {
      const { error: fineError } = await supabase.from("seat_fines").upsert({ reservation_id: reservation.id, student_id: reservation.student_id, amount: settings.default_fine, status: "unpaid" }, { onConflict: "reservation_id" });
      if (fineError) return setToast({ type: "error", message: fineError.message });
    }
    setToast({ type: "success", message: status === "no_show" ? "No-show marked and fine added." : "Reservation updated." }); await loadData();
  }

  async function resolveFine(fine: Fine, status: "paid" | "waived") {
    const { error } = await supabase.from("seat_fines").update({ status, resolved_at: new Date().toISOString() }).eq("id", fine.id);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: `Fine marked ${status}.` }); await loadData();
  }

  async function toggleSlot(slot: Slot) {
    const { error } = await supabase.from("seat_slots").update({ is_active: !slot.is_active }).eq("id", slot.id);
    if (error) return setToast({ type: "error", message: error.message }); await loadData();
  }

  if (loading) return <LoadingState label="Loading seat reservations..." />;
  return <>
    <Toast toast={toast} onClear={() => setToast(null)} />
    <PageHeader eyebrow="Seat management" title="Seat reservations" description="Create time slots, monitor the 20-seat capacity, check students in, and manage no-show fines." />
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <div className="space-y-6">
        <form onSubmit={saveSettings} className="wc-card space-y-3 p-5">
          <h2 className="font-bold text-on-surface">Reservation settings</h2>
          <NumberField label="Total seats" value={settings.total_seats} onChange={(value) => setSettings((s) => ({ ...s, total_seats: value }))} />
          <NumberField label="No-show fine (PKR)" value={settings.default_fine} onChange={(value) => setSettings((s) => ({ ...s, default_fine: value }))} />
          <NumberField label="Cancellation deadline (minutes)" value={settings.cancellation_minutes} onChange={(value) => setSettings((s) => ({ ...s, cancellation_minutes: value }))} />
          <NumberField label="Check-in grace period (minutes)" value={settings.grace_minutes} onChange={(value) => setSettings((s) => ({ ...s, grace_minutes: value }))} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.block_on_unpaid_fine} onChange={(e) => setSettings((s) => ({ ...s, block_on_unpaid_fine: e.target.checked }))} /> Block booking when fine is unpaid</label>
          <button disabled={saving} className="wc-primary-btn w-full">Save settings</button>
        </form>
        <form onSubmit={createSlot} className="wc-card space-y-3 p-5">
          <h2 className="font-bold text-on-surface">Create time slot</h2>
          <label className="block"><span className="wc-label">Date</span><input type="date" min={today} required className="wc-input mt-2" value={form.slot_date} onChange={(e) => setForm((f) => ({ ...f, slot_date: e.target.value }))} /></label>
          <div className="grid grid-cols-2 gap-3"><label><span className="wc-label">Starts</span><input type="time" required className="wc-input mt-2" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} /></label><label><span className="wc-label">Ends</span><input type="time" required className="wc-input mt-2" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} /></label></div>
          <label className="block"><span className="wc-label">Capacity (blank = {settings.total_seats})</span><input type="number" min="1" className="wc-input mt-2" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></label>
          <label className="block"><span className="wc-label">Notes</span><input className="wc-input mt-2" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
          <button disabled={saving} className="wc-primary-btn w-full">Create slot</button>
        </form>
      </div>
      <div className="space-y-5">{slots.length === 0 ? <div className="wc-card p-8 text-center text-on-surface-variant">No upcoming slots. Create the first one.</div> : slots.map((slot) => {
        const rows = reservations.filter((r) => r.slot_id === slot.id); const active = rows.filter((r) => ["reserved", "checked_in"].includes(r.status)).length; const capacity = slot.capacity ?? settings.total_seats;
        return <section key={slot.id} className="wc-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4"><div><h2 className="font-bold text-on-surface">{new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "short" })} · {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</h2><p className="text-sm text-on-surface-variant">{capacity - active} seats available · {active}/{capacity} occupied</p></div><button onClick={() => toggleSlot(slot)} className="wc-secondary-btn">{slot.is_active ? "Close slot" : "Reopen"}</button></div>
          <div className="divide-y divide-outline-variant">{rows.length === 0 ? <p className="p-5 text-sm text-on-surface-variant">No reservations yet.</p> : rows.map((row) => { const fine = fines.find((f) => f.reservation_id === row.id); return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-bold text-on-surface">{row.profiles?.full_name ?? "Student"}</p><p className="text-xs text-on-surface-variant">{row.profiles?.email} · <span className="uppercase">{row.status.replace("_", " ")}</span>{fine ? ` · Fine PKR ${fine.amount} (${fine.status})` : ""}</p></div><div className="flex flex-wrap gap-2">{row.status === "reserved" && <><button onClick={() => updateReservation(row, "checked_in")} className="wc-primary-btn"><Icon name="how_to_reg" /> Check in</button><button onClick={() => updateReservation(row, "no_show")} className="wc-secondary-btn">No-show</button><button onClick={() => updateReservation(row, "cancelled")} className="wc-secondary-btn">Cancel</button></>}{fine?.status === "unpaid" && <><button onClick={() => resolveFine(fine, "paid")} className="wc-primary-btn">Fine paid</button><button onClick={() => resolveFine(fine, "waived")} className="wc-secondary-btn">Waive</button></>}</div></div>; })}</div>
        </section>;
      })}</div>
    </div>
  </>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="wc-label">{label}</span><input type="number" min="0" required className="wc-input mt-2" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
