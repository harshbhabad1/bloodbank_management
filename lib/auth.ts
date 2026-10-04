import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";

const SESSION_COOKIE = "bb_session";
const SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecret() {
  const secret = process.env.SESSION_SECRET || "bloodbank-dev-secret-session-token-32chars";
  return new TextEncoder().encode(secret);
}

export async function createSession() {
  const token = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY,
    path: "/",
  });
}

export async function getSession(): Promise<{ sub: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { sub: string };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function verifyCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bloodbank.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  try {
    const emailBuf = Buffer.from(email);
    const adminEmailBuf = Buffer.from(adminEmail);
    const passwordBuf = Buffer.from(password);
    const adminPasswordBuf = Buffer.from(adminPassword);

    // Pad to same length to avoid length-based timing attacks
    const emailMatch =
      emailBuf.length === adminEmailBuf.length &&
      timingSafeEqual(emailBuf, adminEmailBuf);
    const passwordMatch =
      passwordBuf.length === adminPasswordBuf.length &&
      timingSafeEqual(passwordBuf, adminPasswordBuf);

    return emailMatch && passwordMatch;
  } catch {
    return false;
  }
}
