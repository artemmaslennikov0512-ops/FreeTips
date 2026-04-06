import { ImageResponse } from "next/og";

export const alt = "FreeTips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          background: "linear-gradient(145deg, #0a192f 0%, #1a2744 45%, #0d1525 100%)",
          fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            borderRadius: 24,
            border: "1px solid rgba(197, 165, 114, 0.35)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 88, fontWeight: 800, color: "#c5a572", letterSpacing: "-0.02em" }}>FreeTips</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              marginTop: 20,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            Сервис чаевых для профессионалов
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Оплата картой и Apple Pay / Google Pay
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
