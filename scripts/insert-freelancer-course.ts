import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("courses").insert({
    title: "Freelancer Registration (No Course)",
    description: "Register purely to become a freelancer and showcase your services on our talent portal.",
    status: "active"
  }).select();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

run();
