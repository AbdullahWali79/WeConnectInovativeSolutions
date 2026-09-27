import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("enrollments").select("*").eq("student_id", "some_id").limit(1);
  console.log("enrollments error?", error);

  // let's fetch applications
  const { data: profile } = await supabase.from("profiles").select("*").eq("email", "githubprojectmine@gmail.com").single();
  const { data: enrolls } = await supabase.from("enrollments").select("*").eq("student_id", profile.id);
  console.log("enrolls", enrolls);

  // fetch application
  const { data: app } = await supabase.from("applications").select("*").eq("email", "githubprojectmine@gmail.com");
  console.log("apps", app);
}

run();
