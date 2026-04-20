/**
 * Discriminated union for Server Action return values.
 *
 * Every Server Action in the app returns this shape. Callers check
 * `result.ok` to discriminate success from failure.
 */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { data: T }))
  | { ok: false; error: string };
