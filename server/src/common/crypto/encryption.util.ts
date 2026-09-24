import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * AES-256-GCM encrypt, keyed by ENCRYPTION_KEY (64 hex chars / 32 bytes).
 * Output packs iv:authTag:ciphertext (all hex) into one string so a single
 * DB column holds everything needed to decrypt.
 */
export function encryptSecret(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString('hex')).join(':');
}

export function decryptSecret(payload: string, hexKey: string): string {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted payload');
  }
  const key = Buffer.from(hexKey, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** e.g. "sk-abc123...xyz9" -> "sk-a••••xyz9" — never store or return the raw key past this. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return '••••';
  return `${plaintext.slice(0, 4)}••••${plaintext.slice(-4)}`;
}
