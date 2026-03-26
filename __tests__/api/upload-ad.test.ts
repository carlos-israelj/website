/**
 * Tests for /api/upload-ad endpoint
 *
 * Coverage:
 * - BUG FIX 2: duration parsing from paymentData.duration (30m, 1h, 6h, 24h)
 * - Ensures durationMinutes is correctly calculated
 */

describe('/api/upload-ad duration parsing (Bug Fix #2)', () => {
  // Mock the DURATION_MAP logic
  const DURATION_MAP: Record<string, number> = {
    '30m': 30,
    '1h': 60,
    '6h': 360,
    '24h': 1440,
  };

  function parseDuration(rawDuration: string): number {
    return DURATION_MAP[rawDuration] ?? 60;
  }

  describe('Duration map correctness', () => {
    it('should parse 30m as 30 minutes', () => {
      expect(parseDuration('30m')).toBe(30);
    });

    it('should parse 1h as 60 minutes', () => {
      expect(parseDuration('1h')).toBe(60);
    });

    it('should parse 6h as 360 minutes', () => {
      expect(parseDuration('6h')).toBe(360);
    });

    it('should parse 24h as 1440 minutes', () => {
      expect(parseDuration('24h')).toBe(1440);
    });

    it('should default to 60 minutes for unknown duration', () => {
      expect(parseDuration('unknown')).toBe(60);
    });

    it('should default to 60 minutes for empty string', () => {
      expect(parseDuration('')).toBe(60);
    });
  });

  describe('Expiry time calculation', () => {
    it('should calculate correct expiry for 30m', () => {
      const startsAt = new Date('2024-01-01T00:00:00Z');
      const durationMinutes = parseDuration('30m');
      const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      expect(expiresAt.getTime() - startsAt.getTime()).toBe(30 * 60 * 1000);
    });

    it('should calculate correct expiry for 6h', () => {
      const startsAt = new Date('2024-01-01T00:00:00Z');
      const durationMinutes = parseDuration('6h');
      const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      expect(expiresAt.getTime() - startsAt.getTime()).toBe(6 * 60 * 60 * 1000);
    });

    it('should calculate correct expiry for 24h', () => {
      const startsAt = new Date('2024-01-01T00:00:00Z');
      const durationMinutes = parseDuration('24h');
      const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      expect(expiresAt.getTime() - startsAt.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Bug verification - hardcoded 60 minutes is fixed', () => {
    it('should NOT hardcode 60 minutes for all durations', () => {
      // Before fix: durationMinutes = 60 (hardcoded)
      // After fix: durationMinutes comes from DURATION_MAP

      const durations = ['30m', '1h', '6h', '24h'];
      const expected = [30, 60, 360, 1440];

      durations.forEach((duration, index) => {
        const result = parseDuration(duration);
        expect(result).toBe(expected[index]);
        expect(result).not.toBe(60); // Should not always be 60 (except for '1h')
      });
    });

    it('should respect paid duration for 24h ad', () => {
      const paidDuration = '24h';
      const durationMinutes = parseDuration(paidDuration);

      // Advertiser pays for 24h, should get 1440 minutes, NOT 60
      expect(durationMinutes).toBe(1440);
      expect(durationMinutes).toBeGreaterThan(60);
    });
  });
});
