const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: profile } = await supabase.from("profiles").select("id,full_name,email").eq("email", "atifayyoub582@gmail.com").single();
  const [enrollments, fees, reports, tasks] = await Promise.all([
    supabase.from("enrollments").select("id,student_id,course_id,status,created_at").eq("student_id", profile.id),
    supabase.from("student_fee_records").select("id,enrollment_id,student_id,course_id,month_key,amount_due,amount_paid,status,updated_at").eq("student_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("progress_reports").select("student_id,course_id,total_tasks,completed_tasks,updated_at").eq("student_id", profile.id),
    supabase.from("tasks").select("id,course_id,status").eq("student_id", profile.id),
  ]);
  const taskCounts = {};
  for (const task of tasks.data ?? []) {
    const key = `${task.course_id}:${task.status}`;
    taskCounts[key] = (taskCounts[key] ?? 0) + 1;
  }
  console.log(JSON.stringify({ profile, enrollments: enrollments.data, fees: fees.data, reports: reports.data, taskCounts }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
