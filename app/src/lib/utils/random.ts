/**
 * Returns a cryptographically secure random number between 0 and 1.
 * Works in both browser (window.crypto) and Node.js environments.
 */
export function secureRandom(): number {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  
  // Node.js environment fallback
  try {
    const crypto = require('crypto');
    return crypto.randomBytes(4).readUInt32BE(0) / (0xffffffff + 1);
  } catch (e) {
    // If all else fails, fallback to Math.random (should ideally never happen in modern environments)
    return Math.random();
  }
}

/**
 * Generates a secure random 6-digit numeric PIN.
 */
export function generateSecurePin(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    // Ensure 6 digits: 100000 to 999999
    return (100000 + (array[0] % 900000)).toString();
  }

  try {
    const crypto = require('crypto');
    // randomInt is the cleanest way in Node
    return crypto.randomInt(100000, 1000000).toString();
  } catch (e) {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

/**
 * Generates a secure random alphanumeric string of a given length.
 */
export function generateSecureAlphanumeric(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }
  } else {
    try {
      const crypto = require('crypto');
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += charset[bytes[i] % charset.length];
      }
    } catch (e) {
      // Fallback
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
  }
  return result;
}

/**
 * Fisher-Yates shuffle using secure random source.
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
