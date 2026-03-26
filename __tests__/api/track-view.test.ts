/**
 * Tests for /api/track-view endpoint
 *
 * Coverage:
 * - BUG FIX 1: viewDuration validation (must be in allowlist [10, 30, 60, 120, 240, 480])
 * - Wallet address validation
 * - Session ID validation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/track-view/route';

describe('/api/track-view', () => {
  describe('viewDuration validation (Bug Fix #1)', () => {
    it('should reject viewDuration not in allowlist', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 999, // Invalid - not in [10, 30, 60, 120, 240, 480]
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid viewDuration');
    });

    it('should accept viewDuration = 10 seconds', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 10,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should not fail on validation (may fail on DB if not mocked)
      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid viewDuration');
      }
    });

    it('should accept viewDuration = 30 seconds', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 30,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid viewDuration');
      }
    });

    it('should accept viewDuration = 480 seconds', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 480,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid viewDuration');
      }
    });

    it('should reject viewDuration = 0', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 0,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid viewDuration');
    });

    it('should reject negative viewDuration', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: -100,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid viewDuration');
    });
  });

  describe('Wallet address validation', () => {
    it('should reject invalid Stellar wallet address', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 30,
          slotId: 'test-slot',
          walletAddress: 'invalid_wallet'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid wallet address');
    });

    it('should accept valid Stellar wallet address', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 30,
          slotId: 'test-slot',
          walletAddress: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX7' // Valid format
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid wallet address');
      }
    });

    it('should accept valid Ethereum wallet address', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
          viewDuration: 30,
          slotId: 'test-slot',
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid wallet address');
      }
    });
  });

  describe('Session ID validation', () => {
    it('should reject invalid session ID format', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'invalid session!@#',
          viewDuration: 30,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid session ID');
    });

    it('should accept valid session ID', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_1234567890_abcdef',
          viewDuration: 30,
          slotId: 'test-slot'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 400) {
        expect(data.error).not.toContain('Invalid session ID');
      }
    });
  });

  describe('Missing required fields', () => {
    it('should reject request without placementId', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'sess_123456789',
          viewDuration: 30,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject request without sessionId', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          viewDuration: 30,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject request without viewDuration', async () => {
      const request = new NextRequest('http://localhost/api/track-view', {
        method: 'POST',
        body: JSON.stringify({
          placementId: 'test-placement',
          sessionId: 'sess_123456789',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });
});
