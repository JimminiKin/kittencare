"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/context";

interface InviteDetails {
  householdName: string;
  invitedBy: string | null;
}

export function InviteView({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const t = useTranslations("invite");
  const tc = useTranslations("common");

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setErrorKey(data.error);
        else setInvite(data);
      })
      .catch(() => setErrorKey("notFound"));
  }, [token]);

  async function handleAccept() {
    if (!user) return;
    setAccepting(true);
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setAccepting(false);
    if (data.error) { setErrorKey(data.error); return; }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  if (authLoading || (!invite && !errorKey)) {
    return <div className="flex justify-center py-16 text-muted-foreground">{tc("loading")}</div>;
  }

  if (errorKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">😿</div>
        <p className="font-semibold text-lg">{t(errorKey as any)}</p>
        <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
      </div>
    );
  }

  if (done && invite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🎉</div>
        <p className="font-semibold text-lg">{t("joined", { household: invite.householdName })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <div className="text-6xl">🐱</div>
      <div>
        {invite?.invitedBy && (
          <p className="text-sm text-muted-foreground">
            {t("invitedBy", { name: invite.invitedBy })}
          </p>
        )}
        <h1 className="text-2xl font-bold mt-1">{invite?.householdName}</h1>
      </div>

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("signInFirst")}</p>
          <Button asChild>
            <Link href={`/auth`}>{t("signInButton")}</Link>
          </Button>
        </div>
      ) : (
        <Button size="lg" onClick={handleAccept} disabled={accepting}>
          {accepting ? t("accepting") : t("accept", { household: invite?.householdName ?? "" })}
        </Button>
      )}
    </div>
  );
}
