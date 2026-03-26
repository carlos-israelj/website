/**
 * Tests for lib/validation utilities
 *
 * Coverage:
 * - Stellar wallet address validation
 * - Ethereum wallet address validation
 * - Session ID validation
 */

import {
  isValidStellarAddress,
  isValidEthereumAddress,
  isValidWalletAddress,
  isValidSessionId,
} from '@/lib/validation';

describe('Wallet address validation', () => {
  describe('isValidStellarAddress', () => {
    it('should accept valid Stellar address', () => {
      const validAddresses = [
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        'GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP',
        'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
      ];

      validAddresses.forEach((addr) => {
        expect(isValidStellarAddress(addr)).toBe(true);
      });
    });

    it('should reject address not starting with G', () => {
      expect(isValidStellarAddress('ABRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')).toBe(false);
    });

    it('should reject address with wrong length', () => {
      expect(isValidStellarAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJU')).toBe(false);
    });

    it('should reject address with invalid characters', () => {
      expect(isValidStellarAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2!')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidStellarAddress('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidStellarAddress(null as any)).toBe(false);
      expect(isValidStellarAddress(undefined as any)).toBe(false);
    });
  });

  describe('isValidEthereumAddress', () => {
    it('should accept valid Ethereum address', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        '0xFb6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
      ];

      validAddresses.forEach((addr) => {
        expect(isValidEthereumAddress(addr)).toBe(true);
      });
    });

    it('should accept lowercase Ethereum address', () => {
      expect(isValidEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb')).toBe(true);
    });

    it('should reject address not starting with 0x', () => {
      expect(isValidEthereumAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false);
    });

    it('should reject address with wrong length', () => {
      expect(isValidEthereumAddress('0x742d35Cc6634')).toBe(false);
    });

    it('should reject address with invalid characters', () => {
      expect(isValidEthereumAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEZ')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEthereumAddress('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidEthereumAddress(null as any)).toBe(false);
      expect(isValidEthereumAddress(undefined as any)).toBe(false);
    });
  });

  describe('isValidWalletAddress', () => {
    it('should accept valid Stellar address', () => {
      expect(isValidWalletAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')).toBe(true);
    });

    it('should accept valid Ethereum address', () => {
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidWalletAddress('invalid_wallet')).toBe(false);
      expect(isValidWalletAddress('12345')).toBe(false);
      expect(isValidWalletAddress('')).toBe(false);
    });
  });

  describe('isValidSessionId', () => {
    it('should accept valid session IDs', () => {
      const validIds = [
        'sess_1234567890',
        'sess_1234567890_abcdef',
        'session-id-123',
        'abc123_def456',
      ];

      validIds.forEach((id) => {
        expect(isValidSessionId(id)).toBe(true);
      });
    });

    it('should reject session ID with special characters', () => {
      expect(isValidSessionId('sess_123!@#')).toBe(false);
      expect(isValidSessionId('sess 123')).toBe(false);
      expect(isValidSessionId('sess/123')).toBe(false);
    });

    it('should reject too short session ID', () => {
      expect(isValidSessionId('short')).toBe(false);
    });

    it('should reject too long session ID', () => {
      const longId = 'a'.repeat(101);
      expect(isValidSessionId(longId)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidSessionId('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidSessionId(null as any)).toBe(false);
      expect(isValidSessionId(undefined as any)).toBe(false);
    });
  });
});
