import { cn } from "@/lib/utils";

interface KittenAvatarProps {
  name: string;
  photo?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10 text-base",
  md: "h-14 w-14 text-xl",
  lg: "h-20 w-20 text-3xl",
  xl: "h-28 w-28 text-5xl",
};

export function KittenAvatar({ name, photo, size = "md", className }: KittenAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const colors = [
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        color,
        className
      )}
    >
      {initial}
    </div>
  );
}
