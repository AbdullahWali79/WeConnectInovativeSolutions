"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { normalizeWhatsappPhone } from "@/lib/utils";

export function SubadminMessageDialog({
  open,
  teacherName,
  email,
  phone,
  message,
  hasPassword,
  featureLabels = [],
  onClose,
}: {
  open: boolean;
  teacherName: string;
  email: string;
  phone: string | null;
  message: string;
  hasPassword?: boolean;
  featureLabels?: string[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = useMemo(() => {
    const normalized = normalizeWhatsappPhone(phone);
    return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
  }, [message, phone]);
  const mailUrl = `mailto:${email}?subject=${encodeURIComponent("WeConnect Teacher Account Login Details")}&body=${encodeURIComponent(message)}`;

  if (!open) return null;

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-outline-variant/70 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label-sm text-primary">Login message</p>
              <h2 className="mt-1 text-title-lg text-on-surface">{teacherName}</h2>
              {hasPassword ? (
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">Plain password is available only in this message.</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-primary"
              title="Close"
            >
              <Icon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {featureLabels.length > 0 ? (
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Selected features</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {featureLabels.map((label) => (
                  <span key={label} className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-bold text-on-secondary-fixed">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-on-surface">{message}</pre>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={copyMessage} className="wc-primary-btn w-full">
              <Icon name={copied ? "done" : "content_copy"} className="text-lg" />
              {copied ? "Copied" : "Copy Message"}
            </button>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="wc-secondary-btn w-full">
                <Icon name="forum" className="text-lg" />
                WhatsApp
              </a>
            ) : (
              <button type="button" disabled className="wc-secondary-btn w-full">
                <Icon name="forum" className="text-lg" />
                WhatsApp
              </button>
            )}
            <a href={mailUrl} className="wc-secondary-btn w-full">
              <Icon name="mail" className="text-lg" />
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
