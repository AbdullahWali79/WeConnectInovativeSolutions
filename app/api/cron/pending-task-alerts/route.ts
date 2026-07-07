import { NextResponse } from "next/server";
import { sendDuePendingTaskWhatsAppAlerts } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is missing" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const result = await sendDuePendingTaskWhatsAppAlerts({
      forceTime: url.searchParams.get("force") === "true",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp pending task alert failed" },
      { status: 500 },
    );
  }
}
