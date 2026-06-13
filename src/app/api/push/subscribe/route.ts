import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const admin = getSupabaseAdmin();
  const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  return user ?? null;
}

// Save a push subscription for the authenticated user.
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint, p256dh, auth } = await req.json() as {
    endpoint: string;
    p256dh: string;
    auth: string;
  };
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth_key: auth },
      { onConflict: "endpoint" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// Remove a push subscription (called on disable).
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint: string };
  if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });

  const admin = getSupabaseAdmin();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return Response.json({ ok: true });
}
