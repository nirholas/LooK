/**
 * MotionBlurEngine - Cinematic motion blur for cursor and video frames
 * Ported from Aqua Screen Recorder with adaptations for LooK
 * 
 * Applies velocity-based directional blur for professional-looking motion
 */

/**
 * @typedef {Object} MotionBlurConfig
 * @property {boolean} enabled - Enable motion blur
 * @property {number} intensity - Blur intensity (0-100)
 * @property {number} samples - Number of blur samples (higher = smoother but slower)
 * @property {number} velocityThreshold - Minimum velocity to trigger blur (px/ms)
 * @property {boolean} cursorOnly - Apply blur to cursor only or entire frame
 * @property {boolean} applyToZoom - Apply blur during zoom transitions
 */

/**
 * @typedef {Object} VelocityVector
 * @property {number} x - X velocity component
 * @property {number} y - Y velocity component
 * @property {number} magnitude - Speed magnitude
 * @property {number} angle - Direction angle in radians
 */

export const DEFAULT_MOTION_BLUR_CONFIG = {
  enabled: true,
  intensity: 50,
  samples: 8,
  velocityThreshold: 0.5,
  cursorOnly: false,
  applyToZoom: true,
};

/**
 * Engine for applying cinematic motion blur to cursor and video frames
 * Uses velocity-based directional blur for realistic motion
 */
export class MotionBlurEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_MOTION_BLUR_CONFIG, ...config };
    this.velocityCache = new Map();
    this.lastPosition = null;
    this.lastTimestamp = 0;
  }

  /**
   * Update configuration
   * @param {Partial<MotionBlurConfig>} config
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns {MotionBlurConfig}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Calculate velocity vector from two positions
   * @param {Object} pos1 - First position {x, y, timestamp}
   * @param {Object} pos2 - Second position {x, y, timestamp}
   * @param {number} canvasWidth - Canvas width for scaling
   * @param {number} canvasHeight - Canvas height for scaling
   * @returns {VelocityVector}
   */
  calculateVelocity(pos1, pos2, canvasWidth = 1920, canvasHeight = 1080) {
    const dt = pos2.timestamp - pos1.timestamp;
    if (dt === 0) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    // Calculate pixel displacement
    const dx = (pos2.x - pos1.x) * canvasWidth;
    const dy = (pos2.y - pos1.y) * canvasHeight;

    // Calculate velocity (pixels per millisecond)
    const vx = dx / dt;
    const vy = dy / dt;

    // Calculate magnitude and angle
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx);

    return { x: vx, y: vy, magnitude, angle };
  }

  /**
   * Process cursor position and update velocity
   * @param {number} x - Normalized X position (0-1)
   * @param {number} y - Normalized Y position (0-1)
   * @param {number} timestamp - Current timestamp in ms
   * @returns {VelocityVector|null}
   */
  processPosition(x, y, timestamp) {
    const currentPosition = { x, y, timestamp };

    if (this.lastPosition) {
      const velocity = this.calculateVelocity(this.lastPosition, currentPosition);
      this.velocityCache.set(timestamp, velocity);
      this.lastPosition = currentPosition;
      return velocity;
    }

    this.lastPosition = currentPosition;
    return null;
  }

  /**
   * Get blur parameters based on velocity
   * @param {VelocityVector} velocity
   * @returns {Object} Blur parameters {blurX, blurY, shouldBlur}
   */
  getBlurParams(velocity) {
    if (!this.config.enabled || velocity.magnitude < this.config.velocityThreshold) {
      return { blurX: 0, blurY: 0, shouldBlur: false };
    }

    // Scale blur based on intensity and velocity
    const scaleFactor = (this.config.intensity / 100) * 20;
    const blurAmount = Math.min(velocity.magnitude * scaleFactor, 30);

    // Directional blur based on velocity angle
    const blurX = Math.abs(Math.cos(velocity.angle)) * blurAmount;
    const blurY = Math.abs(Math.sin(velocity.angle)) * blurAmount;

    return {
      blurX: Math.round(blurX * 10) / 10,
      blurY: Math.round(blurY * 10) / 10,
      shouldBlur: true,
      angle: velocity.angle,
      magnitude: velocity.magnitude,
    };
  }

  /**
   * Generate FFmpeg filter for motion blur effect
   * @param {Array} positions - Array of {x, y, t} cursor positions
   * @param {number} fps - Video framerate
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {string} FFmpeg filter string
   */
  generateFFmpegFilter(positions, fps, width, height) {
    if (!this.config.enabled || !positions || positions.length < 2) {
      return '';
    }

    // Calculate velocities for each position
    const velocities = [];
    for (let i = 1; i < positions.length; i++) {
      const pos1 = { x: positions[i-1].x / width, y: positions[i-1].y / height, timestamp: positions[i-1].t };
      const pos2 = { x: positions[i].x / width, y: positions[i].y / height, timestamp: positions[i].t };
      const velocity = this.calculateVelocity(pos1, pos2, width, height);
      velocities.push({ ...velocity, timestamp: positions[i].t, frame: Math.floor(positions[i].t / 1000 * fps) });
    }

    // Find high-velocity segments for blur
    const blurSegments = [];
    let currentSegment = null;

    for (const v of velocities) {
      const params = this.getBlurParams(v);
      
      if (params.shouldBlur) {
        if (!currentSegment) {
          currentSegment = { startFrame: v.frame, endFrame: v.frame, maxBlur: params.blurX };
        } else {
          currentSegment.endFrame = v.frame;
          currentSegment.maxBlur = Math.max(currentSegment.maxBlur, params.blurX);
        }
      } else if (currentSegment) {
        blurSegments.push(currentSegment);
        currentSegment = null;
      }
    }

    if (currentSegment) {
      blurSegments.push(currentSegment);
    }

    // Generate blur filters for segments
    if (blurSegments.length === 0) {
      return '';
    }

    // Use boxblur for motion blur approximation
    // For true directional blur, would need more complex filter chains
    const filters = blurSegments.map(segment => {
      const blur = Math.min(Math.round(segment.maxBlur), 10);
      return `boxblur=luma_radius=${blur}:luma_power=1:enable='between(n,${segment.startFrame},${segment.endFrame})'`;
    });

    return filters.join(',');
  }

  /**
   * Generate cursor trail with motion blur effect
   * Returns positions with opacity based on velocity
   * @param {Array} positions - Recent cursor positions
   * @param {number} currentTime - Current time in ms
   * @param {number} trailLength - Number of trail points
   * @returns {Array} Trail points with blur/opacity
   */
  generateBlurredTrail(positions, currentTime, trailLength = 8) {
    if (!this.config.enabled || positions.length < 2) {
      return positions.slice(-trailLength);
    }

    const trail = [];
    const recentPositions = positions.slice(-trailLength - 1);

    for (let i = 1; i < recentPositions.length; i++) {
      const pos1 = recentPositions[i - 1];
      const pos2 = recentPositions[i];
      
      const velocity = this.calculateVelocity(
        { x: pos1.x, y: pos1.y, timestamp: pos1.t || pos1.timestamp },
        { x: pos2.x, y: pos2.y, timestamp: pos2.t || pos2.timestamp }
      );

      const blurParams = this.getBlurParams(velocity);
      const age = currentTime - (pos2.t || pos2.timestamp);
      const fadeProgress = Math.min(1, age / 300);

      trail.push({
        x: pos2.x,
        y: pos2.y,
        timestamp: pos2.t || pos2.timestamp,
        opacity: (1 - fadeProgress) * (blurParams.shouldBlur ? 0.7 : 0.5),
        blur: blurParams.shouldBlur ? blurParams.blurX : 0,
        scale: blurParams.shouldBlur ? 1 + (velocity.magnitude * 0.01) : 1,
      });
    }

    return trail;
  }

  /**
   * Apply motion blur to zoom transitions
   * @param {Object} zoomTransition - Zoom transition data
   * @returns {Object} Blur parameters for zoom
   */
  getZoomBlurParams(zoomTransition) {
    if (!this.config.enabled || !this.config.applyToZoom) {
      return { blur: 0, shouldBlur: false };
    }

    const { startScale, endScale, progress } = zoomTransition;
    const scaleChange = Math.abs(endScale - startScale);
    
    // Apply blur during zoom based on scale change and progress
    // Blur is strongest in the middle of the transition
    const blurCurve = Math.sin(progress * Math.PI);
    const blurAmount = scaleChange * blurCurve * (this.config.intensity / 100) * 5;

    return {
      blur: Math.round(blurAmount * 10) / 10,
      shouldBlur: blurAmount > 0.5,
    };
  }

  /**
   * Clear velocity cache
   */
  clear() {
    this.velocityCache.clear();
    this.lastPosition = null;
    this.lastTimestamp = 0;
  }

  /**
   * Get cached velocity for a timestamp
   * @param {number} timestamp
   * @returns {VelocityVector|null}
   */
  getVelocityAt(timestamp) {
    return this.velocityCache.get(timestamp) || null;
  }
}

export default MotionBlurEngine;
