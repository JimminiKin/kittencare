"use client";

import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import { useKittens } from "@/hooks/use-kittens";
import { useTranslations } from "@/i18n/context";
import { useFormatAge } from "@/lib/use-format-age";

export function KittenListView() {
  const { data: kittens = [], isLoading: loading } = useKittens();
  const t = useTranslations("kitten");
  const formatAge = useFormatAge();

  const active = kittens.filter((k) => k.status === "active");
  const archived = kittens.filter((k) => k.status !== "active");

  const KittenRow = ({ kitten }: { kitten: (typeof kittens)[0] }) => (
    <Link href={`/kittens/${kitten.id}`}>
      <Card className="active:scale-[0.98] transition-transform">
        <CardContent className="flex items-center gap-3 p-4">
          <KittenAvatar name={kitten.name} photo={kitten.photo} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{kitten.name}</span>
              {kitten.status !== "active" && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {t(`status${kitten.status.charAt(0).toUpperCase()}${kitten.status.slice(1)}` as Parameters<typeof t>[0])}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatAge(kitten.estimatedAgeDays, kitten.birthDate)}
              {kitten.sex && kitten.sex !== "unknown" && ` · ${t(`sex${kitten.sex.charAt(0).toUpperCase()}${kitten.sex.slice(1)}Label` as Parameters<typeof t>[0])}`}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("activeCount", { count: active.length })}</h2>
        <Button size="sm" asChild>
          <Link href="/kittens/new">
            <Plus className="h-4 w-4" /> {t("addButton")}
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <span className="text-5xl">🐱</span>
          <p className="text-muted-foreground text-sm">{t("noActive")}</p>
          <Button asChild>
            <Link href="/kittens/new"><Plus className="h-4 w-4" /> {t("addButton")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((k) => <KittenRow key={k.id} kitten={k} />)}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-muted-foreground pt-2">
            {t("archivedCount", { count: archived.length })}
          </h2>
          <div className="space-y-2 opacity-60">
            {archived.map((k) => <KittenRow key={k.id} kitten={k} />)}
          </div>
        </>
      )}
    </div>
  );
}
