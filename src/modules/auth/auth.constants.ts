export const ACCESS_TOKEN_TYPE = 'access';
export const BCRYPT_ROUNDS = 12;
export const REFRESH_TOKEN_TYPE = 'refresh';

export function expiresInSeconds(expiresIn: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(expiresIn.trim());
  if (!match) throw new Error('Invalid JWT access-token expiry');
  const value = Number(match[1]);
  const multiplier =
    { s: 1, m: 60, h: 3600, d: 86400 }[
      match[2]?.toLowerCase() as 's' | 'm' | 'h' | 'd'
    ] ?? 1;
  return value * multiplier;
}
