import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadGithubFile } from "@/lib/github/github-storage";
import { sanitizeFilename } from "@/lib/media/url";

const adminTypes = new Set([
  "course",
  "courses",
  "task",
  "tasks",
  "announcement",
  "announcements",
  "team",
  "product",
  "products",
  "blog",
  "blogs",
  "news",
  "branding",
  "signature",
  "signatures",
  "software_house",
  "software_houses",
]);
const studentTypes = new Set(["submission", "submissions", "application", "applications", "profile", "user", "users", "task-screenshot", "task-screenshots"]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,role,status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.status !== "approved") {
      return NextResponse.json({ error: "Upload access denied." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "").trim().toLowerCase();
    const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
    const taskId = String(formData.get("taskId") ?? "").trim() || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Upload type is required." }, { status: 400 });
    }

    const isAdmin = profile.role === "admin";
    const isTeacher = profile.role === "teacher";
    const isStudent = profile.role === "student";
    const adminAllowed = (isAdmin || isTeacher) && adminTypes.has(type);
    const studentAllowed = isStudent && studentTypes.has(type) && (!entityId || entityId === user.id);

    if (!adminAllowed && !studentAllowed) {
      return NextResponse.json({ error: "You are not allowed to upload this file type." }, { status: 403 });
    }

    let githubPath: string | undefined = undefined;
    if (type === "task-screenshot" || type === "task-screenshots") {
      const dateStr = new Date().toISOString().split("T")[0];
      const uniqueFilename = `${Date.now()}-${sanitizeFilename(file.name)}`;
      githubPath = `task-screenshots/${entityId ?? user.id}/${taskId ?? "daily"}/${dateStr}/${uniqueFilename}`;
    }

    const result = await uploadGithubFile({
      file,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      type,
      userId: entityId ?? user.id,
      githubPath,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}