import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredKey, getStoredKey, setStoredKey } from './keys';

/** vitest runs in node by default — stand in for the browser API with a tiny fake. */
class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new FakeStorage(),
    configurable: true,
  });
});

describe('key storage', () => {
  it('returns an empty string when nothing is stored', () => {
    expect(getStoredKey('openai')).toBe('');
  });

  it('round-trips a stored key', () => {
    setStoredKey('openai', 'sk-test-123');
    expect(getStoredKey('openai')).toBe('sk-test-123');
  });

  it('keeps providers separate', () => {
    setStoredKey('openai', 'sk-openai');
    setStoredKey('anthropic', 'sk-ant');
    expect(getStoredKey('openai')).toBe('sk-openai');
    expect(getStoredKey('anthropic')).toBe('sk-ant');
  });

  it('setting an empty string clears the key', () => {
    setStoredKey('openai', 'sk-test-123');
    setStoredKey('openai', '');
    expect(getStoredKey('openai')).toBe('');
  });

  it('clearStoredKey removes it', () => {
    setStoredKey('openai', 'sk-test-123');
    clearStoredKey('openai');
    expect(getStoredKey('openai')).toBe('');
  });

  it('never throws if localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });
    expect(() => setStoredKey('openai', 'sk-test')).not.toThrow();
    expect(getStoredKey('openai')).toBe('');
  });
});
