import argon2 from "argon2";
import crypto from "crypto";

/**
 * Manages cryptographic security for password-protected private posts.
 * Implements Argon2 for hashing and AES-256-GCM for reversible encryption.
 */

/**
 * Derives a secure 256-bit key from system environment secrets.
 */
const getKey = (): Buffer => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to protect post passwords");
  }

  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Secures a post password by generating both a one-way hash and a reversible cipher.
 */
export async function protectPassword(password: string): Promise<string> {
  // 1. Generate Argon2 hash for secure verification
  const hash = await argon2.hash(password);
  
  // 2. Encrypt the original password to allow author-side retrieval (AES-256-GCM)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // 3. Persist the cryptographic bundle as a JSON string
  return JSON.stringify({
    hash,
    encrypted,
    iv: iv.toString('hex'),
    authTag
  });
}

/**
 * Decrypts and retrieves the original post password for the content author.
 */
export function getActualPassword(dbValue: string | null): string | null {
  if (!dbValue) return null;
  try {
    const parsed = JSON.parse(dbValue);
    if (parsed.encrypted && parsed.iv && parsed.authTag) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(parsed.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(parsed.authTag, 'hex'));
      let decrypted = decipher.update(parsed.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  } catch {
    return dbValue; // Support for legacy plain-text passwords if necessary
  }
  return dbValue;
}

/**
 * Validates a user-entered password against the stored Argon2 hash.
 */
export async function verifyPostPassword(password: string, dbValue: string | null): Promise<boolean> {
  if (!dbValue) return false;
  try {
    const parsed = JSON.parse(dbValue);
    if (parsed.hash) {
      return await argon2.verify(parsed.hash, password);
    }
  } catch {
    return password === dbValue; // Legacy plain-text fallback
  }
  return false;
}

type OneTimePostAccessToken = {
  passwordFingerprint: string;
  postId: string;
};

declare global {
  var __nkabPostAccessTokens: Map<string, OneTimePostAccessToken> | undefined;
}

const postAccessTokens = globalThis.__nkabPostAccessTokens ?? new Map<string, OneTimePostAccessToken>();

if (!globalThis.__nkabPostAccessTokens) {
  globalThis.__nkabPostAccessTokens = postAccessTokens;
}

function getPasswordFingerprint(dbValue: string): string {
  return crypto.createHash("sha256").update(dbValue).digest("base64url");
}

export function createOneTimePostAccessToken(postId: string, dbValue: string): string {
  const token = crypto.randomBytes(32).toString("base64url");

  postAccessTokens.set(token, {
    passwordFingerprint: getPasswordFingerprint(dbValue),
    postId,
  });

  return token;
}

export function consumeOneTimePostAccessToken(postId: string, dbValue: string | null, token: string | undefined): boolean {
  if (!dbValue || !token) return false;

  const stored = postAccessTokens.get(token);
  postAccessTokens.delete(token);

  if (!stored || stored.postId !== postId) return false;
  if (stored.passwordFingerprint !== getPasswordFingerprint(dbValue)) return false;

  return true;
}
