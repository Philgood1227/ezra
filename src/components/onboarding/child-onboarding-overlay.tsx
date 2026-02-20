"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ds";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import {
  writeChildOnboardingState,
} from "@/lib/preferences/onboarding";
import { cn } from "@/lib/utils";

interface ChildOnboardingOverlayProps {
  open: boolean;
  profileId: string | null;
  childName: string;
  mode?: "full" | "mini";
  onClose: () => void;
}

type ChildStep = "welcome" | "tabs" | "ready";

const FULL_STEPS: ChildStep[] = ["welcome", "tabs", "ready"];

const TAB_ITEMS = [
  {
    icon: "🏠",
    title: "Accueil",
    description: "Un apercu rapide de ta journee.",
  },
  {
    icon: "📋",
    title: "Ma journee",
    description: "Les taches a faire, maintenant et ensuite.",
  },
  {
    icon: "✅",
    title: "Checklists",
    description: "Verifier ton sac, ta piscine, etc.",
  },
  {
    icon: "📚",
    title: "Decouvertes",
    description: "Des fiches d'aide pour les devoirs.",
  },
];

export function ChildOnboardingOverlay({
  open,
  profileId,
  childName,
  mode = "full",
  onClose,
}: ChildOnboardingOverlayProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [remindLater, setRemindLater] = React.useState(false);

  const steps = mode === "mini" ? (["tabs"] as ChildStep[]) : FULL_STEPS;
  const step = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex === steps.length - 1;

  React.useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setRemindLater(false);
    }
  }, [open]);

  const overlayMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const contentMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 24 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const handleNext = React.useCallback(() => {
    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    if (mode === "mini") {
      writeChildOnboardingState(profileId, {
        completed: true,
        remindLater: false,
        completedAt: new Date().toISOString(),
      });
      onClose();
      return;
    }

    writeChildOnboardingState(profileId, {
      completed: true,
      remindLater,
      completedAt: new Date().toISOString(),
    });
    onClose();
  }, [isLastStep, mode, onClose, profileId, remindLater, steps.length]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          className="fixed inset-0 z-[70] bg-gradient-to-b from-brand-primary/20 via-bg-base to-bg-base px-4 py-6 pt-safe md:px-8"
          {...overlayMotionProps}
        >
          <motion.div
            className="mx-auto flex h-full w-full max-w-[860px] flex-col justify-center"
            {...contentMotionProps}
          >
            <div className="rounded-radius-card border border-border-subtle bg-bg-surface/88 p-5 shadow-elevated backdrop-blur-md md:p-6">
              {step === "welcome" ? (
                <StaggerContainer className="space-y-4 text-center">
                  <StaggerItem>
                    <p className="text-6xl" aria-hidden="true">
                      🌟
                    </p>
                  </StaggerItem>
                  <StaggerItem>
                    <h2 className="font-display text-3xl font-black text-text-primary">
                      Bienvenue {childName} !
                    </h2>
                  </StaggerItem>
                  <StaggerItem>
                    <p className="text-base text-text-secondary">
                      Ici, tu peux voir ta journee, cocher tes taches et suivre tes succes.
                    </p>
                  </StaggerItem>
                </StaggerContainer>
              ) : null}

              {step === "tabs" ? (
                <StaggerContainer className="space-y-3">
                  <StaggerItem>
                    <h2 className="text-center font-display text-3xl font-black text-text-primary">
                      Tes onglets principaux
                    </h2>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {TAB_ITEMS.map((item) => (
                        <article
                          key={item.title}
                          className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-3"
                        >
                          <p className="text-xl" aria-hidden="true">
                            {item.icon}
                          </p>
                          <p className="text-sm font-bold text-text-primary">{item.title}</p>
                          <p className="text-xs text-text-secondary">{item.description}</p>
                        </article>
                      ))}
                    </div>
                  </StaggerItem>
                </StaggerContainer>
              ) : null}

              {step === "ready" ? (
                <StaggerContainer className="space-y-4 text-center">
                  <StaggerItem>
                    <h2 className="font-display text-3xl font-black text-text-primary">Pret a commencer ?</h2>
                  </StaggerItem>
                  <StaggerItem>
                    <label
                      className={cn(
                        "mx-auto flex w-full max-w-md cursor-pointer items-center justify-between rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 px-3 py-3",
                      )}
                    >
                      <span className="text-sm font-semibold text-text-primary">
                        Me rappeler plus tard
                      </span>
                      <input
                        type="checkbox"
                        className="size-5 accent-brand-primary"
                        checked={remindLater}
                        onChange={(event) => setRemindLater(event.target.checked)}
                      />
                    </label>
                  </StaggerItem>
                </StaggerContainer>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5" aria-label={`Etape ${stepIndex + 1} sur ${steps.length}`}>
                  {steps.map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "size-2 rounded-radius-pill",
                        index === stepIndex ? "bg-brand-primary" : "bg-border-default",
                      )}
                    />
                  ))}
                </div>
                <Button onClick={handleNext}>
                  {mode === "mini"
                    ? "Fermer"
                    : step === "welcome"
                      ? "Decouvrir"
                      : step === "tabs"
                        ? "C'est compris"
                        : "Aller a l'accueil"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

