import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const surah = request.nextUrl.searchParams.get("surah");
  const ayah = request.nextUrl.searchParams.get("ayah");
  const translator = request.nextUrl.searchParams.get("translator") || "ur.jalandhry";

  if (!/^\d+$/.test(surah || "") || !/^\d+$/.test(ayah || "") || !/^[a-z0-9._-]+$/i.test(translator)) {
    return NextResponse.json({ error: "Invalid ayah request." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,${translator}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) },
    );
    const data = await response.json();
    if (!response.ok || data.code !== 200) {
      return NextResponse.json({ error: "Ayah service unavailable." }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ error: "Ayah service unavailable." }, { status: 502 });
  }
}
