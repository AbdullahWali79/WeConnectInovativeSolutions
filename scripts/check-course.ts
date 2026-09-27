import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profile } = await supabase.from("profiles").select("*").eq("email", "githubprojectmine@gmail.com").single();
  if (profile) {
    const { data: student } = await supabase.from("students").select("course_id").eq("id", profile.id).single();
    console.log("Student course_id:", student?.course_id);
    console.log("Expected course_id:", "501c4f6d-c3db-4ca4-985e-518d5fb6ff29");
  } else {
    console.log("Not found");
  }
}

run();
