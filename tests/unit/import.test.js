import { describe, it, expect } from 'vitest';
import { detectImportType, validateUrl } from '../../src/v2/import.js';

describe('import utilities', () => {
  it('detects git urls', () => {
    expect(detectImportType('https://github.com/user/repo')).toBe('git');
    expect(detectImportType('git@github.com:user/repo.git')).toBe('git');
    expect(detectImportType('https://example.com')).toBe('website');
  });

  it('validates urls', () => {
    expect(() => validateUrl('https://example.com')).not.toThrow();
    expect(() => validateUrl('git@github.com:user/repo.git')).not.toThrow();
    expect(() => validateUrl('not a url')).toThrow();
  });
});
