"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Settings = { total_seats: number; default_fine: number; cancellation_minutes: number; block_on_unpaid_fine: boolean };
type Slot = { id: string; slot_date: string; start_time: string; end_time: string; capacity: number | null; notes: string | null };
type Reservation = { id: string; slot_id: string; status: string; created_at: string; seat_slots: Slot | null };
type Fine = { id: string; amount: number; status: string; reason: string; created_at: string };
type SlotCount = { slot_id: string; reserved_count: number };
type Holiday = { id: string; closure_date: string; title: string; message: string };

const today = new Date().toISOString().slice(0, 10);

export function StudentSeatReservation() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState<Settings>({ total_seats: 20, default_fine: 500, cancellation_minutes: 60, block_on_unpaid_fine: true });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [counts, setCounts] = useState<SlotCount[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { error: scheduleError } = await supabase.rpc("ensure_regular_seat_slots", { days_ahead: 90 });
    const [settingsResult, slotsResult, reservationResult, finesResult, availabilityResult, holidaysResult] = await Promise.all([
      supabase.from("seat_reservation_settings").select("total_seats,default_fine,cancellation_minutes,block_on_unpaid_fine").eq("id", true).single(),
      supabase.from("seat_slots").select("id,slot_date,start_time,end_time,capacity,notes").eq("is_active", true).gte("slot_date", today).order("slot_date").order("start_time"),
      supabase.from("seat_reservations").select("id,slot_id,status,created_at,seat_slots(id,slot_date,start_time,end_time,capacity,notes)").order("created_at", { ascending: false }),
      supabase.from("seat_fines").select("id,amount,status,reason,created_at").order("created_at", { ascending: false }),
      supabase.rpc("get_seat_slot_availability"),
      supabase.from("seat_holiday_closures").select("id,closure_date,title,message").gte("closure_date", today).order("closure_date"),
    ]);
    const availableSlots = (slotsResult.data ?? []) as Slot[];
    const error = scheduleError || settingsResult.error || slotsResult.error || reservationResult.error || finesResult.error || holidaysResult.error;
    if (error) setToast({ type: "error", message: error.message });
    if (settingsResult.data) setSettings(settingsResult.data as Settings);
    setSlots(availableSlots); setCounts((availabilityResult.data ?? []) as SlotCount[]);
    setReservations((reservationResult.data ?? []) as unknown as Reservation[]); setFines((finesResult.data ?? []) as Fine[]);
    setHolidays((holidaysResult.data ?? []) as Holiday[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function reserve(slotId: string) {
    setBusyId(slotId); const { error } = await supabase.rpc("reserve_seat", { target_slot_id: slotId }); setBusyId(null);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Your seat has been reserved." }); await loadData();
  }

  async function cancel(reservationId: string) {
    if (!confirm("Cancel this seat reservation?")) return;
    setBusyId(reservationId); const { error } = await supabase.rpc("cancel_seat_reservation", { target_reservation_id: reservationId }); setBusyId(null);
    if (error) return setToast({ type: "error", message: error.message });
    setToast({ type: "success", message: "Reservation cancelled. The seat is available again." }); await loadData();
  }

  if (loading) return <LoadingState label="Loading available seats..." />;
  const unpaidTotal = fines.filter((fine) => fine.status === "unpaid").reduce((sum, fine) => sum + Number(fine.amount), 0);
  return <>
    <Toast toast={toast} onClear={() => setToast(null)} />
    <PageHeader eyebrow="Student workspace" title="Reserve a seat" description="Choose an available time slot before coming to the software house." />
    {holidays.length > 0 ? <section className="mb-5 space-y-2 sm:mb-6 sm:space-y-3">{holidays.map((holiday) => <div key={holiday.id} className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-900 sm:p-4"><Icon name="event_busy" className="shrink-0 text-xl sm:text-2xl" /><div className="min-w-0"><p className="text-sm font-bold sm:text-base">Closed: {new Date(`${holiday.closure_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</p><p className="mt-0.5 text-xs font-semibold sm:text-sm">{holiday.title}</p><p className="mt-1 text-xs leading-5 sm:text-sm">{holiday.message}</p></div></div>)}</section> : null}
    {unpaidTotal > 0 && <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-800 sm:mb-6 sm:p-4"><Icon name="warning" className="shrink-0 text-xl sm:text-2xl" /><div className="min-w-0"><p className="text-sm font-bold sm:text-base">Unpaid fine: PKR {unpaidTotal}</p><p className="mt-1 text-xs leading-5 sm:text-sm">{settings.block_on_unpaid_fine ? "New reservations are blocked until this fine is cleared by admin." : "Please contact admin to clear this fine."}</p></div></div>}
    <section className="mb-7 sm:mb-8"><h2 className="mb-3 text-base font-bold text-on-surface sm:mb-4 sm:text-lg">Available time slots</h2><div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {slots.length === 0 ? <div className="wc-card col-span-full p-8 text-center text-on-surface-variant">No reservation slots are currently available.</div> : slots.map((slot) => {
        const reserved = Number(counts.find((count) => count.slot_id === slot.id)?.reserved_count ?? 0); const capacity = slot.capacity ?? settings.total_seats; const remaining = Math.max(0, capacity - reserved); const holiday = holidays.find((item) => item.closure_date === slot.slot_date);
        const own = reservations.find((reservation) => reservation.slot_id === slot.id && ["reserved", "checked_in"].includes(reservation.status));
        return <article key={slot.id} className={`wc-card p-4 sm:p-5 ${holiday ? "border-amber-300 bg-amber-50/50" : ""}`}><div className="flex items-center justify-between gap-2"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${holiday ? "bg-amber-100 text-amber-700" : "bg-primary-container text-primary"}`}><Icon name={holiday ? "event_busy" : "event_seat"} className="text-xl sm:text-2xl" /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${holiday || remaining === 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{holiday ? "Closed - Holiday" : `${remaining} of ${capacity} left`}</span></div><div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:mt-4"><h3 className="text-sm font-bold text-on-surface sm:text-base">{new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}</h3><p className="whitespace-nowrap text-sm font-bold text-primary">{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</p></div>{holiday ? <p className="mt-3 rounded-xl bg-amber-100 p-3 text-xs font-semibold leading-5 text-amber-900 sm:text-sm">{holiday.title}: {holiday.message}</p> : null}{slot.notes && <p className="mt-2 break-words text-xs leading-5 text-on-surface-variant">{slot.notes}</p>}{own ? <div className="mt-4 rounded-xl bg-green-50 p-3"><p className="text-sm font-bold text-green-700">✓ {own.status === "checked_in" ? "Checked in" : "Seat reserved"}</p>{own.status === "reserved" && <button disabled={busyId === own.id} onClick={() => cancel(own.id)} className="wc-secondary-btn mt-3 w-full justify-center px-3 py-2.5 text-sm">{busyId === own.id ? "Cancelling..." : "Cancel reservation"}</button>}</div> : <button disabled={Boolean(holiday) || remaining === 0 || busyId === slot.id || unpaidTotal > 0 && settings.block_on_unpaid_fine} onClick={() => reserve(slot.id)} className="wc-primary-btn mt-4 min-h-11 w-full justify-center px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50">{holiday ? "Closed today" : busyId === slot.id ? "Reserving..." : remaining === 0 ? "Slot full" : "Reserve my seat"}</button>}</article>;
      })}
    </div></section>
    <section><h2 className="mb-3 text-base font-bold text-on-surface sm:mb-4 sm:text-lg">My reservation history</h2><div className="wc-card overflow-hidden"><div className="divide-y divide-outline-variant">{reservations.length === 0 ? <p className="p-5 text-sm text-on-surface-variant sm:p-6">You have not reserved a seat yet.</p> : reservations.map((reservation) => <div key={reservation.id} className="flex items-center justify-between gap-3 p-3 sm:p-4"><div className="min-w-0"><p className="text-sm font-bold text-on-surface sm:text-base">{reservation.seat_slots ? new Date(`${reservation.seat_slots.slot_date}T00:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Deleted slot"}</p><p className="mt-0.5 text-xs text-on-surface-variant">{reservation.seat_slots?.start_time.slice(0,5)}–{reservation.seat_slots?.end_time.slice(0,5)}</p></div><span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase text-on-surface-variant sm:px-3 sm:text-xs">{reservation.status.replace("_", " ")}</span></div>)}</div></div></section>
    <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant sm:mt-5">Cancellation is allowed until {settings.cancellation_minutes} minutes before the slot. Missing a reserved seat may result in a PKR {settings.default_fine} fine.</p>
  </>;
}
