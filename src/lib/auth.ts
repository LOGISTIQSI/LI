import { hash, compare } from "bcryptjs";
import { randomUUID } from "crypto";
import { getDb } from "./db";

const SALT_ROUNDS = 10;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export function generateToken(): string {
  return randomUUID();
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

  await db.prepare(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt);

  return token;
}

export async function validateSession(
  token: string
): Promise<{ userId: number; companyId: number; role: string; fullName: string; email: string } | null> {
  const db = getDb();

  const row = await db.prepare(`
    SELECT s.user_id, u.company_id, u.role, u.full_name, u.email, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);

  if (!row) return null;

  const expiresAt = new Date(row.expires_at as string);
  if (expiresAt < new Date()) {
    // Expired — clean up
    await db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    userId: Number(row.user_id),
    companyId: Number(row.company_id),
    role: row.role as string,
    fullName: row.full_name as string,
    email: row.email as string,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const db = getDb();
  await db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  return `logistiqs_token=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_MS / 1000}; SameSite=Lax${isProd ? "; Secure" : ""}`;
}

export function getExpiredCookie(): string {
  return "logistiqs_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
}
