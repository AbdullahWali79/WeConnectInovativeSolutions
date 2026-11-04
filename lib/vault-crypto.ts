/**
 * Vault cryptography helpers.
 *
 * Design:
 * - The admin's secrets (passwords, API keys, links) are encrypted in the
 *   browser using a symmetric key derived from the admin's PIN via PBKDF2
 *   (Web Crypto API).  Only the encrypted ciphertext is sent to Supabase, so
 *   the server / DB never sees the plaintext or the PIN.
 * - The PIN itself is never stored in plaintext.  We store a salted SHA-256
 *   hash (separate salt) server-side so the unlock screen can be verified, and
 *   we store the encryption salt (a second salt) so the same key can be
 *   re-derived from the same PIN.
 *
 * Everything here runs on the client (Web Crypto).  The server actions only
 * store/retrieve opaque encrypted blobs.
 */

const PBKDF2_ITERATIONS = 150_000;
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH = 16; // bytes

export type EncryptedPayload = {
  /** Base64 ciphertext. */
  ct: string;
  /** Base64 IV used for AES-GCM. */
  iv: string;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Derive a random 16-byte salt (base64). */
export function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return toBase64(salt);
}

/** Derive an AES-GCM CryptoKey from a PIN + salt using PBKDF2. */
export async function deriveKeyFromPin(pin: string, saltB64: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(saltB64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a plaintext string. Returns ciphertext + iv (base64). */
export async function encryptString(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { ct: toBase64(ciphertext), iv: toBase64(iv) };
}

/** Decrypt a payload back to the plaintext string. */
export async function decryptString(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ct),
  );
  return dec.decode(plaintext);
}

/** Hash a PIN with a salt (SHA-256, base64). Used to verify the unlock PIN. */
export async function hashPin(pin: string, saltB64: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array([...fromBase64(saltB64), ...enc.encode(pin)]));
  return toBase64(digest);
}
