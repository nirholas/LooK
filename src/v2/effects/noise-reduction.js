/**
 * NoiseReduction - Audio noise reduction using noise gate and spectral analysis
 * Ported from Aqua Screen Recorder with adaptations for LooK
 * 
 * Features:
 * - Learn noise profile from sample
 * - Noise gate with configurable threshold
 * - Spectral gating for cleaner audio
 */

/**
 * @typedef {Object} NoiseProfile
 * @property {Float32Array} frequencyData - Average noise spectrum
 * @property {number} threshold - Detected noise threshold
 * @property {number} sampleRate - Sample rate used for profile
 */

/**
 * @typedef {Object} NoiseReductionConfig
 * @property {boolean} enabled - Enable noise reduction
 * @property {number} threshold - Noise gate threshold in dB (-60 to 0)
 * @property {number} reduction - Amount of reduction (0-100%)
 * @property {number} attack - Attack time in ms
 * @property {number} release - Release time in ms
 * @property {boolean} spectralGating - Use spectral gating vs simple gate
 */

export const DEFAULT_NOISE_REDUCTION_CONFIG = {
  enabled: true,
  threshold: -40,
  reduction: 80,
  attack: 5,
  release: 50,
  spectralGating: false,
};

/**
 * Noise reduction engine for cleaning up audio
 */
export class NoiseReductionEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_NOISE_REDUCTION_CONFIG, ...config };
    this.noiseProfile = null;
    this.gateOpen = false;
    this.currentGain = 1.0;
  }

  /**
   * Update configuration
   * @param {Partial<NoiseReductionConfig>} config
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * @returns {NoiseReductionConfig}
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Learn noise profile from audio samples
   * Typically use first 1-2 seconds of "silence" with background noise
   * @param {Float32Array} samples - Audio samples
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} fftSize - FFT size for analysis (default 2048)
   * @returns {NoiseProfile}
   */
  learnNoiseProfile(samples, sampleRate, fftSize = 2048) {
    const windowCount = Math.floor(samples.length / fftSize);
    const binCount = fftSize / 2;
    const avgSpectrum = new Float32Array(binCount);

    // Simple DFT-based analysis (in production, would use FFT library)
    for (let w = 0; w < windowCount; w++) {
      const windowStart = w * fftSize;
      const window = samples.slice(windowStart, windowStart + fftSize);
      
      // Calculate power spectrum for this window
      const spectrum = this.calculatePowerSpectrum(window);
      
      for (let i = 0; i < binCount; i++) {
        avgSpectrum[i] += spectrum[i];
      }
    }

    // Average and convert to dB
    for (let i = 0; i < binCount; i++) {
      avgSpectrum[i] = 20 * Math.log10((avgSpectrum[i] / windowCount) + 1e-10);
    }

    // Calculate threshold as median of spectrum
    const sorted = Array.from(avgSpectrum).sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * 0.5)];

    this.noiseProfile = {
      frequencyData: avgSpectrum,
      threshold,
      sampleRate,
    };

    console.log('[NoiseReduction] Noise profile learned:', {
      binCount,
      threshold: threshold.toFixed(2),
      avgLevel: (avgSpectrum.reduce((a, b) => a + b) / avgSpectrum.length).toFixed(2),
    });

    return this.noiseProfile;
  }

  /**
   * Calculate simple power spectrum (magnitude squared)
   * @param {Float32Array} samples
   * @returns {Float32Array}
   */
  calculatePowerSpectrum(samples) {
    const n = samples.length;
    const spectrum = new Float32Array(n / 2);

    // Simple DFT (slow but works without external deps)
    for (let k = 0; k < n / 2; k++) {
      let realSum = 0;
      let imagSum = 0;

      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        realSum += samples[t] * Math.cos(angle);
        imagSum -= samples[t] * Math.sin(angle);
      }

      spectrum[k] = (realSum * realSum + imagSum * imagSum) / n;
    }

    return spectrum;
  }

  /**
   * Apply noise gate to audio samples
   * @param {Float32Array} samples - Input samples
   * @param {number} sampleRate - Sample rate
   * @returns {Float32Array} Processed samples
   */
  applyNoiseGate(samples, sampleRate) {
    if (!this.config.enabled) {
      return samples;
    }

    const output = new Float32Array(samples.length);
    const attackSamples = Math.floor(this.config.attack / 1000 * sampleRate);
    const releaseSamples = Math.floor(this.config.release / 1000 * sampleRate);
    const reductionGain = 1 - (this.config.reduction / 100);
    
    // Convert threshold from dB to linear
    const thresholdLinear = Math.pow(10, this.config.threshold / 20);
    
    let envelopeFollower = 0;
    let gain = this.gateOpen ? 1.0 : reductionGain;

    for (let i = 0; i < samples.length; i++) {
      const inputLevel = Math.abs(samples[i]);
      
      // Simple envelope follower
      const attackCoef = 1 - Math.exp(-1 / attackSamples);
      const releaseCoef = 1 - Math.exp(-1 / releaseSamples);
      
      if (inputLevel > envelopeFollower) {
        envelopeFollower = attackCoef * inputLevel + (1 - attackCoef) * envelopeFollower;
      } else {
        envelopeFollower = releaseCoef * inputLevel + (1 - releaseCoef) * envelopeFollower;
      }

      // Gate logic
      const isAboveThreshold = envelopeFollower > thresholdLinear;
      
      if (isAboveThreshold && !this.gateOpen) {
        this.gateOpen = true;
      } else if (!isAboveThreshold && this.gateOpen) {
        this.gateOpen = false;
      }

      // Smooth gain transition
      const targetGain = this.gateOpen ? 1.0 : reductionGain;
      const smoothCoef = this.gateOpen ? attackCoef : releaseCoef;
      gain = smoothCoef * targetGain + (1 - smoothCoef) * gain;

      output[i] = samples[i] * gain;
    }

    this.currentGain = gain;
    return output;
  }

  /**
   * Generate FFmpeg filter for noise reduction
   * Uses highpass, lowpass, and compand filters
   * @returns {string} FFmpeg filter string
   */
  generateFFmpegFilter() {
    if (!this.config.enabled) {
      return '';
    }

    const filters = [];

    // High-pass filter to remove low-frequency rumble
    filters.push('highpass=f=80');

    // Low-pass filter to remove high-frequency hiss
    filters.push('lowpass=f=12000');

    // Noise gate using compand
    // Format: attacks|decays [soft-knee] in-level1:out-level1
    const attackSec = this.config.attack / 1000;
    const releaseSec = this.config.release / 1000;
    const thresholdDb = this.config.threshold;
    const reductionDb = -this.config.reduction * 0.6; // Scale reduction

    filters.push(
      `compand=` +
      `attacks=${attackSec}:` +
      `decays=${releaseSec}:` +
      `points=-80/${reductionDb}|${thresholdDb}/${thresholdDb}|0/0:` +
      `soft-knee=6`
    );

    // Optional: add subtle compression for more consistent levels
    filters.push('acompressor=threshold=-20dB:ratio=4:attack=10:release=100');

    return filters.join(',');
  }

  /**
   * Generate FFmpeg filter chain for full audio cleanup
   * @param {Object} options
   * @param {boolean} options.normalize - Add normalization
   * @param {boolean} options.declick - Add de-clicking
   * @returns {string} Complete filter chain
   */
  generateFullCleanupFilter(options = {}) {
    const filters = [];

    // De-clicking (remove pops/clicks)
    if (options.declick) {
      filters.push('adeclick');
    }

    // Main noise reduction
    const noiseFilter = this.generateFFmpegFilter();
    if (noiseFilter) {
      filters.push(noiseFilter);
    }

    // Normalization
    if (options.normalize) {
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    return filters.join(',');
  }

  /**
   * Check if noise profile is available
   * @returns {boolean}
   */
  hasNoiseProfile() {
    return this.noiseProfile !== null;
  }

  /**
   * Get the current noise profile
   * @returns {NoiseProfile|null}
   */
  getNoiseProfile() {
    return this.noiseProfile;
  }

  /**
   * Clear noise profile
   */
  clearProfile() {
    this.noiseProfile = null;
  }

  /**
   * Reset gate state
   */
  reset() {
    this.gateOpen = false;
    this.currentGain = 1.0;
  }
}

export default NoiseReductionEngine;
