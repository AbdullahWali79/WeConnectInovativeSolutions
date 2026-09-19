import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sanitizeFilename } from "@/lib/media/url";

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const extension = allowedImageTypes[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Image must be a JPG, PNG, WEBP, or GIF file." }, { status: 400 });
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
    }

    const filename = sanitizeFilename(file.name);
    const storagePath = `ai-tools/${Date.now()}-${crypto.randomUUID()}-${filename.replace(/\.[^.]+$/, "")}.${extension}`;
    
    const bytes = new Uint8Array(await file.arrayBuffer());
    
    // We use the service role client since unauthenticated guests are uploading
    const supabaseAdmin = createSupabaseServiceClient();
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from("branding-assets")
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Image upload failed.");
    }

    const { data } = supabaseAdmin.storage.from("branding-assets").getPublicUrl(storagePath);
    
    if (!data.publicUrl) {
      throw new Error("Image uploaded, but its public URL could not be generated.");
    }

    return NextResponse.json({
      url: data.publicUrl
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
