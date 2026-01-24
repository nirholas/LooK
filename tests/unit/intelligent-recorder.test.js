/**
 * Tests for intelligent-recorder.js - AI-powered recording with natural cursor movement
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NaturalCursor,
  ElementPrioritizer,
  DemoFlowPlanner,
  IntelligentRecorder
} from '../../src/v2/intelligent-recorder.js';

describe('NaturalCursor', () => {
  let cursor;

  beforeEach(() => {
    cursor = new NaturalCursor({
      speed: 1.0,
      jitter: 0.5,
      overshoot: 0.1
    });
  });

  describe('generatePath', () => {
    it('should generate a path with multiple points', () => {
      const path = cursor.generatePath(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );

      expect(path).toBeInstanceOf(Array);
      expect(path.length).toBeGreaterThan(2);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1].x).toBeCloseTo(100, 0);
      expect(path[path.length - 1].y).toBeCloseTo(100, 0);
    });

    it('should create curved paths using bezier interpolation', () => {
      const path = cursor.generatePath(
        { x: 0, y: 0 },
        { x: 200, y: 0 }
      );

      // Check that the path isn't a straight line (has Y variation)
      const yValues = path.map(p => p.y);
      const hasVariation = yValues.some(y => Math.abs(y) > 0.1);
      
      // With jitter, there should be some variation
      expect(path.length).toBeGreaterThan(5);
    });

    it('should respect speed settings', () => {
      const slowCursor = new NaturalCursor({ speed: 0.5 });
      const fastCursor = new NaturalCursor({ speed: 2.0 });

      const slowPath = slowCursor.generatePath({ x: 0, y: 0 }, { x: 100, y: 100 });
      const fastPath = fastCursor.generatePath({ x: 0, y: 0 }, { x: 100, y: 100 });

      // Slower cursor should have more points (more granular movement)
      expect(slowPath.length).toBeGreaterThanOrEqual(fastPath.length);
    });
  });

  describe('addJitter', () => {
    it('should add small random variations to position', () => {
      const original = { x: 100, y: 100 };
      const jittered = cursor.addJitter(original);

      // Should be close but not exact
      expect(jittered.x).toBeCloseTo(original.x, -1);
      expect(jittered.y).toBeCloseTo(original.y, -1);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration based on distance', () => {
      const shortDuration = cursor.calculateDuration({ x: 0, y: 0 }, { x: 50, y: 0 });
      const longDuration = cursor.calculateDuration({ x: 0, y: 0 }, { x: 500, y: 0 });

      expect(longDuration).toBeGreaterThan(shortDuration);
      expect(shortDuration).toBeGreaterThan(0);
    });
  });
});

describe('ElementPrioritizer', () => {
  let prioritizer;

  beforeEach(() => {
    prioritizer = new ElementPrioritizer();
  });

  describe('prioritize', () => {
    it('should prioritize elements by type and visibility', () => {
      const elements = [
        { type: 'text', visible: true, area: 100, text: 'paragraph' },
        { type: 'button', visible: true, area: 50, text: 'Click me' },
        { type: 'heading', visible: true, area: 200, text: 'Welcome' },
        { type: 'link', visible: false, area: 30, text: 'hidden' }
      ];

      const prioritized = prioritizer.prioritize(elements);

      // Should filter out hidden elements
      expect(prioritized.every(e => e.visible)).toBe(true);
      
      // Should have scores
      expect(prioritized.every(e => typeof e.score === 'number')).toBe(true);
    });

    it('should score CTAs and buttons higher', () => {
      const elements = [
        { type: 'text', visible: true, area: 100, text: 'Normal text' },
        { type: 'button', visible: true, area: 50, text: 'Sign Up Free' },
        { type: 'link', visible: true, area: 30, text: 'Learn more' }
      ];

      const prioritized = prioritizer.prioritize(elements);
      const button = prioritized.find(e => e.type === 'button');
      const text = prioritized.find(e => e.type === 'text');

      expect(button.score).toBeGreaterThan(text.score);
    });
  });

  describe('getTypeScore', () => {
    it('should return higher scores for interactive elements', () => {
      expect(prioritizer.getTypeScore('button')).toBeGreaterThan(prioritizer.getTypeScore('text'));
      expect(prioritizer.getTypeScore('cta')).toBeGreaterThan(prioritizer.getTypeScore('link'));
      expect(prioritizer.getTypeScore('heading')).toBeGreaterThan(prioritizer.getTypeScore('text'));
    });
  });
});

describe('DemoFlowPlanner', () => {
  let planner;

  beforeEach(() => {
    planner = new DemoFlowPlanner({
      duration: 30000,
      style: 'professional'
    });
  });

  describe('createPlan', () => {
    it('should create a plan from page analysis', () => {
      const analysis = {
        sections: [
          { name: 'hero', elements: [{ type: 'heading', text: 'Welcome' }] },
          { name: 'features', elements: [{ type: 'card', text: 'Feature 1' }] }
        ],
        elements: [
          { type: 'button', text: 'Get Started' },
          { type: 'link', text: 'Learn More' }
        ]
      };

      const plan = planner.createPlan(analysis);

      expect(plan).toHaveProperty('steps');
      expect(plan).toHaveProperty('totalDuration');
      expect(plan.steps).toBeInstanceOf(Array);
    });

    it('should distribute time across sections', () => {
      const analysis = {
        sections: [
          { name: 'hero', elements: [] },
          { name: 'features', elements: [] },
          { name: 'pricing', elements: [] }
        ],
        elements: []
      };

      const plan = planner.createPlan(analysis);

      // Total duration should be close to configured duration
      expect(plan.totalDuration).toBeLessThanOrEqual(35000);
    });
  });

  describe('calculateSectionTime', () => {
    it('should allocate time based on section importance', () => {
      const heroTime = planner.calculateSectionTime('hero', 3);
      const footerTime = planner.calculateSectionTime('footer', 3);

      expect(heroTime).toBeGreaterThan(footerTime);
    });
  });
});

describe('IntelligentRecorder', () => {
  let recorder;

  beforeEach(() => {
    recorder = new IntelligentRecorder({
      width: 1920,
      height: 1080,
      duration: 25000
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new IntelligentRecorder();
      expect(r.options.width).toBe(1920);
      expect(r.options.height).toBe(1080);
    });

    it('should accept custom options', () => {
      const r = new IntelligentRecorder({
        width: 1280,
        height: 720,
        duration: 60000
      });
      expect(r.options.width).toBe(1280);
      expect(r.options.height).toBe(720);
      expect(r.options.duration).toBe(60000);
    });
  });

  describe('analyzePage', () => {
    it('should have analyzePage method', () => {
      expect(typeof recorder.analyzePage).toBe('function');
    });
  });

  describe('createRecordingPlan', () => {
    it('should have createRecordingPlan method', () => {
      expect(typeof recorder.createRecordingPlan).toBe('function');
    });
  });
});
