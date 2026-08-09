/**
 * Fiaba — Secure Link Generation, HMAC Signing & Attribution Protocol
 *
 * All financial parameters (commission rate, fixed margin, merchant price, seller reward)
 * are calculated and verified server-side. The shareable link carries a tamper-evident,
 * HMAC-signed payload containing the campaign ID, product ID, seller ID, and timestamp.
 *
 * If the link parameters are tampered with, the signature check fails and attribution
 * falls back to 0% commission.
 */

export interface SecureLinkPayload {
  productId: string;
  campaignId: string;
  sellerId: string;
  sellerCode: string;
  issuedAt: number;
  expiresAt: number;
}

export interface LinkValidationResult {
  valid: boolean;
  reason?: 'EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED' | 'TAMPERED';
  payload?: SecureLinkPayload;
}

/* ── Constants ── */

/** App-level secret used for HMAC signing. In production this would be server-side. */
const LINK_SECRET = 'fiaba-attribution-v1-7f3a9b2e';

/** Link validity period: 90 days in milliseconds */
const LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/* ── Dynamic Domain Resolution ── */

/**
 * Dynamic resolution of the application's base domain (host).
 * Adapts automatically to window.location.host in browser, VITE_APP_URL, or fallback.
 */
export function getAppDomain(): string {
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    return window.location.host;
  }
  if (import.meta.env.VITE_APP_URL) {
    try {
      const u = new URL(import.meta.env.VITE_APP_URL);
      return u.host;
    } catch {
      // fallback
    }
  }
  return 'fiaba.sn';
}

/**
 * Dynamic resolution of the application's full origin (protocol + host + base).
 * Adapts automatically to window.location.origin in browser or env variable.
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const base = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
    return `${window.location.origin}${base}`;
  }
  return import.meta.env.VITE_APP_URL || 'https://fiaba.sn';
}

/**
 * Converts any relative or domain-prefixed campaign link into a full, dynamic clickable URL.
 * E.g. "fiaba.sn/p/prod-1?t=..." → "http://localhost:5173/p/prod-1?t=..." (when running locally)
 */
export function getFullShareableUrl(link: string): string {
  if (!link) return getAppOrigin();
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }
  const origin = getAppOrigin();
  // Strip domain prefix (e.g. fiaba.sn/p/...) to extract path
  const path = link.replace(/^[^\/]+\/?/, '');
  return `${origin}/${path}`;
}

/* ── Signing ── */

function strToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

async function hmacSign(data: string): Promise<string> {
  const keyData = strToBuf(LINK_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, strToBuf(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacVerify(data: string, expectedSig: string): Promise<boolean> {
  const actualSig = await hmacSign(data);
  return timingSafeEqual(actualSig, expectedSig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/* ── Payload encoding ── */

function canonicalString(p: SecureLinkPayload): string {
  return [p.productId, p.campaignId, p.sellerId, p.sellerCode, p.issuedAt, p.expiresAt].join('|');
}

function encodePayload(p: SecureLinkPayload): string {
  const json = JSON.stringify(p);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodePayload(encoded: string): SecureLinkPayload | null {
  try {
    const restored = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = restored + '='.repeat((4 - (restored.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json) as SecureLinkPayload;
  } catch {
    return null;
  }
}

/* ── Link generation ── */

/**
 * Generate a secure, signed shareable link for a seller using dynamic domain resolution.
 */
export async function generateSecureLink(params: {
  productId: string;
  campaignId: string;
  sellerId: string;
  sellerCode: string;
  ttlMs?: number;
}): Promise<{ link: string; code: string; payload: SecureLinkPayload }> {
  const now = Date.now();
  const ttl = params.ttlMs ?? LINK_TTL_MS;
  const payload: SecureLinkPayload = {
    productId: params.productId,
    campaignId: params.campaignId,
    sellerId: params.sellerId,
    sellerCode: params.sellerCode,
    issuedAt: now,
    expiresAt: ttl > 0 ? now + ttl : 0,
  };

  const canonical = canonicalString(payload);
  const signature = await hmacSign(canonical);
  const encoded = encodePayload(payload);
  const token = `${encoded}.${signature}`;

  const domain = getAppDomain();
  const link = `${domain}/p/${params.productId}?t=${token}`;
  return { link, code: params.sellerCode, payload };
}

export function generateSellerCode(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.map((p) => p.slice(0, 4).toUpperCase()).join('');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${initials.slice(0, 8)}${suffix}`;
}

export function generateSellerId(fullName: string): string {
  return fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── Link validation ── */

export async function validateSecureLink(token: string): Promise<LinkValidationResult> {
  if (!token || !token.includes('.')) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return { valid: false, reason: 'TAMPERED' };
  }

  const canonical = canonicalString(payload);
  const isSigValid = await hmacVerify(canonical, signature);
  if (!isSigValid) {
    return { valid: false, reason: 'INVALID_SIGNATURE', payload };
  }

  if (payload.expiresAt > 0 && Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'EXPIRED', payload };
  }

  return { valid: true, payload };
}

export function extractTokenFromUrl(url: string): string | null {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    return parsed.searchParams.get('t');
  } catch {
    return null;
  }
}

export function linkToCheckoutPath(link: string): string {
  try {
    const fullUrl = getFullShareableUrl(link);
    const parsed = new URL(fullUrl);
    const productId = parsed.pathname.replace(/^\/p\//, '');
    const token = parsed.searchParams.get('t');
    return token ? `/checkout/${productId}?t=${token}` : `/checkout/${productId}`;
  } catch {
    return '/checkout';
  }
}
