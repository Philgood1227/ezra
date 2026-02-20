import type { ZodIssue } from "zod";
import type { FieldErrorMap } from "@/features/auth/form-state";

export function toFieldErrors(issues: ZodIssue[]): FieldErrorMap {
  return issues.reduce<FieldErrorMap>((accumulator, issue) => {
    const key = String(issue.path[0] ?? "form");
    if (!accumulator[key]) {
      accumulator[key] = issue.message;
    }
    return accumulator;
  }, {});
}
