import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Easy Kitty Care — Track health and care for foster kittens";

export default async function Image() {
  const iconData = await readFile(join(process.cwd(), "public/apple-touch-icon.png"), "base64");
  const iconSrc = `data:image/png;base64,${iconData}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #a855f7 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <img src={iconSrc} width={108} height={108} style={{ borderRadius: 28 }} />
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-2px",
            display: "flex",
          }}
        >
          Easy Kitty Care
        </div>
        <div
          style={{
            fontSize: 30,
            color: "rgba(255,255,255,0.72)",
            display: "flex",
          }}
        >
          Track health and care for foster kittens
        </div>
      </div>
    ),
    { ...size }
  );
}
