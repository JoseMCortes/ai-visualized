/**
 * API keys live only in the browser's own localStorage, namespaced per
 * provider. Nothing here ever sends a key anywhere — reading and writing
 * are the only two operations, and `runChain`/`models.ts` are the only code
 * that ever reads a key back out, to hand it straight to the provider's own
 * SDK for a direct request from this page to their API.
 */

import type { Provider } from './models';

const STORAGE_PREFIX = 'langchain-utils:apiKey:';

function storageKey(provider: Provider): string {
  return STORAGE_PREFIX + provider;
}

export function getStoredKey(provider: Provider): string {
  try {
    return localStorage.getItem(storageKey(provider)) ?? '';
  } catch {
    return ''; // storage unavailable (private mode, disabled cookies, etc.) — key just won't persist
  }
}

export function setStoredKey(provider: Provider, key: string): void {
  try {
    if (key) localStorage.setItem(storageKey(provider), key);
    else localStorage.removeItem(storageKey(provider));
  } catch {
    /* ignore — see getStoredKey */
  }
}

export function clearStoredKey(provider: Provider): void {
  setStoredKey(provider, '');
}
