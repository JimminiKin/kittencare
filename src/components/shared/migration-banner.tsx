"use client";

import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { getDB } from "@/db/database";
import {
  migrateLocalToCloud,
  isMigrated,
  markMigrated,
} from "@/services/migration.service";
import { useTranslations } from "@/i18n/context";

export function MigrationBanner() {
  const { user } = useAuthStore();
  const t = useTranslations("migration");

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isMigrated(user.id)) return;

    getDB()
      .kittens.toArray()
      .then((kittens) => {
        if (kittens.length > 0) setShow(true);
        else markMigrated(user.id);
      })
      .catch(() => {});
  }, [user]);

  if (!show) return null;

  async function handleUpload() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const res = await migrateLocalToCloud(user.id);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setDone(res.count);
      setTimeout(() => setShow(false), 2500);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-2">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
        <Upload className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          {done !== null ? (
            <p className="text-sm font-medium text-primary">
              {t("success", { count: done })}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium">{t("banner")}</p>
              {error && (
                <p className="text-xs text-destructive mt-1">
                  {t("error", { error })}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleUpload} disabled={loading}>
                  {loading ? t("uploading") : t("uploadButton")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShow(false)}
                  disabled={loading}
                >
                  {t("dismiss")}
                </Button>
              </div>
            </>
          )}
        </div>
        {done === null && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShow(false)}
            disabled={loading}
            className="shrink-0 -mt-1 -mr-1"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
