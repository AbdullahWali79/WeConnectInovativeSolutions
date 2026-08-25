import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { AIToolsGrid } from "@/components/ai-tools/ai-tools-grid";
import { getApprovedAITools } from "@/lib/ai-tools";

export const metadata: Metadata = { title: "Latest AI Tools | WeConnect", description: "Discover useful AI tools researched and verified by the WeConnect learning community." };
export const revalidate = 300;
export default async function AIToolsPage() {
  const tools = await getApprovedAITools().catch(() => []);
  return <><PublicHeader /><main className="min-h-screen bg-background px-4 pb-20 pt-36 text-on-background"><section className="mx-auto max-w-7xl"><div className="mx-auto mb-12 max-w-3xl text-center"><span className="rounded-full bg-secondary-container px-4 py-2 text-xs font-black uppercase tracking-widest text-on-secondary-container">Community Research</span><h1 className="mt-5 text-4xl font-black md:text-6xl">Latest AI Tools</h1><p className="mt-4 text-lg leading-8 text-on-surface-variant">Student-discovered and admin-verified tools to help you learn, create, research, and work smarter.</p></div><AIToolsGrid tools={tools} /></section></main></>;
}

