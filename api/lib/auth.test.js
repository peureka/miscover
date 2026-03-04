import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, getUserIdFromCookie, parseCookies } from './auth.js';

describe('signToken', () => {
  it('returns a string in format userId.signature', () => {
    const token = signToken(42, 'test-secret');
    expect(token).toMatch(/^42\..+$/);
  });

  it('produces different signatures for different secrets', () => {
    const t1 = signToken(42, 'secret-a');
    const t2 = signToken(42, 'secret-b');
    expect(t1).not.toBe(t2);
  });
});

describe('verifyToken', () => {
  it('returns userId for valid token', () => {
    const token = signToken(42, 'test-secret');
    const userId = verifyToken(token, 'test-secret');
    expect(userId).toBe(42);
  });

  it('returns null for tampered token', () => {
    const token = signToken(42, 'test-secret');
    const tampered = token.replace(/.$/, 'x');
    expect(verifyToken(tampered, 'test-secret')).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = signToken(42, 'secret-a');
    expect(verifyToken(token, 'secret-b')).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(verifyToken('garbage', 'test-secret')).toBeNull();
    expect(verifyToken('', 'test-secret')).toBeNull();
    expect(verifyToken(null, 'test-secret')).toBeNull();
  });
});

describe('parseCookies', () => {
  it('parses cookie header string', () => {
    const cookies = parseCookies('session=abc123; other=value');
    expect(cookies.session).toBe('abc123');
    expect(cookies.other).toBe('value');
  });

  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
  });
});

describe('getUserIdFromCookie', () => {
  it('extracts userId from valid session cookie', () => {
    const token = signToken(42, 'test-secret');
    const cookieHeader = `session=${token}; other=value`;
    const userId = getUserIdFromCookie(cookieHeader, 'test-secret');
    expect(userId).toBe(42);
  });

  it('returns null for missing session cookie', () => {
    expect(getUserIdFromCookie('other=value', 'test-secret')).toBeNull();
  });

  it('returns null for invalid session cookie', () => {
    expect(getUserIdFromCookie('session=garbage', 'test-secret')).toBeNull();
  });
});
