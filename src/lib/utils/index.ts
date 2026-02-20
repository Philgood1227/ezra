import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export { haptic } from "./haptic";
export { isOnline } from "./network";
export { playSound, type FeedbackSound } from "./sounds";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
