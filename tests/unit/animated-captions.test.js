/**
 * Tests for animated-captions.js - Remotion-style animated subtitles
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnimatedCaptionsRenderer,
  CaptionStyle,
  CaptionPresets
} from '../../src/v2/animated-captions.js';

describe('CaptionStyle', () => {
  it('should define all caption styles', () => {
    expect(CaptionStyle.STANDARD).toBe('standard');
    expect(CaptionStyle.KARAOKE).toBe('karaoke');
    expect(CaptionStyle.POP).toBe('pop');
    expect(CaptionStyle.TYPEWRITER).toBe('typewriter');
    expect(CaptionStyle.FADE).toBe('fade');
  });
});

describe('CaptionPresets', () => {
  it('should define presets for each style', () => {
    expect(CaptionPresets[CaptionStyle.STANDARD]).toBeDefined();
    expect(CaptionPresets[CaptionStyle.KARAOKE]).toBeDefined();
    expect(CaptionPresets[CaptionStyle.POP]).toBeDefined();
    expect(CaptionPresets[CaptionStyle.TYPEWRITER]).toBeDefined();
  });

  it('should have required properties for each preset', () => {
    Object.values(CaptionPresets).forEach(preset => {
      expect(preset).toHaveProperty('fontFamily');
      expect(preset).toHaveProperty('fontSize');
      expect(preset).toHaveProperty('color');
      expect(preset).toHaveProperty('backgroundColor');
    });
  });
});

describe('AnimatedCaptionsRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new AnimatedCaptionsRenderer({
      style: CaptionStyle.STANDARD,
      position: 'bottom'
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new AnimatedCaptionsRenderer();
      expect(r.options.style).toBe(CaptionStyle.STANDARD);
      expect(r.options.position).toBe('bottom');
    });

    it('should accept custom style', () => {
      const r = new AnimatedCaptionsRenderer({ style: CaptionStyle.KARAOKE });
      expect(r.options.style).toBe(CaptionStyle.KARAOKE);
    });
  });

  describe('parseSRT', () => {
    it('should parse SRT format correctly', () => {
      const srt = `1
00:00:00,000 --> 00:00:02,500
Hello world

2
00:00:02,500 --> 00:00:05,000
This is a test`;

      const captions = renderer.parseSRT(srt);

      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Hello world');
      expect(captions[0].startTime).toBe(0);
      expect(captions[0].endTime).toBe(2.5);
      expect(captions[1].text).toBe('This is a test');
    });

    it('should handle multi-line captions', () => {
      const srt = `1
00:00:00,000 --> 00:00:03,000
Line one
Line two`;

      const captions = renderer.parseSRT(srt);

      expect(captions[0].text).toBe('Line one\nLine two');
    });

    it('should handle timestamps with hours', () => {
      const srt = `1
01:30:00,500 --> 01:30:05,000
Late caption`;

      const captions = renderer.parseSRT(srt);

      expect(captions[0].startTime).toBe(5400.5);
    });
  });

  describe('splitIntoWords', () => {
    it('should split caption text into words with timing', () => {
      const caption = {
        text: 'Hello beautiful world',
        startTime: 0,
        endTime: 3
      };

      const words = renderer.splitIntoWords(caption);

      expect(words).toHaveLength(3);
      expect(words[0].text).toBe('Hello');
      expect(words[1].text).toBe('beautiful');
      expect(words[2].text).toBe('world');

      // Check timing is distributed
      expect(words[0].startTime).toBe(0);
      expect(words[2].endTime).toBe(3);
    });
  });

  describe('generateKaraokeFrames', () => {
    it('should generate frames for karaoke effect', () => {
      const words = [
        { text: 'Hello', startTime: 0, endTime: 1 },
        { text: 'world', startTime: 1, endTime: 2 }
      ];

      const frames = renderer.generateKaraokeFrames(words, 30);

      expect(frames).toBeInstanceOf(Array);
      expect(frames.length).toBeGreaterThan(0);
    });
  });

  describe('generatePopFrames', () => {
    it('should generate frames for pop effect', () => {
      const words = [
        { text: 'Hello', startTime: 0, endTime: 1 },
        { text: 'world', startTime: 1, endTime: 2 }
      ];

      const frames = renderer.generatePopFrames(words, 30);

      expect(frames).toBeInstanceOf(Array);
      expect(frames.length).toBeGreaterThan(0);
    });
  });

  describe('generateTypewriterFrames', () => {
    it('should generate frames for typewriter effect', () => {
      const caption = {
        text: 'Hello',
        startTime: 0,
        endTime: 2
      };

      const frames = renderer.generateTypewriterFrames(caption, 30);

      expect(frames).toBeInstanceOf(Array);
      // Should have frame for each character
      expect(frames.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getPreset', () => {
    it('should return preset for current style', () => {
      const preset = renderer.getPreset();

      expect(preset).toHaveProperty('fontFamily');
      expect(preset).toHaveProperty('fontSize');
    });

    it('should return correct preset for style', () => {
      const karaokeRenderer = new AnimatedCaptionsRenderer({ style: CaptionStyle.KARAOKE });
      const preset = karaokeRenderer.getPreset();

      expect(preset).toEqual(CaptionPresets[CaptionStyle.KARAOKE]);
    });
  });

  describe('calculatePositionY', () => {
    it('should calculate Y position based on option', () => {
      const videoHeight = 1080;

      const bottomRenderer = new AnimatedCaptionsRenderer({ position: 'bottom' });
      const topRenderer = new AnimatedCaptionsRenderer({ position: 'top' });

      const bottomY = bottomRenderer.calculatePositionY(videoHeight);
      const topY = topRenderer.calculatePositionY(videoHeight);

      expect(bottomY).toBeGreaterThan(topY);
      expect(bottomY).toBeGreaterThan(videoHeight * 0.7);
      expect(topY).toBeLessThan(videoHeight * 0.3);
    });
  });
});
