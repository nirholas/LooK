/**
 * CursorEffectsEngine - Advanced cursor visual effects
 * Ported from Aqua Screen Recorder with adaptations for LooK
 * 
 * Features:
 * - Click ripple animations
 * - Cursor trails
 * - Cursor glow/ring
 * - Auto-hide after inactivity
 * - Velocity-based effects
 */

/**
 * @typedef {Object} CursorEffect
 * @property {string} id - Unique effect ID
 * @property {'click'|'ripple'|'trail'|'glow'} type - Effect type
 * @property {number} x - X position (normalized 0-1 or pixels)
 * @property {number} y - Y position
 * @property {number} timestamp - When effect was triggered
 * @property {number} duration - Effect duration in ms
 * @property {Object} [params] - Additional parameters
 */

/**
 * @typedef {Object} CursorTrailPoint
 * @property {number} x
 * @property {number} y
 * @property {number} timestamp
 * @property {number} opacity
 */

/**
 * @typedef {Object} CursorEffectsConfig
 * @property {boolean} clickRipples - Enable click ripple effects
 * @property {string} rippleColor - Click ripple color
 * @property {number} rippleMaxRadius - Click ripple max radius (px)
 * @property {number} rippleDuration - Click ripple duration (ms)
 * @property {boolean} cursorTrail - Enable cursor trail
 * @property {number} trailLength - Trail length (number of points)
 * @property {number} trailFadeDuration - Trail fade duration (ms)
 * @property {string} trailColor - Trail color
 * @property {number} cursorSize - Cursor size multiplier
 * @property {boolean} cursorRing - Cursor ring enabled
 * @property {string} ringColor - Cursor ring color
 * @property {number} autoHideDelay - Auto-hide cursor after inactivity (ms)
 * @property {boolean} autoHideEnabled - Enable auto-hide
 */

export const DEFAULT_CURSOR_EFFECTS_CONFIG = {
  clickRipples: true,
  rippleColor: '#3b82f6',
  rippleMaxRadius: 50,
  rippleDuration: 600,
  
  cursorTrail: false,
  trailLength: 10,
  trailFadeDuration: 300,
  trailColor: '#ffffff',
  
  cursorSize: 1.0,
  cursorRing: false,
  ringColor: '#fbbf24',
  
  autoHideDelay: 2000,
  autoHideEnabled: false,
};

/**
 * Engine for managing cursor visual effects during recording and playback
 */
export class CursorEffectsEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CURSOR_EFFECTS_CONFIG, ...config };
    this.activeEffects = [];
    this.trailPoints = [];
    this.lastMoveTimestamp = 0;
    this.cursorHidden = false;
  }

  /**
   * Update configuration
   * @param {Partial<CursorEffectsConfig>} config
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns {CursorEffectsConfig}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Process a mouse event and generate effects
   * @param {Object} event - Mouse event data {x, y, action, button, timestamp}
   * @param {number} currentTime - Current playback time in ms
   * @returns {CursorEffect[]} - Array of new effects to render
   */
  processEvent(event, currentTime) {
    const newEffects = [];

    // Update last move time for auto-hide
    if (event.action === 'move' || event.action === 'drag') {
      this.lastMoveTimestamp = currentTime;
      this.cursorHidden = false;

      // Add trail point if enabled
      if (this.config.cursorTrail) {
        this.addTrailPoint(event.x, event.y, currentTime);
      }
    }

    // Generate click ripple
    if (event.action === 'click' && this.config.clickRipples) {
      const ripple = this.createClickRipple(event.x, event.y, event.button, currentTime);
      newEffects.push(ripple);
      this.activeEffects.push(ripple);
    }

    // Check auto-hide
    if (this.config.autoHideEnabled) {
      const timeSinceMove = currentTime - this.lastMoveTimestamp;
      if (timeSinceMove > this.config.autoHideDelay) {
        this.cursorHidden = true;
      }
    }

    return newEffects;
  }

  /**
   * Create a click ripple effect
   * @param {number} x
   * @param {number} y
   * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
   * @param {number} timestamp
   * @returns {CursorEffect}
   */
  createClickRipple(x, y, button, timestamp) {
    return {
      id: `ripple_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ripple',
      x,
      y,
      timestamp,
      duration: this.config.rippleDuration,
      params: {
        maxRadius: this.config.rippleMaxRadius,
        color: this.config.rippleColor,
        opacity: button === 0 ? 0.6 : 0.4, // Left click more visible
        button,
      },
    };
  }

  /**
   * Add a point to the cursor trail
   * @param {number} x
   * @param {number} y
   * @param {number} timestamp
   */
  addTrailPoint(x, y, timestamp) {
    this.trailPoints.push({
      x,
      y,
      timestamp,
      opacity: 1.0,
    });

    // Limit trail length
    while (this.trailPoints.length > this.config.trailLength) {
      this.trailPoints.shift();
    }
  }

  /**
   * Get current trail points with faded opacity
   * @param {number} currentTime
   * @returns {CursorTrailPoint[]}
   */
  getTrailPoints(currentTime) {
    return this.trailPoints.map((point, index) => {
      const age = currentTime - point.timestamp;
      const fadeProgress = Math.min(1, age / this.config.trailFadeDuration);
      const positionFade = index / this.trailPoints.length;
      
      return {
        ...point,
        opacity: Math.max(0, (1 - fadeProgress) * positionFade * 0.8),
      };
    }).filter(p => p.opacity > 0.01);
  }

  /**
   * Get active effects that should be rendered at current time
   * @param {number} currentTime
   * @returns {CursorEffect[]}
   */
  getActiveEffects(currentTime) {
    // Remove expired effects
    this.activeEffects = this.activeEffects.filter(effect => {
      const elapsed = currentTime - effect.timestamp;
      return elapsed < effect.duration;
    });

    // Calculate progress for each effect
    return this.activeEffects.map(effect => {
      const elapsed = currentTime - effect.timestamp;
      const progress = Math.min(1, elapsed / effect.duration);
      
      return {
        ...effect,
        progress,
        // Eased progress for smooth animation
        easedProgress: this.easeOutCubic(progress),
      };
    });
  }

  /**
   * Check if cursor should be visible
   * @param {number} currentTime
   * @returns {boolean}
   */
  isCursorVisible(currentTime) {
    if (!this.config.autoHideEnabled) return true;
    return !this.cursorHidden;
  }

  /**
   * Generate FFmpeg filter for click ripple effects
   * @param {Array} clicks - Array of {x, y, t} click events
   * @param {number} fps - Video framerate
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {string} FFmpeg filter string
   */
  generateFFmpegFilter(clicks, fps, width, height) {
    if (!clicks || clicks.length === 0 || !this.config.clickRipples) {
      return '';
    }

    const filters = [];
    const { rippleColor, rippleMaxRadius, rippleDuration } = this.config;
    const framesPerEffect = Math.ceil(rippleDuration / 1000 * fps);

    // Parse color
    const colorMatch = rippleColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    const hexColor = colorMatch 
      ? `${colorMatch[1]}${colorMatch[2]}${colorMatch[3]}`
      : '3b82f6';

    clicks.forEach((click, idx) => {
      const startFrame = Math.floor(click.t / 1000 * fps);
      const cx = Math.round(click.x);
      const cy = Math.round(click.y);

      // Create expanding ripple rings
      for (let ring = 0; ring < 3; ring++) {
        const ringDelay = Math.floor(ring * framesPerEffect / 4);
        const ringStart = startFrame + ringDelay;
        const ringEnd = startFrame + framesPerEffect;
        
        const ringSize = Math.round(rippleMaxRadius * (0.3 + ring * 0.35));
        const ringOpacity = (0.5 - ring * 0.15).toFixed(2);
        
        // Draw ring as hollow box (approximation)
        filters.push(
          `drawbox=x=${cx - ringSize}:y=${cy - ringSize}:w=${ringSize * 2}:h=${ringSize * 2}:` +
          `c=0x${hexColor}@${ringOpacity}:t=3:` +
          `enable='between(n,${ringStart},${ringEnd})'`
        );
      }

      // Center flash
      filters.push(
        `drawbox=x=${cx - 6}:y=${cy - 6}:w=12:h=12:` +
        `c=0x${hexColor}@0.8:t=fill:` +
        `enable='between(n,${startFrame},${startFrame + Math.floor(framesPerEffect/4)})'`
      );
    });

    return filters.join(',');
  }

  /**
   * Generate SVG for a single ripple effect (for high-quality rendering)
   * @param {CursorEffect} effect
   * @param {number} size - Canvas size
   * @returns {string} SVG string
   */
  generateRippleSVG(effect, size = 120) {
    const { progress, easedProgress, params } = effect;
    const { maxRadius, color, opacity } = params;
    
    const currentRadius = easedProgress * maxRadius;
    const currentOpacity = opacity * (1 - progress);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="rippleGradient">
          <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
          <stop offset="70%" stop-color="${color}" stop-opacity="${currentOpacity}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${currentRadius}" fill="none" stroke="${color}" 
              stroke-width="3" stroke-opacity="${currentOpacity}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${currentRadius * 0.6}" fill="none" stroke="${color}" 
              stroke-width="2" stroke-opacity="${currentOpacity * 0.6}"/>
    </svg>`;
  }

  /**
   * Cubic ease-out function
   * @param {number} t - Progress 0-1
   * @returns {number}
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Clear all effects and trails
   */
  clear() {
    this.activeEffects = [];
    this.trailPoints = [];
    this.cursorHidden = false;
    this.lastMoveTimestamp = 0;
  }
}

export default CursorEffectsEngine;
