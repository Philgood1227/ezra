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
  TextArea,
  useToast,
} from "@/components/ds";
import {
  PARENT_REVISION_AI_TYPE_OPTIONS,
  PARENT_REVISION_SUBJECT_OPTIONS,
  type ParentRevisionAIType,
} from "@/lib/revisions/parent-drafts";

export interface GenerateRevisionFormInput {
  subject: string;
  type: ParentRevisionAIType;
  level: string;
  topic: string;
  source: string;
}

export interface GenerateRevisionFormResult {
  success: boolean;
  error?: string;
  cardId?: string;
  fieldErrors?: Partial<Record<keyof GenerateRevisionFormInput, string>>;
}

interface ParentGenerateRevisionPageProps {
  onGenerateAction: (input: GenerateRevisionFormInput) => Promise<GenerateRevisionFormResult>;
}

type FieldErrors = Partial<Record<keyof GenerateRevisionFormInput, string>>;

const DEFAULT_SUBJECT = PARENT_REVISION_SUBJECT_OPTIONS[0];
const DEFAULT_TYPE = PARENT_REVISION_AI_TYPE_OPTIONS[0];
const DEFAULT_LEVEL = "6P";

export function ParentGenerateRevisionPage({
  onGenerateAction,
}: ParentGenerateRevisionPageProps): React.JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [subject, setSubject] = React.useState<string>(DEFAULT_SUBJECT);
  const [type, setType] = React.useState<ParentRevisionAIType>(DEFAULT_TYPE);
  const [level, setLevel] = React.useState<string>(DEFAULT_LEVEL);
  const [topic, setTopic] = React.useState<string>("");
  const [source, setSource] = React.useState<string>("");
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
        const result = await onGenerateAction({
          subject,
          type,
          level,
          topic,
          source,
        });

        if (!result.success) {
          setErrorMessage(result.error ?? "Generation failed.");
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error ?? "Generation failed.");
          return;
        }

        if (!result.cardId) {
          setErrorMessage("Generation failed. Missing card id.");
          toast.error("Generation failed. Missing card id.");
          return;
        }

        toast.success("Revision generated as draft.");
        router.push(`/parent/revisions/${result.cardId}`);
        router.refresh();
      })();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Generate a revision card</CardTitle>
        <CardDescription>
          Create an AI-assisted draft from subject, level, and topic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="generate-revision-subject" className="text-sm font-semibold text-text-primary">
              Subject
            </label>
            <Select
              id="generate-revision-subject"
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
            <label htmlFor="generate-revision-type" className="text-sm font-semibold text-text-primary">
              Type
            </label>
            <Select
              id="generate-revision-type"
              value={type}
              onChange={(event) => {
                const nextType = event.target.value;
                if (PARENT_REVISION_AI_TYPE_OPTIONS.includes(nextType as ParentRevisionAIType)) {
                  setType(nextType as ParentRevisionAIType);
                }
              }}
              errorMessage={fieldErrors.type}
            >
              {PARENT_REVISION_AI_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="generate-revision-level" className="text-sm font-semibold text-text-primary">
              Level
            </label>
            <Input
              id="generate-revision-level"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
              }}
              placeholder="6P"
              errorMessage={fieldErrors.level}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="generate-revision-topic" className="text-sm font-semibold text-text-primary">
              Topic
            </label>
            <Input
              id="generate-revision-topic"
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
              }}
              placeholder="Complement de phrase"
              errorMessage={fieldErrors.topic}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="generate-revision-source" className="text-sm font-semibold text-text-primary">
              Parent source content
            </label>
            <TextArea
              id="generate-revision-source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
              }}
              placeholder="Paste lesson notes or document extract here. AI will stay strictly inside this source."
              rows={8}
              errorMessage={fieldErrors.source}
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
                Generate draft
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
