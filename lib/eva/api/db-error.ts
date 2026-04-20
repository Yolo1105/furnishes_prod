/**
 * Map Prisma / connection failures to HTTP responses (avoid 500 when Postgres is simply down).
 * Logs stay short: Prisma often prefixes errors with "Invalid `...` invocation" + bundler paths.
 */
import { Prisma } from "@prisma/client";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { log } from "@/lib/eva/core/logger";

const START_DB_HINT =
  "Set DATABASE_URL in `.env.local` to a running PostgreSQL instance (see `.env.example`), run `npm run db:migrate:deploy`, and ensure the server accepts connections (local Docker, Supabase, etc.).";

const INVALID_URL_HINT =
  'DATABASE_URL is missing, invalid, or not PostgreSQL. Copy `.env.example` to `.env.local`, set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"`, then `npm run db:migrate:deploy`.';

/** Server unreachable / timeout / closed (not auth/schema). */
const PRISMA_CONNECTION_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Connection timeout
  "P1017", // Server has closed the connection
]);

const SCHEMA_OUT_OF_DATE_CODES = new Set([
  "P2021", // Table does not exist (migrations not applied)
]);

function extractReadableMessage(msg: string): string {
  const trimmed = msg.trim();
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const last = paragraphs[paragraphs.length - 1];
  if (last && !last.includes("__TURBOPACK__") && !/^Invalid `/i.test(last)) {
    return last.slice(0, 240);
  }
  const noInvocation = trimmed
    .replace(/^Invalid `[^`]*` invocation:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return noInvocation.slice(0, 240);
}

function logDetail(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return extractReadableMessage(e.message);
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    const code =
      "errorCode" in e &&
      typeof (e as { errorCode?: unknown }).errorCode === "string"
        ? (e as { errorCode: string }).errorCode
        : "";
    const base = extractReadableMessage(e.message);
    return [code, base].filter(Boolean).join(" — ").slice(0, 280);
  }
  const raw = e instanceof Error ? e.message : String(e);
  return extractReadableMessage(raw);
}

/** Invalid connection string / datasource config (not “server is down”). */
function isDatabaseConfigurationError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === "P1012" || e.code === "P1013";
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    const m = e.message;
    return (
      /validation error count/i.test(m) ||
      /P1012|P1013/i.test(m) ||
      /error validating datasource/i.test(m) ||
      /invalid.*database string/i.test(m)
    );
  }
  return false;
}

function isConnectionFailure(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_CONNECTION_CODES.has(e.code);
  }
  if (e instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return !isDatabaseConfigurationError(e);
  }
  const raw = e instanceof Error ? e.message : String(e);
  return isUnreachableHeuristic(raw);
}

function isUnreachableHeuristic(message: string): boolean {
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    /ECONNREFUSED|ETIMEDOUT|connect ECONNREFUSED/i.test(message)
  );
}

function isMissingUrl(message: string): boolean {
  return (
    message.includes("DATABASE_URL is not set") ||
    message.includes("Environment variable not found: DATABASE_URL")
  );
}

/**
 * Use in API route `catch` blocks that call Prisma.
 */
export function mapDbErrorToResponse(e: unknown, event: string): Response {
  const detail = logDetail(e);
  const raw = e instanceof Error ? e.message : String(e);

  if (isMissingUrl(raw)) {
    log({
      level: "warn",
      event,
      code: "database_url_missing",
      detail,
    });
    const msg =
      process.env.NODE_ENV === "production"
        ? "Service temporarily unavailable."
        : raw;
    return apiError(ErrorCodes.DATABASE_UNAVAILABLE, msg, 503);
  }

  if (isDatabaseConfigurationError(e)) {
    log({
      level: "warn",
      event,
      code: "database_config_invalid",
      detail,
    });
    const msg =
      process.env.NODE_ENV === "production"
        ? "Service temporarily unavailable."
        : INVALID_URL_HINT;
    return apiError(ErrorCodes.DATABASE_UNAVAILABLE, msg, 503);
  }

  if (isConnectionFailure(e)) {
    log({
      level: "warn",
      event,
      code: "database_unreachable",
      detail,
    });
    const msg =
      process.env.NODE_ENV === "production"
        ? "Service temporarily unavailable."
        : `Cannot connect to the database. ${START_DB_HINT}`;
    return apiError(ErrorCodes.DATABASE_UNAVAILABLE, msg, 503);
  }

  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    SCHEMA_OUT_OF_DATE_CODES.has(e.code)
  ) {
    log({
      level: "warn",
      event,
      code: "database_schema_out_of_date",
      detail,
    });
    const msg =
      process.env.NODE_ENV === "production"
        ? "Service temporarily unavailable."
        : "Database schema is out of date. Run: npm run db:migrate:deploy — then npm run db:seed:dev";
    return apiError(ErrorCodes.DATABASE_UNAVAILABLE, msg, 503);
  }

  log({ level: "error", event, detail });
  return apiError(
    ErrorCodes.INTERNAL_ERROR,
    "Something went wrong loading data. Try again later.",
    500,
  );
}
