import { NextResponse } from "next/server";
import { sendDailyPendingSummary } from "@/lib/mail/send-daily-pending-summary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is missing" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const result = await sendDailyPendingSummary({
      forceTime: url.searchParams.get("force") === "true",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daily pending summary failed" },
      { status: 500 },
    );
  }
}
