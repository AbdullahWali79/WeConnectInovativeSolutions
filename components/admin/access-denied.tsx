import Link from "next/link";
import { Icon } from "@/components/icon";

export function AccessDenied({
  title = "Access denied",
  description = "Your account does not have permission to open this admin module.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-2 py-8">
      <section className="wc-card w-full max-w-xl overflow-hidden">
        <div className="border-b border-outline-variant/70 bg-surface-container-low px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-error-container text-error">
              <Icon name="lock" className="text-2xl" />
            </span>
            <div className="min-w-0">
              <p className="text-label-sm text-primary">Permission required</p>
              <h1 className="mt-1 break-words text-title-lg text-on-surface">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <Link href="/admin" className="wc-primary-btn w-full">
            <Icon name="dashboard" className="text-lg" />
            Dashboard
          </Link>
          <Link href="/login" className="wc-secondary-btn w-full">
            <Icon name="login" className="text-lg" />
            Switch Account
          </Link>
        </div>
      </section>
    </div>
  );
}
