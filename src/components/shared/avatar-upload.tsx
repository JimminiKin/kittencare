"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentUrl?: string;
  name: string;
  storagePath: string;
  onUploaded: (url: string) => void | Promise<void>;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  md: "h-14 w-14 text-xl",
  lg: "h-20 w-20 text-3xl",
  xl: "h-28 w-28 text-5xl",
};

const colors = [
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
];

export function AvatarUpload({
  currentUrl,
  name,
  storagePath,
  onUploaded,
  size = "lg",
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const [error, setError] = useState("");

  const safeName = name || "?";
  const initial = safeName.charAt(0).toUpperCase();
  const color = colors[safeName.charCodeAt(0) % colors.length];

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError("");
    setUploading(true);

    const supabase = getSupabaseClient();
    const path = `${storagePath}/avatar`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    // Append timestamp to bust browser cache when the same path is re-uploaded.
    const freshUrl = `${publicUrl}?v=${Date.now()}`;
    setPreviewUrl(freshUrl);
    await onUploaded(freshUrl);
    setUploading(false);
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <button
        type="button"
        className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload photo"
      >
        <div className={cn("rounded-full overflow-hidden", sizeClasses[size])}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={safeName} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center font-bold", color)}>
              {initial}
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity",
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so the same file can be re-selected after an error.
          e.target.value = "";
        }}
      />
    </div>
  );
}
