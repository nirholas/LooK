import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchProcessor } from '../../src/v2/batch.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock('../../src/v2/index.js', () => ({
  generateDemoV2: vi.fn().mockResolvedValue({ output: 'test.mp4' })
}));

describe('BatchProcessor', () => {
  let processor;
  
  beforeEach(() => {
    processor = new BatchProcessor({
      concurrency: 2,
      outputDir: '/tmp/batch-test'
    });
  });
  
  describe('urlToFilename', () => {
    it('should convert URL to safe filename', () => {
      expect(processor.urlToFilename('https://example.com'))
        .toBe('example-com');
      
      expect(processor.urlToFilename('https://my-app.io/page'))
        .toBe('my-app-io');
    });
    
    it('should handle invalid URLs', () => {
      expect(processor.urlToFilename('invalid'))
        .toBe('demo');
    });
  });
  
  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = processor.chunkArray(arr, 2);
      
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
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
});
