import { isAccountApiError } from "./account-api";

export { isAccountApiError } from "./account-api";

export function getAccountErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isAccountApiError(error) && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
