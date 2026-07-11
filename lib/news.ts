import { createSupabasePublicClient } from "./supabase/public";

export interface AINews {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at?: string;
}

interface Story {
  title: string;
  summary?: string;
  sourceUrl: string;
  datePublished?: string;
  feed?: {
    title: string;
  };
}

/**
 * Fetches the latest AI news and updates the Supabase table.
 * This function also serves as a "keep alive" for the Supabase project.
 */
export async function refreshAINews() {
  const supabase = createSupabasePublicClient();
  
  try {
    // 1. Fetch from Actually Relevant API (Free, no key)
    const response = await fetch("https://actually-relevant-api.onrender.com/api/stories", {
      next: { revalidate: 3600 } // Cache for 1 hour at the fetch level
    });
    
    if (!response.ok) {
      console.error(`External API error: ${response.status} ${response.statusText}`);
      throw new Error("Failed to fetch news from external API");
    }
    
    const data = await response.json();
    const rawStories = (data.data || data.stories || []) as unknown[];
    const stories = rawStories.slice(0, 3) as Story[];

    if (stories.length === 0) {
      console.warn("No stories found in API response");
      return;
    }

    // 2. Clear old news
    await supabase.from("ai_news").delete().not("id", "is", null);

    // 3. Insert new news
    const newsToInsert = stories.map(story => ({
      title: story.title,
      summary: story.summary || "",
      url: story.sourceUrl,
      source: story.feed?.title || "AI News",
      published_at: story.datePublished || new Date().toISOString()
    }));

    const { error: insertError } = await supabase.from("ai_news").insert(newsToInsert);
    
    if (insertError) {
      console.error("Error inserting news:", insertError);
      throw insertError;
    }

    return newsToInsert;
  } catch (error) {
    console.error("News Refresh Error:", error);
    return null;
  }
}

/**
 * Gets news from the database. If news is older than 24h, triggers a refresh.
 */
export async function getLatestNews() {
  const supabase = createSupabasePublicClient();
  
  const { data: existingNews } = await supabase
    .from("ai_news")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  const shouldRefresh = !existingNews || existingNews.length === 0 || 
    (new Date().getTime() - new Date(existingNews[0].created_at).getTime() > 24 * 60 * 60 * 1000);

  if (shouldRefresh) {
    // We don't await here to avoid slowing down the page load
    // but the DB write will happen in the background and keep Supabase alive
    void refreshAINews();
  }

  return existingNews || [];
}
