/**
 * Spotlight - Focus viewer attention by dimming everything except target
 * 
 * Features:
 * - Smooth animated spotlight transitions
 * - Multiple spotlight shapes (rect, circle, pill)
 * - Adjustable darkness/blur
 * - Follow mode (spotlight follows cursor)
 * - Multiple simultaneous spotlights
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * Spotlight shapes
 */
export const SpotlightShape = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  PILL: 'pill',
  ELLIPSE: 'ellipse'
};

/**
 * Spotlight renderer
 */
export class SpotlightRenderer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.darkness = options.darkness || 0.7;
    this.blur = options.blur || 0;
    this.borderGlow = options.borderGlow || true;
    this.glowColor = options.glowColor || 'rgba(255, 255, 255, 0.3)';
    this.glowSize = options.glowSize || 20;
    this.spotlights = [];
  }

  /**
   * Add a spotlight region
   */
  addSpotlight(options) {
    this.spotlights.push({
      bounds: options.bounds,           // {x, y, width, height} as percentages (0-1)
      shape: options.shape || SpotlightShape.RECTANGLE,
      padding: options.padding || 20,
      borderRadius: options.borderRadius || 12,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999,
      label: options.label || null,
      labelPosition: options.labelPosition || 'top', // top, bottom, left, right
      transition: options.transition || 0.3 // transition duration
    });
  }

  /**
   * Add spotlight that follows cursor data
   */
  addFollowSpotlight(cursorData, options = {}) {
    const {
      size = { width: 0.2, height: 0.15 },
      startTime = 0,
      endTime = 999,
      shape = SpotlightShape.RECTANGLE
    } = options;

    // Convert cursor positions to spotlight regions
    for (const point of cursorData) {
      const time = point.t / 1000;
      if (time < startTime || time > endTime) continue;

      this.spotlights.push({
        bounds: {
          x: (point.x / this.width) - size.width / 2,
          y: (point.y / this.height) - size.height / 2,
          width: size.width,
          height: size.height
        },
        shape,
        startTime: time,
        endTime: time + 0.1, // Short duration, will blend
        padding: 30,
        borderRadius: 16,
        transition: 0.1
      });
    }
  }

  /**
   * Generate spotlight frames
   */
  async generateFrames(outputDir, duration) {
    await mkdir(outputDir, { recursive: true });

    const totalFrames = Math.ceil(duration * this.fps);
    const framePaths = [];

    console.log(`  Generating ${totalFrames} spotlight frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      const framePath = join(outputDir, `spotlight_${frame.toString().padStart(6, '0')}.png`);
      
      await this.renderFrame(time, framePath);
      framePaths.push(framePath);

      if (frame % 30 === 0) {
        process.stdout.write(`\r  Spotlight frame ${frame}/${totalFrames}`);
      }
    }
    console.log();

    return framePaths;
  }

  /**
   * Render a single frame
   */
  async renderFrame(time, outputPath) {
    const activeSpotlights = this.getActiveSpotlights(time);

    const svg = this.generateSVG(activeSpotlights, time);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
  }

  /**
   * Get active spotlights with interpolation
   */
  getActiveSpotlights(time) {
    return this.spotlights
      .filter(s => time >= s.startTime - s.transition && time <= s.endTime + s.transition)
      .map(s => {
        // Calculate opacity based on fade in/out
        let opacity = 1;
        if (time < s.startTime) {
          opacity = 1 - (s.startTime - time) / s.transition;
        } else if (time > s.endTime) {
          opacity = 1 - (time - s.endTime) / s.transition;
        }
        return { ...s, opacity: Math.max(0, Math.min(1, opacity)) };
      })
      .filter(s => s.opacity > 0);
  }

  /**
   * Generate SVG for spotlight overlay
   */
  generateSVG(spotlights, time) {
    let svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">`;

    if (spotlights.length === 0) {
      // No spotlights, return fully transparent
      svg += '</svg>';
      return svg;
    }

    // Create mask with cutouts for spotlights
    const maskId = `spotlight-mask-${Math.random().toString(36).substr(2, 9)}`;
    
    svg += `
      <defs>
        <mask id="${maskId}">
          <rect width="100%" height="100%" fill="white"/>
    `;

    // Add cutouts for each spotlight
    for (const spotlight of spotlights) {
      const cutout = this.generateSpotlightCutout(spotlight);
      svg += cutout;
    }

    svg += `
        </mask>
      </defs>
    `;

    // Dark overlay with mask
    svg += `
      <rect width="100%" height="100%" 
            fill="black" fill-opacity="${this.darkness}" 
            mask="url(#${maskId})"/>
    `;

    // Add glow borders around spotlights
    if (this.borderGlow) {
      for (const spotlight of spotlights) {
        svg += this.generateGlowBorder(spotlight);
      }
    }

    // Add labels
    for (const spotlight of spotlights) {
      if (spotlight.label) {
        svg += this.generateLabel(spotlight);
      }
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Generate cutout shape for spotlight
   */
  generateSpotlightCutout(spotlight) {
    const { bounds, shape, padding, borderRadius, opacity } = spotlight;

    const x = bounds.x * this.width - padding;
    const y = bounds.y * this.height - padding;
    const w = bounds.width * this.width + padding * 2;
    const h = bounds.height * this.height + padding * 2;

    // Fade based on opacity
    const fillOpacity = opacity;

    switch (shape) {
      case SpotlightShape.CIRCLE:
        const r = Math.max(w, h) / 2;
        const cx = x + w / 2;
        const cy = y + h / 2;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black" fill-opacity="${fillOpacity}"/>`;

      case SpotlightShape.ELLIPSE:
        return `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" fill="black" fill-opacity="${fillOpacity}"/>`;

      case SpotlightShape.PILL:
        const pillRadius = Math.min(w, h) / 2;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${pillRadius}" ry="${pillRadius}" fill="black" fill-opacity="${fillOpacity}"/>`;

      case SpotlightShape.RECTANGLE:
      default:
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${borderRadius}" ry="${borderRadius}" fill="black" fill-opacity="${fillOpacity}"/>`;
    }
  }

  /**
   * Generate glow border around spotlight
   */
  generateGlowBorder(spotlight) {
    const { bounds, shape, padding, borderRadius, opacity } = spotlight;

    const x = bounds.x * this.width - padding;
    const y = bounds.y * this.height - padding;
    const w = bounds.width * this.width + padding * 2;
    const h = bounds.height * this.height + padding * 2;

    const glowOpacity = opacity * 0.5;

    let path;
    switch (shape) {
      case SpotlightShape.CIRCLE:
        const r = Math.max(w, h) / 2;
        path = `<circle cx="${x + w/2}" cy="${y + h/2}" r="${r}"`;
        break;
      case SpotlightShape.ELLIPSE:
        path = `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}"`;
        break;
      case SpotlightShape.PILL:
        const pillR = Math.min(w, h) / 2;
        path = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${pillR}" ry="${pillR}"`;
        break;
      default:
        path = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${borderRadius}" ry="${borderRadius}"`;
    }

    return `
      <defs>
        <filter id="glow-${Math.random().toString(36).substr(2, 9)}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${this.glowSize}" result="blur"/>
        </filter>
      </defs>
      ${path} fill="none" stroke="${this.glowColor}" stroke-width="${this.glowSize}" 
              stroke-opacity="${glowOpacity}" filter="url(#glow-${Math.random().toString(36).substr(2, 9)})"/>
    `;
  }

  /**
   * Generate label for spotlight
   */
  generateLabel(spotlight) {
    const { bounds, padding, label, labelPosition, opacity } = spotlight;

    const x = bounds.x * this.width;
    const y = bounds.y * this.height;
    const w = bounds.width * this.width;
    const h = bounds.height * this.height;

    let labelX, labelY;
    switch (labelPosition) {
      case 'bottom':
        labelX = x + w / 2;
        labelY = y + h + padding + 30;
        break;
      case 'left':
        labelX = x - padding - 100;
        labelY = y + h / 2;
        break;
      case 'right':
        labelX = x + w + padding + 100;
        labelY = y + h / 2;
        break;
      case 'top':
      default:
        labelX = x + w / 2;
        labelY = y - padding - 10;
    }

    const fontSize = 24;
    const boxPadding = 12;
    const textWidth = label.length * fontSize * 0.55;
    const boxWidth = textWidth + boxPadding * 2;
    const boxHeight = fontSize + boxPadding * 1.5;

    return `
      <g opacity="${opacity}">
        <rect x="${labelX - boxWidth/2}" y="${labelY - boxHeight/2}" 
              width="${boxWidth}" height="${boxHeight}"
              rx="8" ry="8"
              fill="rgba(0, 0, 0, 0.85)"/>
        <text x="${labelX}" y="${labelY + fontSize * 0.3}"
              font-family="Inter, -apple-system, sans-serif"
              font-size="${fontSize}px" font-weight="600"
              fill="white" text-anchor="middle">
          ${this.escapeXml(label)}
        </text>
      </g>
    `;
  }

  /**
   * Escape XML
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Apply spotlight overlay to video
   */
  async applyToVideo(inputVideo, spotlightFramesDir, outputPath) {
    const spotlightVideoPath = join(tmpdir(), `spotlight_${Date.now()}.mov`);
    
    await execAsync(
      `ffmpeg -y -framerate ${this.fps} -i "${spotlightFramesDir}/spotlight_%06d.png" ` +
      `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${spotlightVideoPath}"`,
      { timeout: 300000 }
    );

    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -i "${spotlightVideoPath}" ` +
      `-filter_complex "[0:v][1:v]overlay=0:0:format=auto[out]" ` +
      `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${outputPath}"`,
      { timeout: 300000 }
    );

    return outputPath;
  }
}

/**
 * Add spotlight effect to video
 */
export async function addSpotlight(inputVideo, outputPath, regions, options = {}) {
  if (!regions || regions.length === 0) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  // Get video info
  const { stdout } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of json "${inputVideo}"`
  );
  const info = JSON.parse(stdout);
  const width = info.streams?.[0]?.width || 1920;
  const height = info.streams?.[0]?.height || 1080;
  const fpsRaw = info.streams?.[0]?.r_frame_rate || '30/1';
  const [fpsNum, fpsDen] = fpsRaw.split('/').map(Number);
  const fps = Math.round(fpsNum / fpsDen);
  const duration = options.duration || parseFloat(info.format?.duration) || 30;

  const renderer = new SpotlightRenderer({
    width,
    height,
    fps,
    ...options
  });

  for (const region of regions) {
    renderer.addSpotlight(region);
  }

  const tempDir = join(tmpdir(), `spotlight_${Date.now()}`);
  await renderer.generateFrames(tempDir, duration);
  await renderer.applyToVideo(inputVideo, tempDir, outputPath);

  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch {}

  return outputPath;
}

export default SpotlightRenderer;
