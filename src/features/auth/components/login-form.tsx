"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ds";
import { emptyFormState, type FormSubmitState } from "@/features/auth/form-state";
import { loginSchema } from "@/features/auth/schemas";
import { toFieldErrors } from "@/features/auth/zod-errors";

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormSubmitState>(emptyFormState());
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState(emptyFormState());

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      setState({ fieldErrors: toFieldErrors(parsed.error.issues), formError: null });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/parent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok) {
        setState({
          fieldErrors: {},
          formError: body.error ?? "Connexion impossible pour le moment.",
        });
        return;
      }

      router.push(body.redirectTo ?? "/parent/dashboard");
    } catch {
      setState({ fieldErrors: {}, formError: "Connexion impossible pour le moment." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-semibold text-ink-muted">
          Email parent
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="parent@famille.com"
        />
        {state.fieldErrors.email ? (
          <p className="text-sm text-danger">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-semibold text-ink-muted">
          Mot de passe
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="8 caractères minimum"
        />
        {state.fieldErrors.password ? (
          <p className="text-sm text-danger">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.formError}</p>
      ) : null}

      <Button type="submit" fullWidth loading={isLoading}>
        Se connecter
      </Button>

      <div className="flex flex-col items-center gap-2 pt-2 text-sm text-ink-muted">
        <Link href="/auth/register" className="font-semibold text-accent-700 hover:underline">
          Créer un compte parent
        </Link>
        <Link href="/auth/pin" className="font-semibold text-accent-700 hover:underline">
          Accès enfant par PIN
        </Link>
      </div>
    </form>
  );
}
