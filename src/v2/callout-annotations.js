/**
 * CalloutAnnotations - Draw arrows, boxes, and labels pointing to UI elements
 * 
 * Features:
 * - Animated arrows with customizable styles
 * - Highlight boxes around elements
 * - Text labels with backgrounds
 * - Number badges for steps
 * - Pulse/glow effects
 * - Auto-positioning to avoid overlaps
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { escapeXml as escapeXmlUtil } from './utils.js';

const execAsync = promisify(exec);

/**
 * Callout types
 */
export const CalloutType = {
  ARROW: 'arrow',
  BOX: 'box',
  CIRCLE: 'circle',
  UNDERLINE: 'underline',
  BADGE: 'badge',
  SPOTLIGHT: 'spotlight'
};

/**
 * Arrow styles
 */
export const ArrowStyle = {
  CURVED: 'curved',
  STRAIGHT: 'straight',
  ELBOW: 'elbow',
  HAND_DRAWN: 'hand-drawn'
};

/**
 * Default annotation style
 */
const DEFAULT_STYLE = {
  color: '#FF6B6B',
  strokeWidth: 3,
  fontSize: 20,
  fontWeight: 'bold',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  padding: 12,
  borderRadius: 8,
  arrowSize: 12,
  glowColor: 'rgba(255, 107, 107, 0.5)',
  glowSize: 15
};

/**
 * Color presets
 */
export const AnnotationColors = {
  red: '#FF6B6B',
  blue: '#4ECDC4',
  yellow: '#FFE66D',
  green: '#95E1D3',
  purple: '#A06CD5',
  orange: '#FF9F43',
  white: '#FFFFFF',
  black: '#1A1A1A'
};

/**
 * Callout Annotation Renderer
 */
export class CalloutRenderer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.style = { ...DEFAULT_STYLE, ...options.style };
    this.annotations = [];
  }

  /**
   * Add an arrow annotation
   */
  addArrow(options) {
    this.annotations.push({
      type: CalloutType.ARROW,
      from: options.from,              // {x, y} or 'auto'
      to: options.to,                  // {x, y} target point
      label: options.label || '',
      labelPosition: options.labelPosition || 'start', // start, end, middle
      arrowStyle: options.arrowStyle || ArrowStyle.CURVED,
      color: options.color || this.style.color,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999,
      animated: options.animated !== false
    });
  }

  /**
   * Add a highlight box
   */
  addBox(options) {
    this.annotations.push({
      type: CalloutType.BOX,
      bounds: options.bounds,          // {x, y, width, height}
      label: options.label || '',
      labelPosition: options.labelPosition || 'top', // top, bottom, left, right
      color: options.color || this.style.color,
      pulse: options.pulse || false,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999
    });
  }

  /**
   * Add a circle highlight
   */
  addCircle(options) {
    this.annotations.push({
      type: CalloutType.CIRCLE,
      center: options.center,          // {x, y}
      radius: options.radius || 50,
      label: options.label || '',
      color: options.color || this.style.color,
      pulse: options.pulse || true,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999
    });
  }

  /**
   * Add a numbered step badge
   */
  addBadge(options) {
    this.annotations.push({
      type: CalloutType.BADGE,
      position: options.position,      // {x, y}
      number: options.number,
      label: options.label || '',
      color: options.color || this.style.color,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999
    });
  }

  /**
   * Add spotlight effect (darkens everything except target)
   */
  addSpotlight(options) {
    this.annotations.push({
      type: CalloutType.SPOTLIGHT,
      bounds: options.bounds,          // {x, y, width, height}
      padding: options.padding || 20,
      borderRadius: options.borderRadius || 12,
      darkness: options.darkness || 0.7,
      startTime: options.startTime || 0,
      endTime: options.endTime || 999
    });
  }

  /**
   * Generate annotation frames
   */
  async generateFrames(outputDir, duration) {
    await mkdir(outputDir, { recursive: true });

    const totalFrames = Math.ceil(duration * this.fps);
    const framePaths = [];

    console.log(`  Generating ${totalFrames} annotation frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      const framePath = join(outputDir, `annotation_${frame.toString().padStart(6, '0')}.png`);
      
      await this.renderFrame(time, framePath);
      framePaths.push(framePath);

      if (frame % 30 === 0) {
        process.stdout.write(`\r  Annotation frame ${frame}/${totalFrames}`);
      }
    }
    console.log();

    return framePaths;
  }

  /**
   * Render a single frame
   */
  async renderFrame(time, outputPath) {
    const activeAnnotations = this.annotations.filter(
      a => time >= a.startTime && time <= a.endTime
    );

    if (activeAnnotations.length === 0) {
      const svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
      await sharp(Buffer.from(svg)).png().toFile(outputPath);
      return;
    }

    const svg = this.generateSVG(activeAnnotations, time);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
  }

  /**
   * Generate SVG for all active annotations
   */
  generateSVG(annotations, time) {
    let svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add filters and gradients
    svg += this.generateDefs();

    // Render spotlights first (they go underneath)
    for (const annotation of annotations) {
      if (annotation.type === CalloutType.SPOTLIGHT) {
        svg += this.renderSpotlight(annotation, time);
      }
    }

    // Render other annotations
    for (const annotation of annotations) {
      const elapsed = time - annotation.startTime;
      const animationProgress = Math.min(1, elapsed / 0.3); // 0.3s animation

      switch (annotation.type) {
        case CalloutType.ARROW:
          svg += this.renderArrow(annotation, animationProgress, time);
          break;
        case CalloutType.BOX:
          svg += this.renderBox(annotation, animationProgress, time);
          break;
        case CalloutType.CIRCLE:
          svg += this.renderCircle(annotation, animationProgress, time);
          break;
        case CalloutType.BADGE:
          svg += this.renderBadge(annotation, animationProgress);
          break;
      }
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Generate SVG defs (filters, gradients)
   */
  generateDefs() {
    return `
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${this.style.glowSize}" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.4"/>
        </filter>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/>
        </marker>
      </defs>
    `;
  }

  /**
   * Render arrow annotation
   */
  renderArrow(annotation, progress, time) {
    const { from, to, label, arrowStyle, color, animated, labelPosition } = annotation;
    const { strokeWidth, fontSize, backgroundColor, padding, borderRadius } = this.style;

    // Calculate arrow path
    const path = this.calculateArrowPath(from, to, arrowStyle);
    
    // Animate dash offset for drawing effect
    const pathLength = this.estimatePathLength(from, to);
    const dashOffset = animated ? pathLength * (1 - progress) : 0;

    let svg = `<g>`;

    // Arrow line with glow
    svg += `
      <path d="${path}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="${strokeWidth + 4}"
            stroke-opacity="0.3"
            stroke-linecap="round"
            stroke-dasharray="${pathLength}"
            stroke-dashoffset="${dashOffset}"
            filter="url(#glow)"/>
      <path d="${path}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
            marker-end="url(#arrowhead)"
            stroke-dasharray="${pathLength}"
            stroke-dashoffset="${dashOffset}"
            style="color: ${color}"/>
    `;

    // Label
    if (label && progress > 0.5) {
      const labelOpacity = Math.min(1, (progress - 0.5) * 4);
      const labelPos = this.calculateLabelPosition(from, to, labelPosition);
      svg += this.renderLabel(label, labelPos.x, labelPos.y, color, labelOpacity);
    }

    svg += `</g>`;
    return svg;
  }

  /**
   * Calculate arrow path based on style
   */
  calculateArrowPath(from, to, style) {
    const startX = from.x * this.width;
    const startY = from.y * this.height;
    const endX = to.x * this.width;
    const endY = to.y * this.height;

    switch (style) {
      case ArrowStyle.CURVED:
        // Bezier curve
        const midX = (startX + endX) / 2;
        const midY = Math.min(startY, endY) - 50;
        return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

      case ArrowStyle.ELBOW:
        // L-shaped path
        return `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;

      case ArrowStyle.HAND_DRAWN:
        // Slightly wobbly path
        const wobble1 = (startX + endX) / 2 + (Math.random() - 0.5) * 20;
        const wobble2 = (startY + endY) / 2 + (Math.random() - 0.5) * 20;
        return `M ${startX} ${startY} C ${wobble1} ${startY} ${wobble2} ${endY} ${endX} ${endY}`;

      case ArrowStyle.STRAIGHT:
      default:
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }
  }

  /**
   * Estimate path length for animation
   */
  estimatePathLength(from, to) {
    const dx = (to.x - from.x) * this.width;
    const dy = (to.y - from.y) * this.height;
    return Math.sqrt(dx * dx + dy * dy) * 1.2; // 1.2 for curves
  }

  /**
   * Calculate label position
   */
  calculateLabelPosition(from, to, position) {
    switch (position) {
      case 'end':
        return { x: to.x * this.width, y: to.y * this.height - 30 };
      case 'middle':
        return { 
          x: ((from.x + to.x) / 2) * this.width, 
          y: ((from.y + to.y) / 2) * this.height - 20 
        };
      case 'start':
      default:
        return { x: from.x * this.width, y: from.y * this.height - 30 };
    }
  }

  /**
   * Render highlight box
   */
  renderBox(annotation, progress, time) {
    const { bounds, label, color, pulse, labelPosition } = annotation;
    const { strokeWidth, borderRadius } = this.style;

    const x = bounds.x * this.width;
    const y = bounds.y * this.height;
    const w = bounds.width * this.width;
    const h = bounds.height * this.height;

    // Pulse animation
    const pulseScale = pulse ? 1 + 0.02 * Math.sin(time * 6) : 1;
    const pulseOpacity = pulse ? 0.8 + 0.2 * Math.sin(time * 6) : 1;

    let svg = `<g transform="translate(${x + w/2}, ${y + h/2}) scale(${pulseScale * progress}) translate(${-(x + w/2)}, ${-(y + h/2)})" opacity="${progress}">`;

    // Box outline with glow
    svg += `
      <rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}"
            rx="${borderRadius + 4}" ry="${borderRadius + 4}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth + 6}"
            stroke-opacity="0.3" filter="url(#glow)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}"
            rx="${borderRadius}" ry="${borderRadius}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}"
            stroke-opacity="${pulseOpacity}"/>
    `;

    // Label
    if (label) {
      const labelY = labelPosition === 'bottom' ? y + h + 30 : y - 15;
      svg += this.renderLabel(label, x + w/2, labelY, color, progress);
    }

    svg += `</g>`;
    return svg;
  }

  /**
   * Render circle highlight
   */
  renderCircle(annotation, progress, time) {
    const { center, radius, label, color, pulse } = annotation;
    const { strokeWidth } = this.style;

    const cx = center.x * this.width;
    const cy = center.y * this.height;
    const r = radius * progress;

    const pulseR = pulse ? r + 3 * Math.sin(time * 6) : r;
    const pulseOpacity = pulse ? 0.7 + 0.3 * Math.sin(time * 6) : 1;

    let svg = `<g opacity="${progress}">`;

    // Circle with glow
    svg += `
      <circle cx="${cx}" cy="${cy}" r="${pulseR + 6}"
              fill="none" stroke="${color}" stroke-width="${strokeWidth + 4}"
              stroke-opacity="0.3" filter="url(#glow)"/>
      <circle cx="${cx}" cy="${cy}" r="${pulseR}"
              fill="none" stroke="${color}" stroke-width="${strokeWidth}"
              stroke-opacity="${pulseOpacity}"/>
    `;

    // Label
    if (label) {
      svg += this.renderLabel(label, cx, cy - r - 20, color, progress);
    }

    svg += `</g>`;
    return svg;
  }

  /**
   * Render numbered badge
   */
  renderBadge(annotation, progress) {
    const { position, number, label, color } = annotation;
    const { fontSize, backgroundColor, padding, borderRadius } = this.style;

    const x = position.x * this.width;
    const y = position.y * this.height;
    const badgeSize = fontSize * 1.8;

    let svg = `<g opacity="${progress}" transform="scale(${progress})" transform-origin="${x} ${y}">`;

    // Badge circle
    svg += `
      <circle cx="${x}" cy="${y}" r="${badgeSize / 2}"
              fill="${color}" filter="url(#shadow)"/>
      <text x="${x}" y="${y + fontSize * 0.35}"
            font-family="Inter, sans-serif" font-size="${fontSize}px" font-weight="bold"
            fill="white" text-anchor="middle">
        ${number}
      </text>
    `;

    // Label
    if (label) {
      svg += this.renderLabel(label, x + badgeSize, y, color, progress);
    }

    svg += `</g>`;
    return svg;
  }

  /**
   * Render spotlight effect
   */
  renderSpotlight(annotation, time) {
    const { bounds, padding, borderRadius, darkness } = annotation;

    const x = bounds.x * this.width - padding;
    const y = bounds.y * this.height - padding;
    const w = bounds.width * this.width + padding * 2;
    const h = bounds.height * this.height + padding * 2;

    // Create a mask that darkens everything except the spotlight area
    return `
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white"/>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" 
                rx="${borderRadius}" ry="${borderRadius}" fill="black"/>
        </mask>
      </defs>
      <rect width="100%" height="100%" 
            fill="black" fill-opacity="${darkness}" 
            mask="url(#spotlight-mask)"/>
    `;
  }

  /**
   * Render text label with background
   */
  renderLabel(text, x, y, color, opacity = 1) {
    const { fontSize, backgroundColor, padding, borderRadius } = this.style;
    const textWidth = text.length * fontSize * 0.55;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 1.5;

    return `
      <g opacity="${opacity}">
        <rect x="${x - boxWidth/2}" y="${y - boxHeight/2}" 
              width="${boxWidth}" height="${boxHeight}"
              rx="${borderRadius}" ry="${borderRadius}"
              fill="${backgroundColor}" filter="url(#shadow)"/>
        <text x="${x}" y="${y + fontSize * 0.3}"
              font-family="Inter, -apple-system, sans-serif"
              font-size="${fontSize}px" font-weight="600"
              fill="${color}" text-anchor="middle">
          ${this.escapeXml(text)}
        </text>
      </g>
    `;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return escapeXmlUtil(text);
  }

  /**
   * Apply annotations to video
   */
  async applyToVideo(inputVideo, annotationFramesDir, outputPath) {
    const annotationVideoPath = join(tmpdir(), `annotations_${Date.now()}.mov`);
    
    await execAsync(
      `ffmpeg -y -framerate ${this.fps} -i "${annotationFramesDir}/annotation_%06d.png" ` +
      `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${annotationVideoPath}"`,
      { timeout: 300000 }
    );

    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -i "${annotationVideoPath}" ` +
      `-filter_complex "[0:v][1:v]overlay=0:0:format=auto[out]" ` +
      `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${outputPath}"`,
      { timeout: 300000 }
    );

    return outputPath;
  }
}

/**
 * Add callout annotations to video
 */
export async function addCallouts(inputVideo, outputPath, annotations, options = {}) {
  if (!annotations || annotations.length === 0) {
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

  // Create renderer
  const renderer = new CalloutRenderer({ width, height, fps, ...options });

  // Add annotations
  for (const a of annotations) {
    switch (a.type) {
      case CalloutType.ARROW:
        renderer.addArrow(a);
        break;
      case CalloutType.BOX:
        renderer.addBox(a);
        break;
      case CalloutType.CIRCLE:
        renderer.addCircle(a);
        break;
      case CalloutType.BADGE:
        renderer.addBadge(a);
        break;
      case CalloutType.SPOTLIGHT:
        renderer.addSpotlight(a);
        break;
    }
  }

  // Generate and apply
  const tempDir = join(tmpdir(), `callouts_${Date.now()}`);
  await renderer.generateFrames(tempDir, duration);
  await renderer.applyToVideo(inputVideo, tempDir, outputPath);

  // Cleanup
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch {}

  return outputPath;
}

export default CalloutRenderer;
