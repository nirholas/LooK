/**
 * Tests for gif-export.js - High-quality GIF export with palette optimization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GifExporter,
  GifQuality,
  DitheringMode
} from '../../src/v2/gif-export.js';

describe('GifQuality', () => {
  it('should define quality levels', () => {
    expect(GifQuality.HIGH).toBe('high');
    expect(GifQuality.MEDIUM).toBe('medium');
    expect(GifQuality.LOW).toBe('low');
  });
});

describe('DitheringMode', () => {
  it('should define dithering modes', () => {
    expect(DitheringMode.NONE).toBe('none');
    expect(DitheringMode.BAYER).toBe('bayer');
    expect(DitheringMode.FLOYD_STEINBERG).toBe('floyd_steinberg');
  });
});

describe('GifExporter', () => {
  let exporter;

  beforeEach(() => {
    exporter = new GifExporter({
      width: 640,
      fps: 15,
      quality: GifQuality.MEDIUM
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const e = new GifExporter();
      expect(e.options.width).toBe(640);
      expect(e.options.fps).toBe(15);
      expect(e.options.quality).toBe(GifQuality.MEDIUM);
      expect(e.options.loop).toBe(true);
    });

    it('should accept custom options', () => {
      const e = new GifExporter({
        width: 800,
        fps: 20,
        quality: GifQuality.HIGH,
        loop: false
      });
      expect(e.options.width).toBe(800);
      expect(e.options.fps).toBe(20);
      expect(e.options.quality).toBe(GifQuality.HIGH);
      expect(e.options.loop).toBe(false);
    });
  });

  describe('getQualitySettings', () => {
    it('should return settings for high quality', () => {
      const settings = exporter.getQualitySettings(GifQuality.HIGH);
      
      expect(settings.maxColors).toBe(256);
      expect(settings.dithering).toBe(DitheringMode.FLOYD_STEINBERG);
    });

    it('should return settings for medium quality', () => {
      const settings = exporter.getQualitySettings(GifQuality.MEDIUM);
      
      expect(settings.maxColors).toBe(256);
      expect(settings.dithering).toBe(DitheringMode.BAYER);
    });

    it('should return settings for low quality', () => {
      const settings = exporter.getQualitySettings(GifQuality.LOW);
      
      expect(settings.maxColors).toBeLessThan(256);
      expect(settings.dithering).toBe(DitheringMode.NONE);
    });
  });

  describe('buildPaletteFilter', () => {
    it('should generate palette filter string', () => {
      const filter = exporter.buildPaletteFilter({
        maxColors: 256,
        statsMode: 'full'
      });

      expect(filter).toContain('palettegen');
      expect(filter).toContain('max_colors=256');
    });

    it('should include stats_mode for diff', () => {
      const filter = exporter.buildPaletteFilter({
        maxColors: 256,
        statsMode: 'diff'
      });

      expect(filter).toContain('stats_mode=diff');
    });
  });

  describe('buildGifFilter', () => {
    it('should generate GIF filter string', () => {
      const filter = exporter.buildGifFilter({
        dithering: DitheringMode.FLOYD_STEINBERG
      });

      expect(filter).toContain('paletteuse');
      expect(filter).toContain('dither');
    });

    it('should handle no dithering', () => {
      const filter = exporter.buildGifFilter({
        dithering: DitheringMode.NONE
      });

      expect(filter).toContain('dither=none');
    });

    it('should handle bayer dithering', () => {
      const filter = exporter.buildGifFilter({
        dithering: DitheringMode.BAYER
      });

      expect(filter).toContain('bayer');
    });
  });

  describe('calculateScale', () => {
    it('should calculate scale filter for target width', () => {
      const scale = exporter.calculateScale(1920, 1080, 640);

      expect(scale).toContain('scale=640');
      expect(scale).toContain('-1'); // maintain aspect ratio
    });

    it('should handle different aspect ratios', () => {
      const scale = exporter.calculateScale(1080, 1920, 480);

      expect(scale).toContain('scale=480');
    });
  });

  describe('buildFFmpegCommand', () => {
    it('should build two-pass FFmpeg command', () => {
      const cmd = exporter.buildFFmpegCommand({
        input: '/tmp/video.mp4',
        output: '/tmp/output.gif',
        width: 640,
        fps: 15,
        quality: GifQuality.MEDIUM
      });

      expect(cmd).toContain('-i');
      expect(cmd).toContain('/tmp/video.mp4');
      expect(cmd).toContain('palettegen');
      expect(cmd).toContain('paletteuse');
    });

    it('should include time range if specified', () => {
      const cmd = exporter.buildFFmpegCommand({
        input: '/tmp/video.mp4',
        output: '/tmp/output.gif',
        startTime: 5,
        endTime: 15
      });

      expect(cmd).toContain('-ss');
      expect(cmd).toContain('-to');
    });
  });

  describe('getLoopFlag', () => {
    it('should return 0 for infinite loop', () => {
      exporter.options.loop = true;
      expect(exporter.getLoopFlag()).toBe(0);
    });

    it('should return -1 for no loop', () => {
      exporter.options.loop = false;
      expect(exporter.getLoopFlag()).toBe(-1);
    });

    it('should return specific count', () => {
      exporter.options.loop = 3;
      expect(exporter.getLoopFlag()).toBe(3);
    });
  });

  describe('export', () => {
    it('should have export method', () => {
      expect(typeof exporter.export).toBe('function');
    });
  });

  describe('estimateFileSize', () => {
    it('should estimate output file size', () => {
      const estimate = exporter.estimateFileSize({
        width: 640,
        height: 360,
        fps: 15,
        duration: 5,
        quality: GifQuality.MEDIUM
      });

      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
    });

    it('should return larger estimate for high quality', () => {
      const highEstimate = exporter.estimateFileSize({
        width: 640,
        height: 360,
        fps: 15,
        duration: 5,
        quality: GifQuality.HIGH
      });

      const lowEstimate = exporter.estimateFileSize({
        width: 640,
        height: 360,
        fps: 15,
        duration: 5,
        quality: GifQuality.LOW
      });

      expect(highEstimate).toBeGreaterThan(lowEstimate);
    });
  });

  describe('validateInput', () => {
    it('should validate input parameters', () => {
      expect(() => exporter.validateInput({
        width: 640,
        fps: 15
      })).not.toThrow();
    });

    it('should throw for invalid width', () => {
      expect(() => exporter.validateInput({
        width: -1,
        fps: 15
      })).toThrow();
    });

    it('should throw for invalid fps', () => {
      expect(() => exporter.validateInput({
        width: 640,
        fps: 0
      })).toThrow();
    });

    it('should throw for fps above limit', () => {
      expect(() => exporter.validateInput({
        width: 640,
        fps: 60 // too high for GIF
      })).toThrow();
    });
  });
});
