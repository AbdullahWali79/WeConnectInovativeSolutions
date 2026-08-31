import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const sql = fs.readFileSync(
  "supabase/migrations/20260831000002_add_ai_productivity_automation_mastery_curriculum.sql",
  "utf8",
);
const rowPattern = /\((\d+), '((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)'\)/g;
const decodeSqlText = (value) => value.replaceAll("''", "'");
const topics = [];

for (const match of sql.matchAll(rowPattern)) {
  topics.push({
    day_number: Number(match[1]),
    title: decodeSqlText(match[2]),
    english_video: decodeSqlText(match[3]),
    urdu_video: decodeSqlText(match[4]),
    practice_project: decodeSqlText(match[5]),
  });
}

if (topics.length !== 30) throw new Error(`Expected 30 curriculum rows, parsed ${topics.length}.`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data: course, error: courseError } = await supabase
  .from("courses")
  .select("id,title")
  .ilike("title", "%AI Productivity%Automation Mastery%")
  .limit(1)
  .single();

if (courseError) throw courseError;

const { error: upsertError } = await supabase.from("course_topics").upsert(
  topics.map((topic) => ({ ...topic, course_id: course.id })),
  { onConflict: "course_id,day_number" },
);
if (upsertError) throw upsertError;

const [{ count: syllabusCount, error: syllabusError }, { count: projectCount, error: projectError }] =
  await Promise.all([
    supabase.from("course_topics").select("id", { count: "exact", head: true }).eq("course_id", course.id),
    supabase.from("course_projects").select("id", { count: "exact", head: true }).eq("course_id", course.id),
  ]);

if (syllabusError) throw syllabusError;
if (projectError) throw projectError;
console.log(`${course.title}: ${syllabusCount} syllabus rows, ${projectCount} projects.`);
