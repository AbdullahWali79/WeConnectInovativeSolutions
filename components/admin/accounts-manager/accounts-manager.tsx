/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { 
  fetchAccountsData, addSeller, addClient,
  deleteSharedAccount, updateAssignmentPayment,
  removeAssignment, addBankAccount, deleteBankAccount, importClients, saveSharedAccountWithClients, updateClient
} from "@/app/admin/accounts-manager/actions";
import { Icon } from "@/components/icon";
import { accountStatus, daysUntil } from "@/lib/accounts-renewal";
import { RenewalWorkspace } from "./renewal-workspace";

function expiryLabel(date: string): string {
  const days = daysUntil(date);
  if (days === null) return date;
  if (days === 0) return `${date} · today`;
  return days < 0 ? `${date} · ${Math.abs(days)} days ago` : `${date} · ${days} days left`;
}

export function AccountsManager() {
  const [toast, setToast] = useState<ToastState>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toolFilter, setToolFilter] = useState("All");
  const [workspaceTab, setWorkspaceTab] = useState<"accounts" | "pending" | "renewals">("accounts");

  // Modals state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<any>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  const [isSharedAccountsModalOpen, setIsSharedAccountsModalOpen] = useState(false);
  const [isAddSellerModalOpen, setIsAddSellerModalOpen] = useState(false);

  // Expanded Accounts
  const [expandedAccs, setExpandedAccs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Do not fetch credentials until the module is unlocked.
    if (unlocked) loadData();
  }, [unlocked]);

  
  const handleImportCsv = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      const headers = lines[0].split(",");

      const firstNameIdx = headers.findIndex((h) => h.includes("First Name"));
      const middleNameIdx = headers.findIndex((h) => h.includes("Middle Name"));
      const lastNameIdx = headers.findIndex((h) => h.includes("Last Name"));
      const phone1Idx = headers.findIndex((h) => h === "Phone 1 - Value");
      const email1Idx = headers.findIndex((h) => h === "E-mail 1 - Value");
      const orgIdx = headers.findIndex((h) => h === "Organization Name");
      const labelsIdx = headers.findIndex((h) => h === "Labels");

      const importedClients = [];

      for (let i = 1; i < lines.length; i++) {
        const rowStr = lines[i];
        const row = [];
        let insideQuote = false;
        let currentVal = "";
        for (const char of rowStr) {
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            row.push(currentVal);
            currentVal = "";
          } else {
            currentVal += char;
          }
        }
        row.push(currentVal);

        if (row.length < 5) continue;

        const fn = row[firstNameIdx] || "";
        const mn = row[middleNameIdx] || "";
        const ln = row[lastNameIdx] || "";
        const name = [fn, mn, ln].filter(Boolean).join(" ");
        
        const phone = row[phone1Idx] ? row[phone1Idx].replace(/"/g, "") : null;
        const email = row[email1Idx] ? row[email1Idx].replace(/"/g, "") : null;
        const company = row[orgIdx] ? row[orgIdx].replace(/"/g, "") : null;
        const labels = row[labelsIdx] ? row[labelsIdx].replace(/"/g, "") : null;

        if (!name && !phone && !email) continue;

        importedClients.push({
          name: name || "Unknown Contact",
          phone: phone || null,
          email: email || null,
          company: company || null,
          labels: labels || null,
        });
      }

      if (importedClients.length > 0) {
        setToast({ type: "success", message: `Processing ${importedClients.length} contacts...` });
        const res = await importClients(importedClients);
        if (res.success) {
          setToast({ type: "success", message: `Successfully imported ${res.inserted} new contacts!` });
          loadData();
        } else {
          setToast({ type: "error", message: res.error || "Import failed" });
        }
      } else {
        setToast({ type: "error", message: "No valid contacts found in CSV." });
      }
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  async function loadData() {
    setLoading(true);
    const res = await fetchAccountsData();
    if (res.success) {
      setAccounts(res.accounts || []);
      setSellers(res.sellers || []);
      setClients(res.clients || []);
      setBanks(res.banks || []);
      setSubscriptions(res.subscriptions || []);
      setFollowups(res.followups || []);
    } else {
      setToast({ type: "error", message: res.error || "Failed to load data" });
    }
    setLoading(false);
  }

  async function savePaymentBalance(assignmentId: string, remainingBalance: number) {
    if (!Number.isFinite(remainingBalance) || remainingBalance < 0) {
      setToast({ type: "error", message: "Enter a valid remaining balance of 0 or more." });
      return;
    }
    setSavingPaymentId(assignmentId);
    try {
      const status = remainingBalance > 0 ? "pending" : "cleared";
      const result = await updateAssignmentPayment(assignmentId, status, remainingBalance);
      if (!result.success) {
        setToast({ type: "error", message: result.error || "Could not update payment." });
        return;
      }
      const savedPayment = result.assignment;
      setAccounts(previous => previous.map(account => ({
        ...account,
        am_assignments: account.am_assignments?.map((assignment: any) =>
          assignment.id === assignmentId
            ? { ...assignment, payment_status: savedPayment.payment_status, pending_amount: savedPayment.pending_amount }
            : assignment
        ),
      })));
      setToast({ type: "success", message: Number(savedPayment.pending_amount) === 0 ? "Payment marked paid" : "Remaining balance updated" });
    } catch {
      setToast({ type: "error", message: "Could not update payment. Please try again." });
    } finally {
      setSavingPaymentId(null);
    }
  }

  function editPaymentBalance(assignmentId: string, currentBalance: number) {
    const input = prompt("Remaining unpaid balance (enter 0 if fully paid):", String(currentBalance));
    if (input === null) return;
    if (!input.trim()) {
      setToast({ type: "error", message: "Enter the remaining unpaid balance." });
      return;
    }
    void savePaymentBalance(assignmentId, Number(input));
  }

  const toggleExpand = (id: string) => {
    setExpandedAccs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = () => {
    setToast({ type: "success", message: "Copied to clipboard!" });
  };

  const accountsWithStatus = accounts.map(a => ({ ...a, display_status: accountStatus(a) }));
  const activeCount = accountsWithStatus.filter(a => a.display_status === 'active').length;
  const expiringCount = accountsWithStatus.filter(a => a.display_status === 'expiring_soon').length;
  const expiredCount = accountsWithStatus.filter(a => a.display_status === 'expired').length;
  const bannedCount = accountsWithStatus.filter(a => a.display_status === 'banned').length;

  // Filtered Accounts
  const filteredAccounts = accountsWithStatus.filter(a => {
    if (statusFilter !== "All" && a.display_status !== statusFilter) return false;
    if (toolFilter !== "All" && !a.tool_name.toLowerCase().includes(toolFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.tool_name.toLowerCase().includes(q) || 
             (a.login_email && a.login_email.toLowerCase().includes(q)) ||
             a.am_assignments?.some((as:any) => as.am_clients?.name.toLowerCase().includes(q) || as.am_clients?.phone?.includes(q));
    }
    return true;
  }).sort((a, b) => {
    const priority: Record<string, number> = { expired: 0, expiring_soon: 1, active: 2, banned: 3 };
    return priority[a.display_status] - priority[b.display_status] ||
      (a.end_date || "9999-12-31").localeCompare(b.end_date || "9999-12-31");
  });

  const pendingPayments = accounts.flatMap(account =>
    (account.am_assignments || [])
      .filter((assignment: any) => assignment.payment_status === "pending" || Number(assignment.pending_amount) > 0)
      .map((assignment: any) => ({ ...assignment, account }))
  );

  if (!unlocked) {
    const handleUnlock = () => {
      if (password === "Abdullah123@") {
        setUnlocked(true);
        setUnlockError("");
        setPassword("");
      } else {
        setUnlockError("Incorrect password. Please try again.");
        setPassword("");
      }
    };

    return (
      <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--wc-primary) 20%, transparent), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-0 h-[320px] w-[320px] rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--wc-secondary-container) 18%, transparent), transparent 70%)" }}
        />

        <div className="relative w-full max-w-md">
          <div className="wc-card overflow-hidden rounded-3xl shadow-[0_24px_60px_-12px_rgba(0,33,110,0.28)]">
            {/* Navy header band matching the admin sidebar */}
            <div className="relative overflow-hidden bg-primary px-6 pb-8 pt-7 text-on-primary sm:px-8 sm:pb-10 sm:pt-9">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-10 h-44 w-44 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--wc-secondary-container) 26%, transparent), transparent 70%)" }}
              />

              <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md">
                  <Icon name="lock" className="relative text-[30px] text-secondary-container" />
                </div>

                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                  <Icon name="verified_user" className="text-[13px] text-secondary-container" />
                  Restricted Module
                </span>

                <h2 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">Accounts Manager</h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-blue-100">
                  This module holds client credentials. Enter the authorised password to continue.
                </p>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-secondary-container to-transparent" />
            </div>

            {/* Body */}
            <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8">
              <label htmlFor="module-unlock-password" className="wc-label mb-2 block">
                Module Password
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--wc-on-surface-variant)]">
                  <Icon name="key" className="text-[20px]" />
                </span>
                <input
                  id="module-unlock-password"
                  type="password"
                  value={password}
                  autoFocus
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (unlockError) setUnlockError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUnlock();
                  }}
                  placeholder="Enter password"
                  aria-invalid={Boolean(unlockError)}
                  className="wc-input w-full pl-12 pr-4"
                />
              </div>

              <div
                role="alert"
                aria-live="polite"
                className={`overflow-hidden transition-all duration-300 ${unlockError ? "mt-3 max-h-20 opacity-100" : "mt-0 max-h-0 opacity-0"}`}
              >
                <div className="flex items-start gap-2 rounded-xl border border-error/25 bg-error/10 px-3.5 py-2.5">
                  <Icon name="error" className="mt-px text-[17px] text-error" />
                  <p className="text-[13px] font-semibold leading-snug text-error">{unlockError}</p>
                </div>
              </div>

              <button
                onClick={handleUnlock}
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-on-primary shadow-[0_10px_24px_-6px_rgba(0,33,110,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(0,33,110,0.55)] active:translate-y-0"
              >
                <Icon name="lock_open" className="text-[18px]" />
                Unlock Module
                <Icon name="arrow_forward" className="text-[16px] transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-outline-variant/60 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--wc-on-surface-variant)]">
                <Icon name="shield" className="text-[14px] text-secondary" />
                Authorized personnel only
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 sm:p-6 sm:space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />
      
      {/* Header section matching the screenshot */}
      <div className="rounded-xl bg-primary p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-lg font-bold text-white mb-1 sm:text-xl">Accounts Workspace</h1>
          <p className="text-xs text-blue-100 sm:text-sm">Accounts aur clients popup me add karein. Neeche records clean layout me milenge.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <button onClick={() => { setAccountToEdit(null); setIsAddAccountModalOpen(true); }} className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-blue-50 sm:col-span-1 sm:px-4 sm:text-sm">
            <Icon name="key" className="text-[18px]" />
            Add Shared Account
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} className="hidden" />
            <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:px-4 sm:text-sm">
              <Icon name={importing ? "sync" : "upload_file"} className={`text-[18px] ${importing ? "animate-spin" : ""}`} />
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button onClick={() => { setClientToEdit(null); setIsAddClientModalOpen(true); }} className="flex items-center justify-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:px-4 sm:text-sm">
            <Icon name="person_add" className="text-[18px]" />
            Add Client
          </button>
          <button onClick={() => setIsSharedAccountsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:px-4 sm:text-sm">
            <Icon name="account_balance" className="text-[18px]" />
            Bank Accounts
          </button>
          <button onClick={() => setIsAddSellerModalOpen(true)} className="flex items-center justify-center gap-2 rounded-lg border border-white/40 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:px-4 sm:text-sm">
            <Icon name="sell" className="text-[18px]" />
            Add Seller
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <div className="wc-card p-4 sm:p-5">
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 sm:text-xs">ALL ACCOUNTS</p>
          <p className="text-2xl font-bold text-primary sm:text-3xl">{accounts.length}</p>
        </div>
        <div className="wc-card p-4 sm:p-5">
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 sm:text-xs">ACTIVE</p>
          <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">{activeCount}</p>
        </div>
        <div className="wc-card p-4 sm:p-5">
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 sm:text-xs">EXPIRING SOON</p>
          <p className="text-2xl font-bold text-amber-600 sm:text-3xl">{expiringCount}</p>
        </div>
        <div className="wc-card p-4 sm:p-5">
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 sm:text-xs">EXPIRED</p>
          <p className="text-2xl font-bold text-red-500 sm:text-3xl">{expiredCount}</p>
        </div>
        <div className="wc-card col-span-2 p-4 sm:col-span-1 sm:p-5">
          <p className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 sm:text-xs">BANNED</p>
          <p className="text-2xl font-bold text-gray-700 sm:text-3xl">{bannedCount}</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto border-b border-gray-200 px-1">
        <button onClick={() => setWorkspaceTab("accounts")} className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2.5 text-xs font-bold sm:px-4 sm:text-sm ${workspaceTab === "accounts" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
          Accounts &amp; Members ({accounts.length})
        </button>
        <button onClick={() => setWorkspaceTab("pending")} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2.5 text-xs font-bold sm:px-4 sm:text-sm ${workspaceTab === "pending" ? "bg-amber-500 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
          <Icon name="pending_actions" className="text-[17px]" /> Pending Payments ({pendingPayments.length})
        </button>
        <button onClick={() => setWorkspaceTab("renewals")} className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2.5 text-xs font-bold sm:px-4 sm:text-sm ${workspaceTab === "renewals" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
          Renewals &amp; Follow-ups
        </button>
      </div>

      {workspaceTab === "renewals" ? (
        <RenewalWorkspace accounts={accountsWithStatus} clients={clients} subscriptions={subscriptions} followups={followups} onRefresh={loadData} onEditClient={(client) => { setClientToEdit(client); setIsAddClientModalOpen(true); }} />
      ) : workspaceTab === "pending" ? (
        <div className="space-y-3">
          {pendingPayments.length === 0 ? (
            <div className="wc-card py-10 text-center text-gray-500">No pending member payments.</div>
          ) : pendingPayments.map((item: any) => (
            <div key={item.id} className="wc-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900">{item.am_clients?.name || "Unknown member"}</h3>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 border border-amber-200">PAYMENT PENDING</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Access email: <span className="font-semibold text-gray-700">{item.account.login_email}</span></p>
                <p className="text-xs text-gray-500">Account: {item.account.tool_name} · {item.am_clients?.phone || item.am_clients?.whatsapp || "No phone"}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="text-right"><p className="text-[10px] font-bold uppercase text-gray-500">Pending amount</p><p className="text-lg font-black text-amber-600">{item.pending_amount || 0}</p></div>
                <button disabled={savingPaymentId === item.id} onClick={() => editPaymentBalance(item.id, Number(item.pending_amount) || 0)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Edit Balance</button>
                <button disabled={savingPaymentId === item.id} onClick={() => void savePaymentBalance(item.id, 0)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Mark Paid</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
      <>
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Search Accounts</label>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-2.5 text-gray-500 text-[20px]" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tool, login, plan, or client" 
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option value="All">All</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="banned">Banned</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <label className="block mb-1 text-xs font-semibold text-gray-500">Tool Filter</label>
          <select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option>All</option>
            {Array.from(new Set(accounts.map(a => a.tool_name))).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Accounts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="wc-card text-center py-10 text-gray-500">
            No accounts found. Add one to get started!
          </div>
        ) : (
          filteredAccounts.map(acc => (
            <div key={acc.id} className="wc-card flex flex-col overflow-hidden">
              {/* Header row */}
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    <h3 className="min-w-0 break-words text-sm font-bold text-gray-900">{acc.tool_name} • {acc.login_email}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      acc.display_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      acc.display_status === 'expiring_soon' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {acc.display_status.replaceAll("_", " ").toUpperCase()}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200">{acc.share_type}</span>
                    {acc.end_date && (
                      <span className="text-xs text-gray-500 font-medium">Expires: {expiryLabel(acc.end_date)}</span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                      {acc.am_assignments?.length || 0} client(s)
                    </span>
                 </div>
                 <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
                   <button onClick={() => { setAccountToEdit(acc); setIsAddAccountModalOpen(true); }} className="flex-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 md:flex-none">Edit</button>
                   <button onClick={() => toggleExpand(acc.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50 md:flex-none">
                     {expandedAccs[acc.id] ? "Collapse" : "Expand"} <Icon name={expandedAccs[acc.id] ? "expand_less" : "expand_more"} className="text-[16px]" />
                   </button>
                   <button 
                    onClick={async () => {
                      if(confirm("Delete this account permanently?")) {
                        const res = await deleteSharedAccount(acc.id);
                        if(res.success) { setToast({type:'success', message:'Deleted!'}); loadData(); }
                        else setToast({type:'error', message: res.error || 'Failed to delete'});
                      }
                    }} 
                    className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                     <Icon name="delete" className="text-[18px]" />
                   </button>
                 </div>
              </div>

              {/* Expanded details */}
              {expandedAccs[acc.id] && (
                <div className="flex flex-col gap-5 border-t border-gray-200 bg-gray-50 p-4 sm:gap-6 sm:p-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">ACCESS</h4>
                      <div className="space-y-3">
                        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
                          <span className="min-w-0 break-all text-sm text-gray-700">{acc.login_email}</span>
                          <CopyButton text={acc.login_email} baseClassName="shrink-0 text-gray-400 hover:bg-blue-50 hover:text-blue-600" copiedClassName="bg-emerald-50 text-emerald-600" onCopied={handleCopy} />
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
                          <span className="min-w-0 break-all text-sm text-gray-700">{acc.login_password}</span>
                          <CopyButton text={acc.login_password} baseClassName="shrink-0 text-gray-400 hover:bg-blue-50 hover:text-blue-600" copiedClassName="bg-emerald-50 text-emerald-600" onCopied={handleCopy} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">SHARING</h4>
                      <p className="text-sm text-gray-700 mb-1">{acc.am_assignments?.length || 0} used / {acc.total_slots} total</p>
                      <p className="text-sm text-gray-700 mb-1">{acc.total_slots - (acc.am_assignments?.length || 0)} slot(s) remaining</p>
                      {acc.start_date && acc.end_date && (
                        <p className="text-xs text-gray-500 mt-3">{acc.start_date} to {acc.end_date}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3">PURCHASE</h4>
                      <p className="text-sm text-gray-700 mb-1">{acc.am_sellers?.name || "No seller linked"}</p>
                      <p className="text-xs text-gray-500">Buy price: {acc.buy_price} | Buy date: {acc.buy_date || "N/A"}</p>
                    </div>
                  </div>

                  {/* Linked Clients */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-blue-700 flex items-center gap-1">
                        <Icon name="link" className="text-[18px]" /> Linked Clients
                      </h4>
                      <button onClick={() => { setAccountToEdit(acc); setIsAddAccountModalOpen(true); }} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Add / Manage Members</button>
                      
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {acc.am_assignments?.map((as:any) => (
                        <div key={as.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h5 className="font-bold text-gray-900 text-sm">{as.am_clients?.name}</h5>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${as.payment_status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                {as.payment_status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{as.am_clients?.phone || as.am_clients?.whatsapp || 'No Phone'}</p>
                            {as.pending_amount > 0 && <p className="mt-1 text-[10px] text-amber-600">Pending: {as.pending_amount}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <button onClick={() => {
                               const msg = encodeURIComponent(`Hi ${as.am_clients?.name},\nHere is your access for ${acc.tool_name}:\nEmail: ${acc.login_email}\nPass: ${acc.login_password}\nExpires: ${acc.end_date}`);
                               const phone = (as.am_clients?.whatsapp || as.am_clients?.phone || "").replace(/[^0-9]/g, "");
                               if(phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                               else alert("No WhatsApp number found");
                            }} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 flex items-center gap-1">
                              <Icon name="chat" className="text-[14px]" /> Share Access
                            </button>
                            <button disabled={savingPaymentId === as.id || (as.payment_status !== 'pending' && Number(as.pending_amount) <= 0)} onClick={() => editPaymentBalance(as.id, Number(as.pending_amount) || 0)} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${as.payment_status === 'pending' || Number(as.pending_amount) > 0 ? 'border-gray-300 text-gray-600 hover:bg-gray-50' : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'}`}>
                              Edit Balance
                            </button>
                            <button onClick={() => { setClientToEdit(as.am_clients); setIsAddClientModalOpen(true); }} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Edit Member</button>
                            <button onClick={async () => {
                              if(confirm("Remove this client from this account?")) {
                                const res = await removeAssignment(as.id);
                                if(res.success) { setToast({type:'success', message:'Removed!'}); loadData(); }
                              }
                            }} className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50">
                              <Icon name="close" className="text-[16px]" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!acc.am_assignments || acc.am_assignments.length === 0) && (
                        <p className="col-span-2 text-xs text-gray-500">No clients assigned to this account yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </>
      )}

      {/* Add Seller Modal */}
      {isAddSellerModalOpen && (
        <AddSellerModal onClose={() => setIsAddSellerModalOpen(false)} onSave={() => { setIsAddSellerModalOpen(false); loadData(); setToast({type:'success', message:'Seller added'}); }} />
      )}

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <AddClientModal client={clientToEdit} onClose={() => { setIsAddClientModalOpen(false); setClientToEdit(null); }} onSave={() => { setIsAddClientModalOpen(false); setClientToEdit(null); loadData(); setToast({type:'success', message: clientToEdit ? 'Member updated' : 'Client added'}); }} />
      )}

      {/* Add Shared Account Modal */}
      {isAddAccountModalOpen && (
        <AccountFormModal account={accountToEdit} accounts={accounts} clients={clients} sellers={sellers} onClose={() => setIsAddAccountModalOpen(false)} onSave={() => { setIsAddAccountModalOpen(false); loadData(); setToast({type:'success', message:'Account saved successfully'}); }} />
      )}
      
      {/* Shared Bank Accounts Modal */}
      {isSharedAccountsModalOpen && (
        <BankAccountsModal banks={banks} reload={loadData} onClose={() => setIsSharedAccountsModalOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// MODALS
// ---------------------------------------------------------

export function CopyButton({ text, baseClassName, copiedClassName, title, showLabel = false, onCopied }: {
  text: string;
  baseClassName: string;
  copiedClassName: string;
  title?: string;
  showLabel?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    onCopied?.();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : title}
      aria-label={copied ? "Copied" : title ?? "Copy"}
      className={`inline-flex items-center gap-1 rounded-lg p-1.5 text-sm font-semibold transition-all duration-200 ${copied ? copiedClassName : baseClassName}`}
    >
      <Icon name={copied ? "check" : "content_copy"} className={`text-sm transition-transform duration-200 ${copied ? "scale-110" : ""}`} />
      {showLabel && <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>}
      {!showLabel && copied && <span className="text-xs">Copied!</span>}
    </button>
  );
}

function AddSellerModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ name: "", platform: "", phone: "", whatsapp: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = await addSeller(form);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Add Seller</h2>
              <p className="text-xs text-gray-500">Jis seller/provider se account buy hota hai uski details yahan save karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto sm:p-6">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Seller Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Seller / provider name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Platform</label>
                <input type="text" value={form.platform} onChange={e=>setForm({...form, platform: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Facebook, WhatsApp, website..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="seller@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={3} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Seller terms, reliability, payment account, renewal notes"></textarea>
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="seller-form" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Seller"}
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddClientModal({ client, onClose, onSave }: { client?: any, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ name: client?.name || "", phone: client?.phone || "", whatsapp: client?.whatsapp || "", email: client?.email || "", company: client?.company || "", notes: client?.notes || "", marketing_opt_in: Boolean(client?.marketing_opt_in), marketing_opt_in_source: client?.marketing_opt_in_source || "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = client ? await updateClient(client.id, form) : await addClient(form);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="group" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">{client ? "Edit Member" : "Add Client"}</h2>
              <p className="text-xs text-gray-500">Manual entry support.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto sm:p-6">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Client Name</label>
                <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Type name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Phone Number</label>
                <input type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">WhatsApp Number</label>
                <input type="text" value={form.whatsapp} onChange={e=>setForm({...form, whatsapp: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="03001234567" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="client@example.com" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-600">Company / Notes</label>
              <input type="text" value={form.company} onChange={e=>setForm({...form, company: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mb-2" placeholder="Agency / Client tag" />
              <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Optional notes"></textarea>
              <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={form.marketing_opt_in} onChange={e=>setForm({...form, marketing_opt_in: e.target.checked})} className="mt-0.5" />
                Client agreed to receive renewal offers on WhatsApp. Uncheck if they opt out.
              </label>
              {form.marketing_opt_in && <input required value={form.marketing_opt_in_source} onChange={e=>setForm({...form, marketing_opt_in_source: e.target.value})} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900" placeholder="Consent source, e.g. signup form or WhatsApp chat" />}
            </div>
          </form>
        </div>
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="client-form" disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-[18px]" /> {saving ? "Saving..." : "Save Client"}
          </button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountFormModal({ account, accounts, clients, sellers, onClose, onSave }: { account?: any, accounts: any[], clients: any[], sellers: any[], onClose: () => void, onSave: () => void }) {
  const fieldClass = "w-full rounded-lg border border-outline-variant bg-surface-lowest p-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-surface-container";
  const labelClass = "mb-1 block text-xs font-bold text-on-surface-variant";
  const [form, setForm] = useState({ 
    id: account?.id || "",
    tool_name: account?.tool_name || "", label: account?.label || "", link: account?.link || "", seller_id: account?.seller_id || "", 
    buy_price: account?.buy_price || 0, buy_date: account?.buy_date || "", purchase_notes: account?.purchase_notes || "",
    login_email: account?.login_email || "", login_password: account?.login_password || "", 
    linked_mail: account?.linked_mail || "", linked_mail_password: account?.linked_mail_password || "",
    plan_type: account?.plan_type || "", extra_notes: account?.extra_notes || "", 
    share_type: account?.share_type || "Shared", status: ["expired", "banned"].includes(account?.status) ? account.status : "active",
    total_slots: account?.total_slots || 1, start_date: account?.start_date || "", end_date: account?.end_date || ""
  });
  
  const [selectedClients, setSelectedClients] = useState<any[]>(
    account?.am_assignments ? account.am_assignments.map((a: any) => ({
      client_id: a.client_id,
      name: a.am_clients?.name || "Unknown",
      payment_status: String(a.payment_status || "pending").toLowerCase(),
      pending_amount: a.pending_amount || 0,
      notes: a.notes || ""
    })) : []
  );
  
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom tool dropdown logic
  const uniqueTools = Array.from(new Set(accounts.map((a: any) => a.tool_name).filter(Boolean)));
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const toolDropdownRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(e.target as Node)) {
        setShowToolDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave: any = { ...form };
    if (!dataToSave.id) delete (dataToSave as any).id;
    if (!dataToSave.seller_id) dataToSave.seller_id = null;
    if (!dataToSave.buy_date) dataToSave.buy_date = null;
    if (!dataToSave.start_date) dataToSave.start_date = null;
    if (!dataToSave.end_date) dataToSave.end_date = null;

    const res = await saveSharedAccountWithClients(dataToSave, selectedClients);
    if(res.success) onSave();
    else alert(res.error);
    setSaving(false);
  };

  const handleSelectClient = (c: any) => {
    if (!selectedClients.some(sc => sc.client_id === c.id)) {
      setSelectedClients([...selectedClients, {
        client_id: c.id,
        name: c.name,
        payment_status: "pending",
        pending_amount: 0,
        notes: ""
      }]);
    }
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(clientSearch))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-low p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-primary">
              <Icon name="key" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-on-surface">{account ? "Edit Shared Account" : "Add Shared Account"}</h2>
              <p className="text-xs text-on-surface-variant">Tool, credentials, expiry dates, aur linked clients yahan se manage karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar sm:p-6">
          <form id="account-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative" ref={toolDropdownRef}>
                  <label className={labelClass}>Tool Name</label>
                  <input required type="text" value={form.tool_name} onFocus={() => setShowToolDropdown(true)} onChange={e => { setForm({...form, tool_name: e.target.value}); setShowToolDropdown(true); }} className={fieldClass} placeholder="ChatGPT, Canva..." />
                  {showToolDropdown && uniqueTools.filter((t:any) => t.toLowerCase().includes(form.tool_name.toLowerCase()) && t !== form.tool_name).length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-outline-variant bg-surface-lowest shadow-xl custom-scrollbar">
                      {uniqueTools.filter((t:any) => t.toLowerCase().includes(form.tool_name.toLowerCase()) && t !== form.tool_name).map(t => (
                        <div 
                          key={t as string}
                          onClick={() => {
                            setForm({...form, tool_name: t as string});
                            setShowToolDropdown(false);
                          }}
                          className="cursor-pointer border-b border-outline-variant p-2 px-3 text-sm text-on-surface hover:bg-surface-low last:border-0"
                        >
                          {t as string}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Label (Optional)</label>
                  <input type="text" value={form.label} onChange={e=>setForm({...form, label: e.target.value})} className={fieldClass} placeholder="e.g. Server 1" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Seller / Provider</label>
                  <select value={form.seller_id} onChange={e=>setForm({...form, seller_id: e.target.value})} className={fieldClass}>
                    <option value="">No seller linked</option>
                    {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Buy Price (PKR)</label>
                  <input type="number" min="0" step="0.01" value={form.buy_price} onChange={e=>setForm({...form, buy_price: Number(e.target.value)})} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Buy Date</label>
                  <input type="date" value={form.buy_date} onChange={e=>setForm({...form, buy_date: e.target.value})} className={fieldClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Tool Login / Email</label>
                  <input type="text" value={form.login_email} onChange={e=>setForm({...form, login_email: e.target.value})} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Tool Login Password</label>
                  <input type="text" value={form.login_password} onChange={e=>setForm({...form, login_password: e.target.value})} className={fieldClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Linked Mail</label>
                  <input type="text" value={form.linked_mail} onChange={e=>setForm({...form, linked_mail: e.target.value})} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Linked Mail Password</label>
                  <input type="text" value={form.linked_mail_password} onChange={e=>setForm({...form, linked_mail_password: e.target.value})} className={fieldClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Share Type</label>
                  <select value={form.share_type} onChange={e=>setForm({...form, share_type: e.target.value})} className={fieldClass}>
                    <option value="Shared">Shared</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Account Status</label>
                  <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className={fieldClass}>
                    <option value="active">Use end date</option>
                    <option value="expired">Force expired</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Total Slots</label>
                  <input required type="number" value={form.total_slots} onChange={e=>setForm({...form, total_slots: parseInt(e.target.value)})} className={fieldClass} min="1" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e=>setForm({...form, start_date: e.target.value})} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="date" value={form.end_date} onChange={e=>setForm({...form, end_date: e.target.value})} className={fieldClass} />
                </div>
              </div>

              {/* CLIENT LINKING SECTION */}
              <div className="border-t border-outline-variant pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-on-surface">Link Clients</label>
                  <span className="text-xs text-on-surface-variant">Google contacts import ke baad clients yahan milenge</span>
                </div>
                
                <div className="relative" ref={dropdownRef}>
                  <div 
                    onClick={() => setShowClientDropdown(true)}
                    className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-lowest p-2"
                  >
                    {selectedClients.length === 0 && !showClientDropdown && (
                      <span className="select-none text-sm text-on-surface-variant">Search and select clients...</span>
                    )}
                    {selectedClients.map((sc, i) => (
                      <span key={i} className="flex items-center gap-1 rounded bg-surface-container px-2 py-1 text-xs font-medium text-primary">
                        {sc.name}
                        <span className="inline-flex cursor-pointer hover:text-primary-container" onClick={(e:any) => { e.stopPropagation(); setSelectedClients(selectedClients.filter((_, idx) => idx !== i)); }}><Icon name="close" className="text-[14px]" /></span>
                      </span>
                    ))}
                    {showClientDropdown && (
                      <input 
                        autoFocus
                        type="text" 
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="min-w-[120px] flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                        placeholder="Type to search..."
                      />
                    )}
                  </div>
                  
                  {showClientDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-outline-variant bg-surface-lowest shadow-xl custom-scrollbar">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-center text-sm text-on-surface-variant">No clients found</div>
                      ) : (
                        filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectClient(c)}
                            className="cursor-pointer border-b border-outline-variant p-3 hover:bg-surface-low last:border-0"
                          >
                            <div className="text-sm font-bold text-on-surface">{c.name}</div>
                            {c.phone && <div className="text-xs text-on-surface-variant">{c.phone}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedClients.length > 0 && (
                  <div className="mt-4 rounded-lg border border-outline-variant bg-surface-low p-4">
                    <h3 className="mb-3 text-xs font-bold text-on-surface">Payment Status per Client</h3>
                    <div className="space-y-3">
                      {selectedClients.map((sc, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-1/3 truncate text-sm font-medium text-on-surface" title={sc.name}>{sc.name}</div>
                          <select 
                            value={sc.payment_status} 
                            onChange={(e) => {
                              const newArr = [...selectedClients];
                              newArr[i].payment_status = e.target.value;
                              if (e.target.value !== "pending") newArr[i].pending_amount = 0;
                              setSelectedClients(newArr);
                            }}
                            className="w-1/3 rounded border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-primary"
                          >
                            <option value="pending">Pending</option>
                            <option value="cleared">Cleared</option>
                            <option value="advance">Advance</option>
                          </select>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            aria-label={`Remaining unpaid balance for ${sc.name}`}
                            value={sc.pending_amount} 
                            onChange={(e) => {
                              const newArr = [...selectedClients];
                              newArr[i].pending_amount = Math.max(0, Number(e.target.value) || 0);
                              if (newArr[i].pending_amount > 0) newArr[i].payment_status = "pending";
                              setSelectedClients(newArr);
                            }}
                            className="w-1/3 rounded border border-outline-variant bg-surface-lowest p-2 text-xs text-on-surface outline-none focus:border-primary"
                            placeholder="Remaining balance"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={form.extra_notes} onChange={e=>setForm({...form, extra_notes: e.target.value})} className={fieldClass} rows={2} placeholder="Sharing details, special notes..." />
              </div>

            </div>
          </form>
        </div>
        <div className="flex justify-start gap-3 border-t border-outline-variant bg-surface-low p-4">
          <button form="account-form" disabled={saving} type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50">
            <Icon name={saving ? "sync" : "save"} className={`text-[18px] ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving..." : (account ? "Update Account" : "Save Account")}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant bg-surface-lowest px-6 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container">
            <Icon name="close" className="text-[18px] inline-block mr-1" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}



function BankAccountsModal({ banks, reload, onClose }: { banks: any[], reload: () => void, onClose: () => void }) {
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_title: "", details: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const res = await addBankAccount(form);
    if(res.success) {
      setForm({ bank_name: "", account_number: "", account_title: "", details: "" });
      reload();
    } else alert(res.error);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-gray-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Icon name="account_balance" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">Shared Accounts Directory</h2>
              <p className="text-xs text-gray-500">Account/number add karein, search karein, aur details copy karein.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Icon name="close" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-[500px]">
          {/* Add Form */}
          <div className="w-full overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 md:w-1/3">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Add Shared Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account / Bank Name</label>
                <input required type="text" value={form.bank_name} onChange={e=>setForm({...form, bank_name: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Meezan Bank..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account Number / IBAN</label>
                <input required type="text" value={form.account_number} onChange={e=>setForm({...form, account_number: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="0321..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Account Holder / Title</label>
                <input required type="text" value={form.account_title} onChange={e=>setForm({...form, account_title: e.target.value})} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">Details (Optional)</label>
                <textarea value={form.details} onChange={e=>setForm({...form, details: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Branch code, etc"></textarea>
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                {saving ? "Adding..." : "+ Add"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="w-full overflow-y-auto bg-white p-4 md:w-2/3">
             <div className="space-y-2">
               {banks.map(b => (
                 <div key={b.id} className="group flex justify-between items-center rounded-lg border-b border-gray-100 p-3 transition-colors hover:bg-gray-50">
                   <div>
                     <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                       <Icon name="expand_more" className="text-gray-500 text-sm" /> {b.bank_name}
                     </h4>
                     <p className="text-xs text-gray-500 pl-6">{b.account_number} • {b.account_title}</p>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <CopyButton
                       text={`${b.bank_name}\nTitle: ${b.account_title}\nAcc: ${b.account_number}`}
                       baseClassName="bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                       copiedClassName="bg-emerald-50 text-emerald-600"
                       title="Copy Info"
                       showLabel
                     />
                     <button onClick={async () => {
                       if(confirm("Delete this bank account?")) {
                         await deleteBankAccount(b.id);
                         reload();
                       }
                     }} className="rounded bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600">
                       <Icon name="delete" className="text-sm" />
                     </button>
                   </div>
                 </div>
               ))}
               {banks.length === 0 && <p className="text-center text-gray-500 text-sm py-10">No bank accounts added.</p>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
