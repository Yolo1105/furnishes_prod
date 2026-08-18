type AccountApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export function isAccountApiError(value: unknown): value is AccountApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as AccountApiError).code === "string" &&
    typeof (value as AccountApiError).message === "string"
  );
}

export async function accountRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload ?? {}) as {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    throw {
      code: body.error ?? "request_failed",
      message: body.message ?? "The request could not be completed.",
      ...(body.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
    } satisfies AccountApiError;
  }

  return payload as T;
}
