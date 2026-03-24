import { z } from "zod";

const childTimeBlockSchema = z.enum(["morning", "noon", "afternoon", "home", "evening"]);

export const templateTaskInputSchema = z.object({
  categoryId: z.string().uuid("Categorie invalide."),
  itemKind: z.enum(["activity", "mission", "leisure"]).optional(),
  itemSubkind: z.string().trim().max(60).nullable().optional(),
  assignedProfileId: z.string().trim().min(1, "Assignation invalide.").max(120).nullable(),
  title: z.string().trim().min(2, "Le titre est obligatoire."),
  description: z
    .string()
    .trim()
    .max(4000, "La description ne peut pas depasser 4000 caracteres.")
    .nullable(),
  instructionsHtml: z
    .string()
    .trim()
    .max(20000, "Les consignes HTML ne peuvent pas depasser 20000 caracteres.")
    .nullable()
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de debut invalide."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure de fin invalide."),
  pointsBase: z.number().int().min(0).max(99),
  knowledgeCardId: z.string().uuid("Fiche invalide.").nullable(),
  recommendedChildTimeBlockId: childTimeBlockSchema.nullable().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.").nullable().optional(),
});
