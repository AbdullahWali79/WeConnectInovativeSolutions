import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { BlogsList } from "@/components/public/blogs-list";
import { Icon } from "@/components/icon";
import { getBlogs } from "@/lib/blogs";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blogs | WeConnect-Innovation",
  description: "Insights, training guides, and software industry updates from WeConnect-Innovation.",
};

export default async function BlogsPage() {
  const blogs = await getBlogs({ publishedOnly: true }).catch((error) => {
    console.error("Error loading blogs:", error);
    return [];
  });

  return (
    <main className="min-h-screen bg-[#030B1C] text-white">
      <PublicHeader />
      <section className="relative overflow-hidden bg-[#030B1C] pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),transparent)]" />
        <div className="relative mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
              <Icon name="article" className="text-sm" /> WeConnect Blog
            </div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl md:text-6xl">Practical Guides For Modern Careers</h1>
            <p className="mt-6 text-lg leading-8 text-[#91A3C7]">
              Read training notes, client-hunting lessons, software insights, and practical growth playbooks from the WeConnect team.
            </p>
          </div>
        </div>
      </section>
      <BlogsList blogs={blogs} />
    </main>
  );
}
