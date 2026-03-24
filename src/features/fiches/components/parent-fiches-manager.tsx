"use client";

import * as React from "react";
import Image from "next/image";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  RichTextEditor,
  Select,
  TextArea,
} from "@/components/ds";
import {
  FICHE_FAMILLE_DEFINITIONS,
  FICHE_MATIERE_OPTIONS,
  FICHE_TEMPLATE_DEFINITIONS,
  createDefaultFiche,
  createEmptyFrequentError,
  createEmptyVisual,
  getDefaultFamilleForMatiere,
  getFamilleDefinition,
  getFamiliesByMatiere,
  getTemplateDefinition,
  getTemplateTypeForSelection,
  remapBlocksForTemplate,
  type FicheBlock,
  type FicheFamilleTemplate,
  type FicheMatiere,
  type FicheRecord,
  type FicheTemplateType,
  type FicheVisual,
} from "@/features/fiches/types";

const STORAGE_KEY = "ezra-parent-fiches-v2";
const MAX_VISUAL_FILE_BYTES = 5 * 1024 * 1024;
const LIBRARY_PAGE_SIZE = 12;

type FicheTabId = "editor" | "library";
type FicheStepId = "infos" | "famille" | "template" | "contenu" | "astuces" | "visuels";
type FeedbackState = { tone: "success" | "error"; message: string };
type LibraryMatiereFilter = "Toutes" | FicheMatiere;
type LibraryFamilleFilter = "Toutes" | FicheFamilleTemplate;

const STEPS: Array<{ id: FicheStepId; title: string; helper: string }> = [
  {
    id: "infos",
    title: "Infos de base",
    helper: "Titre et matiere",
  },
  {
    id: "famille",
    title: "Famille de template",
    helper: "Choisir la famille pedagogique",
  },
  {
    id: "template",
    title: "Type de template",
    helper: "Type determine automatiquement",
  },
  {
    id: "contenu",
    title: "Contenu de la fiche",
    helper: "Blocs adaptes au template choisi",
  },
  {
    id: "astuces",
    title: "Trucs & astuces",
    helper: "Checklist, memo, erreurs frequentes",
  },
  {
    id: "visuels",
    title: "Visuels / graphismes",
    helper: "Upload et notes visuelles",
  },
];

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getMatiereLabel(matiere: FicheMatiere): string {
  return FICHE_MATIERE_OPTIONS.find((option) => option.value === matiere)?.label ?? matiere;
}

function normalizeBlockToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isAQuoiBlock(block: FicheBlock): boolean {
  return normalizeBlockToken(block.key).includes("a quoi ca sert");
}

function isARetenirBlock(block: FicheBlock): boolean {
  return normalizeBlockToken(block.key).includes("a retenir");
}

function isExampleBlock(block: FicheBlock): boolean {
  const token = normalizeBlockToken(block.key);
  return token.includes("exemple") || token.includes("quiz");
}

function isKeyPreviewBlock(block: FicheBlock): boolean {
  const token = normalizeBlockToken(block.key);
  return (
    token.includes("schema") ||
    token.includes("regle") ||
    token.includes("etapes") ||
    token.includes("portrait") ||
    token.includes("strategie") ||
    token.includes("relations entre unites")
  );
}

function shouldCollapsePreviewBlock(block: FicheBlock): boolean {
  const plain = stripHtml(block.contentHtml);
  const token = normalizeBlockToken(block.title);
  return (
    plain.length > 520 ||
    token.includes("role") ||
    token.includes("comment") ||
    token.includes("vue d ensemble") ||
    token.includes("tableau") ||
    token.includes("questions")
  );
}

function getPreviewSectionIcon(title: string): string {
  const token = normalizeBlockToken(title);

  if (token.includes("definition")) return "📘";
  if (token.includes("role") || token.includes("comment") || token.includes("identifier")) return "🔍";
  if (token.includes("exemple") || token.includes("quiz")) return "✏️";
  if (token.includes("vocabulaire")) return "🧩";
  if (token.includes("methode") || token.includes("etapes")) return "🛠️";

  return "🧠";
}

function extractPreviewBulletsFromHtml(html: string, limit = 4): string[] {
  const liMatches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => stripHtml(match[1] ?? ""))
    .filter(Boolean);

  if (liMatches.length > 0) {
    return liMatches.slice(0, limit);
  }

  const text = stripHtml(html);
  if (!text) return [];

  return text
    .split(/[.;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function toRichPreview(html: string): React.JSX.Element {
  if (!html.trim()) {
    return <p className="text-sm text-text-muted">Non renseigne.</p>;
  }

  return (
    <div
      className="space-y-2 text-sm text-text-secondary [&_a]:text-brand-primary [&_a]:underline [&_blockquote]:rounded-radius-button [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:bg-brand-50/65 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:ml-5 [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function parseStoredData(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasTemplateType(value: unknown): value is FicheTemplateType {
  if (typeof value !== "string") return false;
  return value in FICHE_TEMPLATE_DEFINITIONS;
}

function normalizeStoredFiche(entry: unknown): FicheRecord | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;

  const matiere: FicheMatiere = raw.matiere === "Mathematiques" ? "Mathematiques" : "Francais";
  const rawFamille = typeof raw.famille_template === "string" ? raw.famille_template : "";
  const familleFromRaw = getFamilleDefinition(rawFamille as FicheFamilleTemplate)?.id ?? null;
  const familleTemplate = familleFromRaw ?? getDefaultFamilleForMatiere(matiere);

  const mappedTemplate = getTemplateTypeForSelection(matiere, familleTemplate);
  const templateType = hasTemplateType(raw.template_type) ? raw.template_type : mappedTemplate;

  const rawBlocks = Array.isArray(raw.blocs)
    ? raw.blocs
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const block = item as Record<string, unknown>;
          return {
            key: typeof block.key === "string" ? block.key : "",
            title: typeof block.title === "string" ? block.title : "",
            description: typeof block.description === "string" ? block.description : "",
            required: Boolean(block.required),
            contentHtml: typeof block.contentHtml === "string" ? block.contentHtml : "",
          } as FicheBlock;
        })
        .filter((block) => block.key.length > 0)
    : [];

  const rawTrucs =
    raw.trucs_astuces && typeof raw.trucs_astuces === "object"
      ? (raw.trucs_astuces as Record<string, unknown>)
      : {};

  const rawErreurs = Array.isArray(rawTrucs.erreursFrequentes)
    ? rawTrucs.erreursFrequentes
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const row = item as Record<string, unknown>;
          return {
            id: typeof row.id === "string" && row.id ? row.id : createEmptyFrequentError().id,
            erreur: typeof row.erreur === "string" ? row.erreur : "",
            fix: typeof row.fix === "string" ? row.fix : "",
          };
        })
    : [];

  const rawVisuals = Array.isArray(raw.visuels)
    ? raw.visuels
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const visual = item as Record<string, unknown>;
          const legacyNotes = typeof visual.instruction === "string" ? visual.instruction : "";
          const legacyLabel =
            typeof visual.visualForLabel === "string" ? visual.visualForLabel : "";
          const notesFromRaw = typeof visual.notes === "string" ? visual.notes : "";
          return {
            id: typeof visual.id === "string" && visual.id ? visual.id : createEmptyVisual().id,
            title: typeof visual.title === "string" ? visual.title : "",
            notes: notesFromRaw || legacyNotes || legacyLabel,
            fileName: typeof visual.fileName === "string" ? visual.fileName : null,
            mimeType: typeof visual.mimeType === "string" ? visual.mimeType : null,
            sizeBytes: typeof visual.sizeBytes === "number" ? visual.sizeBytes : null,
            previewUrl: typeof visual.previewUrl === "string" ? visual.previewUrl : null,
          } as FicheVisual;
        })
    : [];

  const fallbackId = createDefaultFiche(matiere, familleTemplate).id;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    matiere,
    famille_template: familleTemplate,
    template_type: templateType,
    titre_fiche: typeof raw.titre_fiche === "string" ? raw.titre_fiche : "",
    blocs: remapBlocksForTemplate(rawBlocks, templateType),
    trucs_astuces: {
      miniChecklistHtml:
        typeof rawTrucs.miniChecklistHtml === "string" ? rawTrucs.miniChecklistHtml : "",
      astuceMemoHtml: typeof rawTrucs.astuceMemoHtml === "string" ? rawTrucs.astuceMemoHtml : "",
      erreursFrequentes: rawErreurs.length > 0 ? rawErreurs : [createEmptyFrequentError()],
    },
    visuels: rawVisuals,
    statut: raw.statut === "publie" ? "publie" : "brouillon",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function updateFicheTimestamp(fiche: FicheRecord): FicheRecord {
  return {
    ...fiche,
    updatedAt: new Date().toISOString(),
  };
}

export function ParentFichesManager(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<FicheTabId>("editor");
  const [fiches, setFiches] = React.useState<FicheRecord[]>([]);
  const [activeFicheId, setActiveFicheId] = React.useState<string | null>(null);
  const [activeStep, setActiveStep] = React.useState<FicheStepId>("infos");
  const [contentBlockIndex, setContentBlockIndex] = React.useState(0);
  const [matiereActive, setMatiereActive] = React.useState<FicheMatiere>("Francais");
  const [familleActive, setFamilleActive] = React.useState<FicheFamilleTemplate>(
    getDefaultFamilleForMatiere("Francais"),
  );
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewVisualId, setPreviewVisualId] = React.useState<string | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackState | null>(null);
  const [librarySearch, setLibrarySearch] = React.useState("");
  const [libraryMatiereFilter, setLibraryMatiereFilter] =
    React.useState<LibraryMatiereFilter>("Toutes");
  const [libraryFamilleFilter, setLibraryFamilleFilter] =
    React.useState<LibraryFamilleFilter>("Toutes");
  const [libraryVisibleCount, setLibraryVisibleCount] = React.useState<number>(LIBRARY_PAGE_SIZE);

  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = parseStoredData(window.localStorage.getItem(STORAGE_KEY))
      .map((entry) => normalizeStoredFiche(entry))
      .filter((entry): entry is FicheRecord => Boolean(entry));

    setFiches(stored);
    const first = stored[0];
    if (first) {
      setActiveFicheId(first.id);
      setMatiereActive(first.matiere);
      setFamilleActive(first.famille_template);
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fiches));
  }, [fiches, isHydrated]);

  React.useEffect(() => {
    if (!previewOpen) {
      setPreviewVisualId(null);
    }
  }, [previewOpen]);

  const activeFiche = React.useMemo(
    () => fiches.find((fiche) => fiche.id === activeFicheId) ?? null,
    [fiches, activeFicheId],
  );

  React.useEffect(() => {
    if (!activeFicheId) return;
    const exists = fiches.some((fiche) => fiche.id === activeFicheId);
    if (!exists) {
      const first = fiches[0];
      if (first) {
        setActiveFicheId(first.id);
        setMatiereActive(first.matiere);
        setFamilleActive(first.famille_template);
      } else {
        setActiveFicheId(null);
      }
    }
  }, [activeFicheId, fiches]);

  const familiesForMatiere = React.useMemo(
    () => getFamiliesByMatiere(matiereActive),
    [matiereActive],
  );

  const templateForCurrentSelection = React.useMemo(() => {
    if (!activeFiche) {
      return getTemplateTypeForSelection(matiereActive, familleActive);
    }
    return activeFiche.template_type;
  }, [activeFiche, matiereActive, familleActive]);

  const templateDefinition = React.useMemo(
    () => getTemplateDefinition(templateForCurrentSelection),
    [templateForCurrentSelection],
  );

  const stepIndex = React.useMemo(
    () => STEPS.findIndex((step) => step.id === activeStep),
    [activeStep],
  );
  const safeStepIndex = stepIndex < 0 ? 0 : stepIndex;
  const activeStepDefinition = STEPS[safeStepIndex] ?? STEPS[0];
  const canGoPrevStep = safeStepIndex > 0;
  const canGoNextStep = safeStepIndex < STEPS.length - 1;

  React.useEffect(() => {
    if (activeStep !== "contenu") return;
    setContentBlockIndex(0);
  }, [activeStep, activeFicheId, activeFiche?.template_type]);

  React.useEffect(() => {
    if (!activeFiche) {
      setContentBlockIndex(0);
      return;
    }

    setContentBlockIndex((current) => {
      if (activeFiche.blocs.length === 0) return 0;
      return Math.max(0, Math.min(current, activeFiche.blocs.length - 1));
    });
  }, [activeFiche?.blocs.length, activeFicheId]);

  const updateFicheById = React.useCallback(
    (ficheId: string, updater: (current: FicheRecord) => FicheRecord): void => {
      setFiches((current) =>
        current.map((fiche) => (fiche.id === ficheId ? updater(fiche) : fiche)),
      );
      setHasUnsavedChanges(true);
      setFeedback(null);
    },
    [],
  );

  const updateActiveFiche = React.useCallback(
    (updater: (current: FicheRecord) => FicheRecord): void => {
      if (!activeFicheId) return;
      updateFicheById(activeFicheId, updater);
    },
    [activeFicheId, updateFicheById],
  );

  const createFiche = React.useCallback(() => {
    const created = createDefaultFiche(matiereActive, familleActive);
    setFiches((current) => [...current, created]);
    setActiveFicheId(created.id);
    setActiveStep("infos");
    setActiveTab("editor");
    setHasUnsavedChanges(true);
    setFeedback(null);
  }, [familleActive, matiereActive]);

  const duplicateActiveFiche = React.useCallback(() => {
    if (!activeFiche) return;
    const duplicateBase = createDefaultFiche(activeFiche.matiere, activeFiche.famille_template);
    const duplicated: FicheRecord = {
      ...activeFiche,
      id: duplicateBase.id,
      titre_fiche: activeFiche.titre_fiche.trim()
        ? `${activeFiche.titre_fiche.trim()} (copie)`
        : "Nouvelle fiche (copie)",
      blocs: activeFiche.blocs.map((block) => ({ ...block })),
      trucs_astuces: {
        ...activeFiche.trucs_astuces,
        erreursFrequentes: activeFiche.trucs_astuces.erreursFrequentes.map((row) => ({
          ...row,
          id: createEmptyFrequentError().id,
        })),
      },
      visuels: activeFiche.visuels.map((visual) => ({
        ...visual,
        id: createEmptyVisual().id,
      })),
      statut: "brouillon",
      updatedAt: new Date().toISOString(),
    };

    setFiches((current) => [...current, duplicated]);
    setActiveFicheId(duplicated.id);
    setMatiereActive(duplicated.matiere);
    setFamilleActive(duplicated.famille_template);
    setActiveStep("infos");
    setActiveTab("editor");
    setHasUnsavedChanges(true);
    setFeedback(null);
  }, [activeFiche]);

  const removeFicheById = React.useCallback(
    (ficheId: string): void => {
      const target = fiches.find((fiche) => fiche.id === ficheId);
      if (!target) return;
      if (!window.confirm(`Supprimer la fiche \"${target.titre_fiche || "Sans titre"}\" ?`)) {
        return;
      }

      setFiches((current) => current.filter((fiche) => fiche.id !== ficheId));
      setFeedback({ tone: "success", message: "Fiche supprimee." });
      setHasUnsavedChanges(true);
    },
    [fiches],
  );

  const saveActiveFiche = React.useCallback(() => {
    if (!activeFiche) return;

    if (!activeFiche.titre_fiche.trim()) {
      setFeedback({ tone: "error", message: "Le titre de la fiche est obligatoire." });
      setActiveStep("infos");
      return;
    }
    if (!activeFiche.matiere) {
      setFeedback({ tone: "error", message: "La matiere est obligatoire." });
      setActiveStep("infos");
      return;
    }
    if (!getFamilleDefinition(activeFiche.famille_template)) {
      setFeedback({ tone: "error", message: "La famille de template est obligatoire." });
      setActiveStep("famille");
      return;
    }

    const hasContent = activeFiche.blocs.some((block) => Boolean(stripHtml(block.contentHtml)));
    if (!hasContent) {
      setFeedback({
        tone: "error",
        message: "Ajoute au moins un bloc de contenu avant d'enregistrer.",
      });
      setActiveStep("contenu");
      return;
    }

    updateActiveFiche((current) => ({
      ...updateFicheTimestamp(current),
      statut: current.statut === "publie" ? "publie" : "brouillon",
    }));
    setHasUnsavedChanges(false);
    setFeedback({ tone: "success", message: "Fiche enregistree." });
  }, [activeFiche, updateActiveFiche]);

  const syncMatiereForActiveFiche = React.useCallback(
    (matiere: FicheMatiere): void => {
      setMatiereActive(matiere);
      const nextFamily = getDefaultFamilleForMatiere(matiere);
      setFamilleActive(nextFamily);
      updateActiveFiche((current) => {
        const nextTemplate = getTemplateTypeForSelection(matiere, nextFamily);
        return {
          ...updateFicheTimestamp(current),
          matiere,
          famille_template: nextFamily,
          template_type: nextTemplate,
          blocs: remapBlocksForTemplate(current.blocs, nextTemplate),
        };
      });
    },
    [updateActiveFiche],
  );

  const syncFamilleForActiveFiche = React.useCallback(
    (famille: FicheFamilleTemplate): void => {
      setFamilleActive(famille);
      updateActiveFiche((current) => {
        const nextTemplate = getTemplateTypeForSelection(current.matiere, famille);
        return {
          ...updateFicheTimestamp(current),
          famille_template: famille,
          template_type: nextTemplate,
          blocs: remapBlocksForTemplate(current.blocs, nextTemplate),
        };
      });
    },
    [updateActiveFiche],
  );

  const updateBlockContent = React.useCallback(
    (key: string, html: string): void => {
      updateActiveFiche((current) => ({
        ...updateFicheTimestamp(current),
        blocs: current.blocs.map((block) =>
          block.key === key ? { ...block, contentHtml: html } : block,
        ),
      }));
    },
    [updateActiveFiche],
  );

  const addFrequentErrorRow = React.useCallback(() => {
    updateActiveFiche((current) => ({
      ...updateFicheTimestamp(current),
      trucs_astuces: {
        ...current.trucs_astuces,
        erreursFrequentes: [...current.trucs_astuces.erreursFrequentes, createEmptyFrequentError()],
      },
    }));
  }, [updateActiveFiche]);

  const removeFrequentErrorRow = React.useCallback(
    (rowId: string): void => {
      updateActiveFiche((current) => {
        if (current.trucs_astuces.erreursFrequentes.length <= 1) return current;
        return {
          ...updateFicheTimestamp(current),
          trucs_astuces: {
            ...current.trucs_astuces,
            erreursFrequentes: current.trucs_astuces.erreursFrequentes.filter(
              (row) => row.id !== rowId,
            ),
          },
        };
      });
    },
    [updateActiveFiche],
  );

  const updateFrequentErrorRow = React.useCallback(
    (rowId: string, field: "erreur" | "fix", value: string): void => {
      updateActiveFiche((current) => ({
        ...updateFicheTimestamp(current),
        trucs_astuces: {
          ...current.trucs_astuces,
          erreursFrequentes: current.trucs_astuces.erreursFrequentes.map((row) =>
            row.id === rowId ? { ...row, [field]: value } : row,
          ),
        },
      }));
    },
    [updateActiveFiche],
  );

  const addVisualFromFile = React.useCallback(
    async (file: File): Promise<void> => {
      if (!activeFiche) return;
      if (file.size > MAX_VISUAL_FILE_BYTES) {
        setFeedback({
          tone: "error",
          message: `Le fichier depasse ${formatBytes(MAX_VISUAL_FILE_BYTES)}.`,
        });
        return;
      }

      const reader = new FileReader();
      const previewUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
        reader.readAsDataURL(file);
      });

      updateActiveFiche((current) => ({
        ...updateFicheTimestamp(current),
        visuels: [
          ...current.visuels,
          {
            ...createEmptyVisual(),
            title: file.name,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            previewUrl,
          },
        ],
      }));
    },
    [activeFiche, updateActiveFiche],
  );

  const updateVisual = React.useCallback(
    (visualId: string, updater: (current: FicheVisual) => FicheVisual): void => {
      updateActiveFiche((current) => ({
        ...updateFicheTimestamp(current),
        visuels: current.visuels.map((visual) =>
          visual.id === visualId ? updater(visual) : visual,
        ),
      }));
    },
    [updateActiveFiche],
  );

  const removeVisual = React.useCallback(
    (visualId: string): void => {
      updateActiveFiche((current) => ({
        ...updateFicheTimestamp(current),
        visuels: current.visuels.filter((visual) => visual.id !== visualId),
      }));
    },
    [updateActiveFiche],
  );

  const onDropVisual = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      void addVisualFromFile(file);
    },
    [addVisualFromFile],
  );

  const handleNextStep = React.useCallback(() => {
    if (!activeFiche) return;

    if (activeStep === "infos") {
      if (!activeFiche.titre_fiche.trim()) {
        setFeedback({ tone: "error", message: "Renseigne le titre de la fiche." });
        return;
      }
      if (!activeFiche.matiere) {
        setFeedback({ tone: "error", message: "Renseigne la matiere." });
        return;
      }
    }

    if (activeStep === "famille") {
      if (!getFamilleDefinition(activeFiche.famille_template)) {
        setFeedback({ tone: "error", message: "Choisis une famille de template." });
        return;
      }
    }

    const next = STEPS[Math.min(STEPS.length - 1, safeStepIndex + 1)];
    if (next) setActiveStep(next.id);
  }, [activeFiche, activeStep, safeStepIndex]);

  const handlePrevStep = React.useCallback(() => {
    const prev = STEPS[Math.max(0, safeStepIndex - 1)];
    if (prev) setActiveStep(prev.id);
  }, [safeStepIndex]);

  const handleNextContentBlock = React.useCallback(() => {
    if (!activeFiche) return;
    setContentBlockIndex((current) => Math.min(current + 1, activeFiche.blocs.length - 1));
  }, [activeFiche]);

  const handlePrevContentBlock = React.useCallback(() => {
    setContentBlockIndex((current) => Math.max(current - 1, 0));
  }, []);

  const openPreviewForFiche = React.useCallback((ficheId: string): void => {
    setActiveFicheId(ficheId);
    setPreviewOpen(true);
  }, []);

  const openEditorForFiche = React.useCallback(
    (ficheId: string): void => {
      const target = fiches.find((fiche) => fiche.id === ficheId);
      if (!target) return;
      setActiveFicheId(target.id);
      setMatiereActive(target.matiere);
      setFamilleActive(target.famille_template);
      setActiveStep("contenu");
      setActiveTab("editor");
      setFeedback(null);
    },
    [fiches],
  );

  const familiesForLibraryFilter = React.useMemo(() => {
    if (libraryMatiereFilter === "Toutes") return FICHE_FAMILLE_DEFINITIONS;
    return getFamiliesByMatiere(libraryMatiereFilter);
  }, [libraryMatiereFilter]);

  React.useEffect(() => {
    if (libraryFamilleFilter === "Toutes") return;
    const stillValid = familiesForLibraryFilter.some(
      (family) => family.id === libraryFamilleFilter,
    );
    if (!stillValid) setLibraryFamilleFilter("Toutes");
  }, [familiesForLibraryFilter, libraryFamilleFilter]);

  React.useEffect(() => {
    setLibraryVisibleCount(LIBRARY_PAGE_SIZE);
  }, [librarySearch, libraryMatiereFilter, libraryFamilleFilter]);

  const filteredLibraryFiches = React.useMemo(() => {
    const search = librarySearch.trim().toLowerCase();
    return [...fiches]
      .filter((fiche) => {
        if (libraryMatiereFilter !== "Toutes" && fiche.matiere !== libraryMatiereFilter) {
          return false;
        }
        if (libraryFamilleFilter !== "Toutes" && fiche.famille_template !== libraryFamilleFilter) {
          return false;
        }
        if (search && !fiche.titre_fiche.toLowerCase().includes(search)) return false;
        return true;
      })
      .sort((left, right) => {
        const leftDate = new Date(left.updatedAt).getTime();
        const rightDate = new Date(right.updatedAt).getTime();
        return rightDate - leftDate;
      });
  }, [fiches, libraryFamilleFilter, libraryMatiereFilter, librarySearch]);

  const visibleLibraryFiches = React.useMemo(
    () => filteredLibraryFiches.slice(0, libraryVisibleCount),
    [filteredLibraryFiches, libraryVisibleCount],
  );

  const canLoadMoreLibrary = filteredLibraryFiches.length > visibleLibraryFiches.length;

  const breadcrumb = activeFiche
    ? `Fiches > ${getMatiereLabel(activeFiche.matiere)} > ${
        getFamilleDefinition(activeFiche.famille_template)?.label ?? activeFiche.famille_template
      } > ${activeFiche.titre_fiche.trim() || "Sans titre"}`
    : "Fiches";

  function renderTemplateBlock(block: FicheBlock): React.JSX.Element {
    return (
      <div
        key={block.key}
        className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-text-primary">{block.title}</p>
          <Badge variant={block.required ? "warning" : "glass"}>
            {block.required ? "Obligatoire" : "Optionnel"}
          </Badge>
        </div>
        <p className="text-xs text-text-secondary">{block.description}</p>
        <RichTextEditor
          valueHtml={block.contentHtml}
          onChangeHtml={(html) => updateBlockContent(block.key, html)}
          placeholder={block.description}
          enableUnderline
          enableCallout
          enableHighlights
          enablePedagogicalStyles
        />
      </div>
    );
  }

  function renderEditorStepContent(): React.JSX.Element {
    if (!activeFiche) {
      return (
        <EmptyState
          icon="F"
          title="Aucune fiche active"
          description="Cree une nouvelle fiche pour demarrer."
        />
      );
    }

    if (activeStep === "infos") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary">Titre de la fiche</label>
            <Input
              value={activeFiche.titre_fiche}
              onChange={(event) =>
                updateActiveFiche((current) =>
                  updateFicheTimestamp({ ...current, titre_fiche: event.target.value }),
                )
              }
              placeholder="Ex: Le complement de nom"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary">Matiere</p>
            <div className="inline-flex w-full rounded-radius-button border border-border-subtle bg-bg-surface-hover/60 p-1">
              {FICHE_MATIERE_OPTIONS.map((option) => {
                const isActive = activeFiche.matiere === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => syncMatiereForActiveFiche(option.value)}
                    className={[
                      "flex-1 rounded-radius-button px-3 py-2 text-sm font-semibold transition-all",
                      isActive
                        ? "bg-bg-surface text-text-primary shadow-card"
                        : "text-text-secondary hover:text-text-primary",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === "famille") {
      const availableFamilies = getFamiliesByMatiere(activeFiche.matiere);
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Choisis la famille de template qui correspond a ta fiche.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {availableFamilies.map((family) => {
              const isActive = family.id === activeFiche.famille_template;
              return (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => syncFamilleForActiveFiche(family.id)}
                  className={[
                    "rounded-radius-button border p-3 text-left transition-all",
                    isActive
                      ? "border-brand-primary bg-brand-50/60"
                      : "border-border-subtle bg-bg-surface-hover/40 hover:border-brand-200",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-text-primary">{family.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{family.helperText}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeStep === "template") {
      const definition = getTemplateDefinition(activeFiche.template_type);
      return (
        <div className="space-y-4">
          <div className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Template selectionne
            </p>
            <h3 className="mt-1 text-base font-bold text-text-primary">{definition.label}</h3>
            <p className="mt-1 text-sm text-text-secondary">{definition.description}</p>
            <p className="mt-3 text-xs text-text-secondary">
              Le type de template est determine automatiquement selon la matiere et la famille.
            </p>
          </div>
          <div className="rounded-radius-button border border-border-subtle bg-bg-surface/90 p-4">
            <p className="text-sm font-semibold text-text-primary">Blocs qui seront proposes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {definition.blocks.map((block) => (
                <li key={block.key}>
                  {block.title}
                  {block.required ? "" : " (optionnel)"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (activeStep === "contenu") {
      const blockCount = activeFiche.blocs.length;
      if (blockCount === 0) {
        return (
          <EmptyState
            icon="B"
            title="Aucun bloc disponible"
            description="Selectionne une famille de template pour generer les blocs."
          />
        );
      }

      const safeBlockIndex = Math.max(0, Math.min(contentBlockIndex, blockCount - 1));
      const activeBlock = activeFiche.blocs[safeBlockIndex];
      if (!activeBlock) {
        return (
          <EmptyState
            icon="B"
            title="Aucun bloc disponible"
            description="Selectionne une famille de template pour generer les blocs."
          />
        );
      }
      const canGoPrevBlock = safeBlockIndex > 0;
      const canGoNextBlock = safeBlockIndex < blockCount - 1;

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canGoPrevBlock}
              onClick={handlePrevContentBlock}
            >
              {"< Bloc precedent"}
            </Button>
            <div className="text-center">
              <p className="text-xs font-semibold text-text-secondary">
                Bloc {safeBlockIndex + 1} / {blockCount}
              </p>
              <p className="text-sm font-semibold text-text-primary">{activeBlock.title}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canGoNextBlock}
              onClick={handleNextContentBlock}
            >
              {"Bloc suivant >"}
            </Button>
          </div>
          {renderTemplateBlock(activeBlock)}
        </div>
      );
    }

    if (activeStep === "astuces") {
      return (
        <div className="space-y-4">
          <div className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface/90 p-4">
            <p className="text-sm font-semibold text-text-primary">Mini checklist</p>
            <RichTextEditor
              valueHtml={activeFiche.trucs_astuces.miniChecklistHtml}
              onChangeHtml={(html) =>
                updateActiveFiche((current) =>
                  updateFicheTimestamp({
                    ...current,
                    trucs_astuces: { ...current.trucs_astuces, miniChecklistHtml: html },
                  }),
                )
              }
              placeholder="2 a 4 points de verification"
              enableUnderline
              enableCallout
              enableHighlights
              enablePedagogicalStyles
            />
          </div>

          <div className="space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface/90 p-4">
            <p className="text-sm font-semibold text-text-primary">Astuce memo</p>
            <RichTextEditor
              valueHtml={activeFiche.trucs_astuces.astuceMemoHtml}
              onChangeHtml={(html) =>
                updateActiveFiche((current) =>
                  updateFicheTimestamp({
                    ...current,
                    trucs_astuces: { ...current.trucs_astuces, astuceMemoHtml: html },
                  }),
                )
              }
              placeholder="1 a 2 phrases faciles a memoriser"
              enableUnderline
              enableCallout
              enableHighlights
              enablePedagogicalStyles
            />
          </div>

          <div className="space-y-3 rounded-radius-button border border-border-subtle bg-bg-surface/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">Erreurs frequentes</p>
              <Button type="button" size="sm" variant="secondary" onClick={addFrequentErrorRow}>
                Ajouter une erreur frequente
              </Button>
            </div>
            <div className="space-y-2">
              {activeFiche.trucs_astuces.erreursFrequentes.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/55 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <Input
                    value={row.erreur}
                    onChange={(event) =>
                      updateFrequentErrorRow(row.id, "erreur", event.target.value)
                    }
                    placeholder="Erreur frequente"
                  />
                  <Input
                    value={row.fix}
                    onChange={(event) => updateFrequentErrorRow(row.id, "fix", event.target.value)}
                    placeholder="Comment corriger / eviter"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFrequentErrorRow(row.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          className="rounded-radius-button border border-dashed border-border-subtle bg-bg-surface-hover/50 p-5"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropVisual}
        >
          <p className="text-sm font-semibold text-text-primary">Televerser un visuel</p>
          <p className="mt-1 text-sm text-text-secondary">
            Glisse-depose une image ici ou utilise le bouton.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Formats acceptes: PNG, JPG, SVG. Taille max: {formatBytes(MAX_VISUAL_FILE_BYTES)}.
          </p>
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => uploadInputRef.current?.click()}
            >
              Televerser un visuel
            </Button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void addVisualFromFile(file);
              event.target.value = "";
            }}
          />
        </div>

        {activeFiche.visuels.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun visuel pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {activeFiche.visuels.map((visual) => (
              <div
                key={visual.id}
                className="space-y-3 rounded-radius-button border border-border-subtle bg-bg-surface/90 p-3"
              >
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={visual.title}
                    onChange={(event) =>
                      updateVisual(visual.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Titre / description du visuel"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVisual(visual.id)}
                  >
                    Supprimer
                  </Button>
                </div>

                <TextArea
                  rows={3}
                  value={visual.notes}
                  onChange={(event) =>
                    updateVisual(visual.id, (current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Notes sur le visuel (ce qu'il doit montrer)"
                />

                {visual.fileName ? (
                  <p className="text-xs text-text-secondary">
                    {visual.fileName}
                    {typeof visual.sizeBytes === "number"
                      ? ` (${formatBytes(visual.sizeBytes)})`
                      : ""}
                  </p>
                ) : null}

                {visual.previewUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-radius-button border border-border-subtle">
                    <Image
                      src={visual.previewUrl}
                      alt={visual.title || "Visuel"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderEditorTab(): React.JSX.Element {
    if (!activeFiche) {
      return (
        <Card className="border-border-subtle bg-bg-surface/90">
          <CardContent className="space-y-4 p-6">
            <EmptyState
              icon="F"
              title="Aucune fiche disponible"
              description="Cree une fiche pour commencer."
            />
            <div className="flex justify-center">
              <Button type="button" variant="primary" onClick={createFiche}>
                Nouvelle fiche
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const familyDefinition = getFamilleDefinition(activeFiche.famille_template);

    return (
      <div className="space-y-4">
        <Card className="sticky top-2 z-20 border-border-subtle bg-bg-surface/95 shadow-card backdrop-blur">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-secondary">{breadcrumb}</p>
                <p className="text-xs text-text-secondary">
                  {familyDefinition?.helperText ?? "Selectionne une famille de template."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={createFiche}>
                  Nouvelle fiche
                </Button>
                <Button type="button" variant="secondary" onClick={duplicateActiveFiche}>
                  Dupliquer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFicheById(activeFiche.id)}
                >
                  Supprimer
                </Button>
                <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
                  Previsualiser la fiche
                </Button>
                <Button type="button" variant="primary" onClick={saveActiveFiche}>
                  {hasUnsavedChanges ? "Enregistrer" : "Enregistre"}
                </Button>
              </div>
            </div>
            {feedback ? (
              <div
                className={[
                  "rounded-radius-button border px-3 py-2 text-sm",
                  feedback.tone === "success"
                    ? "border-status-success/35 bg-status-success/10 text-status-success"
                    : "border-status-error/35 bg-status-error/10 text-status-error",
                ].join(" ")}
              >
                {feedback.message}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border-subtle bg-bg-surface/92">
            <CardContent className="p-3 sm:p-4">
              <div className="overflow-x-auto pb-1">
                <ol className="flex min-w-[860px] items-start gap-2">
                  {STEPS.map((step, index) => {
                    const isDone = index < safeStepIndex;
                    const isActive = index === safeStepIndex;
                    const canConnectAsDone = index < safeStepIndex;

                    return (
                      <li key={step.id} className="flex min-w-[125px] flex-1 items-start">
                        <button
                          type="button"
                          onClick={() => setActiveStep(step.id)}
                          className={[
                            "w-full rounded-radius-button border px-2 py-2 text-left transition-all",
                            isActive
                              ? "border-brand-primary bg-brand-50/60"
                              : isDone
                                ? "border-brand-200 bg-brand-50/35"
                                : "border-transparent hover:border-border-subtle hover:bg-bg-surface-hover/55",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                isActive
                                  ? "bg-brand-primary text-white"
                                  : isDone
                                    ? "bg-brand-200 text-brand-800"
                                    : "bg-bg-surface-hover text-text-secondary",
                              ].join(" ")}
                            >
                              {isDone ? "✓" : index + 1}
                            </span>
                            {index < STEPS.length - 1 ? (
                              <span
                                className={[
                                  "h-px flex-1 rounded-full",
                                  canConnectAsDone ? "bg-brand-300" : "bg-border-subtle",
                                ].join(" ")}
                              />
                            ) : null}
                          </div>
                          <span className="mt-2 block text-sm font-semibold text-text-primary">
                            {step.title}
                          </span>
                          <span className="block text-xs text-text-secondary">{step.helper}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-surface/92 border-border-subtle">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {activeStepDefinition?.title}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{activeStepDefinition?.helper}</p>
              </div>

              {renderEditorStepContent()}

              <div className="flex items-center justify-between border-t border-border-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canGoPrevStep}
                  onClick={handlePrevStep}
                >
                  Etape precedente
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canGoNextStep}
                  onClick={handleNextStep}
                >
                  Etape suivante
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderLibraryTab(): React.JSX.Element {
    return (
      <div className="space-y-4">
        <Card className="bg-bg-surface/92 border-border-subtle">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[180px_220px_minmax(0,1fr)]">
            <Select
              value={libraryMatiereFilter}
              onChange={(event) =>
                setLibraryMatiereFilter(event.target.value as LibraryMatiereFilter)
              }
            >
              <option value="Toutes">Toutes matieres</option>
              {FICHE_MATIERE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              value={libraryFamilleFilter}
              onChange={(event) =>
                setLibraryFamilleFilter(event.target.value as LibraryFamilleFilter)
              }
            >
              <option value="Toutes">Toutes familles</option>
              {familiesForLibraryFilter.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.label}
                </option>
              ))}
            </Select>

            <Input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="Rechercher une fiche par titre..."
            />
          </CardContent>
        </Card>

        {visibleLibraryFiches.length === 0 ? (
          <Card className="border-border-subtle bg-bg-surface/90">
            <CardContent className="p-6">
              <EmptyState
                icon="F"
                title="Aucune fiche trouvee"
                description="Ajuste tes filtres ou cree une nouvelle fiche."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleLibraryFiches.map((fiche) => {
                const family = getFamilleDefinition(fiche.famille_template);
                return (
                  <Card key={fiche.id} className="bg-bg-surface/92 border-border-subtle">
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-1">
                        <h3 className="line-clamp-2 text-base font-bold text-text-primary">
                          {fiche.titre_fiche.trim() || "Sans titre"}
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="info">{getMatiereLabel(fiche.matiere)}</Badge>
                          <Badge variant="glass">{family?.label ?? fiche.famille_template}</Badge>
                          <Badge variant={fiche.statut === "publie" ? "success" : "warning"}>
                            {fiche.statut}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-text-secondary">
                        Mise a jour: {new Date(fiche.updatedAt).toLocaleString("fr-FR")}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openPreviewForFiche(fiche.id)}
                        >
                          Previsualiser
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditorForFiche(fiche.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFicheById(fiche.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {canLoadMoreLibrary ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLibraryVisibleCount((count) => count + LIBRARY_PAGE_SIZE)}
                >
                  Charger plus
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  const previewBlocks = activeFiche
    ? activeFiche.blocs.filter((block) => Boolean(stripHtml(block.contentHtml)))
    : [];
  const previewObjectiveBlock = previewBlocks.find((block) => isAQuoiBlock(block)) ?? null;
  const previewARetenirBlock = previewBlocks.find((block) => isARetenirBlock(block)) ?? null;
  const previewMainBlocks = previewBlocks.filter(
    (block) => !isAQuoiBlock(block) && !isARetenirBlock(block),
  );
  const previewKeyBlock = previewMainBlocks.find((block) => isKeyPreviewBlock(block)) ?? null;
  const previewExamples = previewMainBlocks.filter((block) => isExampleBlock(block));
  const previewStandardBlocks = previewMainBlocks.filter((block) => !isExampleBlock(block));
  const orderedPreviewMainBlocks = [
    ...previewStandardBlocks.filter((block) => block.key !== previewKeyBlock?.key),
    ...previewExamples,
  ];
  const previewARetenirBullets = previewARetenirBlock
    ? extractPreviewBulletsFromHtml(previewARetenirBlock.contentHtml)
    : [];
  const hasPreviewTips =
    Boolean(stripHtml(activeFiche?.trucs_astuces.miniChecklistHtml ?? "")) ||
    Boolean(stripHtml(activeFiche?.trucs_astuces.astuceMemoHtml ?? "")) ||
    Boolean(
      activeFiche?.trucs_astuces.erreursFrequentes.some((row) => row.erreur.trim() || row.fix.trim()),
    );
  const previewVisuals = activeFiche?.visuels.filter((visual) => Boolean(visual.previewUrl)) ?? [];
  const selectedPreviewVisual =
    previewVisuals.find((visual) => visual.id === previewVisualId) ?? null;

  return (
    <>
      <div className="mb-2">
        <div className="inline-flex rounded-radius-button border border-border-subtle bg-bg-surface-hover/65 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={[
              "rounded-radius-button px-3 py-1.5 text-sm font-semibold transition-all",
              activeTab === "editor"
                ? "bg-bg-surface text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            Creer / editer une fiche
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={[
              "rounded-radius-button px-3 py-1.5 text-sm font-semibold transition-all",
              activeTab === "library"
                ? "bg-bg-surface text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            Fiches existantes
          </button>
        </div>
      </div>

      {activeTab === "editor" ? renderEditorTab() : renderLibraryTab()}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Previsualisation de ${activeFiche?.titre_fiche.trim() || "la fiche"}`}
        description="Mode lecture de la fiche."
        fullscreen
      >
        {activeFiche ? (
          <div className="mx-auto w-full max-w-[1160px] space-y-6 p-4 sm:p-8">
            <section className="rounded-radius-card border border-border-subtle bg-bg-surface/95 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{getMatiereLabel(activeFiche.matiere)}</Badge>
                <Badge variant="glass">
                  {getFamilleDefinition(activeFiche.famille_template)?.label ??
                    activeFiche.famille_template}
                </Badge>
                <Badge variant="glass">
                  {getTemplateDefinition(activeFiche.template_type).label}
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
                {activeFiche.titre_fiche.trim() || "Sans titre"}
              </h1>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <section className="space-y-4">
                {previewObjectiveBlock ? (
                  <article className="rounded-radius-card border border-status-info/35 bg-status-info/10 p-5">
                    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-text-primary">
                      <span aria-hidden="true">🎯</span>
                      A quoi ca sert ?
                    </h2>
                    {toRichPreview(previewObjectiveBlock.contentHtml)}
                  </article>
                ) : null}

                {previewKeyBlock ? (
                  <article className="rounded-radius-card border border-brand-300 bg-brand-50/55 p-5 shadow-card">
                    <h2 className="mb-2 text-lg font-black text-text-primary">{previewKeyBlock.title}</h2>
                    <div className="text-base leading-relaxed text-text-primary">
                      {toRichPreview(previewKeyBlock.contentHtml)}
                    </div>
                  </article>
                ) : null}

                {orderedPreviewMainBlocks
                  .filter((block) => block.key !== previewKeyBlock?.key)
                  .map((block) => (
                    <article
                      key={block.key}
                      className="rounded-radius-card border border-border-subtle bg-bg-surface/92 p-5"
                    >
                      <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-text-primary">
                        <span aria-hidden="true">{getPreviewSectionIcon(block.title)}</span>
                        {block.title}
                      </h3>
                      {shouldCollapsePreviewBlock(block) ? (
                        <details className="group">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-brand-primary">
                            Afficher les details
                          </summary>
                          <div className="mt-3">{toRichPreview(block.contentHtml)}</div>
                        </details>
                      ) : (
                        toRichPreview(block.contentHtml)
                      )}
                    </article>
                  ))}

                {previewBlocks.length === 0 ? (
                  <article className="rounded-radius-card border border-border-subtle bg-bg-surface/92 p-5">
                    <p className="text-sm text-text-secondary">Aucun contenu a afficher pour cette fiche.</p>
                  </article>
                ) : null}
              </section>

              <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                {previewARetenirBlock ? (
                  <article className="rounded-radius-card border border-status-warning/40 bg-status-warning/15 p-5">
                    <h3 className="mb-2 flex items-center gap-2 text-base font-black text-text-primary">
                      <span aria-hidden="true">⭐</span>
                      A retenir
                    </h3>
                    {previewARetenirBullets.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
                        {previewARetenirBullets.map((bullet, index) => (
                          <li key={`${bullet}-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      toRichPreview(previewARetenirBlock.contentHtml)
                    )}
                  </article>
                ) : null}

                {hasPreviewTips ? (
                  <article className="space-y-3 rounded-radius-card border border-border-subtle bg-bg-surface/92 p-5">
                    <h3 className="flex items-center gap-2 text-base font-black text-text-primary">
                      <span aria-hidden="true">💡</span>
                      Trucs & astuces
                    </h3>

                    {stripHtml(activeFiche.trucs_astuces.miniChecklistHtml) ? (
                      <div>
                        <p className="mb-1 text-sm font-semibold text-text-primary">Mini checklist</p>
                        {toRichPreview(activeFiche.trucs_astuces.miniChecklistHtml)}
                      </div>
                    ) : null}

                    {stripHtml(activeFiche.trucs_astuces.astuceMemoHtml) ? (
                      <div>
                        <p className="mb-1 text-sm font-semibold text-text-primary">Astuce memo</p>
                        {toRichPreview(activeFiche.trucs_astuces.astuceMemoHtml)}
                      </div>
                    ) : null}

                    {activeFiche.trucs_astuces.erreursFrequentes.some(
                      (row) => row.erreur.trim() || row.fix.trim(),
                    ) ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-text-primary">Erreurs frequentes</p>
                        {activeFiche.trucs_astuces.erreursFrequentes
                          .filter((row) => row.erreur.trim() || row.fix.trim())
                          .map((row) => (
                            <div
                              key={row.id}
                              className="rounded-radius-button border border-border-subtle bg-bg-surface-hover/50 p-3 text-sm"
                            >
                              <p className="font-semibold text-text-primary">
                                Erreur:{" "}
                                <span className="font-normal text-text-secondary">
                                  {row.erreur || "Non precisee"}
                                </span>
                              </p>
                              <p className="mt-1 font-semibold text-text-primary">
                                Comment eviter:{" "}
                                <span className="font-normal text-text-secondary">
                                  {row.fix || "Non precisee"}
                                </span>
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </article>
                ) : null}

                {previewVisuals.length > 0 ? (
                  <article className="rounded-radius-card border border-border-subtle bg-bg-surface/92 p-5">
                    <h3 className="mb-3 text-base font-black text-text-primary">Visuels</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {previewVisuals.map((visual) => (
                        <button
                          key={visual.id}
                          type="button"
                          onClick={() => setPreviewVisualId(visual.id)}
                          className="group space-y-2 rounded-radius-button border border-border-subtle bg-bg-surface-hover/50 p-2 text-left transition-colors hover:bg-bg-surface-hover/75"
                        >
                          <div className="relative aspect-video w-full overflow-hidden rounded-radius-button border border-border-subtle">
                            <Image
                              src={visual.previewUrl ?? ""}
                              alt={visual.title || "Visuel"}
                              fill
                              unoptimized
                              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          </div>
                          <p className="line-clamp-2 text-xs font-semibold text-text-primary">
                            {visual.title || "Visuel"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </article>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedPreviewVisual)}
        onClose={() => setPreviewVisualId(null)}
        title={selectedPreviewVisual?.title || "Visuel"}
        {...(selectedPreviewVisual?.notes ? { description: selectedPreviewVisual.notes } : {})}
        className="max-w-4xl"
      >
        {selectedPreviewVisual?.previewUrl ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-radius-card border border-border-subtle bg-bg-surface-hover">
            <Image
              src={selectedPreviewVisual.previewUrl}
              alt={selectedPreviewVisual.title || "Visuel"}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
