"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin-access";
import { getYouTubeVideoId } from "@/lib/promo-media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PromotionalPopup } from "@/lib/supabase/types";

type PopupInput = Pick<PromotionalPopup, "title" | "message" | "image_url" | "show_on">;

function cleanInput(input: PopupInput) {
  const title = input.title.trim();
  const message = input.message.trim();
  const mediaUrl = input.image_url?.trim() || null;
  if (!title || !message) throw new Error("Title and message are required.");
  if (!["landing", "student", "both"].includes(input.show_on)) throw new Error("Select a valid popup location.");

  if (mediaUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(mediaUrl);
    } catch {
      throw new Error("Enter a complete public image or video URL.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("The media URL must start with http:// or https://.");
    }

    if (/youtu/i.test(parsedUrl.hostname) && !getYouTubeVideoId(mediaUrl)) {
      throw new Error("This YouTube URL is incomplete. Use a link like https://youtu.be/VIDEO_ID.");
    }
  }

  return {
    title,
    message,
    image_url: mediaUrl,
    show_on: input.show_on,
  };
}

function resultError(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "The promotion could not be saved." };
}

export async function getPromotionalPopups() {
  try {
    await requirePermission("promotional_popups.view");
    const { data, error } = await createSupabaseServiceClient()
      .from("promotional_popups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { ok: true as const, data: (data ?? []) as PromotionalPopup[] };
  } catch (error) {
    return resultError(error);
  }
}

export async function createPromotionalPopup(input: PopupInput) {
  try {
    await requirePermission("promotional_popups.create");
    const { error } = await createSupabaseServiceClient().from("promotional_popups").insert(cleanInput(input));
    if (error) throw new Error(error.message);
    revalidatePath("/admin/promotional-popups");
    return { ok: true as const };
  } catch (error) {
    return resultError(error);
  }
}

export async function updatePromotionalPopup(id: string, input: PopupInput) {
  try {
    await requirePermission("promotional_popups.edit");
    const { error } = await createSupabaseServiceClient().from("promotional_popups").update(cleanInput(input)).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/promotional-popups");
    return { ok: true as const };
  } catch (error) {
    return resultError(error);
  }
}

export async function setPromotionalPopupActive(id: string, isActive: boolean) {
  try {
    await requirePermission("promotional_popups.edit");
    const { error } = await createSupabaseServiceClient().from("promotional_popups").update({ is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/promotional-popups");
    return { ok: true as const };
  } catch (error) {
    return resultError(error);
  }
}

export async function deletePromotionalPopup(id: string) {
  try {
    await requirePermission("promotional_popups.delete");
    const { error } = await createSupabaseServiceClient().from("promotional_popups").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/promotional-popups");
    return { ok: true as const };
  } catch (error) {
    return resultError(error);
  }
}
