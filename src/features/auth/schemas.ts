import { z } from "zod";
import { isValidPin } from "@/lib/auth/pin-validation";

export const loginSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse email valide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const registerSchema = z.object({
  familyName: z.string().trim().min(2, "Le nom de la famille doit contenir au moins 2 caractères."),
  displayName: z.string().trim().min(2, "Le nom affiché doit contenir au moins 2 caractères."),
  email: z.string().trim().email("Saisissez une adresse email valide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const childPinSchema = z.object({
  familyName: z.string().trim().min(2, "Le nom de la famille est obligatoire."),
  childName: z.string().trim().min(2, "Le prénom de l'enfant est obligatoire."),
  pin: z
    .string()
    .trim()
    .refine((value) => isValidPin(value), "Le PIN doit contenir entre 4 et 8 chiffres."),
});

export const pinConfigSchema = z.object({
  childName: z.string().trim().min(2, "Le prénom de l'enfant est obligatoire."),
  pin: z
    .string()
    .trim()
    .refine((value) => isValidPin(value), "Le PIN doit contenir entre 4 et 8 chiffres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChildPinInput = z.infer<typeof childPinSchema>;
export type PinConfigInput = z.infer<typeof pinConfigSchema>;
