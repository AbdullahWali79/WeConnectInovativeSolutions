"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { deleteSocialPost, refreshSocialPostPreview, toggleSocialReaction } from "@/app/social-media/actions";
import { reactionOptions, type SocialMediaPost, type SocialMediaReaction, type SocialReactionType } from "@/lib/social-media";

type FeedPost = SocialMediaPost & { authorName: string };

export function SocialFeed({ posts, reactions, currentUserId, canDelete = false }: { posts: FeedPost[]; reactions: SocialMediaReaction[]; currentUserId: string; canDelete?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [localReactions, setLocalReactions] = useState(reactions);
  const [visiblePosts, setVisiblePosts] = useState(posts);

  function react(postId: string, type: SocialReactionType) {
    if (pending) return;
    const previous = localReactions;
    const mine = previous.find((item) => item.post_id === postId && item.user_id === currentUserId);
    const next = mine?.reaction_type === type
      ? previous.filter((item) => item.id !== mine.id)
      : [
          ...previous.filter((item) => !(item.post_id === postId && item.user_id === currentUserId)),
          { id: mine?.id ?? `temp-${postId}`, post_id: postId, user_id: currentUserId, reaction_type: type, created_at: new Date().toISOString() },
        ];
    setLocalReactions(next);
    startTransition(async () => {
      const result = await toggleSocialReaction(postId, type);
      if (!result.success) setLocalReactions(previous);
    });
  }

  if (!visiblePosts.length) {
    return (
      <div className="rounded-lg border border-dashed border-outline-variant bg-white px-6 py-14 text-center">
        <Icon name="dynamic_feed" className="text-4xl text-primary" />
        <h2 className="mt-3 text-xl font-black text-on-surface">No posts shared yet</h2>
        <p className="mt-1 text-sm text-on-surface-variant">The first submitted social post will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visiblePosts.map((post) => {
        const postReactions = localReactions.filter((item) => item.post_id === post.id);
        const mine = postReactions.find((item) => item.user_id === currentUserId)?.reaction_type;
        return (
          <article key={post.id} className="overflow-hidden rounded-lg border border-outline-variant bg-white shadow-card">
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="group/preview relative block" aria-label={`Open ${post.platform} post by ${post.authorName}`}>
              {post.image_url ? (
                <div className="aspect-[16/9] bg-cover bg-center transition-transform duration-300 group-hover/preview:scale-[1.02]" style={{ backgroundImage: `url(${JSON.stringify(post.image_url).slice(1, -1)})` }} role="img" aria-label={post.title ?? `${post.platform} post preview`} />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#071A3B,#174EA6)] text-white">
                  <div className="text-center"><Icon name="share" className="text-4xl" /><p className="mt-2 text-sm font-black">{post.platform}</p></div>
                </div>
              )}
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary opacity-0 shadow-lg transition group-hover/preview:opacity-100"><Icon name="open_in_new" className="text-lg" /></span>
            </a>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-black uppercase tracking-wider text-primary">{post.platform}</span>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant">{new Date(post.submitted_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
                  {canDelete ? (
                    <><button type="button" title="Fetch featured image again" disabled={pending} onClick={() => {
                      startTransition(async () => {
                        const result = await refreshSocialPostPreview(post.id);
                        if (result.success) window.location.reload();
                      });
                    }} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-[#EEF4FF]">
                      <Icon name="refresh" className="text-base" />
                    </button><button type="button" title="Remove post" disabled={pending} onClick={() => {
                      if (!confirm("Remove this social post from the tracker and feed?")) return;
                      startTransition(async () => {
                        const result = await deleteSocialPost(post.id);
                        if (result.success) setVisiblePosts((current) => current.filter((item) => item.id !== post.id));
                      });
                    }} className="flex h-7 w-7 items-center justify-center rounded-full text-error hover:bg-error-container">
                      <Icon name="delete" className="text-base" />
                    </button></>
                  ) : null}
                </div>
              </div>
              <h3 className="mt-3 line-clamp-2 text-lg font-black text-on-surface">{post.title || `${post.authorName}'s ${post.platform} post`}</h3>
              {post.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-on-surface-variant">{post.description}</p> : null}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
                <span className="min-w-0 truncate text-sm font-bold text-on-surface">{post.authorName}</span>
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-primary hover:underline">
                  Open post <Icon name="open_in_new" className="text-sm" />
                </a>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {reactionOptions.map((option) => {
                  const count = postReactions.filter((item) => item.reaction_type === option.type).length;
                  return (
                    <button key={option.type} type="button" onClick={() => react(post.id, option.type)} disabled={pending} title={option.label} className={`flex h-10 items-center justify-center gap-1 rounded-lg border text-xs font-bold transition ${mine === option.type ? "border-primary bg-primary text-white" : "border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/30"}`}>
                      <Icon name={option.icon} className="text-[17px]" /><span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
