"use client";

import { useMemo, useState, type FormEvent } from "react";
import { recordClientSubscription, recordRenewalFollowup } from "@/app/admin/accounts-manager/actions";
import {
  daysUntil, latestClientSubscriptions, renewalSegment, todayInPakistan,
  type ClientSubscription, type RenewalFollowup,
} from "@/lib/accounts-renewal";

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  marketing_opt_in?: boolean;
}

interface Account {
  id: string;
  tool_name: string;
  total_slots: number;
  display_status: string;
  am_assignments?: { id: string }[];
}

interface Props {
  accounts: Account[];
  clients: Client[];
  subscriptions: ClientSubscription[];
  followups: RenewalFollowup[];
  onRefresh: () => Promise<void>;
  onEditClient: (client: Client) => void;
}

const keyFor = (clientId: string, toolName: string) => `${clientId}:${toolName.trim().toLocaleLowerCase()}`;
const segmentLabel: Record<string, string> = {
  expiring: "Expiring in 7 days", due_today: "Due today", lapsed_1_7: "Lapsed 1–7 days",
  lapsed_8_30: "Lapsed 8–30 days", lapsed_30_plus: "Lapsed 30+ days", later: "Active",
};

export function RenewalWorkspace({ accounts, clients, subscriptions, followups, onRefresh, onEditClient }: Props) {
  const today = todayInPakistan();
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("action");
  const [toolFilter, setToolFilter] = useState("");
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchase, setPurchase] = useState({ id: "", client_id: "", account_id: "", tool_name: "", start_date: today, end_date: "", paid_amount: "" });
  const [activeFollowup, setActiveFollowup] = useState("");
  const [followup, setFollowup] = useState({ outcome: "contacted", notes: "", next_follow_up_date: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const latest = useMemo(() => latestClientSubscriptions(subscriptions), [subscriptions]);
  const followupByKey = useMemo(() => {
    const result = new Map<string, RenewalFollowup>();
    for (const item of followups) {
      const key = keyFor(item.client_id, item.tool_name);
      if (!result.has(key)) result.set(key, item);
    }
    return result;
  }, [followups]);

  const rows = latest.map((subscription) => {
    const segment = renewalSegment(subscription.end_date, today);
    const previousFollowup = followupByKey.get(keyFor(subscription.client_id, subscription.tool_name));
    const lastFollowup = previousFollowup && previousFollowup.contacted_at >= subscription.created_at ? previousFollowup : undefined;
    const contactDue = !lastFollowup || Boolean(lastFollowup.next_follow_up_date && lastFollowup.next_follow_up_date <= today);
    return { subscription, segment, lastFollowup, contactDue, client: clientById.get(subscription.client_id) };
  });

  const filtered = rows.filter((row) => {
    if (toolFilter && row.subscription.tool_name !== toolFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    if (query && !`${row.client?.name || ""} ${row.client?.phone || ""} ${row.subscription.tool_name}`.toLocaleLowerCase().includes(query)) return false;
    if (segmentFilter === "action") return row.segment !== "later" && row.contactDue;
    if (segmentFilter === "lapsed") return row.segment.startsWith("lapsed");
    if (segmentFilter === "expiring") return row.segment === "expiring" || row.segment === "due_today";
    if (segmentFilter === "not_interested") return row.lastFollowup?.outcome === "not_interested";
    return segmentFilter === "all" || row.segment === segmentFilter;
  }).sort((a, b) => a.subscription.end_date.localeCompare(b.subscription.end_date));

  const tools = [...new Set(subscriptions.map((item) => item.tool_name))].sort();
  const month = today.slice(0, 7);
  const renewalsThisMonth = subscriptions.filter((record) =>
    record.source === "manual" && record.created_at.slice(0, 7) === month &&
    subscriptions.some((prior) => prior.id !== record.id &&
      keyFor(prior.client_id, prior.tool_name) === keyFor(record.client_id, record.tool_name) &&
      prior.created_at < record.created_at)
  );
  const termsDueThisMonth = subscriptions.filter((record) => record.end_date.slice(0, 7) === month && record.end_date <= today);
  const dueKeys = new Set(termsDueThisMonth.map((record) => keyFor(record.client_id, record.tool_name)));
  const renewedKeys = new Set(termsDueThisMonth.filter((record) => subscriptions.some((next) =>
    next.id !== record.id && keyFor(next.client_id, next.tool_name) === keyFor(record.client_id, record.tool_name) &&
    next.end_date > record.end_date && next.created_at > record.created_at
  )).map((record) => keyFor(record.client_id, record.tool_name)));
  const renewalRate = dueKeys.size ? `${Math.round(renewedKeys.size / dueKeys.size * 100)}%` : "—";
  const vacantSlots = accounts.filter((account) => account.display_status !== "banned" && account.display_status !== "expired")
    .reduce((sum, account) => sum + Math.max(0, Number(account.total_slots) - (account.am_assignments?.length || 0)), 0);
  const atRiskValue = rows.filter((row) => row.segment !== "later")
    .reduce((sum, row) => sum + Number(row.subscription.paid_amount || 0), 0);

  async function savePurchase(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setNotice("");
    try {
      const response = await recordClientSubscription({
        id: purchase.id || undefined,
        client_id: purchase.client_id,
        account_id: purchase.account_id || null,
        tool_name: purchase.tool_name,
        start_date: purchase.start_date,
        end_date: purchase.end_date,
        paid_amount: purchase.paid_amount === "" ? null : Number(purchase.paid_amount),
      });
      if (!response.success) throw new Error(response.error || "Could not record purchase.");
      setNotice("Purchase or renewal recorded.");
      setShowPurchaseForm(false);
      setPurchase({ id: "", client_id: "", account_id: "", tool_name: "", start_date: today, end_date: "", paid_amount: "" });
      await onRefresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not record purchase."); }
    finally { setSaving(false); }
  }

  async function saveFollowup(event: FormEvent, subscription: ClientSubscription) {
    event.preventDefault();
    setSaving(true); setNotice("");
    try {
      const response = await recordRenewalFollowup({
        client_id: subscription.client_id,
        tool_name: subscription.tool_name,
        outcome: followup.outcome as "contacted" | "interested" | "not_interested",
        notes: followup.notes,
        next_follow_up_date: followup.next_follow_up_date || null,
      });
      if (!response.success) throw new Error(response.error || "Could not save follow-up.");
      setNotice("Follow-up saved.");
      setActiveFollowup("");
      setFollowup({ outcome: "contacted", notes: "", next_follow_up_date: "" });
      await onRefresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save follow-up."); }
    finally { setSaving(false); }
  }

  function openWhatsApp(client: Client, subscription: ClientSubscription) {
    let number = (client.whatsapp || client.phone || "").replace(/\D/g, "");
    if (number.startsWith("00")) number = number.slice(2);
    if (number.startsWith("0") && number.length === 11) number = `92${number.slice(1)}`;
    if (!client.marketing_opt_in || !number) return;
    const date = subscription.end_date;
    const message = `Hi ${client.name}, your ${subscription.tool_name} access ${date < today ? "ended" : "ends"} on ${date}. Would you like to renew? Reply here and we can help.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return <section className="space-y-5">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {[
        ["Due in 7 days", rows.filter((row) => row.segment === "expiring" || row.segment === "due_today").length],
        ["Lapsed", rows.filter((row) => row.segment.startsWith("lapsed")).length],
        ["Renewals this month", renewalsThisMonth.length],
        ["Renewal rate", renewalRate],
        ["Renewal sales (PKR)", renewalsThisMonth.reduce((sum, record) => sum + Number(record.paid_amount || 0), 0).toLocaleString()],
        ["Open account slots", vacantSlots],
      ].map(([label, value]) => <div key={label} className="wc-card p-4"><p className="text-xs font-semibold text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-primary">{value}</p></div>)}
    </div>

    <div className="wc-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div><h2 className="text-lg font-bold text-gray-900">Client renewals</h2><p className="text-xs text-gray-600">Latest term per client and tool. Legacy dates are estimates until reviewed.</p></div>
      <button type="button" onClick={() => { setPurchase({ id: "", client_id: "", account_id: "", tool_name: "", start_date: today, end_date: "", paid_amount: "" }); setShowPurchaseForm((open) => !open); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Record purchase / renewal</button>
    </div>

    {notice && <p role="status" className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800">{notice}</p>}

    {showPurchaseForm && <form onSubmit={savePurchase} className="wc-card grid gap-3 p-4 md:grid-cols-3">
      <label className="text-xs font-semibold">Client<select required value={purchase.client_id} onChange={(event) => setPurchase({ ...purchase, client_id: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Linked account (optional)<select value={purchase.account_id} onChange={(event) => { const account = accounts.find((item) => item.id === event.target.value); setPurchase({ ...purchase, account_id: event.target.value, tool_name: account?.tool_name || purchase.tool_name }); }} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">No linked account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.tool_name} · {account.id.slice(0, 8)}</option>)}</select></label>
      <label className="text-xs font-semibold">Tool<input required value={purchase.tool_name} onChange={(event) => setPurchase({ ...purchase, tool_name: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" placeholder="ChatGPT Plus" /></label>
      <label className="text-xs font-semibold">Client start date<input required type="date" value={purchase.start_date} onChange={(event) => setPurchase({ ...purchase, start_date: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold">Client expiry date<input required type="date" min={purchase.start_date} value={purchase.end_date} onChange={(event) => setPurchase({ ...purchase, end_date: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold">Amount received (PKR, optional)<input type="number" min="0" step="0.01" value={purchase.paid_amount} onChange={(event) => setPurchase({ ...purchase, paid_amount: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-3">{saving ? "Saving..." : purchase.id ? "Save verified term" : "Save purchase"}</button>
    </form>}

    <div className="wc-card grid gap-3 p-4 md:grid-cols-3">
      <input aria-label="Search renewals" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, phone or tool" className="rounded-lg border p-2 text-sm" />
      <select aria-label="Renewal segment" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)} className="rounded-lg border p-2 text-sm">
        <option value="action">Action needed</option><option value="all">All clients</option><option value="expiring">Expiring / due today</option><option value="lapsed">All lapsed</option><option value="lapsed_1_7">Lapsed 1–7 days</option><option value="lapsed_8_30">Lapsed 8–30 days</option><option value="lapsed_30_plus">Lapsed 30+ days</option><option value="not_interested">Not interested</option>
      </select>
      <select aria-label="Tool" value={toolFilter} onChange={(event) => setToolFilter(event.target.value)} className="rounded-lg border p-2 text-sm"><option value="">All tools</option>{tools.map((tool) => <option key={tool} value={tool}>{tool}</option>)}</select>
    </div>

    <p className="text-xs text-gray-600">{filtered.length} matching clients · At-risk value from recorded terms: PKR {atRiskValue.toLocaleString()} (legacy amounts are unknown)</p>

    <div className="space-y-3">
      {filtered.length === 0 && <p className="wc-card p-6 text-sm text-gray-600">No clients match this view. Record a purchase or change the filters.</p>}
      {filtered.map(({ subscription, segment, lastFollowup, client }) => {
        const key = keyFor(subscription.client_id, subscription.tool_name);
        const number = client?.whatsapp || client?.phone;
        const days = daysUntil(subscription.end_date, today);
        const history = subscriptions.filter((item) => keyFor(item.client_id, item.tool_name) === key)
          .sort((a, b) => b.end_date.localeCompare(a.end_date));
        return <article key={key} className="wc-card space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold text-gray-900">{client?.name || "Unknown client"} · {subscription.tool_name}</h3><p className="text-xs text-gray-600">Client expiry: {subscription.end_date} · {segmentLabel[segment]} {days !== null && days < 0 ? `(${Math.abs(days)} days ago)` : ""}</p>{subscription.source === "legacy" && <p className="text-xs text-amber-700">Estimated from linked account; verify this client&apos;s dates.</p>}</div>
            <span className="rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold">{history.length > 1 && subscription.source === "manual" ? "Renewed" : lastFollowup?.outcome?.replaceAll("_", " ") || "Not contacted"}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600"><span>{number || "No phone"}</span>{lastFollowup && <span>Last follow-up: {lastFollowup.contacted_at.slice(0, 10)}</span>}{lastFollowup?.next_follow_up_date && <span>Next: {lastFollowup.next_follow_up_date}</span>}{subscription.paid_amount !== null && <span>Last amount: PKR {Number(subscription.paid_amount).toLocaleString()}</span>}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!client?.marketing_opt_in || !number} onClick={() => client && openWhatsApp(client, subscription)} className="rounded-lg border border-green-300 px-3 py-2 text-xs font-semibold text-green-800 disabled:cursor-not-allowed disabled:opacity-50">WhatsApp renewal draft</button>
            {client && <button type="button" onClick={() => onEditClient(client)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Edit client / consent</button>}
            <button type="button" onClick={() => { setActiveFollowup(activeFollowup === key ? "" : key); setFollowup({ outcome: "contacted", notes: "", next_follow_up_date: "" }); }} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">Log follow-up</button>
            <button type="button" onClick={() => { setPurchase({ id: "", client_id: subscription.client_id, account_id: subscription.account_id || "", tool_name: subscription.tool_name, start_date: today, end_date: "", paid_amount: "" }); setShowPurchaseForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-800">Record renewal</button>
            {subscription.source === "legacy" && <button type="button" onClick={() => { setPurchase({ id: subscription.id, client_id: subscription.client_id, account_id: subscription.account_id || "", tool_name: subscription.tool_name, start_date: subscription.start_date, end_date: subscription.end_date, paid_amount: subscription.paid_amount === null ? "" : String(subscription.paid_amount) }); setShowPurchaseForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Verify client dates</button>}
          </div>
          {!client?.marketing_opt_in && <p className="text-xs text-amber-700">Renewal marketing consent is missing. Edit the client record before opening a WhatsApp draft.</p>}
          {activeFollowup === key && <form onSubmit={(event) => saveFollowup(event, subscription)} className="grid gap-2 rounded-lg bg-gray-50 p-3 md:grid-cols-3">
            <select aria-label="Follow-up outcome" value={followup.outcome} onChange={(event) => setFollowup({ ...followup, outcome: event.target.value })} className="rounded-lg border p-2 text-sm"><option value="contacted">Contacted</option><option value="interested">Interested</option><option value="not_interested">Not interested</option></select>
            <input aria-label="Next follow-up date" type="date" min={today} value={followup.next_follow_up_date} onChange={(event) => setFollowup({ ...followup, next_follow_up_date: event.target.value })} className="rounded-lg border p-2 text-sm" />
            <input aria-label="Follow-up notes" value={followup.notes} onChange={(event) => setFollowup({ ...followup, notes: event.target.value })} placeholder="Notes (optional)" className="rounded-lg border p-2 text-sm" />
            <button disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 md:col-span-3">Save follow-up</button>
          </form>}
          <details className="text-xs text-gray-600"><summary className="cursor-pointer font-semibold">Purchase history ({history.length})</summary><ul className="mt-2 space-y-1">{history.map((item) => <li key={item.id}>{item.start_date} → {item.end_date} · {item.source === "legacy" ? "Estimated legacy record" : `PKR ${item.paid_amount === null ? "unknown" : Number(item.paid_amount).toLocaleString()}`}</li>)}</ul></details>
        </article>;
      })}
    </div>
  </section>;
}
