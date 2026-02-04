export const ADMIN_COOKIE_NAME = 'traccarpro_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

const encoder = new TextEncoder();

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makePayload(username: string, expiresAt: number): string {
  return `${expiresAt}:${encodeURIComponent(username)}`;
}

function parsePayload(payload: string): { username: string; expiresAt: number } | null {
  const [expiresAtRaw, encodedUsername] = payload.split(':', 2);
  if (!expiresAtRaw || !encodedUsername) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;

  try {
    return {
      username: decodeURIComponent(encodedUsername),
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function createAdminSessionToken(
  username: string,
  secret: string,
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = makePayload(username, expiresAt);
  const signature = await sha256Hex(`${payload}.${secret}`);
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string,
  expectedUsername: string,
  secret: string
): Promise<boolean> {
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === token.length - 1) return false;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const parsed = parsePayload(payload);

  if (!parsed) return false;
  if (parsed.username !== expectedUsername) return false;
  if (Math.floor(Date.now() / 1000) > parsed.expiresAt) return false;

  const expectedSignature = await sha256Hex(`${payload}.${secret}`);
  return expectedSignature === signature;
}

