export type SocialReactionType = "support" | "insightful" | "celebrate";

export type SocialMediaPost = {
  id: string;
  student_id: string;
  url: string;
  platform: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  submitted_at: string;
  created_at: string;
};

export type SocialMediaReaction = {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: SocialReactionType;
  created_at: string;
};

export function getPakistanWeekRange(date = new Date()) {
  const pakistanNow = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const day = pakistanNow.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const startLocal = Date.UTC(
    pakistanNow.getUTCFullYear(),
    pakistanNow.getUTCMonth(),
    pakistanNow.getUTCDate() - daysFromMonday,
    0, 0, 0, 0,
  );
  const start = new Date(startLocal - 5 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export function getSocialPlatform(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in") return "LinkedIn";
  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com" ||
    host === "fb.watch"
  ) return "Facebook";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
  if (host === "threads.net" || host.endsWith(".threads.net")) return "Threads";
  if (
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com") ||
    host === "tiktokv.com" ||
    host.endsWith(".tiktokv.com")
  ) return "TikTok";
  return "Other";
}

export const reactionOptions: Array<{ type: SocialReactionType; label: string; icon: string }> = [
  { type: "support", label: "Support", icon: "favorite" },
  { type: "insightful", label: "Insightful", icon: "lightbulb" },
  { type: "celebrate", label: "Celebrate", icon: "celebration" },
];
