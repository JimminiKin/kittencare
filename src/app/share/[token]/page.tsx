import type { Metadata } from "next";
import { ShareView } from "@/features/share/share-view";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data: share } = await admin
    .from("share_tokens")
    .select("kittens(name), expires_at")
    .eq("token", token)
    .single();

  if (!share) return {};
  if (share.expires_at && new Date(share.expires_at) < new Date()) return {};

  const name = (share.kittens as any)?.name ?? "Kitten";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://easykitty.care";

  return {
    title: `${name}'s Care Record · Easy Kitty Care`,
    description: `View ${name}'s health and care information shared via Easy Kitty Care.`,
    openGraph: {
      title: `${name}'s Care Record`,
      description: `View ${name}'s health and care information.`,
      type: "website",
      url: `${base}/share/${token}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s Care Record`,
      description: `View ${name}'s health and care information.`,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShareView token={token} />;
}
