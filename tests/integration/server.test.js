import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../../src/v2/server.js';

describe('Server Integration', () => {
  let server;
  let baseUrl;
  
  beforeAll(async () => {
    const result = await startServer({ port: 0, openBrowser: false });
    server = result.server;
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });
  
  afterAll(() => {
    server?.close();
  });
  
  it('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.status).toBe('ok');
  });
  
  it('should list projects', async () => {
    const response = await fetch(`${baseUrl}/api/projects`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });
  
  it('should reject invalid analyze request', async () => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    expect(response.status).toBe(400);
  });
  
  it('should serve static files', async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    
    expect(response.ok).toBe(true);
    expect(html).toContain('L👀K');
  });
});
