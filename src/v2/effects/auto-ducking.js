/**
 * AutoDucking - Automatically reduce background music volume during speech
 * Ported from Aqua Screen Recorder with adaptations for LooK
 * 
 * Detects voice activity and smoothly reduces music track volume
 */

/**
 * @typedef {Object} AutoDuckingConfig
 * @property {boolean} enabled - Enable auto-ducking
 * @property {number} threshold - Voice detection threshold in dB (-60 to 0)
 * @property {number} ratio - Volume reduction ratio (0.1 to 1, where 0.5 = -6dB)
 * @property {number} attack - Attack time in ms (0-1000)
 * @property {number} release - Release time in ms (0-3000)
 * @property {string[]} targetTracks - Track IDs to duck
 */

/**
 * @typedef {Object} DuckingEvent
 * @property {'duck'|'unduck'} type
 * @property {number} timestamp
 * @property {number} gain
 */

export const DEFAULT_AUTO_DUCKING_CONFIG = {
  enabled: true,
  threshold: -30, // dB
  ratio: 0.3, // Reduce to 30% during speech
  attack: 100, // ms
  release: 500, // ms
  targetTracks: ['music', 'background'],
};

/**
 * Auto-ducking engine for managing audio levels
 */
export class AutoDuckingEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_AUTO_DUCKING_CONFIG, ...config };
    this.voiceDetected = false;
    this.currentGain = 1.0;
    this.duckingEvents = [];
    this.lastAnalysis = null;
  }

  /**
   * Update configuration
   * @param {Partial<AutoDuckingConfig>} config
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns {AutoDuckingConfig}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Analyze audio level and determine if voice is present
   * @param {number} rmsLevel - RMS level (0-1)
   * @param {number} timestamp - Current timestamp in ms
   * @returns {DuckingEvent|null}
   */
  analyzeLevel(rmsLevel, timestamp) {
    if (!this.config.enabled) return null;

    // Convert RMS to dB
    const dbLevel = 20 * Math.log10(rmsLevel || 0.0001);
    
    const wasVoiceDetected = this.voiceDetected;
    this.voiceDetected = dbLevel > this.config.threshold;

    // Only emit event on state change
    if (this.voiceDetected !== wasVoiceDetected) {
      const targetGain = this.voiceDetected ? this.config.ratio : 1.0;
      const event = {
        type: this.voiceDetected ? 'duck' : 'unduck',
        timestamp,
        gain: targetGain,
        transitionTime: this.voiceDetected ? this.config.attack : this.config.release,
      };
      
      this.duckingEvents.push(event);
      this.currentGain = targetGain;
      return event;
    }

    return null;
  }

  /**
   * Process audio samples and return ducking events
   * @param {Float32Array} samples - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} startTime - Start time in ms
   * @returns {DuckingEvent[]}
   */
  processSamples(samples, sampleRate, startTime) {
    if (!this.config.enabled) return [];

    const events = [];
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const windowCount = Math.floor(samples.length / windowSize);

    for (let i = 0; i < windowCount; i++) {
      const windowStart = i * windowSize;
      const windowEnd = windowStart + windowSize;
      const window = samples.slice(windowStart, windowEnd);

      // Calculate RMS for window
      let sum = 0;
      for (let j = 0; j < window.length; j++) {
        sum += window[j] * window[j];
      }
      const rms = Math.sqrt(sum / window.length);

      const timestamp = startTime + (i * 50); // 50ms per window
      const event = this.analyzeLevel(rms, timestamp);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Get gain value at a specific time with interpolation
   * @param {number} timestamp - Time in ms
   * @returns {number} Gain value (0-1)
   */
  getGainAt(timestamp) {
    if (!this.config.enabled || this.duckingEvents.length === 0) {
      return 1.0;
    }

    // Find the most recent event before this timestamp
    let currentGain = 1.0;
    let lastEvent = null;

    for (const event of this.duckingEvents) {
      if (event.timestamp <= timestamp) {
        lastEvent = event;
      } else {
        break;
      }
    }

    if (!lastEvent) {
      return 1.0;
    }

    // Calculate interpolated gain if within transition
    const elapsed = timestamp - lastEvent.timestamp;
    const transitionTime = lastEvent.transitionTime;

    if (elapsed >= transitionTime) {
      return lastEvent.gain;
    }

    // Linear interpolation during transition
    const previousGain = lastEvent.type === 'duck' ? 1.0 : this.config.ratio;
    const targetGain = lastEvent.gain;
    const progress = elapsed / transitionTime;

    // Use ease-out for natural sound
    const easedProgress = 1 - Math.pow(1 - progress, 2);
    return previousGain + (targetGain - previousGain) * easedProgress;
  }

  /**
   * Generate FFmpeg filter for auto-ducking
   * @param {number} duration - Total duration in seconds
   * @returns {string} FFmpeg filter string
   */
  generateFFmpegFilter(duration) {
    if (!this.config.enabled || this.duckingEvents.length === 0) {
      return '';
    }

    // Generate volume keyframes
    const keyframes = [];
    let lastGain = 1.0;

    for (const event of this.duckingEvents) {
      const timeSeconds = event.timestamp / 1000;
      const transitionSeconds = event.transitionTime / 1000;

      // Start of transition
      keyframes.push(`${timeSeconds.toFixed(3)}:${lastGain.toFixed(2)}`);
      
      // End of transition
      keyframes.push(`${(timeSeconds + transitionSeconds).toFixed(3)}:${event.gain.toFixed(2)}`);
      
      lastGain = event.gain;
    }

    if (keyframes.length === 0) {
      return '';
    }

    // Format: volume='if(between(t,0,1),1,if(between(t,1,1.5),0.3,...
    // Simpler approach: use volume with expression
    return `volume='${this.generateVolumeExpression()}'`;
  }

  /**
   * Generate FFmpeg volume expression
   * @returns {string}
   */
  generateVolumeExpression() {
    if (this.duckingEvents.length === 0) {
      return '1';
    }

    const parts = [];
    let lastTime = 0;
    let lastGain = 1.0;

    for (let i = 0; i < this.duckingEvents.length; i++) {
      const event = this.duckingEvents[i];
      const startTime = event.timestamp / 1000;
      const transitionTime = event.transitionTime / 1000;
      const endTime = startTime + transitionTime;

      // Before transition
      if (startTime > lastTime) {
        parts.push(`if(between(t,${lastTime.toFixed(3)},${startTime.toFixed(3)}),${lastGain.toFixed(2)}`);
      }

      // During transition (linear interpolation)
      const gainDiff = event.gain - lastGain;
      parts.push(
        `if(between(t,${startTime.toFixed(3)},${endTime.toFixed(3)}),` +
        `${lastGain.toFixed(2)}+(t-${startTime.toFixed(3)})*${(gainDiff/transitionTime).toFixed(4)}`
      );

      lastTime = endTime;
      lastGain = event.gain;
    }

    // After last event
    parts.push(`${lastGain.toFixed(2)}`);

    // Close all if statements
    const closingParens = ')'.repeat(parts.length - 1);
    return parts.join(',') + closingParens;
  }

  /**
   * Get all ducking events
   * @returns {DuckingEvent[]}
   */
  getEvents() {
    return [...this.duckingEvents];
  }

  /**
   * Clear all events
   */
  clear() {
    this.duckingEvents = [];
    this.voiceDetected = false;
    this.currentGain = 1.0;
  }

  /**
   * Check if currently ducking
   * @returns {boolean}
   */
  isDucking() {
    return this.voiceDetected;
  }
}

export default AutoDuckingEngine;
