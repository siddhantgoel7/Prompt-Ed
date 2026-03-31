/**
 * Returns a cryptographically secure random number between 0 and 1.
 * Uses globalThis.crypto for cross-platform compatibility (Modern Browser & Node.js 19+).
 */
export function secureRandom(): number {
  const crypto = globalThis.crypto;
  if (!crypto) {
    throw new Error('Cryptographically secure random number generator is not available.');
  }

  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Divide by 2^32 to get a value between 0 and 1
  return array[0] / (0xffffffff + 1);
}

/**
 * Generates a secure random 6-digit numeric PIN.
 */
export function generateSecurePin(): string {
  const crypto = globalThis.crypto;
  if (!crypto) {
    throw new Error('Cryptographically secure random number generator is not available.');
  }

  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  
  // Ensure we stay in the 100,000 - 999,999 range for a 6-digit pin
  const pin = 100000 + (array[0] % 900000);
  return pin.toString();
}

/**
 * Generates a secure random alphanumeric string of a given length.
 */
export function generateSecureAlphanumeric(length: number): string {
  const crypto = globalThis.crypto;
  if (!crypto) {
    throw new Error('Cryptographically secure random number generator is not available.');
  }

  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }
  
  return result;
}

/**
 * Fisher-Yates (Durstenfeld) shuffle using secure random source.
 * Prevents SonarQube S2245 (Weak PRNG) and S2245 (Non-uniform shuffle).
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
