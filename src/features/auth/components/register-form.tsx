"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ds";
import { emptyFormState, type FormSubmitState } from "@/features/auth/form-state";
import { registerSchema } from "@/features/auth/schemas";
import { toFieldErrors } from "@/features/auth/zod-errors";

export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormSubmitState>(emptyFormState());
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState(emptyFormState());

    const formData = new FormData(event.currentTarget);
    const payload = {
      familyName: String(formData.get("familyName") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      setState({ fieldErrors: toFieldErrors(parsed.error.issues), formError: null });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/parent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setState({
          fieldErrors: {},
          formError: body.error ?? "Inscription impossible pour le moment.",
        });
        return;
      }

      if (body.redirectTo) {
        router.push(body.redirectTo);
        return;
      }

      setState({
        fieldErrors: {},
        formError: body.message ?? "Compte créé. Vérifiez votre boîte email avant de vous connecter.",
      });
    } catch {
      setState({ fieldErrors: {}, formError: "Inscription impossible pour le moment." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-1">
        <label htmlFor="familyName" className="text-sm font-semibold text-ink-muted">
          Nom de la famille
        </label>
        <Input id="familyName" name="familyName" placeholder="Martin Family" />
        {state.fieldErrors.familyName ? (
          <p className="text-sm text-danger">{state.fieldErrors.familyName}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="displayName" className="text-sm font-semibold text-ink-muted">
          Nom affiché du parent
        </label>
        <Input id="displayName" name="displayName" placeholder="Alice Martin" />
        {state.fieldErrors.displayName ? (
          <p className="text-sm text-danger">{state.fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-semibold text-ink-muted">
          Email
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
          autoComplete="new-password"
          placeholder="8 caractères minimum"
        />
        {state.fieldErrors.password ? (
          <p className="text-sm text-danger">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-800">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" fullWidth loading={isLoading}>
        Créer le compte
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/auth/login" className="font-semibold text-accent-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
