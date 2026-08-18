export type ServiceResult<T, E extends string = string> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: E;
      message?: string;
      fieldErrors?: Record<string, string>;
    };

export function ok<T>(value: T): ServiceResult<T, never> {
  return { ok: true, value };
}

export function err<E extends string>(
  error: E,
  message?: string,
  fieldErrors?: Record<string, string>,
): ServiceResult<never, E> {
  return {
    ok: false,
    error,
    ...(message !== undefined ? { message } : {}),
    ...(fieldErrors !== undefined ? { fieldErrors } : {}),
  };
}
