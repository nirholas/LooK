import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const { API } = await import('../../ui/src/api.js');

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  
  describe('health', () => {
    it('should call health endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });
      
      const result = await API.health();
      
      expect(result.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });
  });
  
  describe('analyze', () => {
    it('should send URL for analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'test-123', analysis: {} })
      });
      
      const result = await API.analyze('https://example.com');
      
      expect(result.projectId).toBe('test-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('example.com')
      });
    });
  });
  
  describe('importProject', () => {
    it('should detect URL vs project ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'new-123', status: 'pending' })
      });
      
      await API.importProject('https://github.com/user/repo');
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.url).toBe('https://github.com/user/repo');
    });
  });
  
  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' })
      });
      
      await expect(API.getProject('invalid'))
        .rejects.toThrow('Not found');
    });
  });
});
