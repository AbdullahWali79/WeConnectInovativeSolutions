import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Always overwrite these; a caller cannot choose which page/template is checked.
  headers.set("x-cms-path", request.nextUrl.pathname);
  headers.set("x-cms-preview", request.nextUrl.searchParams.get("cms-preview") === "1" ? "1" : "0");
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api/|_next/|favicon.ico).*)"] };
