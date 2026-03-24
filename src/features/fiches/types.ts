export type FicheMatiere = "Francais" | "Mathematiques";

export type FicheFamilleTemplate =
  | "TEXTE_COMMUNICATION"
  | "GRAMMAIRE_PHRASE"
  | "CLASSES_GRAMMATICALES"
  | "ORTHOGRAPHE"
  | "VOCABULAIRE"
  | "GRAMMAIRE_TEXTE"
  | "CONCEPT_NUMERIQUE"
  | "PROCEDURE_CALCUL"
  | "PROPRIETE_REGLE"
  | "GRANDEURS_MESURES"
  | "FIGURE_GEOMETRIE"
  | "PROBLEME_STRATEGIE";

export type FicheTemplateType =
  | "FR_CONCEPT_DE_BASE"
  | "FR_FAMILLES_CATEGORIES"
  | "FR_PROCEDURE_SAVOIR_FAIRE"
  | "FR_FONCTION_DANS_PHRASE"
  | "FR_ORTHOGRAPHE_CIBLEE"
  | "FR_VOCABULAIRE_EN_CONTEXTE"
  | "FR_GRAMMAIRE_TEXTE"
  | "MATH_CONCEPT_NUMERIQUE"
  | "MATH_PROCEDURE_CALCUL"
  | "MATH_PROPRIETE_REGLE"
  | "MATH_GRANDEURS_MESURES"
  | "MATH_FIGURE_GEOMETRIE"
  | "MATH_PROBLEME_STRATEGIE";

export type FicheStatut = "brouillon" | "publie";

export type FicheBlockKey = string;

export interface FicheMatiereOption {
  value: FicheMatiere;
  label: string;
}

export interface FicheFamilleDefinition {
  id: FicheFamilleTemplate;
  matiere: FicheMatiere;
  label: string;
  helperText: string;
}

export interface FicheTemplateBlockDefinition {
  key: FicheBlockKey;
  title: string;
  description: string;
  required: boolean;
  placeholder: string;
}

export interface FicheTemplateDefinition {
  id: FicheTemplateType;
  label: string;
  description: string;
  blocks: FicheTemplateBlockDefinition[];
}

export interface FicheBlock {
  key: FicheBlockKey;
  title: string;
  description: string;
  required: boolean;
  contentHtml: string;
}

export interface FicheFrequentError {
  id: string;
  erreur: string;
  fix: string;
}

export interface FicheTrucsAstuces {
  miniChecklistHtml: string;
  astuceMemoHtml: string;
  erreursFrequentes: FicheFrequentError[];
}

export interface FicheVisual {
  id: string;
  title: string;
  notes: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  previewUrl: string | null;
}

export interface FicheRecord {
  id: string;
  matiere: FicheMatiere;
  famille_template: FicheFamilleTemplate;
  template_type: FicheTemplateType;
  titre_fiche: string;
  blocs: FicheBlock[];
  trucs_astuces: FicheTrucsAstuces;
  visuels: FicheVisual[];
  statut: FicheStatut;
  updatedAt: string;
}

export const FICHE_MATIERE_OPTIONS: FicheMatiereOption[] = [
  { value: "Francais", label: "Francais" },
  { value: "Mathematiques", label: "Mathematiques" },
];

export const FICHE_FAMILLE_DEFINITIONS: FicheFamilleDefinition[] = [
  {
    id: "TEXTE_COMMUNICATION",
    matiere: "Francais",
    label: "Texte & communication",
    helperText: "Ce type de fiche sert a mieux lire, comprendre et produire des textes.",
  },
  {
    id: "GRAMMAIRE_PHRASE",
    matiere: "Francais",
    label: "Grammaire de la phrase",
    helperText: "Ce type de fiche sert a analyser la structure de la phrase.",
  },
  {
    id: "CLASSES_GRAMMATICALES",
    matiere: "Francais",
    label: "Classes grammaticales",
    helperText: "Ce type de fiche sert a identifier la nature des mots.",
  },
  {
    id: "ORTHOGRAPHE",
    matiere: "Francais",
    label: "Orthographe",
    helperText: "Ce type de fiche sert a memoriser des regles d'orthographe ciblees.",
  },
  {
    id: "VOCABULAIRE",
    matiere: "Francais",
    label: "Vocabulaire",
    helperText: "Ce type de fiche sert a enrichir le lexique et l'usage en contexte.",
  },
  {
    id: "GRAMMAIRE_TEXTE",
    matiere: "Francais",
    label: "Grammaire du texte",
    helperText: "Ce type de fiche sert a comprendre la coherence et l'organisation des textes.",
  },
  {
    id: "CONCEPT_NUMERIQUE",
    matiere: "Mathematiques",
    label: "Concepts numeriques",
    helperText: "Ce type de fiche sert a comprendre les notions de nombre et de representation.",
  },
  {
    id: "PROCEDURE_CALCUL",
    matiere: "Mathematiques",
    label: "Procedures de calcul",
    helperText: "Ce type de fiche sert a apprendre des methodes de calcul pas a pas.",
  },
  {
    id: "PROPRIETE_REGLE",
    matiere: "Mathematiques",
    label: "Proprietes / regles",
    helperText: "Ce type de fiche sert a appliquer correctement une regle mathematique.",
  },
  {
    id: "GRANDEURS_MESURES",
    matiere: "Mathematiques",
    label: "Grandeurs & mesures",
    helperText: "Ce type de fiche sert a manipuler les unites, conversions et mesures.",
  },
  {
    id: "FIGURE_GEOMETRIE",
    matiere: "Mathematiques",
    label: "Figures / geometrie",
    helperText: "Ce type de fiche sert a reconnaitre et decrire les figures geometriques.",
  },
  {
    id: "PROBLEME_STRATEGIE",
    matiere: "Mathematiques",
    label: "Problemes / strategies",
    helperText: "Ce type de fiche sert a resoudre des problemes avec une strategie claire.",
  },
];

function block(
  key: FicheBlockKey,
  title: string,
  description: string,
  required = true,
): FicheTemplateBlockDefinition {
  return {
    key,
    title,
    description,
    required,
    placeholder: description,
  };
}

export const FICHE_TEMPLATE_DEFINITIONS: Record<FicheTemplateType, FicheTemplateDefinition> = {
  FR_CONCEPT_DE_BASE: {
    id: "FR_CONCEPT_DE_BASE",
    label: "Francais - Concept de base",
    description: "Template pour expliquer une notion de base en francais.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'interet de la notion."),
      block(
        "bloc_definition_simple",
        "Definition simple",
        "Definis la notion avec des mots simples.",
      ),
      block(
        "bloc_comment_reconnaitre",
        "Comment reconnaitre",
        "Donne une methode d'identification.",
      ),
      block("bloc_exemples", "Exemples", "Ajoute des exemples progressifs."),
      block(
        "bloc_a_ne_pas_confondre",
        "A ne pas confondre",
        "Precise les confusions frequentes.",
        false,
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_FAMILLES_CATEGORIES: {
    id: "FR_FAMILLES_CATEGORIES",
    label: "Francais - Familles / categories",
    description: "Template pour classer des notions en categories.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'objectif de la classification."),
      block("bloc_vue_ensemble", "Vue d'ensemble", "Donne une vue globale de la famille."),
      block(
        "bloc_tableau_categories",
        "Tableau categories",
        "Presente les categories de maniere structuree.",
      ),
      block(
        "bloc_comment_distinguer",
        "Comment distinguer",
        "Explique les criteres de distinction.",
      ),
      block("bloc_mini_quiz_mental", "Mini quiz mental", "Ajoute une verif rapide.", false),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_PROCEDURE_SAVOIR_FAIRE: {
    id: "FR_PROCEDURE_SAVOIR_FAIRE",
    label: "Francais - Procedure / savoir-faire",
    description: "Template pour une methode d'action en francais.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Situe l'utilite de la procedure."),
      block("bloc_quand_l_utiliser", "Quand l'utiliser", "Precise les situations d'usage."),
      block("bloc_etapes", "Etapes", "Detaille les etapes a suivre."),
      block("bloc_exemple_guide", "Exemple guide", "Montre une application accompagnee."),
      block(
        "bloc_erreurs_frequentes_explication",
        "Erreurs frequentes (explication)",
        "Explique les erreurs courantes et pourquoi elles arrivent.",
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_FONCTION_DANS_PHRASE: {
    id: "FR_FONCTION_DANS_PHRASE",
    label: "Francais - Fonction dans la phrase",
    description: "Template pour les fonctions grammaticales dans la phrase.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique le role de cette fonction."),
      block(
        "bloc_schema_phrase_ou_structure",
        "Schema phrase ou structure",
        "Montre la structure type.",
      ),
      block(
        "bloc_role_de_la_fonction",
        "Role de la fonction",
        "Explique sa fonction grammaticale.",
      ),
      block("bloc_comment_identifier", "Comment identifier", "Donne la methode pour la reperer."),
      block("bloc_exemples_annotes", "Exemples annotes", "Propose des exemples expliques."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_ORTHOGRAPHE_CIBLEE: {
    id: "FR_ORTHOGRAPHE_CIBLEE",
    label: "Francais - Orthographe ciblee",
    description: "Template pour les regles d'orthographe ciblees.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'utilite de la regle."),
      block("bloc_vue_ensemble", "Vue d'ensemble", "Donne un apercu de la notion."),
      block(
        "bloc_tableau_cas_possibles",
        "Tableau des cas possibles",
        "Liste les cas de maniere claire.",
      ),
      block("bloc_regles_simples", "Regles simples", "Formule les regles essentielles."),
      block(
        "bloc_listes_ou_paires_exemples",
        "Listes ou paires d'exemples",
        "Ajoute des exemples contrastes.",
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_VOCABULAIRE_EN_CONTEXTE: {
    id: "FR_VOCABULAIRE_EN_CONTEXTE",
    label: "Francais - Vocabulaire en contexte",
    description: "Template pour apprendre des mots en contexte.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'interet lexical."),
      block("bloc_exemple_de_base", "Exemple de base", "Donne un exemple d'introduction."),
      block("bloc_liste_de_mots", "Liste de mots", "Liste les mots cibles."),
      block(
        "bloc_utilisation_en_phrases",
        "Utilisation en phrases",
        "Montre l'utilisation dans des phrases.",
      ),
      block("bloc_mini_activite", "Mini activite", "Ajoute une activite courte."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  FR_GRAMMAIRE_TEXTE: {
    id: "FR_GRAMMAIRE_TEXTE",
    label: "Francais - Grammaire du texte",
    description: "Template pour les mecanismes de coherence textuelle.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'utilite en production de texte."),
      block("bloc_definition_simple", "Definition simple", "Definis la notion textuelle."),
      block(
        "bloc_types_de_reprises_ou_usages",
        "Types de reprises ou usages",
        "Presente les differents usages.",
      ),
      block(
        "bloc_exemple_texte_annote",
        "Exemple de texte annote",
        "Montre la notion dans un texte annote.",
      ),
      block("bloc_comment_s_y_prendre", "Comment s'y prendre", "Donne une methode d'application."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_CONCEPT_NUMERIQUE: {
    id: "MATH_CONCEPT_NUMERIQUE",
    label: "Maths - Concept numerique",
    description: "Template pour une notion numerique.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'utilite de la notion numerique."),
      block("bloc_definition_simple", "Definition simple", "Definis la notion."),
      block("bloc_representations", "Representations", "Donne des representations utiles."),
      block(
        "bloc_comment_reconnaitre",
        "Comment reconnaitre",
        "Donne des criteres d'identification.",
      ),
      block(
        "bloc_exemples_et_contre_exemples",
        "Exemples et contre-exemples",
        "Propose des exemples valides et non valides.",
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_PROCEDURE_CALCUL: {
    id: "MATH_PROCEDURE_CALCUL",
    label: "Maths - Procedure de calcul",
    description: "Template pour les methodes de calcul.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique quand la procedure est utile."),
      block("bloc_quand_l_utiliser", "Quand l'utiliser", "Precise les situations d'usage."),
      block("bloc_etapes", "Etapes", "Detaille les etapes de calcul."),
      block("bloc_exemple_guide", "Exemple guide", "Montre un exemple complet guide."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_PROPRIETE_REGLE: {
    id: "MATH_PROPRIETE_REGLE",
    label: "Maths - Propriete / regle",
    description: "Template pour formaliser une regle mathematique.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'utilite de la regle."),
      block("bloc_regle_symbolique", "Regle symbolique", "Ecris la regle sous forme symbolique."),
      block("bloc_regle_en_mots", "Regle en mots", "Explique la regle avec des mots simples."),
      block("bloc_exemples", "Exemples", "Donne des exemples d'application."),
      block("bloc_non_exemples", "Non-exemples", "Donne des contre-exemples.", false),
      block("bloc_utilisation_pratique", "Utilisation pratique", "Montre l'usage en exercice."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_GRANDEURS_MESURES: {
    id: "MATH_GRANDEURS_MESURES",
    label: "Maths - Grandeurs & mesures",
    description: "Template pour unites, conversions et mesures.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'utilite des grandeurs."),
      block("bloc_unites", "Unites", "Liste les unites importantes."),
      block(
        "bloc_relations_entre_unites",
        "Relations entre unites",
        "Montre les equivalences entre unites.",
      ),
      block(
        "bloc_exemples_conversion",
        "Exemples de conversion",
        "Propose des conversions guidees.",
      ),
      block("bloc_methode_calcul", "Methode de calcul", "Explique la methode de calcul associee."),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_FIGURE_GEOMETRIE: {
    id: "MATH_FIGURE_GEOMETRIE",
    label: "Maths - Figure / geometrie",
    description: "Template pour decrire les figures geometriques.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique l'interet de la notion geometrique."),
      block(
        "bloc_portrait_figure_ou_notion",
        "Portrait de la figure ou notion",
        "Decris la figure ou notion.",
      ),
      block("bloc_vocabulaire", "Vocabulaire", "Liste le vocabulaire utile."),
      block(
        "bloc_comment_reperer_ou_construire",
        "Comment reperer ou construire",
        "Donne la methode de construction/reperage.",
      ),
      block(
        "bloc_exemples_ou_cas_typiques",
        "Exemples ou cas typiques",
        "Ajoute des cas representatifs.",
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
  MATH_PROBLEME_STRATEGIE: {
    id: "MATH_PROBLEME_STRATEGIE",
    label: "Maths - Probleme / strategie",
    description: "Template pour resoudre des problemes avec strategie.",
    blocks: [
      block("a_quoi_ca_sert", "A quoi ca sert", "Explique pourquoi cette strategie aide."),
      block("bloc_situation_type", "Situation type", "Pose une situation representative."),
      block("bloc_questions_guides", "Questions guides", "Donne les questions a se poser."),
      block(
        "bloc_strategie_pas_a_pas",
        "Strategie pas a pas",
        "Detaille la demarche de resolution.",
      ),
      block(
        "bloc_exemple_de_probleme_annote",
        "Exemple de probleme annote",
        "Donne un exemple complet commente.",
      ),
      block("bloc_a_retenir", "A retenir", "Resume les points essentiels."),
    ],
  },
};

const FAMILLE_TO_TEMPLATE_BY_MATIERE: Record<
  FicheMatiere,
  Partial<Record<FicheFamilleTemplate, FicheTemplateType>>
> = {
  Francais: {
    TEXTE_COMMUNICATION: "FR_CONCEPT_DE_BASE",
    GRAMMAIRE_PHRASE: "FR_FONCTION_DANS_PHRASE",
    CLASSES_GRAMMATICALES: "FR_CONCEPT_DE_BASE",
    ORTHOGRAPHE: "FR_ORTHOGRAPHE_CIBLEE",
    VOCABULAIRE: "FR_VOCABULAIRE_EN_CONTEXTE",
    GRAMMAIRE_TEXTE: "FR_GRAMMAIRE_TEXTE",
  },
  Mathematiques: {
    CONCEPT_NUMERIQUE: "MATH_CONCEPT_NUMERIQUE",
    PROCEDURE_CALCUL: "MATH_PROCEDURE_CALCUL",
    PROPRIETE_REGLE: "MATH_PROPRIETE_REGLE",
    GRANDEURS_MESURES: "MATH_GRANDEURS_MESURES",
    FIGURE_GEOMETRIE: "MATH_FIGURE_GEOMETRIE",
    PROBLEME_STRATEGIE: "MATH_PROBLEME_STRATEGIE",
  },
};

export function getFamiliesByMatiere(matiere: FicheMatiere): FicheFamilleDefinition[] {
  return FICHE_FAMILLE_DEFINITIONS.filter((family) => family.matiere === matiere);
}

export function getFamilleDefinition(famille: FicheFamilleTemplate): FicheFamilleDefinition | null {
  return FICHE_FAMILLE_DEFINITIONS.find((entry) => entry.id === famille) ?? null;
}

export function getDefaultFamilleForMatiere(matiere: FicheMatiere): FicheFamilleTemplate {
  return getFamiliesByMatiere(matiere)[0]?.id ?? "TEXTE_COMMUNICATION";
}

export function getTemplateTypeForSelection(
  matiere: FicheMatiere,
  famille: FicheFamilleTemplate,
): FicheTemplateType {
  const mapped = FAMILLE_TO_TEMPLATE_BY_MATIERE[matiere][famille];
  if (mapped) return mapped;
  return matiere === "Francais" ? "FR_CONCEPT_DE_BASE" : "MATH_CONCEPT_NUMERIQUE";
}

export function getTemplateDefinition(templateType: FicheTemplateType): FicheTemplateDefinition {
  return FICHE_TEMPLATE_DEFINITIONS[templateType];
}

export function getBlocksForTemplate(
  templateType: FicheTemplateType,
): FicheTemplateBlockDefinition[] {
  return getTemplateDefinition(templateType).blocks;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fiche-${Date.now()}-${Math.trunc(Math.random() * 10_000)}`;
}

export function createEmptyVisual(): FicheVisual {
  return {
    id: createId(),
    title: "",
    notes: "",
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    previewUrl: null,
  };
}

export function createEmptyFrequentError(): FicheFrequentError {
  return {
    id: createId(),
    erreur: "",
    fix: "",
  };
}

export function createDefaultFiche(
  matiere: FicheMatiere,
  famille_template: FicheFamilleTemplate,
): FicheRecord {
  const templateType = getTemplateTypeForSelection(matiere, famille_template);
  return {
    id: createId(),
    matiere,
    famille_template,
    template_type: templateType,
    titre_fiche: "",
    blocs: getBlocksForTemplate(templateType).map((templateBlock) => ({
      key: templateBlock.key,
      title: templateBlock.title,
      description: templateBlock.description,
      required: templateBlock.required,
      contentHtml: "",
    })),
    trucs_astuces: {
      miniChecklistHtml: "",
      astuceMemoHtml: "",
      erreursFrequentes: [createEmptyFrequentError()],
    },
    visuels: [],
    statut: "brouillon",
    updatedAt: new Date().toISOString(),
  };
}

export function remapBlocksForTemplate(
  existingBlocks: FicheBlock[],
  templateType: FicheTemplateType,
): FicheBlock[] {
  const existingByKey = new Map(existingBlocks.map((block) => [block.key, block]));
  return getBlocksForTemplate(templateType).map((templateBlock) => {
    const current = existingByKey.get(templateBlock.key);
    return {
      key: templateBlock.key,
      title: templateBlock.title,
      description: templateBlock.description,
      required: templateBlock.required,
      contentHtml: current?.contentHtml ?? "",
    };
  });
}
