import Image from "next/image";
import { Icon } from "@/components/icon";
import type { AITool } from "@/lib/ai-tools";

export function AIToolsGrid({ tools }: { tools: AITool[] }) {
  if (!tools.length) return <div className="wc-card py-16 text-center"><Icon name="smart_toy" className="text-5xl text-secondary" /><h2 className="mt-4 text-2xl font-black">AI tools are coming soon</h2><p className="mt-2 text-on-surface-variant">Our students and research team are curating useful tools.</p></div>;
  return <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{tools.map((tool) => <article key={tool.id} className="wc-card group overflow-hidden">
    <div className="relative aspect-[16/9] overflow-hidden bg-surface-container"><Image src={tool.image_url} alt={`${tool.name} preview`} fill className="object-cover transition duration-500 group-hover:scale-105" unoptimized /></div>
    <div className="p-5"><div className="mb-3 flex items-start justify-between gap-3"><h2 className="text-xl font-black text-on-surface">{tool.name}</h2><span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-black uppercase text-on-secondary-container">Verified</span></div>
    <p className="whitespace-pre-line text-sm leading-6 text-on-surface-variant">{tool.benefits}</p>
    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="wc-primary-btn mt-5 inline-flex text-sm"><Icon name="open_in_new" /> Explore tool</a></div>
  </article>)}</div>;
}

