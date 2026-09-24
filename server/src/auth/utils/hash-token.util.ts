import { createHash } from 'node:crypto';

/** Refresh tokens are stored hashed, never in plaintext, mirroring password storage. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
