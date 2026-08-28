export type DriveUploadResult = { id: string; name: string; mimeType: string; size: number; url: string };

async function json(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Upload failed (${response.status}).`);
  return data;
}

export async function uploadProjectFileToDrive(file: File, onProgress?: (percent: number) => void): Promise<DriveUploadResult> {
  const init = await json(await fetch("/api/uploads/google-drive/init", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size }) }));
  const driveFile = await new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", init.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100)); };
    xhr.onerror = () => reject(new Error("Network interrupted while uploading to Google Drive."));
    xhr.onload = () => {
      let result: { id?: string; error?: { message?: string } } = {};
      try { result = JSON.parse(xhr.responseText || "{}"); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && result.id) resolve({ id: result.id });
      else reject(new Error(result.error?.message || `Google Drive upload failed (${xhr.status}).`));
    };
    xhr.send(file);
  });
  onProgress?.(100);
  return json(await fetch("/api/uploads/google-drive/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileId: driveFile.id }) }));
}

