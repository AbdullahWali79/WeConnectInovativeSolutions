import * as xlsx from "xlsx";

/**
 * Reads a client's day-wise social media plan (the "30-Day Calendar" workbook)
 * and turns it into day rows for sm_campaign_days.
 *
 * Columns are matched by header text, not by position, so a client sheet with a
 * different column order still imports. Every column is optional — whatever is
 * missing simply stays empty instead of failing the whole upload.
 */

export type PlanDay = {
  day_number: number;
  post_date: string | null;
  theme: string | null;
  goal: string | null;
  research_note: string | null;
  platform_plan: string | null;
  caption: string | null;
  image_headline: string | null;
  x_draft: string | null;
  source_link: string | null;
  reel_script: string | null;
  hashtags: string | null;
  engagement_action: string | null;
  cta: string | null;
  metrics_to_record: string | null;
};

export type ParsedPlan = {
  days: PlanDay[];
  periodStart: string | null;
  periodEnd: string | null;
  goal: string | null;
  clientName: string | null;
  sheetName: string;
  warnings: string[];
};

const MONTH_INDEX: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function text(value: unknown) {
  const out = String(value ?? "").replace(/\s+/g, " ").trim();
  return out || null;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** "Oct 29" / "29 October" / "10/29" → { month, day }, no year. */
function parseMonthDay(value: unknown): { month: number; day: number } | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const monthName = raw.match(/([a-z]{3,9})\.?\s*(\d{1,2})/i);
  if (monthName) {
    const month = MONTH_INDEX[monthName[1].toLowerCase()];
    const day = Number(monthName[2]);
    if (month && day >= 1 && day <= 31) return { month, day };
  }

  const dayFirst = raw.match(/(\d{1,2})\s+([a-z]{3,9})/i);
  if (dayFirst) {
    const month = MONTH_INDEX[dayFirst[2].toLowerCase()];
    const day = Number(dayFirst[1]);
    if (month && day >= 1 && day <= 31) return { month, day };
  }

  const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})/);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  return null;
}

function extractYear(value: unknown): number | null {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function pickSheet(workbook: xlsx.WorkBook) {
  const names = workbook.SheetNames;
  const byName = names.find((name) => /calendar|30.?day|day.?wise|plan|schedule/i.test(name));
  if (byName) return byName;

  // Otherwise choose the sheet that actually contains a "Day" column header.
  let best = names[0];
  let bestScore = -1;
  for (const name of names) {
    const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, blankrows: false });
    const score = rows.slice(0, 5).reduce((total, row) => {
      const hasDay = row.some((cell) => normalizeHeader(cell) === "day");
      return total + (hasDay ? 100 : 0) + row.filter((cell) => text(cell)).length;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

function readReadMe(workbook: xlsx.WorkBook) {
  const meta: Record<string, string> = {};
  const name = workbook.SheetNames.find((sheet) => /read ?me|info|overview|about/i.test(sheet));
  if (!name) return meta;

  const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, blankrows: false });
  rows.forEach((row, index) => {
    const filled = row.filter((cell) => text(cell));
    // A merged title row lands here as a single filled cell.
    if (filled.length === 1 && index === 0) {
      meta.title = String(filled[0]).trim();
      return;
    }
    const label = normalizeHeader(row[0]);
    const value = text(row[1]);
    if (label && value && label.length < 60) meta[label] = value;
  });
  return meta;
}

function collectPlatformPlan(cells: { label: string; value: string | null }[]) {
  const filled = cells.filter((cell) => cell.value);
  if (filled.length === 0) return null;

  // The source workbook repeats one identical sentence across the Facebook /
  // Instagram / X columns. Keep it once instead of tripling the text.
  const unique = Array.from(new Set(filled.map((cell) => cell.value as string)));
  if (unique.length === 1) return unique[0];

  return filled.map((cell) => `${cell.label}: ${cell.value}`).join("\n");
}

export function parseCampaignPlan(data: ArrayBuffer): ParsedPlan {
  const workbook = xlsx.read(data, { type: "array" });
  const sheetName = pickSheet(workbook);
  const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    raw: false,
  });

  const warnings: string[] = [];
  if (rows.length === 0) {
    return { days: [], periodStart: null, periodEnd: null, goal: null, clientName: null, sheetName, warnings: ["The workbook is empty."] };
  }

  // Header row = first row within the first 10 that has a "Day" cell.
  let headerIndex = -1;
  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    if (rows[index].some((cell) => normalizeHeader(cell) === "day")) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex === -1) {
    return {
      days: [],
      periodStart: null,
      periodEnd: null,
      goal: null,
      clientName: null,
      sheetName,
      warnings: [`No "Day" column was found in sheet "${sheetName}". Check that row 1 holds the column headers.`],
    };
  }

  const header = rows[headerIndex].map(normalizeHeader);
  const column = (matcher: (value: string) => boolean) => header.findIndex((value) => value && matcher(value));

  const dayCol = column((value) => value === "day");
  const dateCol = column((value) => value === "date");
  const themeCol = column((value) => /theme|topic/.test(value));
  const goalCol = column((value) => /^goal$|objective/.test(value));
  const researchCol = column((value) => /research|verify/.test(value));
  const fbCol = column((value) => /facebook|\bfb\b/.test(value));
  const igCol = column((value) => /instagram|\big\b/.test(value));
  const xCol = column((value) => /^x plan|^x$|twitter/.test(value));
  const captionCol = column((value) => /caption|talking point/.test(value));
  const imageCol = column((value) => /image|visual|headline/.test(value));
  const xDraftCol = column((value) => /x post|post draft|tweet/.test(value));
  const sourceCol = column((value) => /source|link/.test(value));
  // "Caption / Reel talking points" also contains "reel", so match the script
  // column by its more specific words first and only then fall back to "reel".
  const reelCol =
    column((value) => /script|shot guidance|shot list/.test(value)) >= 0
      ? column((value) => /script|shot guidance|shot list/.test(value))
      : column((value) => /^reel/.test(value));
  const hashtagCol = column((value) => /hashtag/.test(value));
  const engagementCol = column((value) => /engagement/.test(value));
  const ctaCol = column((value) => /^cta$|call to action/.test(value));
  const metricsCol = column((value) => /metric/.test(value));

  const readMe = readReadMe(workbook);
  const yearHint =
    extractYear(readMe["period"]) ??
    extractYear(readMe["date range"]) ??
    new Date().getFullYear();

  const days: PlanDay[] = [];
  let runningYear = yearHint;
  let previousMonth = 0;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row || row.every((cell) => !text(cell))) continue;

    const theme = themeCol >= 0 ? text(row[themeCol]) : null;
    const rawDay = dayCol >= 0 ? Number(String(row[dayCol] ?? "").replace(/[^0-9]/g, "")) : NaN;
    if (!Number.isFinite(rawDay) && !theme) continue;

    const dayNumber = Number.isFinite(rawDay) && rawDay > 0 ? rawDay : days.length + 1;

    let postDate: string | null = null;
    const parsed = dateCol >= 0 ? parseMonthDay(row[dateCol]) : null;
    if (parsed) {
      // "Oct 29" has no year — roll the year forward when the month wraps.
      if (previousMonth && parsed.month < previousMonth) runningYear += 1;
      previousMonth = parsed.month;
      postDate = `${runningYear}-${pad(parsed.month)}-${pad(parsed.day)}`;
    }

    days.push({
      day_number: dayNumber,
      post_date: postDate,
      theme,
      goal: goalCol >= 0 ? text(row[goalCol]) : null,
      research_note: researchCol >= 0 ? text(row[researchCol]) : null,
      platform_plan: collectPlatformPlan([
        { label: "Facebook", value: fbCol >= 0 ? text(row[fbCol]) : null },
        { label: "Instagram", value: igCol >= 0 ? text(row[igCol]) : null },
        { label: "X", value: xCol >= 0 ? text(row[xCol]) : null },
      ]),
      caption: captionCol >= 0 ? text(row[captionCol]) : null,
      image_headline: imageCol >= 0 ? text(row[imageCol]) : null,
      x_draft: xDraftCol >= 0 ? text(row[xDraftCol]) : null,
      source_link: sourceCol >= 0 ? text(row[sourceCol]) : null,
      reel_script: reelCol >= 0 ? String(row[reelCol] ?? "").trim() || null : null,
      hashtags: hashtagCol >= 0 ? text(row[hashtagCol]) : null,
      engagement_action: engagementCol >= 0 ? text(row[engagementCol]) : null,
      cta: ctaCol >= 0 ? text(row[ctaCol]) : null,
      metrics_to_record: metricsCol >= 0 ? text(row[metricsCol]) : null,
    });
  }

  const dated = days.filter((day) => day.post_date);
  const periodStart = dated.length > 0 ? dated[0].post_date : null;
  const periodEnd = dated.length > 0 ? dated[dated.length - 1].post_date : null;

  if (days.length === 0) warnings.push("No day rows were found below the header.");
  if (!periodStart) warnings.push("No usable dates were found — set the start date manually.");

  const title = Object.entries(readMe).find(([label]) => /title|campaign|workbook/.test(label))?.[1] ?? null;
  const clientName = title ? title.split(/[—–|]/)[0].trim() || null : null;

  return {
    days,
    periodStart,
    periodEnd,
    goal: readMe["goal"] ?? null,
    clientName,
    sheetName,
    warnings,
  };
}

export function emptyPlanDay(dayNumber: number): PlanDay {
  return {
    day_number: dayNumber,
    post_date: null,
    theme: null,
    goal: null,
    research_note: null,
    platform_plan: null,
    caption: null,
    image_headline: null,
    x_draft: null,
    source_link: null,
    reel_script: null,
    hashtags: null,
    engagement_action: null,
    cta: null,
    metrics_to_record: null,
  };
}
