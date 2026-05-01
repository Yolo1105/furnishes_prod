/**
 * Discriminated union for Server Action return values.
 *
 * Every Server Action in the app returns this shape. Callers check
 * `result.ok` to discriminate success from failure.
 */
type OkResult<T> = [T] extends [undefined]
  ? { ok: true }
  : { ok: true; data: T };

export type ActionResult<T = undefined> =
  | OkResult<T>
  | { ok: false; error: string };
