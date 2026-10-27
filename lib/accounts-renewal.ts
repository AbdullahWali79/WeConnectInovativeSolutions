export type AccountStatus = "active" | "expiring_soon" | "expired" | "banned";

export interface ClientSubscription {
  id: string;
  client_id: string;
  account_id: string | null;
  tool_name: string;
  start_date: string;
  end_date: string;
  paid_amount: number | null;
  source: "legacy" | "manual";
  created_at: string;
}

export interface RenewalFollowup {
  id: string;
  client_id: string;
  tool_name: string;
  outcome: "contacted" | "interested" | "not_interested";
  notes: string | null;
  next_follow_up_date: string | null;
  contacted_at: string;
}

export function todayInPakistan(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function daysUntil(date: string | null | undefined, today = todayInPakistan()): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const target = Date.parse(`${date}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(target) || !Number.isFinite(current)) return null;
  return Math.round((target - current) / 86_400_000);
}

export function accountStatus(account: { status?: string; end_date?: string | null }, today = todayInPakistan()): AccountStatus {
  if (account.status === "banned") return "banned";
  if (account.status === "expired") return "expired";
  const days = daysUntil(account.end_date, today);
  if (days === null) {
    if (account.status === "expired" || account.status === "expiring_soon") return account.status;
    return "active";
  }
  if (days < 0) return "expired";
  return days <= 7 ? "expiring_soon" : "active";
}

export function latestClientSubscriptions(records: ClientSubscription[]): ClientSubscription[] {
  const latest = new Map<string, ClientSubscription>();
  for (const record of records) {
    const key = `${record.client_id}:${record.tool_name.trim().toLocaleLowerCase()}`;
    const prior = latest.get(key);
    if (!prior || record.end_date > prior.end_date ||
      (record.end_date === prior.end_date && record.created_at > prior.created_at)) {
      latest.set(key, record);
    }
  }
  return [...latest.values()];
}

export function renewalSegment(endDate: string, today = todayInPakistan()): "expiring" | "due_today" | "lapsed_1_7" | "lapsed_8_30" | "lapsed_30_plus" | "later" {
  const days = daysUntil(endDate, today);
  if (days === null || days > 7) return "later";
  if (days > 0) return "expiring";
  if (days === 0) return "due_today";
  if (days >= -7) return "lapsed_1_7";
  if (days >= -30) return "lapsed_8_30";
  return "lapsed_30_plus";
}
