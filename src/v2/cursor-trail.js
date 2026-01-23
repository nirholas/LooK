import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * CursorTrailEffect - Add motion trail/blur effect to cursor movements
 * 
 * Creates a professional looking cursor trail that shows movement direction
 * and makes fast cursor movements more visible and trackable.
 * 
 * Effects available:
 * - trail: Fading dots following the cursor
 * - blur: Motion blur in direction of movement
 * - glow: Glowing trail effect
 * - comet: Comet-like tail effect
 */
export class CursorTrailEffect {
  constructor(options = {}) {
    this.effect = options.effect || 'trail';  // trail, blur, glow, comet
    this.color = options.color || '#3B82F6';
    this.length = options.length || 8;         // Number of trail segments
    this.opacity = options.opacity || 0.6;
    this.fadeRate = options.fadeRate || 0.7;   // How quickly trail fades (0-1)
    this.minVelocity = options.minVelocity || 100; // Min px/sec to show trail
  }

  /**
   * Parse hex color to RGB
   */
  parseColor(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 59, g: 130, b: 246 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  /**
   * Calculate velocity at each cursor position
   */
  calculateVelocities(positions) {
    if (!positions || positions.length < 2) return [];
    
    return positions.map((pos, i) => {
      if (i === 0) {
        return { ...pos, velocity: 0, angle: 0 };
      }
      
      const prev = positions[i - 1];
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      const dt = (pos.t - prev.t) || 1; // Avoid division by zero
      
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000; // px/sec
      const angle = Math.atan2(dy, dx);
      
      return { ...pos, velocity, angle, dx, dy };
    });
  }

  /**
   * Get trail positions for a given frame
   * Returns array of positions with opacity values
   */
  getTrailPositions(positions, frameTime, fps) {
    const frameDuration = 1000 / fps;
    const trailDuration = this.length * frameDuration;
    
    // Find positions within trail time window
    const trailStart = frameTime - trailDuration;
    const relevantPositions = positions.filter(p => 
      p.t >= trailStart && p.t <= frameTime
    );

    if (relevantPositions.length < 2) return [];

    // Sample trail points
    const trail = [];
    for (let i = 0; i < this.length; i++) {
      const t = frameTime - (i * frameDuration);
      const pos = this.interpolatePosition(relevantPositions, t);
      
      if (pos) {
        // Calculate opacity based on age (older = more faded)
        const age = i / this.length;
        const opacity = this.opacity * Math.pow(1 - age, this.fadeRate);
        
        trail.push({
          x: pos.x,
          y: pos.y,
          opacity,
          size: 8 * (1 - age * 0.5) // Smaller as it fades
        });
      }
    }

    return trail;
  }

  /**
   * Simple linear interpolation for position at time t
   */
  interpolatePosition(positions, t) {
    if (!positions || positions.length === 0) return null;
    if (positions.length === 1) return positions[0];

    // Find surrounding positions
    let i = 0;
    while (i < positions.length - 1 && positions[i + 1].t < t) i++;

    const p1 = positions[i];
    const p2 = positions[Math.min(positions.length - 1, i + 1)];

    if (p1.t === p2.t) return p1;

    const progress = (t - p1.t) / (p2.t - p1.t);
    return {
      x: p1.x + (p2.x - p1.x) * progress,
      y: p1.y + (p2.y - p1.y) * progress
    };
  }

  /**
   * Generate FFmpeg filter for cursor trail
   * Uses drawbox commands for trail dots
   */
  generateTrailFilter(cursorData, fps) {
    const positions = this.calculateVelocities(cursorData.positions || []);
    if (positions.length < 2) return '';

    const { r, g, b } = this.parseColor(this.color);
    const hexColor = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    
    const filters = [];
    const duration = positions[positions.length - 1].t;
    const frameCount = Math.ceil(duration / 1000 * fps);

    // Sample every N frames to reduce filter complexity
    const sampleRate = Math.max(1, Math.floor(fps / 15)); // ~15 trail updates per second
    
    for (let frame = 0; frame < frameCount; frame += sampleRate) {
      const frameTime = (frame / fps) * 1000;
      const pos = this.interpolatePosition(positions, frameTime);
      
      if (!pos) continue;

      // Find velocity at this point
      const nearestPos = positions.reduce((nearest, p) => 
        Math.abs(p.t - frameTime) < Math.abs(nearest.t - frameTime) ? p : nearest
      , positions[0]);

      // Only show trail when moving fast enough
      if (nearestPos.velocity < this.minVelocity) continue;

      // Create trail dots
      for (let t = 1; t <= 3; t++) {
        const trailTime = frameTime - (t * 50); // 50ms between trail dots
        const trailPos = this.interpolatePosition(positions, trailTime);
        
        if (!trailPos) continue;

        const opacity = (this.opacity * (1 - t / 4)).toFixed(2);
        const size = Math.max(2, 6 - t);
        
        const startFrame = frame;
        const endFrame = Math.min(frameCount, frame + sampleRate);

        filters.push(
          `drawbox=x=${Math.round(trailPos.x) - size/2}:y=${Math.round(trailPos.y) - size/2}:` +
          `w=${size}:h=${size}:c=0x${hexColor}@${opacity}:t=fill:` +
          `enable='between(n,${startFrame},${endFrame})'`
        );
      }
    }

    return filters.slice(0, 500).join(','); // Limit to prevent filter overflow
  }

  /**
   * Generate SVG for trail effect (for overlay approach)
   */
  generateTrailSVG(trailPositions, width, height) {
    const { r, g, b } = this.parseColor(this.color);
    
    if (!trailPositions || trailPositions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"/>`;
    }

    let circles = '';
    for (const pos of trailPositions) {
      circles += `
        <circle cx="${pos.x}" cy="${pos.y}" r="${pos.size}" 
          fill="rgba(${r},${g},${b},${pos.opacity})" />
      `;
    }

    // Add glow effect if using glow mode
    let defs = '';
    if (this.effect === 'glow') {
      defs = `
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      `;
      circles = `<g filter="url(#glow)">${circles}</g>`;
    }

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      ${circles}
    </svg>`;
  }
}

/**
 * Apply cursor trail effect to video
 */
export async function applyCursorTrail(inputVideo, cursorData, outputPath, options = {}) {
  const {
    effect = 'trail',
    color = '#3B82F6',
    length = 8,
    opacity = 0.5,
    fps = 60,
    ...restOptions
  } = options;

  const renderer = new CursorTrailEffect({
    effect,
    color,
    length,
    opacity
  });

  const filter = renderer.generateTrailFilter(cursorData, fps);
  
  if (!filter) {
    // No trail needed, copy input
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  const cmd = `ffmpeg -y -i "${inputVideo}" \
    -vf "${filter}" \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
    "${outputPath}"`;

  try {
    await execAsync(cmd, { timeout: 300000 });
  } catch (error) {
    console.warn('Cursor trail failed, copying original:', error.message);
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
  }

  return outputPath;
}

export default CursorTrailEffect;
