import argon2 from "argon2";
import crypto from "crypto";

const getKey = (): Buffer => {
  const secret = process.env.POST_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "fallback_default_secret_key_123456";
  return crypto.createHash('sha256').update(secret).digest();
};

export async function protectPassword(password: string): Promise<string> {
  const hash = await argon2.hash(password);
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return JSON.stringify({
    hash,
    encrypted,
    iv: iv.toString('hex'),
    authTag
  });
}

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
    return dbValue;
  }
  return dbValue;
}

export async function verifyPostPassword(password: string, dbValue: string | null): Promise<boolean> {
  if (!dbValue) return false;
  try {
    const parsed = JSON.parse(dbValue);
    if (parsed.hash) {
      return await argon2.verify(parsed.hash, password);
    }
  } catch {
    return password === dbValue;
  }
  return false;
}
