import type { GithubUploadResult } from "@/lib/github/github-storage";

export async function uploadFileToGithubCdn(file: File, type: string, entityId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  if (entityId) formData.append("entityId", entityId);

  const response = await fetch("/api/uploads/github", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Upload failed.");
  }

  return data as GithubUploadResult;
}