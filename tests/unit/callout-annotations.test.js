/**
 * Tests for callout-annotations.js - Arrows, boxes, badges for UI annotations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CalloutRenderer,
  CalloutType,
  CalloutPresets,
  AnimationStyle
} from '../../src/v2/callout-annotations.js';

describe('CalloutType', () => {
  it('should define all callout types', () => {
    expect(CalloutType.ARROW).toBe('arrow');
    expect(CalloutType.BOX).toBe('box');
    expect(CalloutType.CIRCLE).toBe('circle');
    expect(CalloutType.BADGE).toBe('badge');
    expect(CalloutType.SPOTLIGHT).toBe('spotlight');
    expect(CalloutType.BLUR).toBe('blur');
  });
});

describe('AnimationStyle', () => {
  it('should define animation styles', () => {
    expect(AnimationStyle.NONE).toBe('none');
    expect(AnimationStyle.FADE).toBe('fade');
    expect(AnimationStyle.DRAW).toBe('draw');
    expect(AnimationStyle.BOUNCE).toBe('bounce');
    expect(AnimationStyle.SCALE).toBe('scale');
  });
});

describe('CalloutPresets', () => {
  it('should define presets for each callout type', () => {
    expect(CalloutPresets[CalloutType.ARROW]).toBeDefined();
    expect(CalloutPresets[CalloutType.BOX]).toBeDefined();
    expect(CalloutPresets[CalloutType.CIRCLE]).toBeDefined();
    expect(CalloutPresets[CalloutType.BADGE]).toBeDefined();
  });

  it('should have required styling properties', () => {
    Object.values(CalloutPresets).forEach(preset => {
      expect(preset).toHaveProperty('color');
      expect(preset).toHaveProperty('strokeWidth');
    });
  });
});

describe('CalloutRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new CalloutRenderer({
      color: '#EF4444',
      animation: AnimationStyle.FADE
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new CalloutRenderer();
      expect(r.options.color).toBe('#EF4444');
      expect(r.options.animation).toBe(AnimationStyle.FADE);
    });

    it('should accept custom options', () => {
      const r = new CalloutRenderer({
        color: '#3B82F6',
        animation: AnimationStyle.DRAW
      });
      expect(r.options.color).toBe('#3B82F6');
      expect(r.options.animation).toBe(AnimationStyle.DRAW);
    });
  });

  describe('renderArrow', () => {
    it('should generate SVG arrow', () => {
      const svg = renderer.renderArrow({
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 }
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('line');
      expect(svg).toContain('polygon'); // arrow head
    });

    it('should apply color', () => {
      const svg = renderer.renderArrow({
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 }
      });

      expect(svg).toContain('#EF4444');
    });
  });

  describe('renderBox', () => {
    it('should generate SVG box', () => {
      const svg = renderer.renderBox({
        x: 10,
        y: 10,
        width: 200,
        height: 100
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('rect');
      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="100"');
    });

    it('should have rounded corners by default', () => {
      const svg = renderer.renderBox({
        x: 0,
        y: 0,
        width: 100,
        height: 50
      });

      expect(svg).toContain('rx');
    });
  });

  describe('renderCircle', () => {
    it('should generate SVG circle', () => {
      const svg = renderer.renderCircle({
        cx: 100,
        cy: 100,
        radius: 50
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('circle');
      expect(svg).toContain('cx="100"');
      expect(svg).toContain('cy="100"');
      expect(svg).toContain('r="50"');
    });

    it('should be stroke-only (not filled)', () => {
      const svg = renderer.renderCircle({
        cx: 100,
        cy: 100,
        radius: 50
      });

      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke');
    });
  });

  describe('renderBadge', () => {
    it('should generate numbered badge', () => {
      const svg = renderer.renderBadge({
        x: 100,
        y: 100,
        number: 1
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('circle');
      expect(svg).toContain('text');
      expect(svg).toContain('1');
    });

    it('should handle multi-digit numbers', () => {
      const svg = renderer.renderBadge({
        x: 100,
        y: 100,
        number: 10
      });

      expect(svg).toContain('10');
    });
  });

  describe('renderSpotlight', () => {
    it('should generate spotlight overlay', () => {
      const svg = renderer.renderSpotlight({
        x: 500,
        y: 400,
        radius: 100,
        videoWidth: 1920,
        videoHeight: 1080
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('mask');
      expect(svg).toContain('circle');
    });

    it('should dim surrounding area', () => {
      const svg = renderer.renderSpotlight({
        x: 500,
        y: 400,
        radius: 100,
        videoWidth: 1920,
        videoHeight: 1080
      });

      expect(svg).toContain('opacity');
    });
  });

  describe('renderBlur', () => {
    it('should generate blur region', () => {
      const svg = renderer.renderBlur({
        x: 100,
        y: 100,
        width: 200,
        height: 50
      });

      expect(svg).toContain('<svg');
      expect(svg).toContain('filter');
      expect(svg).toContain('feGaussianBlur');
    });
  });

  describe('addCallout', () => {
    it('should add callout to collection', () => {
      renderer.addCallout({
        type: CalloutType.BOX,
        startTime: 5,
        endTime: 10,
        x: 100,
        y: 100,
        width: 200,
        height: 100
      });

      const callouts = renderer.getCallouts();
      expect(callouts).toHaveLength(1);
      expect(callouts[0].type).toBe(CalloutType.BOX);
    });

    it('should generate unique IDs', () => {
      renderer.addCallout({ type: CalloutType.BOX, startTime: 0, endTime: 5 });
      renderer.addCallout({ type: CalloutType.ARROW, startTime: 2, endTime: 7 });

      const callouts = renderer.getCallouts();
      expect(callouts[0].id).not.toBe(callouts[1].id);
    });
  });

  describe('removeCallout', () => {
    it('should remove callout by ID', () => {
      renderer.addCallout({ type: CalloutType.BOX, startTime: 0, endTime: 5 });
      const callouts = renderer.getCallouts();
      const id = callouts[0].id;

      renderer.removeCallout(id);

      expect(renderer.getCallouts()).toHaveLength(0);
    });
  });

  describe('getCalloutsAtTime', () => {
    it('should return callouts visible at specific time', () => {
      renderer.addCallout({ type: CalloutType.BOX, startTime: 0, endTime: 5 });
      renderer.addCallout({ type: CalloutType.ARROW, startTime: 3, endTime: 8 });
      renderer.addCallout({ type: CalloutType.CIRCLE, startTime: 10, endTime: 15 });

      const atTime4 = renderer.getCalloutsAtTime(4);
      expect(atTime4).toHaveLength(2);

      const atTime12 = renderer.getCalloutsAtTime(12);
      expect(atTime12).toHaveLength(1);
      expect(atTime12[0].type).toBe(CalloutType.CIRCLE);
    });
  });

  describe('clearCallouts', () => {
    it('should remove all callouts', () => {
      renderer.addCallout({ type: CalloutType.BOX, startTime: 0, endTime: 5 });
      renderer.addCallout({ type: CalloutType.ARROW, startTime: 2, endTime: 7 });

      renderer.clearCallouts();

      expect(renderer.getCallouts()).toHaveLength(0);
    });
  });

  describe('getAnimationCSS', () => {
    it('should generate CSS for fade animation', () => {
      renderer.options.animation = AnimationStyle.FADE;
      const css = renderer.getAnimationCSS();

      expect(css).toContain('opacity');
      expect(css).toContain('transition');
    });

    it('should generate CSS for draw animation', () => {
      renderer.options.animation = AnimationStyle.DRAW;
      const css = renderer.getAnimationCSS();

      expect(css).toContain('stroke-dasharray');
      expect(css).toContain('stroke-dashoffset');
    });

    it('should return empty for none animation', () => {
      renderer.options.animation = AnimationStyle.NONE;
      const css = renderer.getAnimationCSS();

      expect(css).toBe('');
    });
  });
});
