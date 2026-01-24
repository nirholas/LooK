/**
 * LooK Effects Library
 * 
 * Professional visual and audio effects ported from Aqua Screen Recorder
 * 
 * @module effects
 */

// Visual Effects
export { CursorEffectsEngine, DEFAULT_CURSOR_EFFECTS_CONFIG } from './cursor-effects-engine.js';
export { MotionBlurEngine, DEFAULT_MOTION_BLUR_CONFIG } from './motion-blur-engine.js';

// Audio Effects
export { AutoDuckingEngine, DEFAULT_AUTO_DUCKING_CONFIG } from './auto-ducking.js';
export { NoiseReductionEngine, DEFAULT_NOISE_REDUCTION_CONFIG } from './noise-reduction.js';

import { CursorEffectsEngine } from './cursor-effects-engine.js';
import { MotionBlurEngine } from './motion-blur-engine.js';
import { AutoDuckingEngine } from './auto-ducking.js';
import { NoiseReductionEngine } from './noise-reduction.js';

/**
 * Create a complete effects pipeline with default settings
 * @param {Object} options - Configuration options
 * @returns {Object} Effects engines
 */
export function createEffectsPipeline(options = {}) {
  const {
    cursorEffects = {},
    motionBlur = {},
    autoDucking = {},
    noiseReduction = {},
  } = options;

  return {
    cursor: new CursorEffectsEngine(cursorEffects),
    motionBlur: new MotionBlurEngine(motionBlur),
    autoDucking: new AutoDuckingEngine(autoDucking),
    noiseReduction: new NoiseReductionEngine(noiseReduction),
  };
}

/**
 * Preset configurations for different use cases
 */
export const EFFECT_PRESETS = {
  // Professional product demos
  professional: {
    cursorEffects: {
      clickRipples: true,
      rippleColor: '#3b82f6',
      rippleDuration: 500,
      cursorTrail: false,
    },
    motionBlur: {
      enabled: true,
      intensity: 40,
      cursorOnly: true,
    },
    autoDucking: {
      enabled: true,
      threshold: -30,
      ratio: 0.3,
    },
    noiseReduction: {
      enabled: true,
      threshold: -35,
      reduction: 70,
    },
  },

  // Tutorial/educational videos
  tutorial: {
    cursorEffects: {
      clickRipples: true,
      rippleColor: '#10b981',
      rippleMaxRadius: 60,
      rippleDuration: 700,
      cursorRing: true,
      ringColor: '#fbbf24',
    },
    motionBlur: {
      enabled: false,
    },
    autoDucking: {
      enabled: true,
      threshold: -25,
      ratio: 0.2,
    },
    noiseReduction: {
      enabled: true,
      threshold: -30,
      reduction: 80,
    },
  },

  // Social media (TikTok, Instagram)
  social: {
    cursorEffects: {
      clickRipples: true,
      rippleColor: '#f43f5e',
      rippleMaxRadius: 80,
      rippleDuration: 400,
      cursorTrail: true,
      trailLength: 8,
    },
    motionBlur: {
      enabled: true,
      intensity: 60,
    },
    autoDucking: {
      enabled: false,
    },
    noiseReduction: {
      enabled: true,
      threshold: -40,
      reduction: 60,
    },
  },

  // Minimal/clean look
  minimal: {
    cursorEffects: {
      clickRipples: false,
      cursorTrail: false,
    },
    motionBlur: {
      enabled: false,
    },
    autoDucking: {
      enabled: true,
      threshold: -35,
      ratio: 0.4,
    },
    noiseReduction: {
      enabled: true,
      threshold: -45,
      reduction: 50,
    },
  },
};
