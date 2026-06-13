import { Suspense } from "react";
import { AuthView } from "@/features/auth/auth-view";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthView />
    </Suspense>
  );
}
