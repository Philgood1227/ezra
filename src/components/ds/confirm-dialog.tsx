"use client";

import * as React from "react";
import { Button } from "@/components/ds/button";
import { Modal } from "@/components/ds/modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "link";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmVariant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  const modalDescription = typeof description === "string" ? description : undefined;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      {...(modalDescription ? { description: modalDescription } : {})}
      className="max-w-md"
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
