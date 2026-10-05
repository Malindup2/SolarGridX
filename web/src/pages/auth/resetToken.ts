/*
 * resetToken.ts
 * Reads the password-reset token from the URL fragment (#token=<64 hex chars>).
 */

export function readResetToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  return token && /^[0-9a-fA-F]{64}$/.test(token) ? token : null
}
