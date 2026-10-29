import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Always overwrite these; a caller cannot choose which page/template is checked.
  headers.set("x-cms-path", request.nextUrl.pathname);
  headers.set("x-cms-preview", request.nextUrl.searchParams.get("cms-preview") === "1" ? "1" : "0");
  const response = NextResponse.next({ request: { headers } });
  if (request.nextUrl.pathname === "/student" || request.nextUrl.pathname.startsWith("/student/")) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "student") {
        const { data: enrollment } = await supabase.from("enrollments").select("course_id").eq("student_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { data: controls } = enrollment ? await supabase.from("course_student_menu_controls").select("menu_key,is_visible,sort_order").eq("course_id", enrollment.course_id).order("sort_order") : { data: [] };
        const key = request.nextUrl.pathname === "/student" ? "dashboard" : request.nextUrl.pathname.split("/")[2];
        const mappedKey = key === "courses" ? "syllabus" : key;
        const courseAllows = Boolean(controls?.some(row => row.menu_key === mappedKey && row.is_visible));

        // Campaign work is granted by campaign membership, not by course menus.
        // Students the admin creates straight into a campaign have no course
        // enrollment, so without this they were locked out of the portal with
        // "No features are assigned to your course."
        const campaignStudent = courseAllows
          ? false
          : ((await supabase.from("sm_campaign_members").select("id").eq("student_id", user.id).eq("status", "active").limit(1)).data ?? []).length > 0;
        const campaignAllows = campaignStudent && ["dashboard", "campaigns", "profile"].includes(mappedKey);

        if (!courseAllows && !campaignAllows) {
          if (request.method !== "GET") return new NextResponse("This feature is not assigned to your course.", { status: 403 });

          if (campaignStudent) {
            // Everything outside the campaign hub is out of scope for them.
            const url = request.nextUrl.clone();
            url.pathname = "/student/campaigns";
            url.search = "";
            const redirect = NextResponse.redirect(url);
            response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
            return redirect;
          }

          const first = controls?.find(row => row.is_visible);
          if (!first) return new NextResponse("No features are assigned to your course. Please contact your administrator.", { status: 403 });
          const url = request.nextUrl.clone();
          url.pathname = first.menu_key === "dashboard" ? "/student" : "/student/" + first.menu_key;
          url.search = "";
          const redirect = NextResponse.redirect(url);
          response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
          return redirect;
        }
      }
    }
  }
  return response;
}
export const config = { matcher: ["/((?!api/|_next/|favicon.ico).*)"] };
