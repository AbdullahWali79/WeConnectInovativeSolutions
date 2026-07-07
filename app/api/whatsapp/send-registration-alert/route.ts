import { NextResponse } from "next/server";
import { sendRegistrationWhatsAppAlert } from "@/lib/whatsapp/templates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const result = await sendRegistrationWhatsAppAlert({
      studentName: payload.studentName || "Test Student",
      courseName: payload.courseName || "Test Course",
      phone: payload.phone || "Not provided",
      status: payload.status || "Pending Review",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp registration alert failed" },
      { status: 500 },
    );
  }
}
