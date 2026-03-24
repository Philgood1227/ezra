"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ds";
import { emptyFormState, type FormSubmitState } from "@/features/auth/form-state";
import { pinConfigSchema } from "@/features/auth/schemas";
import { toFieldErrors } from "@/features/auth/zod-errors";

export function SetPinForm(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormSubmitState>(emptyFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState(emptyFormState());
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      childName: String(formData.get("childName") ?? ""),
      pin: String(formData.get("pin") ?? ""),
    };

    const parsed = pinConfigSchema.safeParse(payload);
    if (!parsed.success) {
      setState({ fieldErrors: toFieldErrors(parsed.error.issues), formError: null });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/child/pin-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setState({
          fieldErrors: {},
          formError: body.error ?? "Impossible d'enregistrer le PIN enfant.",
        });
        return;
      }

      setSuccessMessage(body.message ?? "PIN enfant enregistré.");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setState({ fieldErrors: {}, formError: "Impossible d'enregistrer le PIN enfant." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
          Nouveau PIN
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
      {successMessage ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" loading={isLoading}>
        Enregistrer le PIN enfant
      </Button>
    </form>
  );
}
