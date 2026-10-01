/* JOBRADAR — encrypted local vault.
   Private-source secrets (API tokens, usernames, passwords) are NEVER
   stored in plaintext. They are encrypted with AES-GCM-256 using a key
   derived from the user's vault passphrase (PBKDF2-SHA-256, 120k rounds).
   The key lives in memory only and is wiped on lock / page reload.
   Only ciphertext + salt ever touch localStorage.

   This is the browser equivalent of a local password manager: the app
   cannot recover secrets if the passphrase is forgotten.
*/

const META_KEY = 'jobradar:vault:meta:v1';
const SECRETS_KEY = 'jobradar:vault:secrets:v1';
const VERIFIER_PLAINTEXT = 'jobradar-vault-ok';

let memoryKey: CryptoKey | null = null;

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

interface VaultMeta {
  salt: string; // b64
  verifier: { iv: string; data: string }; // b64
}

function readMeta(): VaultMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as VaultMeta) : null;
  } catch {
    return null;
  }
}

function readSecrets(): Record<string, { iv: string; data: string }> {
  try {
    const raw = localStorage.getItem(SECRETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSecrets(s: Record<string, { iv: string; data: string }>): void {
  localStorage.setItem(SECRETS_KEY, JSON.stringify(s));
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(key: CryptoKey, plaintext: string): Promise<{ iv: string; data: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(ct)) };
}

async function decrypt(key: CryptoKey, ivB64: string, dataB64: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivB64) },
    key,
    b64ToBytes(dataB64),
  );
  return new TextDecoder().decode(pt);
}

export type VaultStatus = 'none' | 'locked' | 'unlocked';

export function vaultStatus(): VaultStatus {
  if (memoryKey) return 'unlocked';
  return readMeta() ? 'locked' : 'none';
}

export function isVaultUnlocked(): boolean {
  return memoryKey !== null;
}

/** First-time setup. Throws if a vault already exists. */
export async function setupVault(passphrase: string): Promise<void> {
  if (readMeta()) throw new Error('A vault already exists on this device.');
  if (passphrase.length < 8) throw new Error('Passphrase must be at least 8 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const key = await deriveKey(passphrase, salt);
  const verifier = await encrypt(key, VERIFIER_PLAINTEXT);
  localStorage.setItem(META_KEY, JSON.stringify({ salt: bytesToB64(salt), verifier } satisfies VaultMeta));
  memoryKey = key;
}

/** Unlock with the existing passphrase. Throws on wrong passphrase. */
export async function unlockVault(passphrase: string): Promise<void> {
  const meta = readMeta();
  if (!meta) throw new Error('No vault on this device yet.');
  const key = await deriveKey(passphrase, b64ToBytes(meta.salt));
  const check = await decrypt(key, meta.verifier.iv, meta.verifier.data).catch(() => null);
  if (check !== VERIFIER_PLAINTEXT) throw new Error('Wrong passphrase.');
  memoryKey = key;
}

export function lockVault(): void {
  memoryKey = null;
}

/** Danger zone: deletes the vault metadata AND all stored secrets. */
export function destroyVault(): void {
  memoryKey = null;
  try {
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(SECRETS_KEY);
  } catch { /* ignore */ }
}

export async function storeSecret(ref: string, plaintext: string): Promise<void> {
  if (!memoryKey) throw new Error('Vault is locked.');
  const secrets = readSecrets();
  secrets[ref] = await encrypt(memoryKey, plaintext);
  writeSecrets(secrets);
}

export async function readSecret(ref: string): Promise<string | null> {
  if (!memoryKey) throw new Error('Vault is locked.');
  const entry = readSecrets()[ref];
  if (!entry) return null;
  return decrypt(memoryKey, entry.iv, entry.data);
}

export function hasSecret(ref: string): boolean {
  return Boolean(readSecrets()[ref]);
}

export function deleteSecret(ref: string): void {
  const secrets = readSecrets();
  delete secrets[ref];
  writeSecrets(secrets);
}
