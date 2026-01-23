import { describe, it, expect, beforeEach } from 'vitest';
import { AutoZoom } from '../../src/v2/auto-zoom.js';

describe('AutoZoom', () => {
  let autoZoom;

  beforeEach(() => {
    autoZoom = new AutoZoom();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(autoZoom.minZoom).toBe(1.0);
      expect(autoZoom.maxZoom).toBe(2.0);
      expect(autoZoom.defaultZoom).toBe(1.3);
      expect(autoZoom.zoomDuration).toBe(800);
      expect(autoZoom.holdDuration).toBe(1500);
      expect(autoZoom.easing).toBe('easeInOutCubic');
    });

    it('should accept custom options', () => {
      const customZoom = new AutoZoom({
        minZoom: 0.5,
        maxZoom: 3.0,
        defaultZoom: 1.5,
        zoomDuration: 1000,
        holdDuration: 2000,
        easing: 'linear'
      });

      expect(customZoom.minZoom).toBe(0.5);
      expect(customZoom.maxZoom).toBe(3.0);
      expect(customZoom.defaultZoom).toBe(1.5);
      expect(customZoom.zoomDuration).toBe(1000);
      expect(customZoom.holdDuration).toBe(2000);
      expect(customZoom.easing).toBe('linear');
    });

    it('should initialize follow-cam settings', () => {
      expect(autoZoom.followIntensity).toBe(0.5);
      expect(autoZoom.deadzone).toBe(0.2);
      expect(autoZoom.maxPanSpeed).toBe(200);
      expect(autoZoom.anticipation).toBe(200);
    });

    it('should default to smart zoom mode', () => {
      expect(autoZoom.zoomMode).toBe('smart');
    });
  });

  describe('generateFromCursor', () => {
    it('should generate initial keyframe at time 0', () => {
      const cursorData = { clicks: [], positions: [] };
      const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);
      
      expect(keyframes[0]).toEqual({
        time: 0,
        zoom: 1.0,
        x: 960,
        y: 540,
        easing: 'easeInOutCubic'
      });
    });

    it('should generate zoom keyframes for clicks', () => {
      const cursorData = {
        clicks: [{ t: 5000, x: 500, y: 300 }],
        positions: []
      };
      
      const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);
      
      // Should have: initial, pre-zoom, zoom-in, hold, zoom-out
      expect(keyframes.length).toBeGreaterThanOrEqual(4);
      
      // Find the zoom-in keyframe (at click time)
      const zoomInFrame = keyframes.find(k => k.time === 5000);
      expect(zoomInFrame.zoom).toBe(1.3); // defaultZoom
      expect(zoomInFrame.x).toBe(500);
      expect(zoomInFrame.y).toBe(300);
    });

    it('should sort keyframes by time', () => {
      const cursorData = {
        clicks: [
          { t: 10000, x: 800, y: 600 },
          { t: 2000, x: 200, y: 100 }
        ],
        positions: []
      };
      
      const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);
      
      for (let i = 1; i < keyframes.length; i++) {
        expect(keyframes[i].time).toBeGreaterThanOrEqual(keyframes[i - 1].time);
      }
    });

    it('should return to center after click hold', () => {
      const cursorData = {
        clicks: [{ t: 5000, x: 500, y: 300 }],
        positions: []
      };
      
      const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);
      const lastFrame = keyframes[keyframes.length - 1];
      
      expect(lastFrame.zoom).toBe(1.0); // minZoom
      expect(lastFrame.x).toBe(960); // center x
      expect(lastFrame.y).toBe(540); // center y
    });

    it('should handle empty click data', () => {
      const cursorData = { clicks: [], positions: [] };
      const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);
      
      expect(keyframes).toHaveLength(1);
      expect(keyframes[0].time).toBe(0);
    });
  });

  describe('generateFollowZoom', () => {
    it('should return empty keyframes for empty cursor data', () => {
      const cursorData = { positions: [], clicks: [] };
      const keyframes = autoZoom.generateFollowZoom(cursorData, 1920, 1080);
      
      expect(keyframes).toEqual([]);
    });

    it('should generate keyframes from position data', () => {
      const cursorData = {
        positions: [
          { t: 0, x: 960, y: 540 },
          { t: 1000, x: 1200, y: 600 },
          { t: 2000, x: 1400, y: 700 }
        ],
        clicks: []
      };
      
      const keyframes = autoZoom.generateFollowZoom(cursorData, 1920, 1080);
      
      expect(keyframes.length).toBeGreaterThan(0);
    });

    it('should respect deadzone settings', () => {
      const customZoom = new AutoZoom({ deadzone: 0.5 });
      
      // Cursor moving within center 50% shouldn't cause panning
      const cursorData = {
        positions: [
          { t: 0, x: 960, y: 540 },
          { t: 1000, x: 1000, y: 540 }
        ],
        clicks: []
      };
      
      const keyframes = customZoom.generateFollowZoom(cursorData, 1920, 1080);
      
      // Pan should be minimal within deadzone
      if (keyframes.length > 0) {
        const lastFrame = keyframes[keyframes.length - 1];
        expect(Math.abs(lastFrame.x - 960)).toBeLessThan(100);
      }
    });
  });

  describe('smoothDamp', () => {
    it('should move current value toward target', () => {
      const result = autoZoom.smoothDamp(0, 100, 200, 0.016);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('should respect max speed limit', () => {
      const result = autoZoom.smoothDamp(0, 1000, 50, 0.016);
      
      // Max delta per frame = 50 * 0.016 = 0.8, then * 0.3 smoothing = 0.24
      expect(result).toBeLessThan(1);
    });

    it('should return current value when already at target', () => {
      const result = autoZoom.smoothDamp(100, 100, 200, 0.016);
      
      expect(result).toBe(100);
    });
  });

  describe('interpolatePositions', () => {
    it('should interpolate positions at regular intervals', () => {
      const positions = [
        { t: 0, x: 0, y: 0 },
        { t: 1000, x: 100, y: 100 }
      ];
      
      const frames = autoZoom.interpolatePositions(positions, 1000, 60);
      
      expect(frames.length).toBe(60); // 1 second at 60fps
    });

    it('should return empty array for empty positions', () => {
      const frames = autoZoom.interpolatePositions([], 1000, 60);
      
      expect(frames).toEqual([]);
    });

    it('should maintain time relationship in frames', () => {
      const positions = [
        { t: 0, x: 0, y: 0 },
        { t: 2000, x: 200, y: 200 }
      ];
      
      const frames = autoZoom.interpolatePositions(positions, 2000, 30);
      
      expect(frames[0].time).toBe(0);
      expect(frames[frames.length - 1].time).toBeCloseTo((frames.length - 1) / 30 * 1000);
    });
  });

  describe('interpolateAt', () => {
    it('should return first position for empty array', () => {
      const result = autoZoom.interpolateAt([], 500);
      
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return single position for array with one element', () => {
      const result = autoZoom.interpolateAt([{ t: 0, x: 100, y: 200 }], 500);
      
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should interpolate between two positions', () => {
      const positions = [
        { t: 0, x: 0, y: 0 },
        { t: 1000, x: 100, y: 100 }
      ];
      
      const result = autoZoom.interpolateAt(positions, 500);
      
      expect(result.x).toBeCloseTo(50);
      expect(result.y).toBeCloseTo(50);
    });

    it('should clamp to last position beyond time range', () => {
      const positions = [
        { t: 0, x: 0, y: 0 },
        { t: 1000, x: 100, y: 100 }
      ];
      
      const result = autoZoom.interpolateAt(positions, 2000);
      
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });

  describe('detectFocusPoints', () => {
    it('should return empty array for insufficient positions', () => {
      const cursorData = { positions: [{ t: 0, x: 0, y: 0 }], clicks: [] };
      const points = autoZoom.detectFocusPoints(cursorData);
      
      expect(points).toEqual([]);
    });

    it('should include clicks as high importance focus points', () => {
      const cursorData = {
        positions: [
          { t: 0, x: 0, y: 0 },
          { t: 1000, x: 100, y: 100 }
        ],
        clicks: [{ t: 500, x: 50, y: 50 }]
      };
      
      const points = autoZoom.detectFocusPoints(cursorData);
      const clickPoint = points.find(p => p.reason === 'click');
      
      expect(clickPoint).toBeDefined();
      expect(clickPoint.importance).toBe('high');
    });
  });

  describe('detectHoverPauses', () => {
    it('should detect when cursor stays in same area', () => {
      const positions = [
        { t: 0, x: 100, y: 100 },
        { t: 200, x: 105, y: 102 },
        { t: 400, x: 103, y: 98 },
        { t: 600, x: 101, y: 100 },
        { t: 1000, x: 100, y: 100 }
      ];
      
      const pauses = autoZoom.detectHoverPauses(positions, { 
        minDuration: 500, 
        maxRadius: 50 
      });
      
      expect(pauses.length).toBeGreaterThanOrEqual(1);
    });

    it('should not detect pause for fast cursor movement', () => {
      const positions = [
        { t: 0, x: 0, y: 0 },
        { t: 100, x: 200, y: 200 },
        { t: 200, x: 400, y: 400 },
        { t: 300, x: 600, y: 600 }
      ];
      
      const pauses = autoZoom.detectHoverPauses(positions, { 
        minDuration: 500, 
        maxRadius: 50 
      });
      
      expect(pauses).toHaveLength(0);
    });
  });
});
