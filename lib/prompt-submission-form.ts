export const PROMPT_SUBMISSION_PATH = "/prompts/submit";

// The same form is used by the public page and the admin sharing screen.
export const PROMPT_SUBMISSION_GOOGLE_URL = "https://docs.google.com/forms/d/e/1FAIpQLScfgjTuQHt9cdCcu5Ha8hIFN2_FtZaA_pGklBGion_sPpF1mw/viewform";

export function promptSubmissionEmbedUrl(formUrl: string) {
  const url = new URL(formUrl);
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || !/^\/forms\/d\/(?:e\/)?[A-Za-z0-9_-]+\/viewform\/?$/.test(url.pathname)) {
    throw new Error("Use the Google Form responder URL.");
  }
  url.searchParams.set("embedded", "true");
  return url.toString();
}
