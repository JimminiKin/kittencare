"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cat, Utensils, Scale, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/context";

const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/kittens", key: "kittens", icon: Cat },
  { href: "/feed", key: "feed", icon: Utensils },
  { href: "/weight", key: "weight", icon: Scale },
  { href: "/health", key: "health", icon: Activity },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-lg">
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <span className={cn(active && "font-semibold")}>{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
