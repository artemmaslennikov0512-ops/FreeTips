import { ImageResponse } from "next/og";

/** Иконка 32×32 для вкладки браузера — без масштабирования, чёткая. */
export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a192f",
          borderRadius: "50%",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "0.06em",
          }}
        >
          FT
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
