import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      // Using a small timeout just in case it hangs
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name: string) => 
      $(`meta[property='${name}']`).attr("content") || 
      $(`meta[name='${name}']`).attr("content") || 
      "";

    const title = getMetaTag("og:title") || getMetaTag("twitter:title") || $("title").text();
    const description = getMetaTag("og:description") || getMetaTag("twitter:description") || getMetaTag("description");
    const image = getMetaTag("og:image") || getMetaTag("twitter:image");

    return NextResponse.json({
      title: title?.trim(),
      description: description?.trim(),
      image: image?.trim(),
    });
  } catch (error) {
    console.error("Error fetching link preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview data. The site might be blocking access." },
      { status: 500 }
    );
  }
}
