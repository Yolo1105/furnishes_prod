import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#fff2e5",
        color: "#6b2c12",
        fontSize: 72,
        fontWeight: 600,
      }}
    >
      <div>furnishes.</div>
      <div style={{ fontSize: 32, marginTop: 24, fontWeight: 400 }}>
        A room thinks with you
      </div>
    </div>,
    size,
  );
}
