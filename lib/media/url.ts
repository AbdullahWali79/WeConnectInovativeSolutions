const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/gh";

const folderByType: Record<string, string> = {
  course: "uploads/courses",
  courses: "uploads/courses",
  task: "uploads/tasks",
  tasks: "uploads/tasks",
  submission: "uploads/submissions",
  submissions: "uploads/submissions",
  announcement: "uploads/announcements",
  announcements: "uploads/announcements",
  team: "uploads/team",
  product: "uploads/products",
  products: "uploads/products",
  blog: "uploads/blogs",
  blogs: "uploads/blogs",
  news: "uploads/news",
  application: "uploads/applications",
  applications: "uploads/applications",
  user: "uploads/users",
  users: "uploads/users",
  profile: "uploads/users",
  branding: "uploads/branding",
  signature: "uploads/signatures",
  signatures: "uploads/signatures",
  software_house: "uploads/software-houses",
  software_houses: "uploads/software-houses",
};

export function sanitizeFilename(filename: string) {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

  return cleaned || `file-${Date.now()}`;
}

export function toJsDelivrUrl(githubPath: string, repoOverride?: string) {
  const owner = process.env.GITHUB_OWNER;
  const repo = repoOverride || process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const cdnBase = process.env.GITHUB_CDN_BASE || DEFAULT_CDN_BASE;

  if (!owner || !repo) {
    throw new Error("Missing GitHub CDN environment variables.");
  }

  return `${cdnBase.replace(/\/$/, "")}/${owner}/${repo}@${branch}/${githubPath.replace(/^\/+/, "")}`;
}

export function getBestMediaUrl(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function buildGithubPath(type: string, filename: string, userId?: string) {
  const safeType = type.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  const folder = folderByType[safeType] ?? `uploads/${safeType || "misc"}`;
  const safeFilename = sanitizeFilename(filename);
  const uniqueName = `${Date.now()}-${safeFilename}`;

  if (["submission", "submissions", "application", "applications", "user", "users", "profile"].includes(safeType) && userId) {
    return `${folder}/${sanitizeFilename(userId)}/${uniqueName}`;
  }

  return `${folder}/${uniqueName}`;
}
