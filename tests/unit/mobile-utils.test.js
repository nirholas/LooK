/**
 * Unit tests for mobile-utils.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { access, readFile } from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn()
}));

// Mock fetch for Appium status checks
global.fetch = vi.fn();

describe('mobile-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectPlatform', () => {
    it('should detect iOS for .app files', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('MyApp.app')).toBe('ios');
    });

    it('should detect iOS for .ipa files', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('MyApp.ipa')).toBe('ios');
    });

    it('should detect Android for .apk files', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('MyApp.apk')).toBe('android');
    });

    it('should detect Android for .aab files', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('app-release.aab')).toBe('android');
    });

    it('should detect iOS for bundle IDs', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('com.example.myapp')).toBe('ios');
    });

    it('should be case insensitive for extensions', async () => {
      const { detectPlatform } = await import('../../src/v2/mobile-utils.js');
      expect(detectPlatform('MyApp.APK')).toBe('android');
      expect(detectPlatform('MyApp.IPA')).toBe('ios');
    });
  });

  describe('validateAppPath', () => {
    it('should validate bundle IDs without file access', async () => {
      const { validateAppPath } = await import('../../src/v2/mobile-utils.js');
      
      const result = await validateAppPath('com.example.app', 'ios');
      
      expect(result.type).toBe('bundleId');
      expect(result.valid).toBe(true);
      expect(access).not.toHaveBeenCalled();
    });

    it('should validate existing iOS app file', async () => {
      access.mockResolvedValue(undefined);
      
      const { validateAppPath } = await import('../../src/v2/mobile-utils.js');
      
      const result = await validateAppPath('/path/to/app.ipa', 'ios');
      
      expect(result.type).toBe('file');
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent files', async () => {
      access.mockRejectedValue(new Error('ENOENT'));
      
      const { validateAppPath } = await import('../../src/v2/mobile-utils.js');
      
      const result = await validateAppPath('/nonexistent.apk', 'android');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File not found');
    });

    it('should reject wrong file type for iOS', async () => {
      access.mockResolvedValue(undefined);
      
      const { validateAppPath } = await import('../../src/v2/mobile-utils.js');
      
      const result = await validateAppPath('/path/to/app.apk', 'ios');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('iOS apps must be');
    });

    it('should reject wrong file type for Android', async () => {
      access.mockResolvedValue(undefined);
      
      const { validateAppPath } = await import('../../src/v2/mobile-utils.js');
      
      const result = await validateAppPath('/path/to/app.ipa', 'android');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Android apps must be');
    });
  });

  describe('Command Injection Prevention', () => {
    describe('bootIOSSimulator', () => {
      it('should reject device names with shell metacharacters', async () => {
        const { bootIOSSimulator } = await import('../../src/v2/mobile-utils.js');
        
        await expect(bootIOSSimulator('iPhone; rm -rf /')).rejects.toThrow('forbidden characters');
        await expect(bootIOSSimulator('iPhone | cat /etc/passwd')).rejects.toThrow('forbidden characters');
        await expect(bootIOSSimulator('iPhone`whoami`')).rejects.toThrow('forbidden characters');
        await expect(bootIOSSimulator('iPhone$(whoami)')).rejects.toThrow('forbidden characters');
        await expect(bootIOSSimulator('iPhone & malicious')).rejects.toThrow('forbidden characters');
      });

      it('should reject device names with newlines', async () => {
        const { bootIOSSimulator } = await import('../../src/v2/mobile-utils.js');
        
        await expect(bootIOSSimulator('iPhone\nmalicious')).rejects.toThrow('forbidden characters');
        await expect(bootIOSSimulator('iPhone\rmalicious')).rejects.toThrow('forbidden characters');
      });

      it('should accept valid device names (sanitization passes)', async () => {
        const { bootIOSSimulator } = await import('../../src/v2/mobile-utils.js');
        
        // These should not throw sanitization errors (may throw "not found" which is fine)
        try {
          await bootIOSSimulator('iPhone 15 Pro');
        } catch (e) {
          expect(e.message).not.toContain('forbidden characters');
          expect(e.message).toContain('Simulator not found');
        }
        
        try {
          await bootIOSSimulator('iPhone-15-Pro');
        } catch (e) {
          expect(e.message).not.toContain('forbidden characters');
        }
      });
    });

    describe('startAndroidEmulator', () => {
      it('should reject emulator names with shell metacharacters', async () => {
        const { startAndroidEmulator } = await import('../../src/v2/mobile-utils.js');
        
        await expect(startAndroidEmulator('Pixel; rm -rf /')).rejects.toThrow('forbidden characters');
        await expect(startAndroidEmulator('Pixel | cat /etc/passwd')).rejects.toThrow('forbidden characters');
        await expect(startAndroidEmulator('Pixel`whoami`')).rejects.toThrow('forbidden characters');
        await expect(startAndroidEmulator('Pixel$(whoami)')).rejects.toThrow('forbidden characters');
      });

      it('should accept valid emulator names (sanitization passes)', async () => {
        const { startAndroidEmulator } = await import('../../src/v2/mobile-utils.js');
        
        // Valid names should not fail sanitization
        try {
          await startAndroidEmulator('Pixel_7_API_34');
        } catch (e) {
          // Should not be a sanitization error
          expect(e.message).not.toContain('forbidden characters');
        }
      });
    });
  });

  describe('checkAppiumServer', () => {
    it('should return running true when server responds', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ value: { build: { version: '2.0.0' } } })
      });
      
      const { checkAppiumServer } = await import('../../src/v2/mobile-utils.js');
      
      const result = await checkAppiumServer(4723);
      
      expect(result.running).toBe(true);
      expect(result.version).toBe('2.0.0');
    });

    it('should return running false when server is unreachable', async () => {
      global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));
      
      const { checkAppiumServer } = await import('../../src/v2/mobile-utils.js');
      
      const result = await checkAppiumServer(4723);
      
      expect(result.running).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parseActionsScript', () => {
    it('should parse valid actions script', async () => {
      const validScript = JSON.stringify({
        name: 'Test Script',
        actions: [
          { type: 'tap', xPercent: 0.5, yPercent: 0.5 },
          { type: 'wait', duration: 1000 }
        ]
      });
      
      readFile.mockResolvedValue(validScript);
      
      const { parseActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      const result = await parseActionsScript('/path/to/script.json');
      
      expect(result.name).toBe('Test Script');
      expect(result.actions).toHaveLength(2);
    });

    it('should reject script without actions array', async () => {
      readFile.mockResolvedValue(JSON.stringify({ name: 'Bad Script' }));
      
      const { parseActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      await expect(parseActionsScript('/path/to/script.json'))
        .rejects.toThrow('must have an "actions" array');
    });

    it('should reject invalid action types', async () => {
      const invalidScript = JSON.stringify({
        actions: [{ type: 'invalid_action' }]
      });
      readFile.mockResolvedValue(invalidScript);
      
      const { parseActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      await expect(parseActionsScript('/path/to/script.json'))
        .rejects.toThrow('Invalid action type');
    });

    it('should handle file not found', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      readFile.mockRejectedValue(error);
      
      const { parseActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      await expect(parseActionsScript('/nonexistent.json'))
        .rejects.toThrow('Actions script not found');
    });
  });

  describe('generateSampleActionsScript', () => {
    it('should return valid sample script structure', async () => {
      const { generateSampleActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      const sample = generateSampleActionsScript();
      
      expect(sample.name).toBeDefined();
      expect(sample.description).toBeDefined();
      expect(Array.isArray(sample.actions)).toBe(true);
      expect(sample.actions.length).toBeGreaterThan(0);
    });

    it('should include various action types in sample', async () => {
      const { generateSampleActionsScript } = await import('../../src/v2/mobile-utils.js');
      
      const sample = generateSampleActionsScript();
      const actionTypes = sample.actions.map(a => a.type);
      
      expect(actionTypes).toContain('tap');
      expect(actionTypes).toContain('wait');
      expect(actionTypes).toContain('scroll');
    });
  });
});
