import { NextResponse } from "next/server";
import { sendPendingTaskSummaryWhatsAppAlert } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendPendingTaskSummaryWhatsAppAlert();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp pending task summary failed" },
      { status: 500 },
    );
  }
}
