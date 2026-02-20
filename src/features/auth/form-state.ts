export type FieldErrorMap = Record<string, string>;

export interface FormSubmitState {
  fieldErrors: FieldErrorMap;
  formError: string | null;
}

export function emptyFormState(): FormSubmitState {
  return {
    fieldErrors: {},
    formError: null,
  };
}
