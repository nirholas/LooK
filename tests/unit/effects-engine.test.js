import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CursorEffectsEngine, 
  DEFAULT_CURSOR_EFFECTS_CONFIG 
} from '../../src/v2/effects/cursor-effects-engine.js';
import { 
  MotionBlurEngine, 
  DEFAULT_MOTION_BLUR_CONFIG 
} from '../../src/v2/effects/motion-blur-engine.js';
import { 
  AutoDuckingEngine, 
  DEFAULT_AUTO_DUCKING_CONFIG 
} from '../../src/v2/effects/auto-ducking.js';
import { 
  NoiseReductionEngine, 
  DEFAULT_NOISE_REDUCTION_CONFIG 
} from '../../src/v2/effects/noise-reduction.js';

describe('CursorEffectsEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new CursorEffectsEngine();
  });

  it('should initialize with default config', () => {
    const config = engine.getConfig();
    expect(config.clickRipples).toBe(true);
    expect(config.rippleColor).toBe('#3b82f6');
    expect(config.rippleDuration).toBe(600);
  });

  it('should accept custom config', () => {
    const custom = new CursorEffectsEngine({
      rippleColor: '#ff0000',
      rippleMaxRadius: 100,
    });
    const config = custom.getConfig();
    expect(config.rippleColor).toBe('#ff0000');
    expect(config.rippleMaxRadius).toBe(100);
  });

  it('should process click events and generate ripple effects', () => {
    const event = { x: 0.5, y: 0.5, action: 'click', button: 0, timestamp: 1000 };
    const effects = engine.processEvent(event, 1000);
    
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('ripple');
    expect(effects[0].x).toBe(0.5);
    expect(effects[0].y).toBe(0.5);
  });

  it('should track cursor trail when enabled', () => {
    engine.updateConfig({ cursorTrail: true });
    
    // Simulate mouse movement
    engine.processEvent({ x: 0.1, y: 0.1, action: 'move', timestamp: 100 }, 100);
    engine.processEvent({ x: 0.2, y: 0.2, action: 'move', timestamp: 200 }, 200);
    engine.processEvent({ x: 0.3, y: 0.3, action: 'move', timestamp: 300 }, 300);
    
    const trail = engine.getTrailPoints(300);
    expect(trail.length).toBeGreaterThan(0);
  });

  it('should generate FFmpeg filter for clicks', () => {
    const clicks = [
      { x: 100, y: 200, t: 1000 },
      { x: 300, y: 400, t: 2000 },
    ];
    const filter = engine.generateFFmpegFilter(clicks, 30, 1920, 1080);
    
    expect(filter).toContain('drawbox');
    expect(filter).toContain('enable=');
  });

  it('should expire effects after duration', () => {
    const event = { x: 0.5, y: 0.5, action: 'click', button: 0, timestamp: 0 };
    engine.processEvent(event, 0);
    
    // Get effects after expiration
    const activeEffects = engine.getActiveEffects(1000); // After 1 second (600ms duration)
    expect(activeEffects).toHaveLength(0);
  });
});

describe('MotionBlurEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MotionBlurEngine();
  });

  it('should initialize with default config', () => {
    const config = engine.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.intensity).toBe(50);
    expect(config.velocityThreshold).toBe(0.5);
  });

  it('should calculate velocity between positions', () => {
    const pos1 = { x: 0, y: 0, timestamp: 0 };
    const pos2 = { x: 0.1, y: 0.1, timestamp: 100 };
    
    const velocity = engine.calculateVelocity(pos1, pos2, 1920, 1080);
    
    expect(velocity.magnitude).toBeGreaterThan(0);
    expect(velocity.angle).toBeDefined();
  });

  it('should return zero velocity for same position', () => {
    const pos1 = { x: 0.5, y: 0.5, timestamp: 0 };
    const pos2 = { x: 0.5, y: 0.5, timestamp: 100 };
    
    const velocity = engine.calculateVelocity(pos1, pos2);
    
    expect(velocity.magnitude).toBe(0);
  });

  it('should not blur below velocity threshold', () => {
    const slowVelocity = { x: 0.001, y: 0.001, magnitude: 0.1, angle: 0 };
    const params = engine.getBlurParams(slowVelocity);
    
    expect(params.shouldBlur).toBe(false);
  });

  it('should blur above velocity threshold', () => {
    const fastVelocity = { x: 1, y: 1, magnitude: 2, angle: Math.PI / 4 };
    const params = engine.getBlurParams(fastVelocity);
    
    expect(params.shouldBlur).toBe(true);
    expect(params.blurX).toBeGreaterThan(0);
  });

  it('should generate blurred trail', () => {
    const positions = [
      { x: 0.1, y: 0.1, t: 0 },
      { x: 0.3, y: 0.3, t: 50 },
      { x: 0.5, y: 0.5, t: 100 },
    ];
    
    const trail = engine.generateBlurredTrail(positions, 150, 3);
    
    expect(trail.length).toBeGreaterThan(0);
    trail.forEach(point => {
      expect(point.opacity).toBeDefined();
      expect(point.blur).toBeDefined();
    });
  });
});

describe('AutoDuckingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AutoDuckingEngine();
  });

  it('should initialize with default config', () => {
    const config = engine.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.threshold).toBe(-30);
    expect(config.ratio).toBe(0.3);
  });

  it('should detect voice above threshold', () => {
    // RMS of ~0.1 is roughly -20dB, above -30dB threshold
    const event = engine.analyzeLevel(0.1, 1000);
    
    expect(event).not.toBeNull();
    expect(event.type).toBe('duck');
    expect(engine.isDucking()).toBe(true);
  });

  it('should not detect voice below threshold', () => {
    // RMS of ~0.001 is roughly -60dB, below -30dB threshold
    const event = engine.analyzeLevel(0.001, 1000);
    
    // No event on first call (no state change from initial false)
    expect(engine.isDucking()).toBe(false);
  });

  it('should emit unduck event when voice stops', () => {
    // First, detect voice
    engine.analyzeLevel(0.1, 1000);
    expect(engine.isDucking()).toBe(true);
    
    // Then voice stops
    const event = engine.analyzeLevel(0.001, 2000);
    
    expect(event).not.toBeNull();
    expect(event.type).toBe('unduck');
    expect(engine.isDucking()).toBe(false);
  });

  it('should return interpolated gain during transition', () => {
    // Trigger ducking
    engine.analyzeLevel(0.1, 1000);
    
    // Get gain during attack transition
    const gainMid = engine.getGainAt(1050); // 50ms into 100ms attack
    
    expect(gainMid).toBeLessThan(1.0);
    expect(gainMid).toBeGreaterThan(0.3);
  });

  it('should generate FFmpeg volume expression', () => {
    engine.analyzeLevel(0.1, 1000);
    engine.analyzeLevel(0.001, 2000);
    
    const filter = engine.generateFFmpegFilter(10);
    
    expect(filter).toContain('volume=');
  });
});

describe('NoiseReductionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new NoiseReductionEngine();
  });

  it('should initialize with default config', () => {
    const config = engine.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.threshold).toBe(-40);
    expect(config.reduction).toBe(80);
  });

  it('should generate FFmpeg filter', () => {
    const filter = engine.generateFFmpegFilter();
    
    expect(filter).toContain('highpass');
    expect(filter).toContain('lowpass');
    expect(filter).toContain('compand');
  });

  it('should generate full cleanup filter chain', () => {
    const filter = engine.generateFullCleanupFilter({
      normalize: true,
      declick: true,
    });
    
    expect(filter).toContain('adeclick');
    expect(filter).toContain('loudnorm');
  });

  it('should not have noise profile initially', () => {
    expect(engine.hasNoiseProfile()).toBe(false);
  });

  it('should learn noise profile from samples', () => {
    // Create fake noise samples
    const samples = new Float32Array(4096);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (Math.random() - 0.5) * 0.01; // Low-level noise
    }
    
    const profile = engine.learnNoiseProfile(samples, 44100);
    
    expect(engine.hasNoiseProfile()).toBe(true);
    expect(profile.threshold).toBeDefined();
    expect(profile.sampleRate).toBe(44100);
  });

  it('should apply noise gate to samples', () => {
    const samples = new Float32Array(1000);
    
    // Create signal with alternating loud and quiet sections
    for (let i = 0; i < samples.length; i++) {
      if (i < 500) {
        samples[i] = Math.sin(i * 0.1) * 0.5; // Loud signal
      } else {
        samples[i] = (Math.random() - 0.5) * 0.01; // Quiet noise
      }
    }
    
    const output = engine.applyNoiseGate(samples, 44100);
    
    expect(output.length).toBe(samples.length);
    
    // Quiet section should be reduced
    const quietRMS = Math.sqrt(
      output.slice(800, 900).reduce((sum, s) => sum + s * s, 0) / 100
    );
    const loudRMS = Math.sqrt(
      output.slice(100, 200).reduce((sum, s) => sum + s * s, 0) / 100
    );
    
    expect(loudRMS).toBeGreaterThan(quietRMS);
  });

  it('should return original samples when disabled', () => {
    engine.updateConfig({ enabled: false });
    
    const samples = new Float32Array([0.1, 0.2, 0.3]);
    const output = engine.applyNoiseGate(samples, 44100);
    
    expect(output).toEqual(samples);
  });
});

describe('Effect Presets', () => {
  it('should create professional preset engines', async () => {
    const { EFFECT_PRESETS } = await import('../../src/v2/effects/index.js');
    
    expect(EFFECT_PRESETS.professional).toBeDefined();
    expect(EFFECT_PRESETS.professional.cursorEffects.clickRipples).toBe(true);
    expect(EFFECT_PRESETS.professional.motionBlur.enabled).toBe(true);
  });

  it('should create tutorial preset engines', async () => {
    const { EFFECT_PRESETS } = await import('../../src/v2/effects/index.js');
    
    expect(EFFECT_PRESETS.tutorial).toBeDefined();
    expect(EFFECT_PRESETS.tutorial.cursorEffects.cursorRing).toBe(true);
    expect(EFFECT_PRESETS.tutorial.motionBlur.enabled).toBe(false);
  });
});
