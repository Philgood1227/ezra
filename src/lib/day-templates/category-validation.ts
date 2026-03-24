import { z } from "zod";
import { isCategoryColorKey, isCategoryIconKey } from "@/lib/day-templates/constants";
import type { CategoryInput } from "@/lib/day-templates/types";

export const categoryIconKeySchema = z
  .string()
  .trim()
  .min(1, "L'icone est obligatoire.")
  .refine((value) => isCategoryIconKey(value), {
    message: "Cle d'icone invalide. Choisissez une icone de la liste.",
  })
  .transform((value) => value as CategoryInput["icon"]);

export const categoryColorKeySchema = z
  .string()
  .trim()
  .min(1, "La couleur est obligatoire.")
  .refine((value) => isCategoryColorKey(value), {
    message: "Cle couleur invalide. Choisissez une couleur de la liste.",
  })
  .transform((value) => value as CategoryInput["colorKey"]);

export const categoryInputSchema = z.object({
  code: z.enum(["homework", "revision", "training", "activity", "routine", "leisure"]).nullable().optional(),
  name: z.string().trim().min(2, "Le nom de la categorie est obligatoire."),
  icon: categoryIconKeySchema,
  colorKey: categoryColorKeySchema,
  defaultItemKind: z.enum(["activity", "mission", "leisure"]).nullable().optional(),
});
