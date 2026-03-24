"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RevisionCardView } from "@/components/child/revisions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
} from "@/components/ds";
import {
  REVISION_CARD_KIND_GENERIC,
  REVISION_CARD_KIND_LABELS,
  REVISION_CARD_STATUS_PUBLISHED,
  toggleRevisionCardStatus,
} from "@/lib/revisions/constants";
import type { RevisionCardStatus, StoredRevisionCard } from "@/lib/revisions/types";

interface RevisionDetailActionResult {
  success: boolean;
  error?: string;
}

interface RevisionDetailClientProps {
  card: StoredRevisionCard;
  onSetStatusAction: (input: {
    cardId: string;
    status: RevisionCardStatus;
  }) => Promise<RevisionDetailActionResult>;
  onDeleteAction: (input: { cardId: string }) => Promise<RevisionDetailActionResult>;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function RevisionDetailClient({
  card,
  onSetStatusAction,
  onDeleteAction,
}: RevisionDetailClientProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isMutating, startMutation] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<"status" | "delete" | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const isPublished = card.status === REVISION_CARD_STATUS_PUBLISHED;
  const nextStatus = toggleRevisionCardStatus(card.status);
  const childPath = `/child/revisions/${card.id}`;

  function runMutation(
    type: "status" | "delete",
    action: () => Promise<RevisionDetailActionResult>,
    onSuccess: () => void,
  ): void {
    setPendingAction(type);
    startMutation(() => {
      void (async () => {
        const result = await action();
        if (!result.success) {
          setErrorMessage(result.error ?? "Action impossible.");
          return;
        }

        setErrorMessage(null);
        onSuccess();
      })().finally(() => {
        setPendingAction(null);
      });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPublished ? "success" : "warning"}>{card.status}</Badge>
            <Badge variant={card.content.kind === REVISION_CARD_KIND_GENERIC ? "neutral" : "info"}>
              {REVISION_CARD_KIND_LABELS[card.content.kind]}
            </Badge>
            <Badge variant="neutral">{card.subject}</Badge>
            {card.level ? <Badge variant="neutral">{card.level}</Badge> : null}
          </div>
          <CardTitle className="text-3xl leading-tight md:text-4xl">{card.title}</CardTitle>
          {card.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          <p className="text-xs font-medium text-text-secondary">
            Mis a jour le {formatUpdatedAt(card.updatedAt)}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Link href={childPath}>
            <Button variant="ghost">Ouvrir cote enfant</Button>
          </Link>
          <Link href={`/parent/revisions/${card.id}/edit`}>
            <Button variant="tertiary">Editer</Button>
          </Link>
          <Button
            type="button"
            variant="secondary"
            disabled={isMutating}
            loading={pendingAction === "status"}
            onClick={() => {
              runMutation(
                "status",
                () => onSetStatusAction({ cardId: card.id, status: nextStatus }),
                () => {
                  router.refresh();
                },
              );
            }}
          >
            {isPublished ? "Depublier" : "Publier"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isMutating}
            onClick={() => {
              setIsDeleteDialogOpen(true);
            }}
          >
            Supprimer
          </Button>
        </CardContent>
      </Card>

      {!isPublished ? (
        <Card className="border-status-warning/40">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-status-warning">
              L&apos;enfant voit uniquement les fiches publiees.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-status-error/40">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-status-error">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <RevisionCardView
        card={card}
        showHeader={false}
        showMarkReviewedControls={false}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Supprimer cette fiche ?"
        description={`La fiche "${card.title}" sera retiree de la bibliotheque.`}
        confirmLabel="Supprimer la fiche"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={pendingAction === "delete"}
        onCancel={() => {
          if (!isMutating) {
            setIsDeleteDialogOpen(false);
          }
        }}
        onConfirm={() => {
          runMutation(
            "delete",
            () => onDeleteAction({ cardId: card.id }),
            () => {
              setIsDeleteDialogOpen(false);
              router.push("/parent/revisions");
              router.refresh();
            },
          );
        }}
      />
    </div>
  );
}
