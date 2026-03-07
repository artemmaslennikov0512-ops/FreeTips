import { ImageResponse } from "next/og";

/* 512px — чтобы в автозаполнении/вкладке при масштабировании не было смаза */
export const size = { width: 512, height: 512 };
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
            fontSize: 224,
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
