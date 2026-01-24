/**
 * Tests for spotlight.js - Focus attention with dimmed overlay and cutouts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SpotlightRenderer,
  SpotlightShape,
  SpotlightPresets
} from '../../src/v2/spotlight.js';

describe('SpotlightShape', () => {
  it('should define spotlight shapes', () => {
    expect(SpotlightShape.CIRCLE).toBe('circle');
    expect(SpotlightShape.RECTANGLE).toBe('rectangle');
    expect(SpotlightShape.ROUNDED_RECT).toBe('rounded-rect');
    expect(SpotlightShape.ELLIPSE).toBe('ellipse');
  });
});

describe('SpotlightPresets', () => {
  it('should define presets', () => {
    expect(SpotlightPresets.subtle).toBeDefined();
    expect(SpotlightPresets.dramatic).toBeDefined();
    expect(SpotlightPresets.focus).toBeDefined();
  });

  it('should have opacity settings', () => {
    expect(SpotlightPresets.subtle.overlayOpacity).toBeLessThan(SpotlightPresets.dramatic.overlayOpacity);
  });
});

describe('SpotlightRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new SpotlightRenderer({
      overlayOpacity: 0.7,
      overlayColor: '#000000',
      shape: SpotlightShape.CIRCLE
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new SpotlightRenderer();
      expect(r.options.overlayOpacity).toBe(0.7);
      expect(r.options.overlayColor).toBe('#000000');
      expect(r.options.shape).toBe(SpotlightShape.CIRCLE);
    });

    it('should accept custom options', () => {
      const r = new SpotlightRenderer({
        overlayOpacity: 0.5,
        overlayColor: '#1a1a1a',
        shape: SpotlightShape.RECTANGLE
      });
      expect(r.options.overlayOpacity).toBe(0.5);
      expect(r.options.overlayColor).toBe('#1a1a1a');
      expect(r.options.shape).toBe(SpotlightShape.RECTANGLE);
    });
  });

  describe('renderSVG', () => {
    it('should generate SVG with mask for circle', () => {
      const svg = renderer.renderSVG({
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

    it('should generate SVG for rectangle shape', () => {
      renderer.options.shape = SpotlightShape.RECTANGLE;
      const svg = renderer.renderSVG({
        x: 500,
        y: 400,
        width: 200,
        height: 100,
        videoWidth: 1920,
        videoHeight: 1080
      });

      expect(svg).toContain('rect');
    });

    it('should apply overlay opacity', () => {
      const svg = renderer.renderSVG({
        x: 500,
        y: 400,
        radius: 100,
        videoWidth: 1920,
        videoHeight: 1080
      });

      expect(svg).toContain('opacity');
      expect(svg).toContain('0.7');
    });
  });

  describe('createMask', () => {
    it('should create SVG mask element for circle', () => {
      const mask = renderer.createMask({
        shape: SpotlightShape.CIRCLE,
        x: 100,
        y: 100,
        radius: 50
      });

      expect(mask).toContain('mask');
      expect(mask).toContain('white'); // cutout area
    });

    it('should create SVG mask element for rectangle', () => {
      const mask = renderer.createMask({
        shape: SpotlightShape.RECTANGLE,
        x: 100,
        y: 100,
        width: 200,
        height: 100
      });

      expect(mask).toContain('mask');
      expect(mask).toContain('rect');
    });

    it('should create SVG mask element for rounded rect', () => {
      const mask = renderer.createMask({
        shape: SpotlightShape.ROUNDED_RECT,
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        borderRadius: 10
      });

      expect(mask).toContain('rx="10"');
    });
  });

  describe('addSpotlight', () => {
    it('should add spotlight to collection', () => {
      renderer.addSpotlight({
        x: 500,
        y: 400,
        radius: 100,
        startTime: 5,
        endTime: 10
      });

      const spotlights = renderer.getSpotlights();
      expect(spotlights).toHaveLength(1);
    });

    it('should generate unique IDs', () => {
      renderer.addSpotlight({ x: 100, y: 100, radius: 50, startTime: 0, endTime: 5 });
      renderer.addSpotlight({ x: 200, y: 200, radius: 50, startTime: 5, endTime: 10 });

      const spotlights = renderer.getSpotlights();
      expect(spotlights[0].id).not.toBe(spotlights[1].id);
    });
  });

  describe('removeSpotlight', () => {
    it('should remove spotlight by ID', () => {
      renderer.addSpotlight({ x: 100, y: 100, radius: 50, startTime: 0, endTime: 5 });
      const spotlights = renderer.getSpotlights();
      const id = spotlights[0].id;

      renderer.removeSpotlight(id);

      expect(renderer.getSpotlights()).toHaveLength(0);
    });
  });

  describe('getSpotlightsAtTime', () => {
    it('should return spotlights visible at specific time', () => {
      renderer.addSpotlight({ x: 100, y: 100, radius: 50, startTime: 0, endTime: 5 });
      renderer.addSpotlight({ x: 200, y: 200, radius: 50, startTime: 3, endTime: 8 });
      renderer.addSpotlight({ x: 300, y: 300, radius: 50, startTime: 10, endTime: 15 });

      const atTime4 = renderer.getSpotlightsAtTime(4);
      expect(atTime4).toHaveLength(2);

      const atTime12 = renderer.getSpotlightsAtTime(12);
      expect(atTime12).toHaveLength(1);
    });
  });

  describe('clearSpotlights', () => {
    it('should remove all spotlights', () => {
      renderer.addSpotlight({ x: 100, y: 100, radius: 50, startTime: 0, endTime: 5 });
      renderer.addSpotlight({ x: 200, y: 200, radius: 50, startTime: 5, endTime: 10 });

      renderer.clearSpotlights();

      expect(renderer.getSpotlights()).toHaveLength(0);
    });
  });

  describe('setPreset', () => {
    it('should apply preset settings', () => {
      renderer.setPreset('dramatic');

      expect(renderer.options.overlayOpacity).toBe(SpotlightPresets.dramatic.overlayOpacity);
    });

    it('should apply subtle preset', () => {
      renderer.setPreset('subtle');

      expect(renderer.options.overlayOpacity).toBe(SpotlightPresets.subtle.overlayOpacity);
    });
  });

  describe('calculateFadeAnimation', () => {
    it('should calculate fade in/out values', () => {
      const spotlight = {
        startTime: 5,
        endTime: 10,
        fadeIn: 0.5,
        fadeOut: 0.5
      };

      // During fade in
      const fadeInValue = renderer.calculateFadeAnimation(5.25, spotlight);
      expect(fadeInValue).toBeGreaterThan(0);
      expect(fadeInValue).toBeLessThan(1);

      // Fully visible
      const fullValue = renderer.calculateFadeAnimation(7.5, spotlight);
      expect(fullValue).toBe(1);

      // During fade out
      const fadeOutValue = renderer.calculateFadeAnimation(9.75, spotlight);
      expect(fadeOutValue).toBeGreaterThan(0);
      expect(fadeOutValue).toBeLessThan(1);
    });
  });

  describe('fromElement', () => {
    it('should create spotlight from element bounds', () => {
      const element = {
        x: 100,
        y: 100,
        width: 200,
        height: 50
      };

      const spotlight = renderer.fromElement(element, {
        padding: 20,
        startTime: 0,
        endTime: 5
      });

      expect(spotlight.x).toBe(100 - 20);
      expect(spotlight.y).toBe(100 - 20);
      expect(spotlight.width).toBe(200 + 40);
      expect(spotlight.height).toBe(50 + 40);
    });
  });
});
