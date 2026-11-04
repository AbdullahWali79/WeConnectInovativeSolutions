/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Toast, type ToastState } from "@/components/toast";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  fetchVaultItems,
  addVaultItem,
  updateVaultItem,
  deleteVaultItem,
  getVaultPin,
  setVaultPin,
} from "@/app/admin/vault/actions";
import {
  deriveKeyFromPin,
  encryptString,
  decryptString,
  generateSalt,
  hashPin,
  type EncryptedPayload,
} from "@/lib/vault-crypto";

type Category = "Password" | "Link" | "Note" | "API Key" | "General";
const CATEGORIES: Category[] = ["Password", "Link", "Note", "API Key", "General"];

type VaultEntry = { product_name: string; value: string; note: string };
type VaultItem = {
  id: string;
  category: Category;
  label: string;
  note?: string | null;
  value_enc?: EncryptedPayload | null;
  entries_enc?: EncryptedPayload | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type DecryptedItem = {
  id: string;
  category: Category;
  label: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  value: string;        // single-value categories
  entries: VaultEntry[]; // multi-entry categories
};

const MULTI_ENTRY_CATEGORIES: Category[] = ["Password", "Link"];

export function Vault() {
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);

  // PIN / unlock state
  const [hasPin, setHasPin] = useState<boolean | null>(null); // null = unknown
  const [unlocked, setUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Data
  const [items, setItems] = useState<VaultItem[]>([]);
  const [decrypted, setDecrypted] = useState<DecryptedItem[]>([]);

  // UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<DecryptedItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [showValues, setShowValues] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const pinRes = await getVaultPin();
      if (pinRes.success) {
        setHasPin(Boolean(pinRes.pin));
      }
      setLoading(false);
    })();
  }, []);

  // --- Unlock flow ---------------------------------------------------------

  const handleUnlock = useCallback(async () => {
    setPinError("");
    if (!pinInput.trim()) {
      setPinError("Enter your PIN");
      return;
    }
    const pinRes = await getVaultPin();
    if (!pinRes.success || !pinRes.pin) {
      setPinError("No PIN set yet.");
      return;
    }
    const { pin_hash, pin_salt, key_salt } = pinRes.pin;
    const candidateHash = await hashPin(pinInput.trim(), pin_salt);
    if (candidateHash !== pin_hash) {
      setPinError("Wrong PIN. Try again.");
      setPinInput("");
      return;
    }
    const key = await deriveKeyFromPin(pinInput.trim(), key_salt);
    setCryptoKey(key);
    setUnlocked(true);
    setPinInput("");
    await loadItems(key);
  }, [pinInput]);

  const handleLock = useCallback(() => {
    setUnlocked(false);
    setCryptoKey(null);
    setItems([]);
    setDecrypted([]);
    setShowValues(false);
  }, []);

  // First-time PIN setup / change PIN
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleSetupPin = useCallback(async (pin: string) => {
    if (pin.length < 4) {
      setToast({ type: "error", message: "PIN must be at least 4 digits." });
      return null;
    }
    const pinSalt = generateSalt();
    const keySalt = generateSalt();
    const pinHash = await hashPin(pin, pinSalt);
    const res = await setVaultPin(pinHash, pinSalt, keySalt);
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to set PIN." });
      return null;
    }
    setHasPin(true);
    const key = await deriveKeyFromPin(pin, keySalt);
    setCryptoKey(key);
    setUnlocked(true);
    setToast({ type: "success", message: "Vault PIN set and unlocked." });
    return key;
  }, []);

  const handleChangePin = useCallback(async (oldPin: string, newPin: string) => {
    const pinRes = await getVaultPin();
    if (!pinRes.success || !pinRes.pin) {
      setToast({ type: "error", message: "No PIN set." });
      return false;
    }
    const candidateHash = await hashPin(oldPin, pinRes.pin.pin_salt);
    if (candidateHash !== pinRes.pin.pin_hash) {
      setToast({ type: "error", message: "Current PIN is wrong." });
      return false;
    }
    if (newPin.length < 4) {
      setToast({ type: "error", message: "New PIN must be at least 4 digits." });
      return false;
    }
    // Re-derive old key, decrypt everything, then re-encrypt with new key.
    const oldKey = await deriveKeyFromPin(oldPin, pinRes.pin.key_salt);
    const newPinSalt = generateSalt();
    const newKeySalt = generateSalt();
    const newPinHash = await hashPin(newPin, newPinSalt);
    const newKey = await deriveKeyFromPin(newPin, newKeySalt);

    const refreshed = await Promise.all(
      items.map(async (it) => {
        const updates: any = {};
        if (it.value_enc) {
          const plain = await decryptString(it.value_enc, oldKey);
          updates.value_enc = await encryptString(plain, newKey);
        }
        if (it.entries_enc) {
          const plain = await decryptString(it.entries_enc, oldKey);
          updates.entries_enc = await encryptString(plain, newKey);
        }
        if (Object.keys(updates).length) {
          await updateVaultItem(it.id, updates);
        }
        return { ...it, ...updates } as VaultItem;
      }),
    );
    setItems(refreshed);
    await setVaultPin(newPinHash, newPinSalt, newKeySalt);
    setCryptoKey(newKey);
    setToast({ type: "success", message: "PIN changed. All items re-encrypted." });
    return true;
  }, [items]);

  // --- Data loading / decryption ------------------------------------------

  async function loadItems(key: CryptoKey) {
    setLoading(true);
    const res = await fetchVaultItems();
    if (!res.success) {
      setToast({ type: "error", message: res.error || "Failed to load vault" });
      setLoading(false);
      return;
    }
    const raw = (res.items || []) as VaultItem[];
    setItems(raw);
    const dec: DecryptedItem[] = [];
    for (const it of raw) {
      try {
        let value = "";
        let entries: VaultEntry[] = [];
        if (MULTI_ENTRY_CATEGORIES.includes(it.category) && it.entries_enc) {
          entries = JSON.parse(await decryptString(it.entries_enc, key));
        } else if (it.value_enc) {
          value = await decryptString(it.value_enc, key);
        }
        dec.push({
          id: it.id,
          category: it.category,
          label: it.label,
          note: it.note || "",
          is_pinned: it.is_pinned,
          created_at: it.created_at,
          updated_at: it.updated_at,
          value,
          entries,
        });
      } catch {
        // skip items that fail to decrypt
      }
    }
    setDecrypted(dec);
    // default: collapse each item card
    const map: Record<string, boolean> = {};
    dec.forEach((d) => { map[d.id] = true; });
    setCollapsedMap(map);
    setLoading(false);
  }

  // --- Item CRUD -----------------------------------------------------------

  const handleSaveItem = useCallback(
    async (form: {
      category: Category;
      label: string;
      note: string;
      value: string;
      entries: VaultEntry[];
    }) => {
      if (!cryptoKey) {
        setToast({ type: "error", message: "Vault is locked." });
        return false;
      }
      if (!form.label.trim()) {
        setToast({ type: "error", message: "Label is required." });
        return false;
      }
      const isMulti = MULTI_ENTRY_CATEGORIES.includes(form.category);
      const payload: any = {
        category: form.category,
        label: form.label.trim(),
        note: form.note || null,
        is_pinned: false,
      };
      if (isMulti) {
        const clean = form.entries.filter((e) => e.product_name.trim() || e.value.trim());
        if (!clean.length) {
          setToast({ type: "error", message: "Add at least one entry." });
          return false;
        }
        payload.entries_enc = await encryptString(JSON.stringify(clean), cryptoKey);
        payload.value_enc = null;
      } else {
        if (!form.value.trim()) {
          setToast({ type: "error", message: "Value is required." });
          return false;
        }
        payload.value_enc = await encryptString(form.value, cryptoKey);
        payload.entries_enc = null;
      }

      if (editData?.id) {
        const res = await updateVaultItem(editData.id, payload);
        if (!res.success) {
          setToast({ type: "error", message: res.error || "Update failed." });
          return false;
        }
        setToast({ type: "success", message: "Vault item updated." });
      } else {
        const res = await addVaultItem(payload);
        if (!res.success) {
          setToast({ type: "error", message: res.error || "Save failed." });
          return false;
        }
        setToast({ type: "success", message: "Vault item saved." });
      }
      await loadItems(cryptoKey);
      return true;
    },
    [cryptoKey, editData],
  );

  const handleTogglePin = useCallback(
    async (item: DecryptedItem) => {
      await updateVaultItem(item.id, { is_pinned: !item.is_pinned });
      if (cryptoKey) await loadItems(cryptoKey);
    },
    [cryptoKey],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this vault item? This cannot be undone.")) return;
      await deleteVaultItem(id);
      if (cryptoKey) await loadItems(cryptoKey);
      setToast({ type: "success", message: "Item deleted." });
    },
    [cryptoKey],
  );

  const toggleCollapse = (id: string) => setCollapsedMap((p) => ({ ...p, [id]: !p[id] }));
  const collapseAll = () => {
    const map: Record<string, boolean> = {};
    filtered.forEach((d) => { map[d.id] = true; });
    setCollapsedMap(map);
  };
  const expandAll = () => setCollapsedMap({});

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ type: "success", message: "Copied to clipboard!" });
  };

  // --- Derived / filtered list --------------------------------------------

  const filtered = useMemo(() => {
    return decrypted.filter((d) => {
      if (showPinnedOnly && !d.is_pinned) return false;
      if (categoryFilter !== "All" && d.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const inLabel = d.label.toLowerCase().includes(q);
        const inNote = d.note.toLowerCase().includes(q);
        const inEntries = d.entries.some(
          (e) => e.product_name.toLowerCase().includes(q) || e.value.toLowerCase().includes(q) || e.note.toLowerCase().includes(q),
        );
        const inValue = d.value.toLowerCase().includes(q);
        return inLabel || inNote || inEntries || inValue;
      }
      return true;
    });
  }, [decrypted, categoryFilter, search, showPinnedOnly]);

  const grouped = useMemo(() => {
    const map = new Map<Category, DecryptedItem[]>();
    filtered.forEach((d) => {
      const arr = map.get(d.category) || [];
      arr.push(d);
      map.set(d.category, arr);
    });
    return CATEGORIES.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [filtered]);

  const pinned = useMemo(() => decrypted.filter((d) => d.is_pinned), [decrypted]);

  // --- Render: loading -----------------------------------------------------

  if (loading && hasPin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm text-gray-500">Loading vault...</p>
        </div>
      </div>
    );
  }

  // --- Render: no PIN yet → setup -----------------------------------------

  if (!hasPin || showPinSetup) {
    return (
      <>
        <Toast toast={toast} onClear={() => setToast(null)} />
        <PinSetupScreen
          onSet={async (pin) => {
            const key = await handleSetupPin(pin);
            if (key) {
              setShowPinSetup(false);
              await loadItems(key);
            }
          }}
        />
      </>
    );
  }

  // --- Render: locked ------------------------------------------------------

  if (!unlocked) {
    return (
      <>
        <Toast toast={toast} onClear={() => setToast(null)} />
        <LockScreen
          pin={pinInput}
          setPin={setPinInput}
          error={pinError}
          onUnlock={handleUnlock}
          onForgot={() => setToast({ type: "info", message: "Contact your DB admin to reset the vault PIN." })}
        />
      </>
    );
  }

  // --- Render: unlocked vault ---------------------------------------------

  return (
    <div className="p-4 md:p-6 space-y-3.5 max-w-7xl mx-auto">
      <Toast toast={toast} onClear={() => setToast(null)} />

      {/* Header */}
      <div className="rounded-xl bg-primary px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Icon name="shield" className="text-amber-400 text-[20px]" />
            My Vault
          </h1>
          <p className="text-xs text-blue-100/90 mt-0.5">
            {decrypted.length} saved {decrypted.length === 1 ? "item" : "items"} · PIN-protected · encrypted
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Expand all"
          >
            <Icon name="unfold_more" className="text-[15px]" /> Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Collapse all"
          >
            <Icon name="unfold_less" className="text-[15px]" /> Collapse All
          </button>
          <button
            type="button"
            onClick={() => setShowPinSetup(true)}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Change PIN"
          >
            <Icon name="key" className="text-[15px]" /> Change PIN
          </button>
          <button
            type="button"
            onClick={handleLock}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Lock vault"
          >
            <Icon name="lock" className="text-[15px]" /> Lock
          </button>
          <button
            onClick={() => { setEditData(null); setIsModalOpen(true); }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="add" className="text-[16px]" /> Add Item
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-2 sm:p-2.5 flex flex-col sm:flex-row gap-2 items-center shadow-2xs">
        <div className="relative flex-1 w-full">
          <Icon name="search" className="absolute left-3 top-2 text-gray-400 text-[18px]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            className="w-full bg-gray-50/70 hover:bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-9 pr-8 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowValues((v) => !v)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0",
            showValues ? "bg-emerald-500 text-white border-emerald-600" : "bg-gray-50 hover:bg-emerald-50/60 text-gray-700 border-gray-200 hover:border-emerald-300",
          )}
          title={showValues ? "Hide values" : "Show values"}
        >
          <Icon name={showValues ? "visibility" : "visibility_off"} className="text-[16px]" />
          {showValues ? "Show" : "Hide"}
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
        <button
          type="button"
          onClick={() => { setCategoryFilter("All"); setShowPinnedOnly(false); }}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            categoryFilter === "All" && !showPinnedOnly ? "bg-primary text-white shadow-2xs" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
          )}
        >
          All ({decrypted.length})
        </button>
        <button
          type="button"
          onClick={() => { setShowPinnedOnly((v) => !v); setCategoryFilter("All"); }}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer",
            showPinnedOnly ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-gray-600 border border-gray-200 hover:bg-amber-50/50 hover:border-amber-300",
          )}
        >
          <Icon name="push_pin" className="text-[13px]" /> Pinned ({pinned.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = decrypted.filter((d) => d.category === c).length;
          if (!count) return null;
          const isActive = categoryFilter === c && !showPinnedOnly;
          return (
            <button
              key={c}
              type="button"
              onClick={() => { setCategoryFilter(c); setShowPinnedOnly(false); }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                isActive ? "bg-primary text-white shadow-2xs" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
              )}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Main layout: list + pinned sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* List */}
        <div className="space-y-4 min-w-0">
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-xs">Loading vault items...</div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Icon name={search || categoryFilter !== "All" || showPinnedOnly ? "search_off" : "lock"} className="text-4xl text-amber-400 mb-2 inline-block" />
              <p className="font-semibold text-gray-700 text-sm">
                {search || categoryFilter !== "All" || showPinnedOnly ? "No matching items." : "Your vault is empty."}
              </p>
              {!search && categoryFilter === "All" && !showPinnedOnly && (
                <button
                  onClick={() => { setEditData(null); setIsModalOpen(true); }}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="add" className="text-[16px]" /> Add your first item
                </button>
              )}
            </div>
          ) : (
            grouped.map((group) => (
              <VaultGroup
                key={group.category}
                category={group.category}
                items={group.items}
                collapsedMap={collapsedMap}
                onToggleCollapse={toggleCollapse}
                onCopy={handleCopy}
                onTogglePin={handleTogglePin}
                onEdit={(d) => { setEditData(d); setIsModalOpen(true); }}
                onDelete={handleDelete}
                showValues={showValues}
              />
            ))
          )}
        </div>

        {/* Pinned sidebar */}
        <div className="hidden lg:block sticky top-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Icon name="push_pin" className="text-[16px] text-amber-400" /> Pinned
              </span>
              <span className="text-[10px] text-blue-100/80 font-medium">{pinned.length} quick rows</span>
            </div>
            <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
              {pinned.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">Pin items for quick access.</p>
              ) : (
                pinned.map((p) => (
                  <PinnedCard key={p.id} item={p} onCopy={handleCopy} onTogglePin={() => handleTogglePin(p)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <VaultItemModal
          editData={editData}
          onClose={() => setIsModalOpen(false)}
          onSave={async (form) => {
            const ok = await handleSaveItem(form);
            if (ok) setIsModalOpen(false);
          }}
        />
      )}

      {showPinSetup && hasPin && (
        <ChangePinModal
          onCancel={() => setShowPinSetup(false)}
          onChange={async (oldPin, newPin) => {
            const ok = await handleChangePin(oldPin, newPin);
            if (ok) setShowPinSetup(false);
            return ok;
          }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

const CATEGORY_COLORS: Record<Category, string> = {
  Password: "emerald",
  Link: "blue",
  Note: "amber",
  "API Key": "purple",
  General: "gray",
};

const COLOR_CLASSES: Record<string, { badge: string; dot: string }> = {
  emerald: { badge: "bg-emerald-50 text-emerald-800 border-emerald-200/60", dot: "bg-emerald-500" },
  blue: { badge: "bg-blue-50 text-blue-800 border-blue-200/60", dot: "bg-blue-500" },
  amber: { badge: "bg-amber-50 text-amber-800 border-amber-200/60", dot: "bg-amber-500" },
  purple: { badge: "bg-purple-50 text-purple-800 border-purple-200/60", dot: "bg-purple-500" },
  gray: { badge: "bg-gray-100 text-gray-700 border-gray-200/60", dot: "bg-gray-500" },
};

function VaultGroup({
  category,
  items,
  collapsedMap,
  onToggleCollapse,
  onCopy,
  onTogglePin,
  onEdit,
  onDelete,
  showValues,
}: {
  category: Category;
  items: DecryptedItem[];
  collapsedMap: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  onCopy: (text: string) => void;
  onTogglePin: (item: DecryptedItem) => void;
  onEdit: (d: DecryptedItem) => void;
  onDelete: (id: string) => void;
  showValues: boolean;
}) {
  const [groupHidden, setGroupHidden] = useState(false);
  const color = COLOR_CLASSES[CATEGORY_COLORS[category]];

  if (groupHidden) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => setGroupHidden(false)}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", color.dot)} />
            <span className="text-xs font-bold tracking-wider uppercase text-gray-600">{category}</span>
            <span className="text-[11px] text-gray-400">({items.length})</span>
          </span>
          <span className="text-xs text-primary font-semibold flex items-center gap-1">
            Show <Icon name="expand_more" className="text-[16px]" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", color.dot)} />
          <span className="text-xs font-bold tracking-wider uppercase text-gray-600">{category}</span>
          <span className="text-[11px] text-gray-400">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
        </span>
        <button
          type="button"
          onClick={() => setGroupHidden(true)}
          className="text-xs text-gray-400 hover:text-gray-600 font-semibold flex items-center gap-0.5 cursor-pointer"
        >
          Hide <Icon name="expand_less" className="text-[15px]" />
        </button>
      </div>
      {items.map((item) => (
        <VaultItemCard
          key={item.id}
          item={item}
          collapsed={Boolean(collapsedMap[item.id])}
          onToggleCollapse={() => onToggleCollapse(item.id)}
          onCopy={onCopy}
          onTogglePin={() => onTogglePin(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          showValues={showValues}
        />
      ))}
    </div>
  );
}

function maskValue(value: string, visible: boolean): string {
  if (visible || !value) return value;
  if (value.length <= 4) return "•".repeat(value.length);
  return value.slice(0, 2) + "•".repeat(Math.min(value.length - 4, 10)) + value.slice(-2);
}

function VaultItemCard({
  item,
  collapsed,
  onToggleCollapse,
  onCopy,
  onTogglePin,
  onEdit,
  onDelete,
  showValues,
}: {
  item: DecryptedItem;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCopy: (text: string) => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showValues: boolean;
}) {
  const color = COLOR_CLASSES[CATEGORY_COLORS[item.category]];
  const isMulti = MULTI_ENTRY_CATEGORIES.includes(item.category);

  return (
    <div className="bg-white border border-gray-200/90 rounded-xl p-3.5 flex flex-col relative shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={onToggleCollapse}>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={cn("text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase", color.badge)}>
              {item.category}
            </span>
            {isMulti && (
              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                {item.entries.length} {item.entries.length === 1 ? "entry" : "entries"}
              </span>
            )}
            {item.is_pinned && <Icon name="push_pin" className="text-[14px] text-amber-500" />}
          </div>
          <h3 className="text-sm font-bold leading-snug text-gray-900">{item.label}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            title={item.is_pinned ? "Unpin" : "Pin for quick access"}
            className={cn("p-1 rounded-md transition-colors cursor-pointer", item.is_pinned ? "text-amber-500 hover:bg-amber-50" : "text-gray-400 hover:text-amber-500 hover:bg-gray-100")}
          >
            <Icon name={item.is_pinned ? "push_pin" : "push_pin"} className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{collapsed ? "Show" : "Hide"}</span>
            <Icon name={collapsed ? "expand_more" : "expand_less"} className="text-[16px]" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2">
            {isMulti ? (
              item.entries.map((entry, i) => (
                <div key={i} className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-2.5">
                  {entry.product_name && (
                    <div className="text-[11px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                      <Icon name="label" className="text-[13px] text-gray-400" /> {entry.product_name}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <code className={cn("flex-1 text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1 truncate", !showValues && "text-gray-400")}>
                      {maskValue(entry.value, showValues)}
                    </code>
                    <button
                      type="button"
                      onClick={() => onCopy(entry.value)}
                      className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer"
                      title="Copy"
                    >
                      <Icon name="content_copy" className="text-[15px]" />
                    </button>
                    {item.category === "Link" && (
                      <button
                        type="button"
                        onClick={() => window.open(entry.value, "_blank")}
                        className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer"
                        title="Open"
                      >
                        <Icon name="open_in_new" className="text-[15px]" />
                      </button>
                    )}
                  </div>
                  {entry.note && <p className="text-[11px] text-gray-500 mt-1.5">{entry.note}</p>}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5">
                <code className={cn("flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1.5 truncate", !showValues && "text-gray-400")}>
                  {maskValue(item.value, showValues)}
                </code>
                <button
                  type="button"
                  onClick={() => onCopy(item.value)}
                  className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer"
                  title="Copy"
                >
                  <Icon name="content_copy" className="text-[15px]" />
                </button>
                {item.category === "Link" && (
                  <button
                    type="button"
                    onClick={() => window.open(item.value, "_blank")}
                    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer"
                    title="Open"
                  >
                    <Icon name="open_in_new" className="text-[15px]" />
                  </button>
                )}
              </div>
            )}
            {item.note && !isMulti && <p className="text-[11px] text-gray-500">{item.note}</p>}
          </div>

          <div className="flex gap-1.5 justify-end border-t border-gray-100 pt-2 mt-2">
            <button
              onClick={onEdit}
              className="px-2.5 py-1 rounded-md text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Icon name="edit" className="text-[14px]" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="px-2.5 py-1 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Icon name="delete" className="text-[14px]" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PinnedCard({ item, onCopy, onTogglePin }: { item: DecryptedItem; onCopy: (text: string) => void; onTogglePin: () => void }) {
  const color = COLOR_CLASSES[CATEGORY_COLORS[item.category]];
  const preview = useMemo(() => {
    if (MULTI_ENTRY_CATEGORIES.includes(item.category)) {
      const first = item.entries[0];
      return first ? `${first.product_name ? first.product_name + ": " : ""}${first.value}` : "";
    }
    return item.value;
  }, [item]);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={cn("text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase", color.badge)}>
          {item.category}
        </span>
        <button type="button" onClick={onTogglePin} className="text-amber-500 hover:text-amber-600 cursor-pointer" title="Unpin">
          <Icon name="push_pin" className="text-[14px]" />
        </button>
      </div>
      <p className="text-xs font-bold text-gray-800 truncate" title={item.label}>{item.label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <code className="flex-1 text-[10px] font-mono text-gray-500 truncate">{preview}</code>
        <button
          type="button"
          onClick={() => onCopy(MULTI_ENTRY_CATEGORIES.includes(item.category) ? item.entries[0]?.value || "" : item.value)}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Copy"
        >
          <Icon name="content_copy" className="text-[13px]" />
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Modals
// ===========================================================================

function VaultItemModal({
  editData,
  onClose,
  onSave,
}: {
  editData: DecryptedItem | null;
  onClose: () => void;
  onSave: (form: { category: Category; label: string; note: string; value: string; entries: VaultEntry[] }) => Promise<void>;
}) {
  const [category, setCategory] = useState<Category>(editData?.category || "Password");
  const [label, setLabel] = useState(editData?.label || "");
  const [note, setNote] = useState(editData?.note || "");
  const [value, setValue] = useState(editData?.value || "");
  const [entries, setEntries] = useState<VaultEntry[]>(editData?.entries?.length ? editData.entries : [{ product_name: "", value: "", note: "" }]);
  const [showValues, setShowValues] = useState(false);
  const [saving, setSaving] = useState(false);

  const isMulti = MULTI_ENTRY_CATEGORIES.includes(category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ category, label, note, value, entries });
    setSaving(false);
  };

  const addEntry = () => setEntries([...entries, { product_name: "", value: "", note: "" }]);
  const updateEntry = (i: number, field: keyof VaultEntry, v: string) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: v };
    setEntries(next);
  };
  const removeEntry = (i: number) => {
    if (entries.length > 1) setEntries(entries.filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Icon name="shield" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-gray-900">{editData ? "Edit Vault Item" : "Add Vault Item"}</h2>
              <p className="text-xs text-gray-500">Client name ya label save karein. Password aur link categories me aik item ke neeche multiple entries add kar sakte hain.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer">
            <Icon name="close" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="vault-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                      category === c ? COLOR_CLASSES[CATEGORY_COLORS[c]].badge + " ring-2 ring-offset-1 ring-emerald-300" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Label *</label>
              <input
                required
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                placeholder={isMulti ? "e.g. Client Name" : "e.g. Gmail Password"}
              />
            </div>

            {/* Value / Entries */}
            {isMulti ? (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">
                      {category === "Password" ? "Passwords" : "Links"} *
                    </h3>
                    <p className="text-xs text-gray-500">Har row me product name, {category === "Password" ? "password" : "link"} aur usi product ka note save hoga.</p>
                  </div>
                  <button type="button" onClick={addEntry} className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer">
                    <Icon name="add" className="text-[16px]" /> Add {category === "Password" ? "Password" : "Link"}
                  </button>
                </div>
                <div className="space-y-3">
                  {entries.map((entry, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 relative">
                      {entries.length > 1 && (
                        <button type="button" onClick={() => removeEntry(i)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer">
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      )}
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Product name ({i + 1})</label>
                      <input
                        type="text"
                        value={entry.product_name}
                        onChange={(e) => updateEntry(i, "product_name", e.target.value)}
                        className="mb-2 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                        placeholder={`Product name (${i + 1})`}
                      />
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">{category === "Password" ? "Password" : "Link"} ({i + 1})</label>
                      <div className="relative">
                        <input
                          type={showValues ? "text" : "password"}
                          value={entry.value}
                          onChange={(e) => updateEntry(i, "value", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 pr-10 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                          placeholder={`${category === "Password" ? "Password" : "Link"} (${i + 1})`}
                        />
                        <button type="button" onClick={() => setShowValues((v) => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer">
                          <Icon name={showValues ? "visibility" : "visibility_off"} className="text-[18px]" />
                        </button>
                      </div>
                      <label className="block text-[11px] font-bold text-gray-600 mt-2 mb-1">Product note</label>
                      <textarea
                        value={entry.note}
                        onChange={(e) => updateEntry(i, "note", e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 resize-none"
                        placeholder="Product note..."
                      />
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2.5 w-max">
                  <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} className="rounded bg-white border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Icon name={showValues ? "visibility" : "visibility_off"} className="text-[15px]" /> Show {category === "Password" ? "passwords" : "links"}
                  </span>
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Value *</label>
                <div className="relative">
                  <input
                    required
                    type={category === "Link" ? "text" : showValues ? "text" : "password"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 pr-10 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter value"
                  />
                  {category !== "Link" && (
                    <button type="button" onClick={() => setShowValues((v) => !v)} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer">
                      <Icon name={showValues ? "visibility" : "visibility_off"} className="text-[18px]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="Optional note..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button type="submit" form="vault-form" disabled={saving} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 cursor-pointer">
            <Icon name="save" className="text-[18px]" /> {saving ? "Saving..." : editData ? "Save" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
            <Icon name="close" className="text-[18px]" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Lock screen + PIN setup / change
// ===========================================================================

function LockScreen({
  pin,
  setPin,
  error,
  onUnlock,
  onForgot,
}: {
  pin: string;
  setPin: (v: string) => void;
  error: string;
  onUnlock: () => void;
  onForgot: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Icon name="key" className="text-white text-[32px]" />
          </div>
          <h2 className="text-lg font-bold text-white">Enter Vault PIN</h2>
          <p className="text-xs text-emerald-100 mt-1">Enter your PIN to access the vault.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onUnlock(); }}
          className="p-6 space-y-4"
        >
          <div>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Enter PIN"
            />
            {error && <p className="text-xs text-red-600 mt-2 font-semibold">{error}</p>}
          </div>
          <button type="submit" className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold transition-colors cursor-pointer">
            Unlock
          </button>
          <button type="button" onClick={onForgot} className="w-full text-xs text-gray-400 hover:text-gray-600 font-semibold cursor-pointer">
            Forgot PIN?
          </button>
        </form>
      </div>
    </div>
  );
}

function PinSetupScreen({
  onSet,
}: {
  onSet: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    if (pin !== confirm) { setError("PINs do not match."); return; }
    setBusy(true);
    await onSet(pin);
    setBusy(false);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Icon name="shield_locked" className="text-white text-[32px]" />
          </div>
          <h2 className="text-lg font-bold text-white">Set Vault PIN</h2>
          <p className="text-xs text-emerald-100 mt-1">Choose a PIN to protect your personal vault. This PIN encrypts your secrets — only you can unlock them.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">New PIN</label>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="••••"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer">
            {busy ? "Setting up..." : "Set PIN & Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePinModal({
  onChange,
  onCancel,
}: {
  onChange: (oldPin: string, newPin: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPin.length < 4) { setError("New PIN must be at least 4 digits."); return; }
    if (newPin !== confirm) { setError("New PINs do not match."); return; }
    setBusy(true);
    await onChange(oldPin, newPin);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center border-b border-gray-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Icon name="key" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Change Vault PIN</h2>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer">
            <Icon name="close" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Current PIN</label>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-center text-lg tracking-[0.5em] text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="••••"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer">
              {busy ? "Changing..." : "Change PIN"}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">All existing items will be re-encrypted with the new PIN. Don&apos;t forget your new PIN — there is no recovery.</p>
        </form>
      </div>
    </div>
  );
}
