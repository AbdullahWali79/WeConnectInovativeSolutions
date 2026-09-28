import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: apps } = await supabase.from("applications").select("*").eq("course_id", "501c4f6d-c3db-4ca4-985e-518d5fb6ff29").eq("status", "approved");
  
  for (const app of apps || []) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("email", app.email).single();
    if (profile) {
      // check if in talent_profiles
      const { data: tp } = await supabase.from("talent_profiles").select("id").eq("id", profile.id).maybeSingle();
      if (!tp) {
        console.log("Missing talent profile for", app.full_name, "creating...");
        await supabase.from("talent_profiles").insert({
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          whatsapp_number: profile.phone,
          status: "approved",
          whatsapp_enabled: true
        });
      } else {
        console.log("Talent profile already exists for", app.full_name);
      }
    }
  }
}

run();
