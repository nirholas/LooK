/**
 * Tests for auto-thumbnail.js - AI-powered best frame selection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AutoThumbnailGenerator,
  ThumbnailPresets,
  FrameAnalyzer
} from '../../src/v2/auto-thumbnail.js';

describe('ThumbnailPresets', () => {
  it('should define presets for common platforms', () => {
    expect(ThumbnailPresets.youtube).toBeDefined();
    expect(ThumbnailPresets.twitter).toBeDefined();
    expect(ThumbnailPresets.linkedin).toBeDefined();
    expect(ThumbnailPresets.instagram).toBeDefined();
  });

  it('should have correct dimensions for YouTube', () => {
    expect(ThumbnailPresets.youtube.width).toBe(1280);
    expect(ThumbnailPresets.youtube.height).toBe(720);
  });

  it('should have correct dimensions for Twitter', () => {
    expect(ThumbnailPresets.twitter.width).toBe(1200);
    expect(ThumbnailPresets.twitter.height).toBe(675);
  });

  it('should have correct dimensions for LinkedIn', () => {
    expect(ThumbnailPresets.linkedin.width).toBe(1200);
    expect(ThumbnailPresets.linkedin.height).toBe(627);
  });
});

describe('FrameAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new FrameAnalyzer();
  });

  describe('calculateBrightness', () => {
    it('should calculate average brightness of pixel data', () => {
      // Create mock grayscale image data (all mid-gray)
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;     // R
        data[i + 1] = 128; // G
        data[i + 2] = 128; // B
        data[i + 3] = 255; // A
      }

      const brightness = analyzer.calculateBrightness({ data, width, height });
      
      expect(brightness).toBeCloseTo(128, 0);
    });

    it('should handle dark images', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 20;
        data[i + 1] = 20;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }

      const brightness = analyzer.calculateBrightness({ data, width, height });
      
      expect(brightness).toBeLessThan(50);
    });
  });

  describe('calculateContrast', () => {
    it('should calculate contrast (standard deviation)', () => {
      // Create alternating black and white pixels for max contrast
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        const isWhite = (i / 4) % 2 === 0;
        const val = isWhite ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }

      const contrast = analyzer.calculateContrast({ data, width, height });
      
      expect(contrast).toBeGreaterThan(100);
    });
  });

  describe('calculateSharpness', () => {
    it('should detect sharp edges', () => {
      // This is a simplified test - actual sharpness requires real image analysis
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      // Create a simple gradient
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const val = Math.floor((x / width) * 255);
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
      }

      const sharpness = analyzer.calculateSharpness({ data, width, height });
      
      expect(typeof sharpness).toBe('number');
    });
  });

  describe('scoreFrame', () => {
    it('should return a composite score', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }

      const score = analyzer.scoreFrame({ data, width, height });
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe('AutoThumbnailGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new AutoThumbnailGenerator();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(generator.options.sampleCount).toBeGreaterThan(0);
      expect(generator.options.format).toBe('png');
    });

    it('should accept custom options', () => {
      const g = new AutoThumbnailGenerator({
        sampleCount: 20,
        format: 'jpg'
      });
      expect(g.options.sampleCount).toBe(20);
      expect(g.options.format).toBe('jpg');
    });
  });

  describe('getPreset', () => {
    it('should return preset dimensions', () => {
      const preset = generator.getPreset('youtube');
      
      expect(preset.width).toBe(1280);
      expect(preset.height).toBe(720);
    });

    it('should return default for unknown preset', () => {
      const preset = generator.getPreset('unknown');
      
      expect(preset).toBeDefined();
      expect(preset.width).toBeGreaterThan(0);
    });
  });

  describe('getSampleTimestamps', () => {
    it('should generate evenly distributed timestamps', () => {
      const timestamps = generator.getSampleTimestamps(30, 10);
      
      expect(timestamps).toHaveLength(10);
      expect(timestamps[0]).toBeGreaterThanOrEqual(0);
      expect(timestamps[timestamps.length - 1]).toBeLessThanOrEqual(30);
    });

    it('should skip intro and outro', () => {
      const timestamps = generator.getSampleTimestamps(30, 10);
      
      // Should not sample from first or last 10%
      expect(timestamps[0]).toBeGreaterThanOrEqual(3);
      expect(timestamps[timestamps.length - 1]).toBeLessThanOrEqual(27);
    });
  });

  describe('analyzeVideo', () => {
    it('should have analyzeVideo method', () => {
      expect(typeof generator.analyzeVideo).toBe('function');
    });
  });

  describe('generate', () => {
    it('should have generate method', () => {
      expect(typeof generator.generate).toBe('function');
    });
  });

  describe('addTitleOverlay', () => {
    it('should have addTitleOverlay method', () => {
      expect(typeof generator.addTitleOverlay).toBe('function');
    });
  });

  describe('addLogoOverlay', () => {
    it('should have addLogoOverlay method', () => {
      expect(typeof generator.addLogoOverlay).toBe('function');
    });
  });
});
