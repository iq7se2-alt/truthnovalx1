import crypto from "node:crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.warn("⚠️  ADMIN_PASSWORD is not set in .env — admin login will be disabled.");
}
const SECRET = process.env.SESSION_SECRET || "dev-secret-fallback";

export const ADMIN_COOKIE = "lord_admin_token";
export const ADMIN_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Create a signed session token: `<expEpochMs>.<hmac>` */
export function createSessionToken(): string {
  const exp = Date.now() + ADMIN_MAX_AGE_SEC * 1000;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

/** Verify a session token signature + expiry */
export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const exp = Number(payload);
  if (!exp || Number.isNaN(exp)) return false;
  if (Date.now() > exp) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Constant-time password check */
export function checkPassword(password: string): boolean {
  if (!password || !ADMIN_PASSWORD) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
