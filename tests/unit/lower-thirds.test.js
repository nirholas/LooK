/**
 * Tests for lower-thirds.js - Professional name/title overlays
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LowerThirdsRenderer,
  LowerThirdsStyle,
  LowerThirdsPresets,
  AnimationPreset
} from '../../src/v2/lower-thirds.js';

describe('LowerThirdsStyle', () => {
  it('should define all lower third styles', () => {
    expect(LowerThirdsStyle.MODERN).toBe('modern');
    expect(LowerThirdsStyle.CLASSIC).toBe('classic');
    expect(LowerThirdsStyle.MINIMAL).toBe('minimal');
    expect(LowerThirdsStyle.GRADIENT).toBe('gradient');
    expect(LowerThirdsStyle.BROADCAST).toBe('broadcast');
  });
});

describe('AnimationPreset', () => {
  it('should define animation presets', () => {
    expect(AnimationPreset.SLIDE_IN).toBe('slide-in');
    expect(AnimationPreset.FADE_IN).toBe('fade-in');
    expect(AnimationPreset.SCALE_UP).toBe('scale-up');
    expect(AnimationPreset.WIPE).toBe('wipe');
  });
});

describe('LowerThirdsPresets', () => {
  it('should define presets for each style', () => {
    expect(LowerThirdsPresets[LowerThirdsStyle.MODERN]).toBeDefined();
    expect(LowerThirdsPresets[LowerThirdsStyle.CLASSIC]).toBeDefined();
    expect(LowerThirdsPresets[LowerThirdsStyle.MINIMAL]).toBeDefined();
    expect(LowerThirdsPresets[LowerThirdsStyle.GRADIENT]).toBeDefined();
    expect(LowerThirdsPresets[LowerThirdsStyle.BROADCAST]).toBeDefined();
  });

  it('should have required properties', () => {
    Object.values(LowerThirdsPresets).forEach(preset => {
      expect(preset).toHaveProperty('backgroundColor');
      expect(preset).toHaveProperty('textColor');
      expect(preset).toHaveProperty('nameFont');
      expect(preset).toHaveProperty('titleFont');
      expect(preset).toHaveProperty('animation');
    });
  });

  it('should have modern style with accent color', () => {
    const modern = LowerThirdsPresets[LowerThirdsStyle.MODERN];
    expect(modern.accentColor).toBeDefined();
  });

  it('should have broadcast style with animation timing', () => {
    const broadcast = LowerThirdsPresets[LowerThirdsStyle.BROADCAST];
    expect(broadcast.animationDuration).toBeDefined();
  });
});

describe('LowerThirdsRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new LowerThirdsRenderer({
      name: 'John Doe',
      title: 'Software Engineer',
      style: LowerThirdsStyle.MODERN
    });
  });

  describe('constructor', () => {
    it('should initialize with required parameters', () => {
      expect(renderer.options.name).toBe('John Doe');
      expect(renderer.options.title).toBe('Software Engineer');
      expect(renderer.options.style).toBe(LowerThirdsStyle.MODERN);
    });

    it('should use default style if not specified', () => {
      const r = new LowerThirdsRenderer({ name: 'Jane' });
      expect(r.options.style).toBe(LowerThirdsStyle.MODERN);
    });

    it('should accept position option', () => {
      const r = new LowerThirdsRenderer({
        name: 'Test',
        position: 'bottom-right'
      });
      expect(r.options.position).toBe('bottom-right');
    });
  });

  describe('renderSVG', () => {
    it('should generate SVG with name', () => {
      const svg = renderer.renderSVG();

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('John Doe');
    });

    it('should include title if provided', () => {
      const svg = renderer.renderSVG();

      expect(svg).toContain('Software Engineer');
    });

    it('should work without title', () => {
      const r = new LowerThirdsRenderer({ name: 'Name Only' });
      const svg = r.renderSVG();

      expect(svg).toContain('Name Only');
      expect(svg).not.toContain('undefined');
    });

    it('should apply style-specific colors', () => {
      const svg = renderer.renderSVG();
      const preset = LowerThirdsPresets[LowerThirdsStyle.MODERN];

      expect(svg).toContain(preset.textColor);
    });
  });

  describe('getPosition', () => {
    it('should calculate bottom-left position', () => {
      renderer.options.position = 'bottom-left';
      const pos = renderer.getPosition(1920, 1080);

      expect(pos.x).toBeLessThan(200);
      expect(pos.y).toBeGreaterThan(800);
    });

    it('should calculate bottom-right position', () => {
      renderer.options.position = 'bottom-right';
      const pos = renderer.getPosition(1920, 1080);

      expect(pos.x).toBeGreaterThan(1200);
      expect(pos.y).toBeGreaterThan(800);
    });

    it('should calculate top-left position', () => {
      renderer.options.position = 'top-left';
      const pos = renderer.getPosition(1920, 1080);

      expect(pos.x).toBeLessThan(200);
      expect(pos.y).toBeLessThan(200);
    });
  });

  describe('getAnimationKeyframes', () => {
    it('should generate slide-in keyframes', () => {
      const keyframes = renderer.getAnimationKeyframes(AnimationPreset.SLIDE_IN);

      expect(keyframes).toHaveProperty('from');
      expect(keyframes).toHaveProperty('to');
      expect(keyframes.from.transform).toContain('translateX');
    });

    it('should generate fade-in keyframes', () => {
      const keyframes = renderer.getAnimationKeyframes(AnimationPreset.FADE_IN);

      expect(keyframes.from.opacity).toBe(0);
      expect(keyframes.to.opacity).toBe(1);
    });

    it('should generate scale-up keyframes', () => {
      const keyframes = renderer.getAnimationKeyframes(AnimationPreset.SCALE_UP);

      expect(keyframes.from.transform).toContain('scale');
    });
  });

  describe('getDimensions', () => {
    it('should calculate dimensions based on text length', () => {
      const dims = renderer.getDimensions();

      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('should be wider for longer names', () => {
      const shortRenderer = new LowerThirdsRenderer({ name: 'Jo' });
      const longRenderer = new LowerThirdsRenderer({ name: 'Jonathan Weatherspoon III' });

      const shortDims = shortRenderer.getDimensions();
      const longDims = longRenderer.getDimensions();

      expect(longDims.width).toBeGreaterThan(shortDims.width);
    });
  });

  describe('setDisplayTime', () => {
    it('should set start and end time', () => {
      renderer.setDisplayTime(5, 10);

      expect(renderer.startTime).toBe(5);
      expect(renderer.endTime).toBe(10);
    });

    it('should calculate duration', () => {
      renderer.setDisplayTime(5, 10);

      expect(renderer.getDuration()).toBe(5);
    });
  });

  describe('isVisibleAt', () => {
    it('should return true when within display time', () => {
      renderer.setDisplayTime(5, 10);

      expect(renderer.isVisibleAt(7)).toBe(true);
    });

    it('should return false when outside display time', () => {
      renderer.setDisplayTime(5, 10);

      expect(renderer.isVisibleAt(3)).toBe(false);
      expect(renderer.isVisibleAt(12)).toBe(false);
    });

    it('should return true at boundaries', () => {
      renderer.setDisplayTime(5, 10);

      expect(renderer.isVisibleAt(5)).toBe(true);
      expect(renderer.isVisibleAt(10)).toBe(true);
    });
  });

  describe('applyToVideo', () => {
    it('should have applyToVideo method', () => {
      expect(typeof renderer.applyToVideo).toBe('function');
    });
  });

  describe('renderHTML', () => {
    it('should generate HTML version for web', () => {
      const html = renderer.renderHTML();

      expect(html).toContain('<div');
      expect(html).toContain('John Doe');
      expect(html).toContain('Software Engineer');
    });
  });
});
