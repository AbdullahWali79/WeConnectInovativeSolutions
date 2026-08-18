"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Settings = { total_seats: number; default_fine: number; cancellation_minutes: number; grace_minutes: number; block_on_unpaid_fine: boolean };
type Slot = { id: string; slot_date: string; start_time: string; end_time: string; capacity: number | null; is_active: boolean; notes: string | null };
type Reservation = { id: string; slot_id: string; student_id: string; status: string; created_at: string; checked_in_at: string | null; profiles: { full_name: string | null; email: string | null } | null };
type Fine = { id: string; reservation_id: string; student_id: string; amount: number; status: string };
type Holiday = { id: string; closure_date: string; title: string; message: string };

const today = new Date().toISOString().slice(0, 10);
const defaultSettings: Settings = { total_seats: 20, default_fine: 500, cancellation_minutes: 60, grace_minutes: 30, block_on_unpaid_fine: true };

function formatSelectedDate(date: string) {
  if (!date) return "Select a date to see its day";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SeatReservationsManager() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState(defaultSettings);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [form, setForm] = useState({ slot_date: today, start_time: "09:00", end_time: "13:00", capacity: "", notes: "" });
  const [holidayForm, setHolidayForm] = useState({ closure_date: today, title: "Holiday", message: "The software house will remain closed today." });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [openModal, setOpenModal] = useState<"settings" | "slot" | "holiday" | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(() => new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [settingsResult, slotsResult, reservationsResult, finesResult, holidaysResult] = await Promise.all([
      supabase.from("seat_reservation_settings").select("total_seats,default_fine,cancellation_minutes,grace_minutes,block_on_unpaid_fine").eq("id", true).single(),
      supabase.from("seat_slots").select("*").gte("slot_date", today).order("slot_date").order("start_time"),
      supabase.from("seat_reservations").select("id,slot_id,student_id,status,created_at,checked_in_at,profiles!seat_reservations_student_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("seat_fines").select("id,reservation_id,student_id,amount,status"),
      supabase.from("seat_holiday_closures").select("id,closure_date,title,message").gte("closure_date", today).order("closure_date"),
    ]);
    const error = settingsResult.error || slotsResult.error || reservationsResult.error || finesResult.error || holidaysResult.error;
    if (error) setToast({ type: "error", message: error.message });
    if (settingsResult.data) setSettings(settingsResult.data as Settings);
    setSlots((slotsResult.data ?? []) as Slot[]);
    setReservations((reservationsResult.data ?? []) as unknown as Reservation[]);
    setFines((finesResult.data ?? []) as Fine[]);
    setHolidays((holidaysResult.data ?? []) as Holiday[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const { error } = await supabase.from("seat_reservation_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", true);
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Reservation settings saved." });
    setOpenModal(null);
  }

  async function createSlot(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const { error } = await supabase.from("seat_slots").insert({ ...form, capacity: form.capacity ? Number(form.capacity) : null, notes: form.notes.trim() || null });
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "New seat slot created and activated." });
    setForm((current) => ({ ...current, notes: "" }));
    setOpenModal(null);
    await loadData();
  }

  function openCreateSlot() {
    setEditingSlotId(null);
    setForm({ slot_date: today, start_time: "09:00", end_time: "13:00", capacity: "", notes: "" });
    setOpenModal("slot");
  }

  function openEditSlot(slot: Slot) {
    setEditingSlotId(slot.id);
    setForm({
      slot_date: slot.slot_date,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      capacity: slot.capacity?.toString() ?? "",
      notes: slot.notes ?? "",
    });
    setOpenModal("slot");
  }

  async function updateSlot(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSlotId) return;
    setSaving(true);
    const { error } = await supabase.from("seat_slots").update({
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
      notes: form.notes.trim() || null,
    }).eq("id", editingSlotId);
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Time slot updated." });
    setOpenModal(null);
    setEditingSlotId(null);
    await loadData();
  }

  async function deleteSlot(slot: Slot) {
    const slotLabel = `${new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}, ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
    if (!confirm(`Delete the ${slotLabel} slot? All reservations and fines linked to this slot will also be permanently deleted.`)) return;
    setSaving(true);
    const { error } = await supabase.from("seat_slots").delete().eq("id", slot.id);
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Time slot deleted." });
    await loadData();
  }

  function toggleCollapsed(slotId: string) {
    setCollapsedSlots((current) => {
      const next = new Set(current);
      if (next.has(slotId)) next.delete(slotId); else next.add(slotId);
      return next;
    });
  }

  async function announceHoliday(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    const { error } = await supabase.from("seat_holiday_closures").upsert(holidayForm, { onConflict: "closure_date" });
    setSaving(false);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Holiday announced. Reservations are blocked for this date." });
    setOpenModal(null); await loadData();
  }

  async function removeHoliday(id: string) {
    if (!confirm("Remove this holiday announcement and reopen reservations for the date?")) return;
    const { error } = await supabase.from("seat_holiday_closures").delete().eq("id", id);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Holiday removed. The date is open again." }); await loadData();
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
    <PageHeader eyebrow="Seat management" title="Seat reservations" description="Create slots, monitor capacity, record attendance, and manage no-show fines." action={<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"><button type="button" onClick={() => setOpenModal("holiday")} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs sm:text-sm"><Icon name="event_busy" /> Holiday</button><button type="button" onClick={() => setOpenModal("settings")} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs sm:text-sm"><Icon name="settings" /> Settings</button><button type="button" onClick={openCreateSlot} className="wc-primary-btn col-span-2 min-w-0 justify-center px-3 py-2 text-xs sm:text-sm"><Icon name="add" /> Create Time Slot</button></div>} />
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950"><Icon name="how_to_reg" className="mt-0.5 shrink-0 text-xl text-primary" /><div><p className="text-sm font-black">Attendance can be recorded later the same day</p><p className="mt-1 text-xs leading-5 text-blue-800">At 4 PM, open today&apos;s slot. Tap Check in for students who attended and No-show for students who did not.</p></div></div>
    {holidays.length > 0 ? <section className="mb-5 space-y-2">{holidays.map((holiday) => <div key={holiday.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"><div className="flex gap-3"><Icon name="event_busy" className="text-2xl" /><div><p className="font-bold">{holiday.title} - {new Date(`${holiday.closure_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</p><p className="text-sm">{holiday.message}</p></div></div><button type="button" onClick={() => removeHoliday(holiday.id)} className="rounded-xl border border-amber-400 px-3 py-2 text-xs font-bold hover:bg-amber-100">Remove holiday</button></div>)}</section> : null}
    <div className="space-y-5">{slots.length === 0 ? <div className="wc-card p-10 text-center"><Icon name="event_seat" className="mb-3 text-4xl text-primary" /><p className="font-bold text-on-surface">No upcoming slots</p><p className="mt-1 text-sm text-on-surface-variant">Use the Create Time Slot button above to activate seat reservations.</p></div> : slots.map((slot) => {
        const rows = reservations.filter((r) => r.slot_id === slot.id); const active = rows.filter((r) => ["reserved", "checked_in"].includes(r.status)).length; const capacity = slot.capacity ?? settings.total_seats;
        const isCollapsed = collapsedSlots.has(slot.id);
        return <section key={slot.id} className="wc-card overflow-hidden"><div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${isCollapsed ? "" : "border-b border-outline-variant"}`}><button type="button" onClick={() => toggleCollapsed(slot.id)} aria-expanded={!isCollapsed} aria-controls={`slot-${slot.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Icon name="expand_more" className={`shrink-0 text-2xl text-primary transition-transform ${isCollapsed ? "-rotate-90" : ""}`} /><div className="min-w-0"><h2 className="text-base font-bold text-on-surface sm:text-lg">{new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "short" })} · {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</h2><p className="mt-1 text-sm text-on-surface-variant">{capacity - active} seats available · {active}/{capacity} occupied</p></div></button><div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"><button type="button" onClick={() => openEditSlot(slot)} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs"><Icon name="edit" /> Edit</button><button type="button" disabled={saving} onClick={() => deleteSlot(slot)} className="wc-secondary-btn min-w-0 justify-center border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50"><Icon name="delete" /> Delete</button><button type="button" onClick={() => toggleSlot(slot)} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs">{slot.is_active ? "Close" : "Reopen"}</button></div></div>
          {!isCollapsed ? <div id={`slot-${slot.id}`} className="divide-y divide-outline-variant">{rows.length === 0 ? <p className="p-5 text-sm text-on-surface-variant">No reservations yet.</p> : rows.map((row) => { const fine = fines.find((f) => f.reservation_id === row.id); return <div key={row.id} className="p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-on-surface">{row.profiles?.full_name ?? "Student"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${row.status === "checked_in" ? "bg-emerald-100 text-emerald-800" : row.status === "no_show" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{row.status.replace("_", " ")}</span></div><p className="mt-1 break-all text-xs text-on-surface-variant">{row.profiles?.email}</p>{row.checked_in_at ? <p className="mt-1 text-xs font-bold text-emerald-700">Attendance marked at {new Date(row.checked_in_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p> : null}{fine ? <p className="mt-1 text-xs font-bold text-red-700">Fine PKR {fine.amount} ({fine.status})</p> : null}</div><div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{row.status === "reserved" && <><button onClick={() => updateReservation(row, "checked_in")} className="wc-primary-btn min-w-0 justify-center px-3 py-2 text-xs"><Icon name="how_to_reg" /> Check in</button><button onClick={() => updateReservation(row, "no_show")} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs">No-show</button><button onClick={() => updateReservation(row, "cancelled")} className="wc-secondary-btn col-span-2 min-w-0 justify-center px-3 py-2 text-xs sm:col-auto">Cancel</button></>}{fine?.status === "unpaid" && <><button onClick={() => resolveFine(fine, "paid")} className="wc-primary-btn min-w-0 justify-center px-3 py-2 text-xs">Fine paid</button><button onClick={() => resolveFine(fine, "waived")} className="wc-secondary-btn min-w-0 justify-center px-3 py-2 text-xs">Waive</button></>}</div></div>; })}</div> : null}
        </section>;
      })}
    </div>
    {openModal === "settings" ? <Modal title="Reservation settings" icon="settings" onClose={() => setOpenModal(null)}>
      <form onSubmit={saveSettings} className="space-y-4">
        <NumberField label="Total seats" value={settings.total_seats} onChange={(value) => setSettings((s) => ({ ...s, total_seats: value }))} />
        <NumberField label="No-show fine (PKR)" value={settings.default_fine} onChange={(value) => setSettings((s) => ({ ...s, default_fine: value }))} />
        <NumberField label="Cancellation deadline (minutes)" value={settings.cancellation_minutes} onChange={(value) => setSettings((s) => ({ ...s, cancellation_minutes: value }))} />
        <NumberField label="Check-in grace period (minutes)" value={settings.grace_minutes} onChange={(value) => setSettings((s) => ({ ...s, grace_minutes: value }))} />
        <label className="flex items-center gap-2 text-sm text-on-surface"><input type="checkbox" checked={settings.block_on_unpaid_fine} onChange={(e) => setSettings((s) => ({ ...s, block_on_unpaid_fine: e.target.checked }))} /> Block booking when fine is unpaid</label>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setOpenModal(null)} className="wc-secondary-btn">Cancel</button><button disabled={saving} className="wc-primary-btn">{saving ? "Saving..." : "Save Settings"}</button></div>
      </form>
    </Modal> : null}
    {openModal === "slot" ? <Modal title={editingSlotId ? "Edit time slot" : "Create time slot"} icon={editingSlotId ? "edit" : "event_seat"} onClose={() => { setOpenModal(null); setEditingSlotId(null); }}>
      <form onSubmit={editingSlotId ? updateSlot : createSlot} className="space-y-4">
        <label className="block"><span className="wc-label">Date</span><input type="date" min={today} required className="wc-input mt-2" value={form.slot_date} onChange={(e) => setForm((f) => ({ ...f, slot_date: e.target.value }))} /><span className="mt-2 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary"><Icon name="calendar_today" className="text-base" />{formatSelectedDate(form.slot_date)}</span></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="wc-label">Starts</span><input type="time" required className="wc-input mt-2" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} /></label><label><span className="wc-label">Ends</span><input type="time" required className="wc-input mt-2" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} /></label></div>
        <label className="block"><span className="wc-label">Capacity (blank = {settings.total_seats})</span><input type="number" min="1" className="wc-input mt-2" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></label>
        <label className="block"><span className="wc-label">Notes</span><textarea className="wc-input mt-2 min-h-20" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => { setOpenModal(null); setEditingSlotId(null); }} className="wc-secondary-btn">Cancel</button><button disabled={saving} className="wc-primary-btn">{saving ? "Saving..." : editingSlotId ? "Save Changes" : "Create & Activate Slot"}</button></div>
      </form>
    </Modal> : null}
    {openModal === "holiday" ? <Modal title="Announce holiday" icon="event_busy" onClose={() => setOpenModal(null)}>
      <form onSubmit={announceHoliday} className="space-y-4">
        <label className="block"><span className="wc-label">Holiday date</span><input type="date" min={today} required className="wc-input mt-2" value={holidayForm.closure_date} onChange={(e) => setHolidayForm((f) => ({ ...f, closure_date: e.target.value }))} /><span className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800"><Icon name="calendar_today" className="text-base" />{formatSelectedDate(holidayForm.closure_date)}</span></label>
        <label className="block"><span className="wc-label">Title</span><input required className="wc-input mt-2" value={holidayForm.title} onChange={(e) => setHolidayForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Public Holiday" /></label>
        <label className="block"><span className="wc-label">Message for students</span><textarea required className="wc-input mt-2 min-h-24" value={holidayForm.message} onChange={(e) => setHolidayForm((f) => ({ ...f, message: e.target.value }))} /></label>
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Students will see this notice and will not be able to reserve a seat for this date.</p>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setOpenModal(null)} className="wc-secondary-btn">Cancel</button><button disabled={saving} className="wc-primary-btn">{saving ? "Announcing..." : "Announce & Close Date"}</button></div>
      </form>
    </Modal> : null}
  </>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="wc-label">{label}</span><input type="number" min="0" required className="wc-input mt-2" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function Modal({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-surface shadow-2xl">
      <div className="flex items-center justify-between bg-primary px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Icon name={icon} /></span><h2 className="text-lg font-bold">{title}</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Close"><Icon name="close" /></button></div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </div>
  </div>;
}
