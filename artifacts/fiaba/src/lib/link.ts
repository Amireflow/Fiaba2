/**
 * Secure link generation and validation utilities.
 *
 * Links are the backbone of Fiaba's seller attribution system.
 * When a seller joins a campaign, they receive a unique link that:
 *  1. Identifies them (sellerId + sellerCode)
 *  2. Identifies the campaign and product
 *  3. Is signed with an HMAC-like signature to prevent tampering
 *  4. Contains an expiry timestamp to limit link lifetime
 *
 * The signature uses a simple HMAC-SHA256 implementation via the
 * Web Crypto API (SubtleCrypto). This runs entirely client-side —
 * in production this would be server-side, but for this demo the
 * signing secret is derived from a constant + seller data.
 */

/* ── Types ── */

export type SecureLinkPayload = {
  /** Product or opportunity ID */
  productId: string;
  /** Campaign ID */
  campaignId: string;
  /** Seller identifier (slug) */
  sellerId: string;
  /** Human-readable seller code (e.g. MARIFALL) */
  sellerCode: string;
  /** Unix timestamp (ms) when the link was generated */
  issuedAt: number;
  /** Unix timestamp (ms) when the link expires (0 = never) */
  expiresAt: number;
};

export type ValidatedLink = {
  valid: boolean;
  payload: SecureLinkPayload | null;
  error: string | null;
};

/* ── Constants ── */

/** App-level secret used for HMAC signing. In production this would be server-side. */
const LINK_SECRET = 'fiaba-attribution-v1-7f3a9b2e';

/** Link validity period: 90 days in milliseconds */
const LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Base URL for generating shareable links */
const BASE_DOMAIN = 'fiaba.sn';

/* ── Signing ── */

/**
 * Convert a string to an ArrayBuffer for SubtleCrypto.
 */
function strToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

/**
 * Compute an HMAC-SHA256 signature for the given payload data.
 * Returns a hex string.
 */
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

/**
 * Verify an HMAC-SHA256 signature against the data.
 */
async function hmacVerify(data: string, expectedSig: string): Promise<boolean> {
  const actualSig = await hmacSign(data);
  return timingSafeEqual(actualSig, expectedSig);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/* ── Payload encoding ── */

/**
 * Serialize the payload into a canonical string for signing.
 * The order of fields is fixed to ensure consistent signatures.
 */
function canonicalString(p: SecureLinkPayload): string {
  return [p.productId, p.campaignId, p.sellerId, p.sellerCode, p.issuedAt, p.expiresAt].join('|');
}

/**
 * Encode the payload as a compact base64 string (for use in URLs).
 */
function encodePayload(p: SecureLinkPayload): string {
  const json = JSON.stringify(p);
  // Use btoa with UTF-8 safe encoding
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64 payload string back into a SecureLinkPayload.
 */
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
 * Generate a secure, signed shareable link for a seller.
 *
 * The link format is:
 *   https://fiaba.sn/p/{productId}?t={encodedPayload}.{signature}
 *
 * The signature covers the canonical payload string, ensuring that
 * any modification to the payload invalidates the signature.
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

  const link = `${BASE_DOMAIN}/p/${params.productId}?t=${token}`;
  return { link, code: params.sellerCode, payload };
}

/**
 * Generate a seller code from a name.
 * E.g. "Marième Fall" → "MARIFALL"
 */
export function generateSellerCode(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.map((p) => p.slice(0, 4).toUpperCase()).join('');
  // Add a short random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${initials.slice(0, 8)}${suffix}`;
}

/**
 * Generate a seller slug/ID from a name.
 * E.g. "Marième Fall" → "marieme-fall"
 */
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

/**
 * Validate a link token (encoded payload + signature).
 * Checks:
 *  1. Token format (payload.signature)
 *  2. Signature authenticity
 *  3. Expiry date
 *
 * Returns the payload if valid, or an error description if not.
 */
export async function validateSecureLink(token: string): Promise<ValidatedLink> {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, payload: null, error: 'Format de lien invalide' };
  }

  const [encodedPayload, signature] = parts;
  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return { valid: false, payload: null, error: 'Données du lien illisibles' };
  }

  // Verify signature
  const canonical = canonicalString(payload);
  const sigValid = await hmacVerify(canonical, signature);
  if (!sigValid) {
    return { valid: false, payload: null, error: 'Signature invalide — lien modifié' };
  }

  // Check expiry
  if (payload.expiresAt > 0 && Date.now() > payload.expiresAt) {
    return { valid: false, payload: null, error: 'Lien expiré' };
  }

  return { valid: true, payload, error: null };
}

/**
 * Extract the token from a full URL or link string.
 * Supports both `?t=xxx` and `&t=xxx` formats.
 */
export function extractTokenFromUrl(url: string): string | null {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    return parsed.searchParams.get('t');
  } catch {
    return null;
  }
}

/**
 * Build the full checkout URL from a shareable link.
 * Converts `fiaba.sn/p/{productId}?t={token}` into
 * `/checkout/{productId}?t={token}` for internal routing.
 */
export function linkToCheckoutPath(link: string): string {
  try {
    const fullUrl = link.startsWith('http') ? link : `https://${link}`;
    const parsed = new URL(fullUrl);
    const productId = parsed.pathname.replace(/^\/p\//, '');
    const token = parsed.searchParams.get('t');
    return token ? `/checkout/${productId}?t=${token}` : `/checkout/${productId}`;
  } catch {
    return '/checkout';
  }
}
