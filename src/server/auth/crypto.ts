import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

/**
 * Development-only pepper so local runs and E2E work without AUTH_SECRET.
 * Production is required to supply its own (enforced by boot preflight).
 *
 * `prisma/seed.mjs` duplicates this constant and `digestToken` because it runs
 * as plain Node. Change both together or seeded sessions stop resolving.
 */
const DEV_TOKEN_PEPPER = "furnishes-development-token-pepper";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      },
    );
  });
}

export function createRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function tokenPepper(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required to derive token digests.");
  }
  return DEV_TOKEN_PEPPER;
}

/**
 * Keyed digest for session and email tokens. Keying with AUTH_SECRET means a
 * database read alone cannot verify a stolen token, and rotating the secret
 * invalidates every session and pending email link (see docs/OPERATIONS.md).
 */
export function digestToken(token: string): string {
  return createHmac("sha256", tokenPepper()).update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const [, nRaw, rRaw, pRaw, salt, hash] = parts;
  if (!nRaw || !rRaw || !pRaw || !salt || !hash) {
    return false;
  }
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEYLEN,
      { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw) },
      (error, value) => {
        if (error) reject(error);
        else resolve(value);
      },
    );
  });
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(expected, derived);
}
