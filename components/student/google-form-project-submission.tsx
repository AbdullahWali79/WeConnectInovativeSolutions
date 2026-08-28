import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";

export function GoogleFormProjectSubmission({ title, instructions, formUrl }: { title: string; instructions?: string | null; formUrl: string }) {
  return <div className="space-y-6">
    <PageHeader eyebrow="Projects" title={title} description={instructions || "Complete and submit the project form below."} />
    <div className="wc-card flex gap-3 p-4 text-sm text-on-surface-variant"><Icon name="info" className="shrink-0 text-primary" /><p>Submit the form once for each project. Your response is saved directly in the admin Google Form responses.</p></div>
    <section className="wc-card overflow-hidden"><iframe src={formUrl} title={title} className="h-[calc(100vh-180px)] min-h-[760px] w-full border-0" loading="eager">Loading Google Form…</iframe></section>
  </div>;
}
