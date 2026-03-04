import { createHmac } from 'crypto';

export function signToken(userId, secret) {
  const sig = createHmac('sha256', secret).update(String(userId)).digest('hex');
  return `${userId}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const userId = parseInt(token.slice(0, dot), 10);
  if (isNaN(userId)) return null;
  const expected = signToken(userId, secret);
  if (token !== expected) return null;
  return userId;
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
}

export function getUserIdFromCookie(cookieHeader, secret) {
  const cookies = parseCookies(cookieHeader);
  if (!cookies.session) return null;
  return verifyToken(cookies.session, secret);
}

export function setSessionCookie(res, userId, secret) {
  const token = signToken(userId, secret);
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);
}
