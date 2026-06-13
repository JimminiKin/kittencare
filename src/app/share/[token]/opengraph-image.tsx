import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let name = "Kitten";
  let subtitle = "";
  let photoSrc: string | null = null;

  try {
    const admin = getSupabaseAdmin();
    const { data: share } = await admin
      .from("share_tokens")
      .select("kittens(name, estimated_age_days, birth_date, sex, photo), expires_at")
      .eq("token", token)
      .single();

    const isExpired = share?.expires_at && new Date(share.expires_at) < new Date();
    const kitten = !isExpired ? (share?.kittens as any) : null;

    if (kitten) {
      name = kitten.name ?? "Kitten";

      let ageLabel = "";
      if (kitten.estimated_age_days) {
        const weeks = Math.floor(kitten.estimated_age_days / 7);
        const days = kitten.estimated_age_days % 7;
        ageLabel = weeks === 0 ? `${days}d old` : days === 0 ? `${weeks}w old` : `${weeks}w ${days}d old`;
      } else if (kitten.birth_date) {
        const ageDays = Math.floor((Date.now() - new Date(kitten.birth_date).getTime()) / 86400000);
        const weeks = Math.floor(ageDays / 7);
        const days = ageDays % 7;
        ageLabel = weeks === 0 ? `${days}d old` : `${weeks}w ${days}d old`;
      }
      const sex = kitten.sex && kitten.sex !== "unknown" ? (kitten.sex as string) : null;
      subtitle = [ageLabel, sex].filter(Boolean).join(" · ");

      // Fetch kitten photo with a 3s timeout so slow storage never blocks the card
      if (kitten.photo) {
        try {
          const res = await fetch(kitten.photo, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const mime = res.headers.get("content-type") ?? "image/jpeg";
            photoSrc = `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
          }
        } catch {
          // fall through to placeholder
        }
      }
    }
  } catch {
    // DB unreachable — render a generic branded card rather than crashing
  }

  const iconData = await readFile(join(process.cwd(), "public/apple-touch-icon.png"), "base64");
  const iconSrc = `data:image/png;base64,${iconData}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 80px",
        }}
      >
        {/* Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={iconSrc} width={36} height={36} style={{ borderRadius: 8 }} />
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 22, fontWeight: 600, display: "flex" }}>
            Easy Kitty Care
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 22, display: "flex", marginLeft: 4 }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 22, display: "flex", marginLeft: 4 }}>
            Shared Care Record
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", alignItems: "center", gap: 56, flex: 1 }}>
          {photoSrc ? (
            <img
              src={photoSrc}
              width={220}
              height={220}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "5px solid rgba(255,255,255,0.25)",
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 100,
              }}
            >
              🐱
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 80, fontWeight: 800, color: "white", lineHeight: 1, display: "flex" }}>
              {name}
            </div>
            {subtitle ? (
              <div
                style={{
                  fontSize: 34,
                  color: "rgba(255,255,255,0.75)",
                  textTransform: "capitalize",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: 18 }}>
          easykitty.care
        </div>
      </div>
    ),
    { ...size }
  );
}
