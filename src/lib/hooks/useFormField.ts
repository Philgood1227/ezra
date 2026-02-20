"use client";

import * as React from "react";

type Validator<TValue> = (value: TValue) => string | null;

interface UseFormFieldOptions<TValue> {
  initialValue: TValue;
  validate: Validator<TValue>;
}

interface UseFormFieldResult<TValue> {
  value: TValue;
  setValue: React.Dispatch<React.SetStateAction<TValue>>;
  touched: boolean;
  error: string | null;
  hasError: boolean;
  isValid: boolean;
  markTouched: () => void;
  validateNow: () => string | null;
  reset: (nextValue?: TValue) => void;
}

export function useFormField<TValue>({
  initialValue,
  validate,
}: UseFormFieldOptions<TValue>): UseFormFieldResult<TValue> {
  const [value, setValue] = React.useState<TValue>(initialValue);
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const runValidation = React.useCallback(
    (nextValue: TValue): string | null => {
      const nextError = validate(nextValue);
      setError(nextError);
      return nextError;
    },
    [validate],
  );

  const validateNow = React.useCallback(() => runValidation(value), [runValidation, value]);

  const markTouched = React.useCallback(() => {
    setTouched(true);
    runValidation(value);
  }, [runValidation, value]);

  const reset = React.useCallback(
    (nextValue?: TValue) => {
      const resolved = nextValue ?? initialValue;
      setValue(resolved);
      setTouched(false);
      setError(null);
    },
    [initialValue],
  );

  return {
    value,
    setValue,
    touched,
    error,
    hasError: touched && Boolean(error),
    isValid: touched && !error,
    markTouched,
    validateNow,
    reset,
  };
}

