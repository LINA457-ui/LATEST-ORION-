import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../../../../lib/db/src/index.js";
import { adminPins } from "../../../../lib/db/src/schema/index.js";
import { count } from "drizzle-orm";

function requireSecret(): string {
  const s = process.env.SESSION_SECRET;

  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET environment variable is required (min 16 chars) for admin PIN security.",
    );
  }

  return s;
}

const SECRET: string = requireSecret();
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

export const DEFAULT_PIN = "1805";
export const MAX_PINS = 3;

export function hashPin(pin: string): string {
  return createHash("sha256").update(`${SECRET}:${pin}`).digest("hex");
}

export async function ensureDefaultPin(): Promise<void> {
  const [{ value }] = await db.select({ value: count() }).from(adminPins);

  if (Number(value) === 0) {
    await db.insert(adminPins).values({
      pinHash: hashPin(DEFAULT_PIN),
      label: "Default PIN",
      createdBy: null,
    });
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const target = hashPin(pin);
  const rows = await db.select().from(adminPins);

  for (const r of rows) {
    if (
      r.pinHash.length === target.length &&
      timingSafeEqual(Buffer.from(r.pinHash), Buffer.from(target))
    ) {
      return true;
    }
  }

  return false;
}

export function issuePinToken(userId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;

  const sig = createHmac("sha256", SECRET)
    .update(`${exp}:${userId}`)
    .digest("hex");

  return `${exp}.${sig}`;
}

export function verifyPinToken(token: string, userId: string): boolean {
  const idx = token.indexOf(".");

  if (idx <= 0) return false;

  const expStr = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const exp = Number(expStr);

  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const expected = createHmac("sha256", SECRET)
    .update(`${exp}:${userId}`)
    .digest("hex");

  if (sig.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
