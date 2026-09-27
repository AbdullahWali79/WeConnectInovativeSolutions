import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profile } = await supabase.from("profiles").select("*").eq("email", "githubprojectmine@gmail.com").single();
  if (profile) {
    const res = await supabase.from("talent_profiles").insert({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      whatsapp_number: profile.phone,
      status: "approved",
      whatsapp_enabled: true
    });
    console.log("Inserted profile for", profile.full_name, res.error);
  } else {
    console.log("Not found");
  }
}

run();
