"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { Blog } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/image-url";

export function BlogsList({ blogs }: { blogs: Blog[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");

  const tags = useMemo(() => Array.from(new Set(blogs.flatMap((blog) => blog.tags ?? []))).sort(), [blogs]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return blogs.filter((blog) => {
      const matchesQuery = !term || `${blog.title} ${blog.target_keyword ?? ""} ${blog.excerpt ?? ""}`.toLowerCase().includes(term);
      const matchesTag = tag === "all" || (blog.tags ?? []).includes(tag);
      return matchesQuery && matchesTag;
    });
  }, [blogs, query, tag]);

  return (
    <section className="relative bg-[var(--wc-bg)] py-12 md:py-20">
      <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
        <div className="mb-8 grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--wc-on-surface-variant)]" />
            <input
              className="h-14 w-full rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] pl-12 pr-4 text-on-surface outline-none transition focus:border-[var(--wc-secondary)]/50"
              placeholder="Search by title or keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="h-14 rounded-2xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] px-4 font-bold text-on-surface outline-none transition focus:border-[var(--wc-secondary)]/50"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          >
            <option value="all">All Tags</option>
            {tags.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center">
            <Icon name="article" className="mx-auto text-5xl text-[var(--wc-on-surface-variant)]" />
            <h2 className="mt-5 text-2xl font-black text-on-surface">No blogs found</h2>
            <p className="mt-2 text-[var(--wc-on-surface-variant)]">Try a different search or tag.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((blog) => {
              const coverImageUrl = normalizeImageUrl(blog.cover_image_cdn_url ?? blog.cover_image_url);
              return (
              <Link key={blog.id} href={`/blogs/${blog.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/70 shadow-[0_0_50px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[var(--wc-secondary)]/35">
                <div className="aspect-[16/10] bg-[var(--wc-surface-low)]">
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImageUrl} alt={blog.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#071A3B] text-[var(--wc-secondary)]"><Icon name="article" className="text-5xl" /></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{formatDate(blog.published_at)}</span>
                    {blog.featured ? <span className="rounded-full bg-[var(--wc-secondary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--wc-secondary)]">Featured</span> : null}
                  </div>
                  <h2 className="text-xl font-black leading-tight text-on-surface transition group-hover:text-[var(--wc-secondary)]">{blog.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[var(--wc-on-surface-variant)] line-clamp-2">{blog.excerpt}</p>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

