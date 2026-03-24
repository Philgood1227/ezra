"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  useToast,
} from "@/components/ds";
import {
  type CreateDraftActionResult,
  type CreateDraftInput,
  PARENT_REVISION_SUBJECT_OPTIONS,
  PARENT_REVISION_TYPE_OPTIONS,
} from "@/lib/revisions/parent-drafts";
import type { CardType } from "@/lib/revisions/types";

interface ParentNewRevisionPageProps {
  onCreateDraftAction: (input: CreateDraftInput) => Promise<CreateDraftActionResult>;
}

type FieldErrors = Partial<Record<keyof CreateDraftInput, string>>;

const DEFAULT_SUBJECT = PARENT_REVISION_SUBJECT_OPTIONS[0];
const DEFAULT_TYPE = PARENT_REVISION_TYPE_OPTIONS[0];
const DEFAULT_LEVEL = "6P";

export function ParentNewRevisionPage({
  onCreateDraftAction,
}: ParentNewRevisionPageProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = React.useState<string>(DEFAULT_SUBJECT);
  const [type, setType] = React.useState<CardType>(DEFAULT_TYPE);
  const [level, setLevel] = React.useState<string>(DEFAULT_LEVEL);
  const [title, setTitle] = React.useState<string>("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [isPending, startTransition] = React.useTransition();

  function clearErrors(): void {
    setErrorMessage(null);
    setFieldErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    clearErrors();

    startTransition(() => {
      void (async () => {
        const result = await onCreateDraftAction({
          subject,
          type,
          level,
          title,
        });

        if (!result.success) {
          setErrorMessage(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }

        toast.success("Draft saved.");
        router.push("/parent/revisions");
        router.refresh();
      })();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">New revision</CardTitle>
        <CardDescription>
          Create a minimal draft card manually (subject, type, level, title).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="new-revision-subject" className="text-sm font-semibold text-text-primary">
              Subject
            </label>
            <Select
              id="new-revision-subject"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
              }}
              errorMessage={fieldErrors.subject}
            >
              {PARENT_REVISION_SUBJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-revision-type" className="text-sm font-semibold text-text-primary">
              Type
            </label>
            <Select
              id="new-revision-type"
              value={type}
              onChange={(event) => {
                const nextType = event.target.value;
                if (PARENT_REVISION_TYPE_OPTIONS.includes(nextType as CardType)) {
                  setType(nextType as CardType);
                }
              }}
              errorMessage={fieldErrors.type}
            >
              {PARENT_REVISION_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-revision-level" className="text-sm font-semibold text-text-primary">
              Level
            </label>
            <Input
              id="new-revision-level"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
              }}
              placeholder="6P"
              errorMessage={fieldErrors.level}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-revision-title" className="text-sm font-semibold text-text-primary">
              Title
            </label>
            <Input
              id="new-revision-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Fractions equivalentes"
              errorMessage={fieldErrors.title}
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm font-semibold text-status-error">
              {errorMessage}
            </p>
          ) : null}

          <div className="-mx-6 sticky bottom-0 z-10 border-t border-border-subtle bg-bg-base/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg-base/85">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  router.push("/parent/revisions");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="premium" loading={isPending}>
                Save draft
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
