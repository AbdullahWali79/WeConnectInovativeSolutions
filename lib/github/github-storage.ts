import { buildGithubPath, sanitizeFilename, toJsDelivrUrl } from "@/lib/media/url";

export type GithubUploadResult = {
  filename: string;
  githubPath: string;
  githubUrl: string;
  githubCdnUrl: string;
  mime: string;
  size: number;
};

type UploadInput = {
  file: File | Buffer;
  filename: string;
  mime: string;
  type: string;
  userId?: string;
  githubPath?: string;
};

const imageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const documentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);
const videoTypes = new Set(["video/mp4", "video/webm"]);
const allowedTypes = new Set([...imageTypes, ...documentTypes, ...videoTypes]);

function getConfig(type?: string) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = type === "product" || type === "products"
    ? process.env.GITHUB_PRODUCTS_REPO || process.env.GITHUB_REPO
    : process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 10);

  if (!token || !owner || !repo) {
    throw new Error("GitHub upload environment variables are not configured.");
  }

  return { token, owner, repo, branch, maxBytes: maxUploadMb * 1024 * 1024 };
}

function assertAllowedFile(mime: string, size: number) {
  const { maxBytes } = getConfig();

  if (!allowedTypes.has(mime)) {
    throw new Error("Unsupported file type.");
  }

  if (size > maxBytes) {
    throw new Error(`File must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

async function toBuffer(file: File | Buffer) {
  if (Buffer.isBuffer(file)) return file;
  return Buffer.from(await file.arrayBuffer());
}

async function getExistingSha(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub lookup failed: ${text}`);
  }

  const data = (await response.json()) as { sha?: string };
  return data.sha ?? null;
}

export async function uploadGithubFile(input: UploadInput): Promise<GithubUploadResult> {
  const { token, owner, repo, branch } = getConfig(input.type);
  const buffer = await toBuffer(input.file);
  const filename = sanitizeFilename(input.filename);

  assertAllowedFile(input.mime, buffer.byteLength);

  const githubPath = input.githubPath ?? buildGithubPath(input.type, filename, input.userId);
  const encodedPath = githubPath.split("/").map(encodeURIComponent).join("/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  const existingSha = await getExistingSha(`${apiUrl}?ref=${encodeURIComponent(branch)}`, token);
  const content = buffer.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: `Upload ${githubPath}`,
      content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub upload failed: ${text}`);
  }

  const data = (await response.json()) as { content?: { html_url?: string } };
  const githubUrl = data.content?.html_url ?? `https://github.com/${owner}/${repo}/blob/${branch}/${githubPath}`;

  return {
    filename,
    githubPath,
    githubUrl,
    githubCdnUrl: toJsDelivrUrl(githubPath, repo),
    mime: input.mime,
    size: buffer.byteLength,
  };
}

export async function deleteGithubFile(githubPath: string) {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = githubPath.split("/").map(encodeURIComponent).join("/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  const existingSha = await getExistingSha(`${apiUrl}?ref=${encodeURIComponent(branch)}`, token);

  if (!existingSha) return { deleted: false, reason: "not_found" };

  const response = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: `Delete ${githubPath}`,
      sha: existingSha,
      branch,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub delete failed: ${text}`);
  }

  return { deleted: true };
}
