import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground text-sm">Loading sign-in…</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
