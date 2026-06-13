import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const storagePath = form.get("storagePath") as string | null;

  if (!file || !storagePath) {
    return Response.json({ error: "Missing file or storagePath" }, { status: 400 });
  }

  // Validate path: users can only write to users/<their-id>/ or kittens/.
  const [prefix, ownerId] = storagePath.split("/");
  if (prefix === "users" && ownerId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (prefix !== "users" && prefix !== "kittens") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  // Ensure bucket exists (no-op if already created).
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const path = `${storagePath}/avatar`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  return Response.json({ publicUrl });
}
