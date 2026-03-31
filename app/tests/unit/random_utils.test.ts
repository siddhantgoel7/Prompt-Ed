import { 
  secureRandom, 
  generateSecurePin, 
  generateSecureAlphanumeric, 
  secureShuffle 
} from '@/lib/utils/random';

describe('random_utils', () => {
  describe('secureRandom', () => {
    it('should return a number between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const val = secureRandom();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('generateSecurePin', () => {
    it('should return a 6-digit string', () => {
      const pin = generateSecurePin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(parseInt(pin, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(pin, 10)).toBeLessThanOrEqual(999999);
    });
  });

  describe('generateSecureAlphanumeric', () => {
    it('should return a string of requested length', () => {
      const result = generateSecureAlphanumeric(10);
      expect(result).toHaveLength(10);
      expect(result).toMatch(/^[A-Z0-9]+$/);
    });

    it('should return different strings for different calls', () => {
        const s1 = generateSecureAlphanumeric(8);
        const s2 = generateSecureAlphanumeric(8);
        expect(s1).not.toBe(s2);
    });
  });

  describe('secureShuffle', () => {
    it('should return a shuffled array with the same elements', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = secureShuffle(input);
      
      expect(result).toHaveLength(input.length);
      expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
    });

    it('should handle empty arrays', () => {
      expect(secureShuffle([])).toEqual([]);
    });

    it('should handle single element arrays', () => {
      expect(secureShuffle([1])).toEqual([1]);
    });
  });
});
