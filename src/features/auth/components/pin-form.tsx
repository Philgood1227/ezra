"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ds";
import { emptyFormState, type FormSubmitState } from "@/features/auth/form-state";
import { childPinSchema } from "@/features/auth/schemas";
import { toFieldErrors } from "@/features/auth/zod-errors";

export function PinForm(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormSubmitState>(emptyFormState());
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState(emptyFormState());

    const formData = new FormData(event.currentTarget);
    const payload = {
      familyName: String(formData.get("familyName") ?? ""),
      childName: String(formData.get("childName") ?? ""),
      pin: String(formData.get("pin") ?? ""),
    };

    const parsed = childPinSchema.safeParse(payload);
    if (!parsed.success) {
      setState({ fieldErrors: toFieldErrors(parsed.error.issues), formError: null });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/child/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok) {
        setState({
          fieldErrors: {},
          formError: body.error ?? "Connexion enfant impossible pour le moment.",
        });
        return;
      }

      router.push(body.redirectTo ?? "/child");
    } catch {
      setState({ fieldErrors: {}, formError: "Connexion enfant impossible pour le moment." });
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
        <Input id="familyName" name="familyName" placeholder="Famille Martin" />
        {state.fieldErrors.familyName ? (
          <p className="text-sm text-danger">{state.fieldErrors.familyName}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="childName" className="text-sm font-semibold text-ink-muted">
          Prénom de l&apos;enfant
        </label>
        <Input id="childName" name="childName" placeholder="Ezra" />
        {state.fieldErrors.childName ? (
          <p className="text-sm text-danger">{state.fieldErrors.childName}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="pin" className="text-sm font-semibold text-ink-muted">
          PIN
        </label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={8}
          placeholder="4 à 8 chiffres"
        />
        {state.fieldErrors.pin ? (
          <p className="text-sm text-danger">{state.fieldErrors.pin}</p>
        ) : null}
      </div>

      {state.formError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.formError}</p>
      ) : null}

      <Button type="submit" fullWidth loading={isLoading}>
        Entrer dans l&apos;espace enfant
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Compte parent ?{" "}
        <Link href="/auth/login" className="font-semibold text-accent-700 hover:underline">
          Aller à la connexion
        </Link>
      </p>
    </form>
  );
}
