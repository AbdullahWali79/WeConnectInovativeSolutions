import { config } from "dotenv";
config({ path: ".env.local" });
import { submitPublicAITool } from "./app/forms/ai-tools/actions";
import { createSupabasePublicClient } from "./lib/supabase/public";

async function test() {
  const supabase = createSupabasePublicClient();
  const { data: forms } = await supabase.from("public_ai_tool_forms").select("id");
  console.log(forms);
  if (!forms || forms.length === 0) return console.log("No form found");
  const form = forms[0];

  const res = await submitPublicAITool(form.id, {
    categoryId: "",
    categorySnapshot: "Video Editing",
    submitterName: "Abdullah",
    submitterPhone: "+923217726944",
    toolName: "Choppity",
    toolUrl: "https://www.choppity.com/" + Date.now(),
    benefits: "Simple Ai Editing Tool",
    imageUrl: ""
  });
  console.log(res);
}

test();

test();
