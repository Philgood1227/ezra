"use client";

import * as React from "react";
import { Button, Modal, ThemeToggle } from "@/components/ds";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { useFeedbackPreferences } from "@/lib/hooks/useFeedbackPreferences";
import {
  writeParentOnboardingState,
  type ParentOnboardingObjective,
} from "@/lib/preferences/onboarding";
import { cn } from "@/lib/utils";

interface ParentOnboardingModalProps {
  open: boolean;
  profileId: string | null;
  onClose: () => void;
}

type ParentOnboardingStep = "welcome" | "spaces" | "goal" | "preferences";

const STEP_ORDER: ParentOnboardingStep[] = ["welcome", "spaces", "goal", "preferences"];

const GOAL_OPTIONS: Array<{ value: NonNullable<ParentOnboardingObjective>; label: string }> = [
  { value: "routines", label: "Structurer les routines" },
  { value: "devoirs", label: "Suivre les devoirs" },
  { value: "motivation", label: "Motiver avec des recompenses" },
];

function ProgressDots({ currentStep }: { currentStep: number }): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Etape ${currentStep + 1} sur ${STEP_ORDER.length}`}>
      {STEP_ORDER.map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-2 rounded-radius-pill transition-colors duration-200",
            index === currentStep ? "bg-brand-primary" : "bg-border-default",
          )}
        />
      ))}
    </div>
  );
}

export function ParentOnboardingModal({
  open,
  profileId,
  onClose,
}: ParentOnboardingModalProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [objective, setObjective] = React.useState<ParentOnboardingObjective>(null);
  const { preferences, setHapticsEnabled, setSoundsEnabled } = useFeedbackPreferences("global");

  const step = STEP_ORDER[stepIndex] ?? STEP_ORDER[0];
  const canGoBack = stepIndex > 0;
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  React.useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setObjective(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "ArrowRight" && stepIndex < STEP_ORDER.length - 1) {
        setStepIndex((current) => Math.min(current + 1, STEP_ORDER.length - 1));
      }
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, stepIndex]);

  const handleSkip = React.useCallback(() => {
    writeParentOnboardingState(profileId, {
      completed: false,
      skipped: true,
      objective,
      completedAt: null,
    });
    onClose();
  }, [objective, onClose, profileId]);

  const handleContinue = React.useCallback(() => {
    if (isLastStep) {
      writeParentOnboardingState(profileId, {
        completed: true,
        skipped: false,
        objective,
        completedAt: new Date().toISOString(),
      });
      onClose();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, STEP_ORDER.length - 1));
  }, [isLastStep, objective, onClose, profileId]);

  return (
    <Modal open={open} onClose={handleSkip} title="" description="" className="max-w-xl p-5">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <ProgressDots currentStep={stepIndex} />
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-radius-button px-2 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            Ignorer pour plus tard
          </button>
        </div>

        {step === "welcome" ? (
          <StaggerContainer className="space-y-3">
            <StaggerItem>
              <h2 className="font-display text-2xl font-black text-text-primary">Bienvenue dans Ezra 👋</h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-sm text-text-secondary">
                Ezra t&apos;aide a organiser le quotidien de ton enfant et a suivre sa progression.
              </p>
            </StaggerItem>
          </StaggerContainer>
        ) : null}

        {step === "spaces" ? (
          <StaggerContainer className="space-y-3">
            <StaggerItem>
              <h2 className="font-display text-2xl font-black text-text-primary">Roles et espaces</h2>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">Espace Parent</p>
                <p className="text-xs text-text-secondary">Configurer les routines, devoirs et parametres.</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">Espace Enfant</p>
                <p className="text-xs text-text-secondary">Executer les taches, cocher, se concentrer et progresser.</p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        ) : null}

        {step === "goal" ? (
          <StaggerContainer className="space-y-3">
            <StaggerItem>
              <h2 className="font-display text-2xl font-black text-text-primary">Objectif principal</h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-sm text-text-secondary">Quel est ton objectif principal ?</p>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setObjective(option.value)}
                    className={cn(
                      "inline-flex h-touch-sm items-center justify-center rounded-radius-pill border px-3 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                      objective === option.value
                        ? "border-brand-primary bg-brand-primary/14 text-brand-primary"
                        : "border-border-default bg-bg-surface text-text-secondary",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </StaggerItem>
          </StaggerContainer>
        ) : null}

        {step === "preferences" ? (
          <StaggerContainer className="space-y-3">
            <StaggerItem>
              <h2 className="font-display text-2xl font-black text-text-primary">Preferences de base</h2>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">Theme</p>
                <p className="mb-2 text-xs text-text-secondary">Tu peux changer a tout moment.</p>
                <ThemeToggle />
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">Vibrations</p>
                <p className="mb-2 text-xs text-text-secondary">Feedback tactile sur les actions importantes.</p>
                <Button size="sm" variant={preferences.hapticsEnabled ? "primary" : "secondary"} onClick={() => setHapticsEnabled(!preferences.hapticsEnabled)}>
                  {preferences.hapticsEnabled ? "Activees" : "Desactivees"}
                </Button>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-radius-card border border-border-subtle bg-bg-surface-hover/60 p-3">
                <p className="text-sm font-semibold text-text-primary">Sons</p>
                <p className="mb-2 text-xs text-text-secondary">Desactives par defaut pour garder un environnement calme.</p>
                <Button size="sm" variant={preferences.soundsEnabled ? "primary" : "secondary"} onClick={() => setSoundsEnabled(!preferences.soundsEnabled)}>
                  {preferences.soundsEnabled ? "Actives" : "Desactives"}
                </Button>
              </div>
            </StaggerItem>
          </StaggerContainer>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))} disabled={!canGoBack}>
            Retour
          </Button>
          <Button size="sm" onClick={handleContinue}>
            {isLastStep ? "Terminer et ouvrir le tableau de bord" : "Continuer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
