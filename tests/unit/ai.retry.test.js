import { describe, it, expect } from 'vitest';
import { withRetry } from '../../src/v2/ai.js';

describe('withRetry', () => {
  it('retries until success and returns value', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        const e = new Error('transient');
        throw e;
      }
      return 'ok';
    };

    const result = await withRetry(fn, 5, 10);
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after exhausting retries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('permanent');
    };

    await expect(withRetry(fn, 3, 5)).rejects.toThrow('permanent');
    expect(attempts).toBe(3);
  });
});
