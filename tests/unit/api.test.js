import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response with headers
function createMockResponse(data, ok = true) {
  return {
    ok,
    headers: {
      get: (name) => name === 'content-type' ? 'application/json' : null
    },
    json: async () => data
  };
}

const { API } = await import('../../ui/src/api.js');

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  
  describe('health', () => {
    it('should call health endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'ok' }));
      
      const result = await API.health();
      
      expect(result.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });
  });
  
  describe('analyze', () => {
    it('should send URL for analysis', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ projectId: 'test-123', analysis: {} }));
      
      const result = await API.analyze('https://example.com');
      
      expect(result.projectId).toBe('test-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('example.com')
      }));
    });
  });
  
  describe('importProject', () => {
    it('should detect URL vs project ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ projectId: 'new-123', status: 'pending' }));
      
      await API.importProject('https://github.com/user/repo');
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.url).toBe('https://github.com/user/repo');
    });
  });
  
  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, false));
      
      await expect(API.getProject('invalid'))
        .rejects.toThrow('Not found');
    });
  });
});
