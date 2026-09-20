import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get parameters
    const title = searchParams.get("title") || "AI Tool";
    
    // WeConnect Colors
    const primary = "#1e40af"; // blue-800
    const secondary = "#0f172a"; // slate-900

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc", // slate-50
            backgroundImage: "radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            fontFamily: "sans-serif",
            padding: "40px",
          }}
        >
          {/* Logo / Brand Area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            {/* Simple logo placeholder - you can replace with an actual img tag if you have a public logo URL */}
            <div
              style={{
                background: primary,
                color: "white",
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: "bold",
                marginRight: "20px",
                boxShadow: "0 10px 25px rgba(30, 64, 175, 0.3)",
              }}
            >
              W
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  color: primary,
                  letterSpacing: "-1px",
                }}
              >
                We Connect
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: secondary,
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                }}
              >
                Innovative Solutions
              </span>
            </div>
          </div>

          {/* Tool Title */}
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: 900,
              color: secondary,
              textAlign: "center",
              lineHeight: 1.2,
              padding: "0 40px",
              maxWidth: "1000px",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          
          <div
            style={{
              marginTop: "40px",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#64748b",
              background: "#e2e8f0",
              padding: "10px 24px",
              borderRadius: "40px",
            }}
          >
            Featured AI Tool
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
