"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/context";

interface TransferDetails {
  kittenName: string;
  kittenPhoto: string | null;
  fromHousehold: string;
  transferredBy: string | null;
}

export function TransferAcceptView({ token }: { token: string }) {
  const { user } = useAuthStore();
  const t = useTranslations("transfer");
  const tc = useTranslations("common");

  const [details, setDetails] = useState<TransferDetails | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/transfer/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setErrorKey(data.error);
        else setDetails(data);
      })
      .catch(() => setErrorKey("notFound"));
  }, [token]);

  async function handleAccept() {
    if (!user) return;
    setAccepting(true);
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const res = await fetch(`/api/transfer/${token}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();
    setAccepting(false);
    if (data.error) { setErrorKey(data.error); return; }
    setDone(true);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }

  if (!details && !errorKey) {
    return <div className="flex justify-center py-16 text-muted-foreground">{tc("loading")}</div>;
  }

  if (errorKey) {
    const messages: Record<string, string> = {
      notFound: t("errorNotFound"),
      alreadyAccepted: t("errorAlreadyAccepted"),
      noHousehold: t("errorNoHousehold"),
      sameHousehold: t("errorSameHousehold"),
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">😿</div>
        <p className="font-semibold text-lg">{messages[errorKey] ?? t("errorNotFound")}</p>
        <Button asChild variant="outline"><Link href="/">{tc("goHome")}</Link></Button>
      </div>
    );
  }

  if (done && details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🐱</div>
        <p className="font-semibold text-lg">{t("accepted", { name: details.kittenName })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <KittenAvatar name={details!.kittenName} photo={details!.kittenPhoto} size="lg" />
      <div>
        {details!.transferredBy && (
          <p className="text-sm text-muted-foreground">
            {t("transferredBy", { name: details!.transferredBy })}
          </p>
        )}
        <h1 className="text-2xl font-bold mt-1">{details!.kittenName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("fromHousehold", { household: details!.fromHousehold })}
        </p>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{t("description")}</p>

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("signInFirst")}</p>
          <Button asChild>
            <Link href={`/auth?redirectTo=/transfer/${token}`}>{t("signInButton")}</Link>
          </Button>
        </div>
      ) : (
        <Button size="lg" onClick={handleAccept} disabled={accepting}>
          {accepting ? t("accepting") : t("accept", { name: details!.kittenName })}
        </Button>
      )}
    </div>
  );
}
