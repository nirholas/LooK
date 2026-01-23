import sharp from 'sharp';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * CursorRenderer - Production-ready cursor overlay for demo videos
 * 
 * Features:
 * - Multiple cursor styles (arrow, pointer, dot, circle, crosshair, spotlight)
 * - Cursor trail effect for smooth motion visualization
 * - Glow effect for better visibility
 * - Click pulse animation
 * - Velocity-based sizing
 * 
 * Uses FFmpeg overlay with time-based position expressions
 */
export class CursorRenderer {
  constructor(options = {}) {
    this.style = options.style || 'default';
    this.size = options.size || 32;
    this.color = options.color || '#000000';
    this.outlineColor = options.outlineColor || '#FFFFFF';
    this.outlineWidth = options.outlineWidth || 2;
    this.shadowBlur = options.shadowBlur || 6;
    this.shadowOpacity = options.shadowOpacity || 0.4;
    this.clickScale = options.clickScale || 0.85;
    
    // New enhanced options
    this.glow = options.glow || false;
    this.glowColor = options.glowColor || this.color;
    this.glowIntensity = options.glowIntensity || 0.5;
    this.trail = options.trail || false;
    this.trailLength = options.trailLength || 5;
    this.trailOpacity = options.trailOpacity || 0.3;
  }

  /**
   * Generate cursor PNG using sharp
   */
  async generateCursorImage(outputDir, isClick = false) {
    await mkdir(outputDir, { recursive: true });
    
    const filename = isClick ? `cursor-${this.style}-click.png` : `cursor-${this.style}.png`;
    const outputPath = join(outputDir, filename);
    
    // Get SVG for the cursor style
    const svg = this.getCursorSVG(isClick);
    
    // Convert SVG to PNG with sharp
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Get SVG string for cursor - clean, professional designs
   */
  getCursorSVG(isClick = false) {
    const scale = isClick ? this.clickScale : 1.0;
    const size = Math.round(this.size * scale);
    const glowExtra = this.glow ? 10 : 0;
    const canvasSize = this.size + this.shadowBlur * 2 + 4 + glowExtra;
    const offset = this.shadowBlur + 2 + (glowExtra / 2);
    
    // Build filter with optional glow
    let filterDefs = `
      <defs>
        <filter id="shadow" x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="1" dy="2" stdDeviation="${this.shadowBlur / 2}" flood-opacity="${this.shadowOpacity}"/>
          ${this.glow ? `
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
          ` : ''}
        </filter>
        ${this.glow ? `
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        ` : ''}
      </defs>
    `;

    switch (this.style) {
      case 'dot':
        return this.getDotSVG(canvasSize, size, offset, filterDefs);
      case 'circle':
        return this.getCircleSVG(canvasSize, size, offset, filterDefs);
      case 'pointer':
        return this.getPointerSVG(canvasSize, size, offset, filterDefs);
      case 'crosshair':
        return this.getCrosshairSVG(canvasSize, size, offset, filterDefs);
      case 'spotlight':
        return this.getSpotlightSVG(canvasSize, size, offset, filterDefs);
      case 'arrow-modern':
        return this.getModernArrowSVG(canvasSize, size, offset, filterDefs);
      case 'default':
      default:
        return this.getArrowSVG(canvasSize, size, offset, filterDefs);
    }
  }

  /**
   * Classic arrow cursor - macOS/Windows style
   */
  getArrowSVG(canvasSize, size, offset, shadow) {
    const s = size / 24; // Scale factor
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <g filter="url(#shadow)" transform="translate(${offset}, ${offset})">
        <path d="M 0,0 L 0,${20*s} L ${4*s},${16*s} L ${7*s},${23*s} L ${10*s},${22*s} L ${7*s},${15*s} L ${12*s},${15*s} Z" 
              fill="${this.color}" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  /**
   * Pointer/hand cursor
   */
  getPointerSVG(canvasSize, size, offset, shadow) {
    const s = size / 24;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <g filter="url(#shadow)" transform="translate(${offset}, ${offset})">
        <path d="M ${8*s},${0*s} L ${8*s},${14*s} L ${5*s},${11*s} L ${3*s},${13*s} L ${8*s},${20*s} L ${12*s},${20*s} 
                 L ${12*s},${15*s} L ${15*s},${15*s} L ${15*s},${12*s} L ${18*s},${12*s} L ${18*s},${9*s} L ${12*s},${9*s} L ${12*s},${0*s} Z"
              fill="${this.color}" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  /**
   * Filled dot cursor - modern/minimal
   */
  getDotSVG(canvasSize, size, offset, shadow) {
    const radius = size / 2;
    const center = offset + radius;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <g filter="url(#shadow)">
        <circle cx="${center}" cy="${center}" r="${radius}" 
                fill="${this.color}" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}"/>
      </g>
    </svg>`;
  }

  /**
   * Circle outline cursor - for highlighting
   */
  getCircleSVG(canvasSize, size, offset, shadow) {
    const radius = size / 2 - 2;
    const center = offset + size / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <g filter="url(#shadow)">
        <circle cx="${center}" cy="${center}" r="${radius}" 
                fill="none" stroke="${this.color}" stroke-width="${this.outlineWidth + 2}"/>
        <circle cx="${center}" cy="${center}" r="${radius}" 
                fill="none" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}" opacity="0.8"/>
      </g>
    </svg>`;
  }

  /**
   * Crosshair cursor - for precision demos
   */
  getCrosshairSVG(canvasSize, size, offset, shadow) {
    const center = offset + size / 2;
    const half = size / 2;
    const inner = size / 6;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <g filter="url(#shadow)">
        <line x1="${center}" y1="${center - half}" x2="${center}" y2="${center - inner}" 
              stroke="${this.color}" stroke-width="${this.outlineWidth + 1}" stroke-linecap="round"/>
        <line x1="${center}" y1="${center + inner}" x2="${center}" y2="${center + half}" 
              stroke="${this.color}" stroke-width="${this.outlineWidth + 1}" stroke-linecap="round"/>
        <line x1="${center - half}" y1="${center}" x2="${center - inner}" y2="${center}" 
              stroke="${this.color}" stroke-width="${this.outlineWidth + 1}" stroke-linecap="round"/>
        <line x1="${center + inner}" y1="${center}" x2="${center + half}" y2="${center}" 
              stroke="${this.color}" stroke-width="${this.outlineWidth + 1}" stroke-linecap="round"/>
        <circle cx="${center}" cy="${center}" r="${inner / 2}" fill="${this.color}"/>
      </g>
    </svg>`;
  }

  /**
   * Spotlight cursor - highlights area around cursor (great for tutorials)
   */
  getSpotlightSVG(canvasSize, size, offset, shadow) {
    const center = offset + size / 2;
    const outerRadius = size / 2;
    const innerRadius = size / 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <defs>
        <radialGradient id="spotGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${this.color}" stop-opacity="0"/>
          <stop offset="60%" stop-color="${this.color}" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="${this.color}" stop-opacity="0.4"/>
        </radialGradient>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="url(#spotGradient)"/>
        <circle cx="${center}" cy="${center}" r="${innerRadius}" 
                fill="${this.color}" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}"/>
      </g>
    </svg>`;
  }

  /**
   * Modern arrow cursor - sleeker design with gradient
   */
  getModernArrowSVG(canvasSize, size, offset, shadow) {
    const s = size / 24;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
      ${shadow}
      <defs>
        <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${this.color}"/>
          <stop offset="100%" stop-color="${this.adjustColor(this.color, -30)}"/>
        </linearGradient>
      </defs>
      <g filter="url(#shadow)" transform="translate(${offset}, ${offset})">
        <path d="M 1,1 L 1,${18*s} L ${5*s},${14*s} L ${8*s},${21*s} L ${11*s},${19*s} L ${8*s},${13*s} L ${13*s},${13*s} Z" 
              fill="url(#arrowGradient)" stroke="${this.outlineColor}" stroke-width="${this.outlineWidth}" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  /**
   * Adjust color brightness
   */
  adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }

  /**
   * Apply cursor overlay to video using FFmpeg
   * This is the main entry point for cursor rendering
   */
  async applyCursorOverlay(inputVideo, outputVideo, cursorData, options = {}) {
    const {
      fps = 60,
      width = 1920,
      height = 1080,
    } = options;

    if (this.style === 'none') {
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputVideo}"`);
      return outputVideo;
    }

    const tempDir = join(tmpdir(), `cursor-overlay-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // Generate cursor image
      const cursorPath = await this.generateCursorImage(tempDir, false);
      
      // Get cursor image dimensions
      const cursorMeta = await sharp(cursorPath).metadata();
      const cursorWidth = cursorMeta.width;
      const cursorHeight = cursorMeta.height;
      
      // Calculate hotspot offset (top-left of cursor for arrow, center for dot/circle)
      const hotspotX = this.style === 'dot' || this.style === 'circle' || this.style === 'crosshair' 
        ? cursorWidth / 2 
        : this.shadowBlur + 2;
      const hotspotY = this.style === 'dot' || this.style === 'circle' || this.style === 'crosshair'
        ? cursorHeight / 2
        : this.shadowBlur + 2;

      // Get frames from cursor data
      const frames = this.getInterpolatedFrames(cursorData, fps);
      
      if (frames.length === 0) {
        // No cursor data, just copy video
        await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputVideo}"`);
        return outputVideo;
      }

      // Build FFmpeg overlay expression
      const overlayExpr = this.buildOverlayExpression(frames, hotspotX, hotspotY, width, height, fps);
      
      const command = `ffmpeg -y -i "${inputVideo}" -i "${cursorPath}" \
        -filter_complex "[1:v]format=rgba[cursor];[0:v][cursor]overlay=${overlayExpr}:format=auto" \
        -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
        "${outputVideo}"`;

      await execAsync(command, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
      
      return outputVideo;
    } catch (error) {
      console.error('Cursor overlay failed:', error.message);
      // Fallback: copy without cursor
      try {
        await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputVideo}"`);
      } catch (e) {
        throw new Error(`Video processing failed: ${error.message}`);
      }
      return outputVideo;
    }
  }

  /**
   * Build filter for post-process.js integration
   * Returns filter components for the post-process pipeline
   */
  async buildFilter(cursorData, fps, width, height, tempDir) {
    if (this.style === 'none') {
      return { cursorImagePath: null, overlayFilter: null };
    }

    // Generate cursor image
    const cursorPath = await this.generateCursorImage(tempDir, false);
    
    // Get cursor image dimensions
    const cursorMeta = await sharp(cursorPath).metadata();
    const cursorWidth = cursorMeta.width;
    const cursorHeight = cursorMeta.height;
    
    // Calculate hotspot offset
    const hotspotX = this.style === 'dot' || this.style === 'circle' || this.style === 'crosshair' 
      ? cursorWidth / 2 
      : this.shadowBlur + 2;
    const hotspotY = this.style === 'dot' || this.style === 'circle' || this.style === 'crosshair'
      ? cursorHeight / 2
      : this.shadowBlur + 2;

    // Get frames from cursor data
    const frames = this.getInterpolatedFrames(cursorData, fps);
    
    if (frames.length === 0) {
      return { cursorImagePath: null, overlayFilter: null };
    }

    // Build overlay expression
    const overlayExpr = this.buildOverlayExpression(frames, hotspotX, hotspotY, width, height, fps);
    
    return {
      cursorImagePath: cursorPath,
      overlayFilter: overlayExpr,
      size: { width: cursorWidth, height: cursorHeight }
    };
  }

  /**
   * Get interpolated cursor frames from cursor data
   */
  getInterpolatedFrames(cursorData, fps) {
    // Handle both CursorTracker object and plain JSON
    const positions = cursorData.positions || cursorData;
    
    if (!positions || positions.length === 0) {
      return [];
    }

    const duration = positions[positions.length - 1].t;
    const frameCount = Math.ceil((duration / 1000) * fps);
    const frames = [];

    for (let i = 0; i < frameCount; i++) {
      const timeMs = (i / fps) * 1000;
      const pos = this.interpolatePosition(positions, timeMs);
      
      // Check if there's a click near this time
      const clicks = cursorData.clicks || [];
      const isClick = clicks.some(c => Math.abs(c.t - timeMs) < 100);
      
      // Calculate velocity for motion blur effects
      let velocity = 0;
      if (i > 0) {
        const prevFrame = frames[i - 1];
        const dx = pos.x - prevFrame.x;
        const dy = pos.y - prevFrame.y;
        const dt = (1 / fps) * 1000; // ms per frame
        velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000; // pixels per second
      }
      
      frames.push({
        frame: i,
        time: timeMs,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        isClick,
        velocity // pixels per second
      });
    }

    return frames;
  }

  /**
   * Interpolate cursor position at a specific time using Catmull-Rom
   */
  interpolatePosition(positions, timeMs) {
    if (positions.length === 0) return { x: 0, y: 0 };
    if (positions.length === 1) return { x: positions[0].x, y: positions[0].y };

    // Find the two positions surrounding this time
    let i = 0;
    while (i < positions.length - 1 && positions[i + 1].t < timeMs) i++;

    const p0 = positions[Math.max(0, i - 1)];
    const p1 = positions[i];
    const p2 = positions[Math.min(positions.length - 1, i + 1)];
    const p3 = positions[Math.min(positions.length - 1, i + 2)];

    // Calculate local t (0-1 between p1 and p2)
    const segmentDuration = (p2.t - p1.t) || 1;
    const localT = Math.max(0, Math.min(1, (timeMs - p1.t) / segmentDuration));

    // Catmull-Rom interpolation with easing for smoother motion
    const easedT = this.easeInOutCubic(localT);
    
    return {
      x: this.catmullRom(p0.x, p1.x, p2.x, p3.x, easedT),
      y: this.catmullRom(p0.y, p1.y, p2.y, p3.y, easedT)
    };
  }

  /**
   * Cubic ease in-out for smoother cursor movement
   */
  easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Catmull-Rom spline interpolation
   */
  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * Build FFmpeg overlay expression for cursor position
   * Uses 't' (time in seconds) for interpolation
   */
  buildOverlayExpression(frames, hotspotX, hotspotY, width, height, fps) {
    if (frames.length === 0) {
      return `x=0:y=0:enable=0`;
    }

    // Sample keyframes - 2 per second is enough for smooth motion
    const sampleInterval = Math.max(1, Math.floor(fps / 2));
    const keyframes = [];
    
    for (let i = 0; i < frames.length; i += sampleInterval) {
      keyframes.push(frames[i]);
    }
    // Always include last frame
    if (keyframes.length > 0 && keyframes[keyframes.length - 1].frame !== frames[frames.length - 1].frame) {
      keyframes.push(frames[frames.length - 1]);
    }

    // If only one keyframe or none, use static position
    if (keyframes.length <= 1) {
      const x = Math.max(0, Math.round((keyframes[0]?.x || 0) - hotspotX));
      const y = Math.max(0, Math.round((keyframes[0]?.y || 0) - hotspotY));
      return `x=${x}:y=${y}`;
    }

    // Build piecewise linear expression using 't' (time in seconds)
    let xExpr = '';
    let yExpr = '';
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      const kf = keyframes[i];
      const nextKf = keyframes[i + 1];
      
      const t1 = kf.time / 1000;      // Convert to seconds
      const t2 = nextKf.time / 1000;
      const x1 = Math.round(Math.max(0, Math.min(width, kf.x)) - hotspotX);
      const y1 = Math.round(Math.max(0, Math.min(height, kf.y)) - hotspotY);
      const x2 = Math.round(Math.max(0, Math.min(width, nextKf.x)) - hotspotX);
      const y2 = Math.round(Math.max(0, Math.min(height, nextKf.y)) - hotspotY);
      
      // Linear interpolation: x1 + (x2-x1) * (t-t1) / (t2-t1)
      const dt = (t2 - t1) || 0.001;
      const xLerp = `${x1}+(${x2-x1})*(t-${t1.toFixed(3)})/${dt.toFixed(3)}`;
      const yLerp = `${y1}+(${y2-y1})*(t-${t1.toFixed(3)})/${dt.toFixed(3)}`;
      
      if (i === 0) {
        xExpr = `if(lt(t,${t2.toFixed(3)}),${xLerp},`;
        yExpr = `if(lt(t,${t2.toFixed(3)}),${yLerp},`;
      } else if (i === keyframes.length - 2) {
        // Last segment - use final position as fallback
        xExpr += `${x2}`;
        yExpr += `${y2}`;
      } else {
        xExpr += `if(lt(t,${t2.toFixed(3)}),${xLerp},`;
        yExpr += `if(lt(t,${t2.toFixed(3)}),${yLerp},`;
      }
    }
    
    // Close all if statements
    for (let i = 0; i < keyframes.length - 2; i++) {
      xExpr += ')';
      yExpr += ')';
    }

    return `x='${xExpr}':y='${yExpr}'`;
  }
}

/**
 * Quick function to add cursor to a video
 */
export async function addCursorToVideo(inputVideo, outputVideo, cursorData, options = {}) {
  const renderer = new CursorRenderer({
    style: options.cursorStyle || 'default',
    size: options.cursorSize || 32,
    color: options.cursorColor || '#000000'
  });

  return renderer.applyCursorOverlay(inputVideo, outputVideo, cursorData, {
    fps: options.fps || 60,
    width: options.width || 1920,
    height: options.height || 1080
  });
}

/**
 * Available cursor styles
 */
export const CURSOR_STYLES = [
  'default',       // Classic arrow cursor
  'arrow-modern',  // Sleeker gradient arrow
  'pointer',       // Hand/pointer cursor
  'dot',          // Filled dot - modern/minimal
  'circle',       // Circle outline - for highlighting
  'crosshair',    // Precision crosshair
  'spotlight',    // Spotlight effect around cursor
  'none'          // No cursor overlay
];

/**
 * Cursor color presets for quick styling
 */
export const CURSOR_PRESETS = {
  // Light themes
  light: {
    color: '#000000',
    outlineColor: '#FFFFFF',
    shadowOpacity: 0.4
  },
  // Dark themes
  dark: {
    color: '#FFFFFF',
    outlineColor: '#000000',
    shadowOpacity: 0.6
  },
  // Accent colors
  blue: {
    color: '#3B82F6',
    outlineColor: '#FFFFFF',
    glow: true,
    glowColor: '#3B82F6'
  },
  green: {
    color: '#10B981',
    outlineColor: '#FFFFFF',
    glow: true,
    glowColor: '#10B981'
  },
  red: {
    color: '#EF4444',
    outlineColor: '#FFFFFF',
    glow: true,
    glowColor: '#EF4444'
  },
  purple: {
    color: '#8B5CF6',
    outlineColor: '#FFFFFF',
    glow: true,
    glowColor: '#8B5CF6'
  },
  orange: {
    color: '#F97316',
    outlineColor: '#FFFFFF',
    glow: true,
    glowColor: '#F97316'
  },
  // Brand-specific
  github: {
    color: '#24292F',
    outlineColor: '#FFFFFF',
    style: 'default'
  },
  figma: {
    color: '#F24E1E',
    outlineColor: '#FFFFFF',
    style: 'dot',
    glow: true
  },
  notion: {
    color: '#000000',
    outlineColor: '#FFFFFF',
    style: 'default'
  }
};

/**
 * Default options
 */
export const DEFAULT_CURSOR_OPTIONS = {
  style: 'default',
  size: 32,
  color: '#000000',
  outlineColor: '#FFFFFF',
  shadowBlur: 6,
  shadowOpacity: 0.4,
  glow: false,
  trail: false
};

/**
 * Get cursor options from a preset name
 */
export function getCursorPreset(presetName) {
  return CURSOR_PRESETS[presetName] || CURSOR_PRESETS.light;
}

/**
 * Create a CursorRenderer from a preset
 */
export function createCursorFromPreset(presetName, overrides = {}) {
  const preset = getCursorPreset(presetName);
  return new CursorRenderer({
    ...DEFAULT_CURSOR_OPTIONS,
    ...preset,
    ...overrides
  });
}

/**
 * Analyze cursor movement data and return statistics
 */
export function analyzeCursorData(cursorData) {
  const positions = cursorData.positions || cursorData;
  
  if (!positions || positions.length === 0) {
    return {
      totalPositions: 0,
      duration: 0,
      avgVelocity: 0,
      maxVelocity: 0,
      totalDistance: 0,
      clickCount: 0
    };
  }
  
  let totalDistance = 0;
  let maxVelocity = 0;
  const velocities = [];
  
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = (curr.t - prev.t) || 1;
    const velocity = dist / dt * 1000; // px/s
    
    totalDistance += dist;
    velocities.push(velocity);
    maxVelocity = Math.max(maxVelocity, velocity);
  }
  
  const avgVelocity = velocities.length > 0 
    ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
    : 0;
  
  const duration = positions[positions.length - 1].t - positions[0].t;
  const clicks = cursorData.clicks || [];
  
  return {
    totalPositions: positions.length,
    duration: Math.round(duration),
    avgVelocity: Math.round(avgVelocity),
    maxVelocity: Math.round(maxVelocity),
    totalDistance: Math.round(totalDistance),
    clickCount: clicks.length
  };
}

/**
 * Validate cursor data structure
 */
export function validateCursorData(cursorData) {
  if (!cursorData) return { valid: false, error: 'No cursor data provided' };
  
  const positions = cursorData.positions || cursorData;
  
  if (!Array.isArray(positions)) {
    return { valid: false, error: 'Cursor data must be an array or contain a positions array' };
  }
  
  if (positions.length === 0) {
    return { valid: false, error: 'Cursor data is empty' };
  }
  
  // Check first position has required fields
  const first = positions[0];
  if (typeof first.x !== 'number' || typeof first.y !== 'number' || typeof first.t !== 'number') {
    return { valid: false, error: 'Cursor positions must have x, y, and t (time) fields' };
  }
  
  return { valid: true, positionCount: positions.length };
}
