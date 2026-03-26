/**
 * Tests for /api/health endpoint
 *
 * Coverage:
 * - BUG FIX 4: environment variable information should not be exposed
 * - Only status and timestamp should be returned
 */

import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

describe('/api/health endpoint (Bug Fix #4)', () => {
  describe('Information disclosure prevention', () => {
    it('should return only status and timestamp', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data.status).toBe('healthy');
    });

    it('should NOT expose environment variable', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).not.toHaveProperty('environment');
      expect(data).not.toHaveProperty('NODE_ENV');
    });

    it('should NOT expose lighthouseApiKey status', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).not.toHaveProperty('lighthouseApiKey');
    });

    it('should NOT expose lighthouseStorageHash status', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data).not.toHaveProperty('lighthouseStorageHash');
    });

    it('should return valid timestamp format', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Response structure', () => {
    it('should have exactly 2 properties', async () => {
      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      const keys = Object.keys(data);
      expect(keys.length).toBe(2);
      expect(keys).toContain('status');
      expect(keys).toContain('timestamp');
    });
  });
});
