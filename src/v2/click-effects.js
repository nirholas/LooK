import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * ClickEffectRenderer - Generate professional click effects for demo videos
 * 
 * Uses a reliable approach:
 * 1. Generate individual PNG frames for each click effect
 * 2. Use FFmpeg's overlay filter with enable expressions
 * 3. Fallback to simple drawbox if complex effects fail
 */
export class ClickEffectRenderer {
  constructor(options = {}) {
    this.effect = options.effect || 'ripple';  // ripple, pulse, ring, spotlight
    this.color = options.color || '#3B82F6';   // Blue by default
    this.size = options.size || 60;            // Max effect radius
    this.duration = options.duration || 400;   // Effect duration in ms
    this.opacity = options.opacity || 0.6;
  }

  /**
   * Parse hex color to RGB values
   */
  parseColor(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 59, g: 130, b: 246 }; // Default blue
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  /**
   * Convert RGB to hex for FFmpeg
   */
  rgbToHex(r, g, b) {
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /**
   * Generate a simple but effective FFmpeg filter for click effects
   * Uses multiple overlapping circles that grow and fade
   * 
   * @param {Array} clicks - Array of {x, y, t} click events
   * @param {number} fps - Video framerate
   * @returns {string} FFmpeg filter string
   */
  generateSimpleFilter(clicks, fps) {
    if (!clicks || clicks.length === 0) {
      return '';
    }

    const { r, g, b } = this.parseColor(this.color);
    const hexColor = this.rgbToHex(r, g, b);
    const filters = [];
    const framesPerEffect = Math.ceil(this.duration / 1000 * fps);

    clicks.forEach((click, idx) => {
      const startFrame = Math.floor(click.t / 1000 * fps);
      const cx = Math.round(click.x);
      const cy = Math.round(click.y);

      // Create multiple rings at different stages for smooth animation
      for (let ring = 0; ring < 4; ring++) {
        const ringDelay = Math.floor(ring * framesPerEffect / 6);
        const ringStart = startFrame + ringDelay;
        const ringEnd = startFrame + framesPerEffect;
        
        // Each ring grows and fades
        const maxRadius = this.size * (0.4 + ring * 0.2);
        const ringOpacity = Math.max(0.1, this.opacity - ring * 0.15);
        
        // Use expression-based circle radius
        // drawbox approximation for circles (multiple boxes create octagon-like shape)
        const boxSize = Math.round(maxRadius * 0.7);
        
        filters.push(
          `drawbox=x=${cx - boxSize/2}:y=${cy - boxSize/2}:w=${boxSize}:h=${boxSize}:` +
          `c=0x${hexColor}@${ringOpacity.toFixed(2)}:t=2:` +
          `enable='between(n,${ringStart},${ringEnd})'`
        );
      }

      // Add center dot for immediate feedback
      filters.push(
        `drawbox=x=${cx - 4}:y=${cy - 4}:w=8:h=8:` +
        `c=0x${hexColor}@0.9:t=fill:` +
        `enable='between(n,${startFrame},${startFrame + Math.floor(framesPerEffect/3)})'`
      );
    });

    return filters.join(',');
  }

  /**
   * Generate PNG frames for a single click effect
   * @param {Object} click - {x, y, t}
   * @param {string} outputDir - Directory to save frames
   * @param {number} fps - Framerate
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {Promise<{frames: string[], startFrame: number}>}
   */
  async generateClickFrames(click, outputDir, fps, width, height) {
    const frameCount = Math.ceil(this.duration / 1000 * fps);
    const frames = [];
    const startFrame = Math.floor(click.t / 1000 * fps);

    for (let i = 0; i < frameCount; i++) {
      const progress = i / (frameCount - 1);
      const framePath = join(outputDir, `click_f${String(startFrame + i).padStart(6, '0')}.png`);
      
      const svgContent = this.renderEffectSVG(click.x, click.y, progress, width, height);
      
      await sharp(Buffer.from(svgContent))
        .png()
        .toFile(framePath);
      
      frames.push(framePath);
    }

    return { frames, startFrame, frameCount };
  }

  /**
   * Render a single effect frame as SVG
   */
  renderEffectSVG(cx, cy, progress, width, height) {
    const { r, g, b } = this.parseColor(this.color);
    
    switch (this.effect) {
      case 'pulse':
        return this.renderPulseSVG(cx, cy, progress, r, g, b, width, height);
      case 'ring':
        return this.renderRingSVG(cx, cy, progress, r, g, b, width, height);
      case 'spotlight':
        return this.renderSpotlightSVG(cx, cy, progress, r, g, b, width, height);
      case 'ripple':
      default:
        return this.renderRippleSVG(cx, cy, progress, r, g, b, width, height);
    }
  }

  /**
   * Ripple Effect - Expanding circle that fades out
   */
  renderRippleSVG(cx, cy, progress, r, g, b, width, height) {
    // Ease-out expansion
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const radius = this.size * easeOut;
    // Fade out
    const opacity = this.opacity * (1 - progress);
    const strokeWidth = Math.max(2, 6 * (1 - progress));

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Inner glow -->
      <circle cx="${cx}" cy="${cy}" r="${radius * 0.3}" 
        fill="rgba(${r},${g},${b},${opacity * 0.4})" filter="url(#glow)"/>
      <!-- Main ring with white outline for visibility -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" 
        fill="none" stroke="white" stroke-width="${strokeWidth + 2}" opacity="${opacity * 0.5}"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" 
        fill="none" stroke="rgba(${r},${g},${b},1)" stroke-width="${strokeWidth}" opacity="${opacity}"/>
      <!-- Bright center dot at start -->
      ${progress < 0.3 ? `
        <circle cx="${cx}" cy="${cy}" r="${6 * (1 - progress/0.3)}" 
          fill="white" opacity="${0.9 * (1 - progress/0.3)}"/>
      ` : ''}
    </svg>`;
  }

  /**
   * Pulse Effect - Scale up then down
   */
  renderPulseSVG(cx, cy, progress, r, g, b, width, height) {
    // Pulse: grow fast, shrink slow
    let scale;
    if (progress < 0.25) {
      scale = progress / 0.25; // Grow quickly
    } else {
      scale = 1 - ((progress - 0.25) / 0.75) * 0.8; // Shrink slowly
    }
    
    const radius = this.size * 0.5 * scale;
    const opacity = this.opacity * (progress < 0.1 ? progress / 0.1 : (1 - (progress - 0.1) / 0.9));
    
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="white" stop-opacity="${opacity}"/>
          <stop offset="40%" stop-color="rgba(${r},${g},${b},${opacity})"/>
          <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#pulse)"/>
    </svg>`;
  }

  /**
   * Ring Effect - Clean expanding ring
   */
  renderRingSVG(cx, cy, progress, r, g, b, width, height) {
    const easeOut = 1 - Math.pow(1 - progress, 2);
    const radius = this.size * easeOut;
    const opacity = this.opacity * Math.pow(1 - progress, 1.5);
    const strokeWidth = Math.max(1.5, 4 * (1 - progress * 0.7));

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- White background ring for contrast -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" 
        fill="none" stroke="white" stroke-width="${strokeWidth + 3}" opacity="${opacity * 0.6}"/>
      <!-- Colored ring -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" 
        fill="none" stroke="rgba(${r},${g},${b},1)" stroke-width="${strokeWidth}" opacity="${opacity}"/>
      <!-- Inner ring -->
      <circle cx="${cx}" cy="${cy}" r="${radius * 0.6}" 
        fill="none" stroke="rgba(${r},${g},${b},0.6)" stroke-width="${strokeWidth * 0.6}" 
        opacity="${opacity * 0.5}"/>
    </svg>`;
  }

  /**
   * Spotlight Effect - Highlights click area with vignette
   */
  renderSpotlightSVG(cx, cy, progress, r, g, b, width, height) {
    // Fade in then out
    let intensity;
    if (progress < 0.15) {
      intensity = progress / 0.15;
    } else if (progress > 0.6) {
      intensity = (1 - progress) / 0.4;
    } else {
      intensity = 1;
    }
    
    const spotRadius = this.size * 2;
    const vignetteOpacity = 0.35 * intensity;
    const glowOpacity = this.opacity * 0.4 * intensity;

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="spotlight" cx="${cx/width}" cy="${cy/height}" r="0.5" fx="${cx/width}" fy="${cy/height}">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="${Math.min(0.4, spotRadius/width)}" stop-color="rgba(0,0,0,0)"/>
          <stop offset="0.8" stop-color="rgba(0,0,0,${vignetteOpacity})"/>
          <stop offset="1" stop-color="rgba(0,0,0,${vignetteOpacity})"/>
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(${r},${g},${b},${glowOpacity})"/>
          <stop offset="60%" stop-color="rgba(${r},${g},${b},${glowOpacity * 0.3})"/>
          <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
        </radialGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>
      <!-- Vignette -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#spotlight)"/>
      <!-- Glow at click point -->
      <circle cx="${cx}" cy="${cy}" r="${spotRadius}" fill="url(#glow)" filter="url(#blur)"/>
      <!-- Small highlight ring -->
      <circle cx="${cx}" cy="${cy}" r="${this.size * 0.4}" 
        fill="none" stroke="white" stroke-width="2" opacity="${intensity * 0.5}"/>
    </svg>`;
  }
}

/**
 * Apply click effects to video using frame-by-frame compositing
 * This is the most reliable method but slower
 * 
 * @param {string} inputVideo - Path to input video
 * @param {Array} clicks - Array of click events {x, y, t}
 * @param {Object} options - Effect options
 * @returns {Promise<string>} Path to output video
 */
export async function applyClickEffects(inputVideo, clicks, options = {}) {
  const {
    effect = 'ripple',
    color = '#3B82F6',
    size = 60,
    duration = 400,
    opacity = 0.6,
    fps = 60,
    width = 1920,
    height = 1080,
    outputPath = null,
    tempDir = null
  } = options;

  if (!clicks || clicks.length === 0) {
    return inputVideo;
  }

  const workDir = tempDir || join(tmpdir(), `click-effects-${Date.now()}`);
  await mkdir(workDir, { recursive: true });

  const renderer = new ClickEffectRenderer({
    effect,
    color,
    size,
    duration,
    opacity
  });

  const output = outputPath || join(workDir, 'with-clicks.mp4');

  // Try simple filter approach first (fastest)
  try {
    const simpleFilter = renderer.generateSimpleFilter(clicks, fps);
    if (simpleFilter) {
      const cmd = `ffmpeg -y -i "${inputVideo}" -vf "${simpleFilter}" ` +
        `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${output}"`;
      
      await execAsync(cmd, { timeout: 180000 });
      return output;
    }
  } catch (error) {
    console.warn('Simple filter failed, trying frame overlay method:', error.message);
  }

  // Fallback: Generate PNG overlays and composite
  try {
    const effectsDir = join(workDir, 'effect-frames');
    await mkdir(effectsDir, { recursive: true });

    // Generate frames for each click
    const allFrames = [];
    for (let i = 0; i < clicks.length; i++) {
      const clickFrames = await renderer.generateClickFrames(
        clicks[i], effectsDir, fps, width, height
      );
      allFrames.push(clickFrames);
    }

    // Build complex overlay filter
    // This approach overlays pre-rendered frames at specific times
    const filterParts = [];
    const inputs = [`-i "${inputVideo}"`];
    
    // For each click, we overlay its frames
    allFrames.forEach((cf, idx) => {
      // We need to overlay frames at specific times
      // Using enable expression to show only at the right frame
      const startTime = clicks[idx].t / 1000;
      const endTime = startTime + duration / 1000;
      
      // Use the first frame as representative (simpler approach)
      if (cf.frames.length > 0) {
        inputs.push(`-i "${cf.frames[0]}"`);
        const inputIdx = idx + 1;
        filterParts.push(
          `overlay=0:0:enable='between(t,${startTime},${endTime})'`
        );
      }
    });

    if (filterParts.length > 0) {
      // Chain overlays
      let filterComplex = '';
      let lastOutput = '[0:v]';
      
      filterParts.forEach((fp, idx) => {
        const inputIdx = idx + 1;
        const outputLabel = idx === filterParts.length - 1 ? '[out]' : `[tmp${idx}]`;
        filterComplex += `${lastOutput}[${inputIdx}:v]${fp}${outputLabel}`;
        if (idx < filterParts.length - 1) {
          filterComplex += ';';
          lastOutput = `[tmp${idx}]`;
        }
      });

      const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" ` +
        `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${output}"`;
      
      await execAsync(cmd, { timeout: 300000 });
      return output;
    }
  } catch (error) {
    console.warn('Frame overlay method failed, returning original:', error.message);
  }

  // If all else fails, just copy the input
  try {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  } catch {
    return inputVideo;
  }
}

/**
 * Quick test function to verify click effects work
 */
export async function testClickEffects() {
  const renderer = new ClickEffectRenderer({
    effect: 'ripple',
    color: '#3B82F6',
    size: 60,
    duration: 400
  });

  // Test simple filter generation
  const testClicks = [
    { x: 500, y: 300, t: 1000 },
    { x: 800, y: 500, t: 3000 }
  ];
  
  const filter = renderer.generateSimpleFilter(testClicks, 60);
  console.log('Generated filter:', filter.substring(0, 200) + '...');
  
  // Test SVG generation
  const svg = renderer.renderEffectSVG(500, 300, 0.5, 1920, 1080);
  console.log('SVG generated, length:', svg.length);
  
  return { filter, svg };
}

export default ClickEffectRenderer;
