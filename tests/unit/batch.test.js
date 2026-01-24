import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchProcessor } from '../../src/v2/batch.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/v2/index.js', () => ({
  generateDemoV2: vi.fn().mockResolvedValue({ output: 'test.mp4' })
}));

vi.mock('yaml', () => ({
  parse: vi.fn((content) => JSON.parse(content))
}));

describe('BatchProcessor', () => {
  let processor;
  
  beforeEach(() => {
    vi.clearAllMocks();
    processor = new BatchProcessor({
      concurrency: 2,
      outputDir: '/tmp/batch-test'
    });
  });
  
  describe('constructor', () => {
    it('should set default options', () => {
      const p = new BatchProcessor();
      expect(p.concurrency).toBe(2);
      expect(p.outputDir).toBe('./batch-output');
      expect(p.resume).toBe(false);
      expect(p.dryRun).toBe(false);
    });
    
    it('should accept custom options', () => {
      const p = new BatchProcessor({
        concurrency: 4,
        outputDir: '/custom/path',
        resume: true,
        dryRun: true,
        reportPath: '/reports/batch.json'
      });
      expect(p.concurrency).toBe(4);
      expect(p.outputDir).toBe('/custom/path');
      expect(p.resume).toBe(true);
      expect(p.dryRun).toBe(true);
      expect(p.reportPath).toBe('/reports/batch.json');
    });
  });
  
  describe('urlToFilename', () => {
    it('should convert URL to safe filename', () => {
      expect(processor.urlToFilename('https://example.com'))
        .toBe('example-com');
      
      expect(processor.urlToFilename('https://my-app.io/page'))
        .toBe('my-app-io');
    });
    
    it('should handle URLs with subdomains', () => {
      expect(processor.urlToFilename('https://www.example.com'))
        .toBe('www-example-com');
      
      expect(processor.urlToFilename('https://app.mysite.co.uk'))
        .toBe('app-mysite-co-uk');
    });
    
    it('should handle invalid URLs', () => {
      expect(processor.urlToFilename('invalid'))
        .toBe('demo');
      
      expect(processor.urlToFilename(''))
        .toBe('demo');
    });
  });
  
  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = processor.chunkArray(arr, 2);
      
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
    
    it('should handle empty array', () => {
      expect(processor.chunkArray([], 2)).toEqual([]);
    });
    
    it('should handle chunk size larger than array', () => {
      expect(processor.chunkArray([1, 2], 5)).toEqual([[1, 2]]);
    });
    
    it('should handle chunk size of 1', () => {
      expect(processor.chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });
  });
  
  describe('getOutputPath', () => {
    it('should use custom name if provided', () => {
      const job = { url: 'https://example.com', name: 'custom-name' };
      
      expect(processor.getOutputPath(job))
        .toBe('/tmp/batch-test/custom-name.mp4');
    });
    
    it('should generate name from URL if not provided', () => {
      const job = { url: 'https://example.com' };
      
      expect(processor.getOutputPath(job))
        .toBe('/tmp/batch-test/example-com.mp4');
    });
  });
  
  describe('loadConfig', () => {
    it('should load and parse JSON config', async () => {
      const { readFile } = await import('fs/promises');
      readFile.mockResolvedValue(JSON.stringify({
        jobs: [{ url: 'https://example.com' }],
        defaults: { duration: 30 }
      }));
      
      await processor.loadConfig('/path/to/config.json');
      
      expect(processor.config.jobs).toHaveLength(1);
      expect(processor.config.defaults.duration).toBe(30);
    });
    
    it('should throw error if jobs array is missing', async () => {
      const { readFile } = await import('fs/promises');
      readFile.mockResolvedValue(JSON.stringify({ defaults: {} }));
      
      await expect(processor.loadConfig('/path/to/config.json'))
        .rejects.toThrow('Config must contain a "jobs" array');
    });
  });
  
  describe('processJob', () => {
    it('should return success result on successful generation', async () => {
      const job = { url: 'https://example.com', name: 'test' };
      const result = await processor.processJob(job, {});
      
      expect(result.status).toBe('success');
      expect(result.url).toBe('https://example.com');
      expect(result.output).toContain('test.mp4');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should return error result on failed generation', async () => {
      const { generateDemoV2 } = await import('../../src/v2/index.js');
      generateDemoV2.mockRejectedValueOnce(new Error('Generation failed'));
      
      const job = { url: 'https://fail.com' };
      const result = await processor.processJob(job, {});
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Generation failed');
    });
    
    it('should merge defaults with job options', async () => {
      const { generateDemoV2 } = await import('../../src/v2/index.js');
      
      const job = { url: 'https://example.com', options: { style: 'energetic' } };
      const defaults = { duration: 30, voice: 'nova' };
      
      await processor.processJob(job, defaults);
      
      expect(generateDemoV2).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        duration: 30,
        voice: 'nova',
        style: 'energetic'
      }));
    });
  });
});
