/**
 * Tests for scene-transitions.js - Professional video transitions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SceneTransitionRenderer,
  TransitionType,
  TransitionPresets
} from '../../src/v2/scene-transitions.js';

describe('TransitionType', () => {
  it('should define all transition types', () => {
    expect(TransitionType.FADE).toBe('fade');
    expect(TransitionType.BLUR).toBe('blur');
    expect(TransitionType.SLIDE_LEFT).toBe('slide-left');
    expect(TransitionType.SLIDE_RIGHT).toBe('slide-right');
    expect(TransitionType.ZOOM).toBe('zoom');
    expect(TransitionType.WIPE).toBe('wipe');
  });
});

describe('TransitionPresets', () => {
  it('should define presets for each transition type', () => {
    expect(TransitionPresets[TransitionType.FADE]).toBeDefined();
    expect(TransitionPresets[TransitionType.BLUR]).toBeDefined();
    expect(TransitionPresets[TransitionType.SLIDE_LEFT]).toBeDefined();
  });

  it('should have required properties', () => {
    Object.values(TransitionPresets).forEach(preset => {
      expect(preset).toHaveProperty('duration');
      expect(preset).toHaveProperty('easing');
    });
  });
});

describe('SceneTransitionRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new SceneTransitionRenderer({
      type: TransitionType.FADE,
      duration: 0.5
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new SceneTransitionRenderer();
      expect(r.options.type).toBe(TransitionType.FADE);
      expect(r.options.duration).toBe(0.5);
    });

    it('should accept custom options', () => {
      const r = new SceneTransitionRenderer({
        type: TransitionType.BLUR,
        duration: 1.0
      });
      expect(r.options.type).toBe(TransitionType.BLUR);
      expect(r.options.duration).toBe(1.0);
    });
  });

  describe('getFFmpegFilter', () => {
    it('should generate FFmpeg filter for fade', () => {
      const filter = renderer.getFFmpegFilter(TransitionType.FADE, 0.5);
      
      expect(filter).toContain('xfade');
      expect(filter).toContain('fade');
    });

    it('should generate FFmpeg filter for blur', () => {
      const r = new SceneTransitionRenderer({ type: TransitionType.BLUR });
      const filter = r.getFFmpegFilter(TransitionType.BLUR, 0.5);
      
      expect(filter).toContain('xfade');
    });

    it('should generate FFmpeg filter for slide', () => {
      const r = new SceneTransitionRenderer({ type: TransitionType.SLIDE_LEFT });
      const filter = r.getFFmpegFilter(TransitionType.SLIDE_LEFT, 0.5);
      
      expect(filter).toContain('xfade');
      expect(filter).toContain('slideleft');
    });

    it('should generate FFmpeg filter for zoom', () => {
      const r = new SceneTransitionRenderer({ type: TransitionType.ZOOM });
      const filter = r.getFFmpegFilter(TransitionType.ZOOM, 0.5);
      
      expect(filter).toContain('xfade');
    });

    it('should generate FFmpeg filter for wipe', () => {
      const r = new SceneTransitionRenderer({ type: TransitionType.WIPE });
      const filter = r.getFFmpegFilter(TransitionType.WIPE, 0.5);
      
      expect(filter).toContain('xfade');
      expect(filter).toContain('wipe');
    });
  });

  describe('calculateOffset', () => {
    it('should calculate transition offset based on video duration', () => {
      const offset = renderer.calculateOffset(10, 0.5);
      
      // Transition should start before the end
      expect(offset).toBe(9.5);
    });

    it('should handle short videos', () => {
      const offset = renderer.calculateOffset(1, 0.5);
      
      expect(offset).toBe(0.5);
    });
  });

  describe('buildTransitionCommand', () => {
    it('should build FFmpeg command for two clips', () => {
      const cmd = renderer.buildTransitionCommand(
        '/tmp/clip1.mp4',
        '/tmp/clip2.mp4',
        '/tmp/output.mp4',
        { offset: 5 }
      );

      expect(cmd).toContain('-i');
      expect(cmd).toContain('/tmp/clip1.mp4');
      expect(cmd).toContain('/tmp/clip2.mp4');
      expect(cmd).toContain('xfade');
    });
  });

  describe('addIntroTransition', () => {
    it('should have addIntroTransition method', () => {
      expect(typeof renderer.addIntroTransition).toBe('function');
    });
  });

  describe('addOutroTransition', () => {
    it('should have addOutroTransition method', () => {
      expect(typeof renderer.addOutroTransition).toBe('function');
    });
  });

  describe('joinWithTransitions', () => {
    it('should have joinWithTransitions method', () => {
      expect(typeof renderer.joinWithTransitions).toBe('function');
    });
  });
});
