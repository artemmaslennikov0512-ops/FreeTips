import { ImageResponse } from "next/og";

/* 1024px — максимальная чёткость при масштабировании во вкладке и автозаполнении */
export const size = { width: 1024, height: 1024 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 448,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          FT
        </span>
      </div>
    ),
    { ...size }
  );
}
