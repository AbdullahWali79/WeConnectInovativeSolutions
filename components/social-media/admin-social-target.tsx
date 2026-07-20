"use client";

import { useState, useTransition } from "react";
import { updateSocialWeeklyTarget } from "@/app/social-media/actions";
import { Icon } from "@/components/icon";

export function AdminSocialTarget({ initialTarget }: { initialTarget: number }) {
  const [target, setTarget] = useState(initialTarget);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant bg-white p-4 shadow-card">
      <label><span className="wc-label">Posts per student / week</span><input type="number" min="1" max="20" value={target} onChange={(event) => setTarget(Number(event.target.value))} className="wc-input mt-2 w-32" /></label>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => {
        const result = await updateSocialWeeklyTarget(target);
        setMessage(result.success ? "Weekly target updated." : result.error ?? "Update failed.");
      })} className="wc-primary-btn"><Icon name="save" />{pending ? "Saving..." : "Save target"}</button>
      {message ? <p className="w-full text-sm font-semibold text-on-surface-variant">{message}</p> : null}
    </div>
  );
}
