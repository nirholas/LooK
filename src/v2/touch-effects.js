import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * TouchEffectRenderer - Generate touch visualization effects for mobile demos
 * Creates touch indicators, swipe trails, and gesture animations
 */
export class TouchEffectRenderer {
  constructor(options = {}) {
    this.indicator = options.indicator || 'circle';    // circle, finger, ripple, dot
    this.color = options.color || 'rgba(255,255,255,0.8)';
    this.size = options.size || 80;                    // Touch indicator size
    this.swipeTrailWidth = options.swipeTrailWidth || 6;
    this.swipeTrailColor = options.swipeTrailColor || 'rgba(255,255,255,0.6)';
    this.showSwipeTrail = options.showSwipeTrail !== false;
    this.showTapRipple = options.showTapRipple !== false;
    this.rippleDuration = options.rippleDuration || 400;  // ms
  }

  /**
   * Parse color string to RGBA values
   */
  parseColor(colorStr) {
    // Handle rgba format
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
        a: parseFloat(rgbaMatch[4] ?? 1)
      };
    }

    // Handle hex format
    const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
        a: 1
      };
    }

    // Default white
    return { r: 255, g: 255, b: 255, a: 0.8 };
  }

  /**
   * Generate touch indicator overlay frames
   */
  async generateTouchOverlay(touchFrames, fps, width, height, tempDir) {
    const overlayDir = join(tempDir, 'touch-overlay');
    await mkdir(overlayDir, { recursive: true });

    // Generate each frame
    for (let i = 0; i < touchFrames.length; i++) {
      const frame = touchFrames[i];
      const framePath = join(overlayDir, `frame_${String(i).padStart(6, '0')}.png`);
      
      await this.renderFrame(frame, width, height, framePath);
    }

    // Compile frames to video with transparency
    const outputPath = join(tempDir, 'touch-overlay.mov');
    const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${overlayDir}/frame_%06d.png" \
      -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le \
      "${outputPath}"`;

    try {
      await execAsync(ffmpegCmd, { timeout: 300000 });
    } catch (error) {
      // Fallback to webm
      const webmPath = join(tempDir, 'touch-overlay.webm');
      const webmCmd = `ffmpeg -y -framerate ${fps} -i "${overlayDir}/frame_%06d.png" \
        -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 \
        "${webmPath}"`;
      await execAsync(webmCmd, { timeout: 300000 });
      return webmPath;
    }

    return outputPath;
  }

  /**
   * Render a single overlay frame
   */
  async renderFrame(frame, width, height, outputPath) {
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add blur filter
    svgContent += `
      <defs>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
        </filter>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
        </filter>
      </defs>
    `;

    // Draw swipe trail if active
    if (frame.gesture && frame.gesture.type === 'swipe' && this.showSwipeTrail) {
      svgContent += this.renderSwipeTrailSVG(frame.gesture, frame.time);
    }

    // Draw touch indicator if active
    if (frame.active && frame.x !== null && frame.y !== null) {
      svgContent += this.renderTouchIndicatorSVG(frame.x, frame.y);
    }

    // Draw tap ripple effect
    if (frame.gesture && 
        (frame.gesture.type === 'tap' || frame.gesture.type === 'double_tap') && 
        this.showTapRipple) {
      const elapsed = frame.time - frame.gesture.t;
      if (elapsed >= 0 && elapsed < this.rippleDuration) {
        const progress = elapsed / this.rippleDuration;
        svgContent += this.renderTapRippleSVG(frame.gesture.x, frame.gesture.y, progress);
      }
    }

    svgContent += '</svg>';

    // Create PNG from SVG
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(outputPath);
  }

  /**
   * Render touch indicator SVG
   */
  renderTouchIndicatorSVG(x, y) {
    const color = this.parseColor(this.color);
    const { r, g, b, a } = color;
    const size = this.size;

    switch (this.indicator) {
      case 'circle':
        return `
          <!-- Outer glow -->
          <circle cx="${x}" cy="${y}" r="${size * 0.5}" 
            fill="rgba(${r},${g},${b},${a * 0.2})" filter="url(#blur)"/>
          <!-- Main circle -->
          <circle cx="${x}" cy="${y}" r="${size * 0.35}" 
            fill="rgba(${r},${g},${b},${a * 0.5})" filter="url(#softBlur)"/>
          <!-- Center dot -->
          <circle cx="${x}" cy="${y}" r="${size * 0.15}" 
            fill="rgba(${r},${g},${b},${a * 0.9})"/>
        `;

      case 'dot':
        return `
          <circle cx="${x}" cy="${y}" r="${size * 0.25}" 
            fill="rgba(${r},${g},${b},${a})" filter="url(#softBlur)"/>
        `;

      case 'finger':
        // Oval shape like a finger tip
        return `
          <!-- Shadow -->
          <ellipse cx="${x + 3}" cy="${y + 3}" rx="${size * 0.3}" ry="${size * 0.4}" 
            fill="rgba(0,0,0,0.2)" filter="url(#blur)"/>
          <!-- Finger shape -->
          <ellipse cx="${x}" cy="${y}" rx="${size * 0.3}" ry="${size * 0.4}" 
            fill="rgba(${r},${g},${b},${a})"/>
          <!-- Highlight -->
          <ellipse cx="${x - size * 0.08}" cy="${y - size * 0.1}" rx="${size * 0.12}" ry="${size * 0.15}" 
            fill="rgba(255,255,255,0.4)"/>
        `;

      case 'ripple':
      default:
        return `
          <!-- Animated ripple indicator -->
          <circle cx="${x}" cy="${y}" r="${size * 0.4}" 
            fill="none" stroke="rgba(${r},${g},${b},${a})" stroke-width="3"/>
          <circle cx="${x}" cy="${y}" r="${size * 0.2}" 
            fill="rgba(${r},${g},${b},${a * 0.6})"/>
        `;
    }
  }

  /**
   * Render tap ripple effect SVG
   */
  renderTapRippleSVG(x, y, progress) {
    const color = this.parseColor(this.color);
    const { r, g, b } = color;
    
    // Ease-out expansion
    const radius = this.size * (1 - Math.pow(1 - progress, 3));
    // Fade out
    const opacity = 0.6 * (1 - progress);
    // Ring gets thinner
    const strokeWidth = Math.max(2, 6 * (1 - progress));

    return `
      <!-- Inner glow -->
      <circle cx="${x}" cy="${y}" r="${radius * 0.4}" 
        fill="rgba(${r},${g},${b},${opacity * 0.4})" filter="url(#blur)"/>
      <!-- Ripple ring -->
      <circle cx="${x}" cy="${y}" r="${radius}" 
        fill="none" stroke="rgba(${r},${g},${b},${opacity})" 
        stroke-width="${strokeWidth}"/>
      <!-- Outer glow -->
      <circle cx="${x}" cy="${y}" r="${radius + 4}" 
        fill="none" stroke="rgba(255,255,255,${opacity * 0.3})" 
        stroke-width="2" filter="url(#blur)"/>
    `;
  }

  /**
   * Render swipe trail SVG
   */
  renderSwipeTrailSVG(gesture, currentTime) {
    const color = this.parseColor(this.swipeTrailColor);
    const { r, g, b, a } = color;
    
    const elapsed = currentTime - gesture.t;
    const progress = Math.min(1, elapsed / gesture.duration);
    
    // Calculate current position along swipe
    const currentX = gesture.startX + (gesture.endX - gesture.startX) * progress;
    const currentY = gesture.startY + (gesture.endY - gesture.startY) * progress;
    
    // Trail fades in and out
    const trailOpacity = a * Math.min(1, elapsed / 100) * Math.max(0, 1 - (elapsed - gesture.duration) / 200);
    
    if (trailOpacity <= 0) return '';

    // Draw trail from start to current position
    let svg = `
      <!-- Swipe trail line -->
      <line x1="${gesture.startX}" y1="${gesture.startY}" 
            x2="${currentX}" y2="${currentY}"
            stroke="rgba(${r},${g},${b},${trailOpacity})" 
            stroke-width="${this.swipeTrailWidth}"
            stroke-linecap="round"/>
      
      <!-- Trail glow -->
      <line x1="${gesture.startX}" y1="${gesture.startY}" 
            x2="${currentX}" y2="${currentY}"
            stroke="rgba(${r},${g},${b},${trailOpacity * 0.4})" 
            stroke-width="${this.swipeTrailWidth + 4}"
            stroke-linecap="round"
            filter="url(#blur)"/>
    `;

    // Add arrow head at the end if swipe is complete
    if (progress >= 0.95) {
      svg += this.renderArrowHeadSVG(gesture.startX, gesture.startY, 
                                      gesture.endX, gesture.endY, 
                                      r, g, b, trailOpacity);
    }

    return svg;
  }

  /**
   * Render arrow head for swipe direction
   */
  renderArrowHeadSVG(startX, startY, endX, endY, r, g, b, opacity) {
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = 15;
    const arrowAngle = Math.PI / 6; // 30 degrees

    const x1 = endX - arrowSize * Math.cos(angle - arrowAngle);
    const y1 = endY - arrowSize * Math.sin(angle - arrowAngle);
    const x2 = endX - arrowSize * Math.cos(angle + arrowAngle);
    const y2 = endY - arrowSize * Math.sin(angle + arrowAngle);

    return `
      <polygon points="${endX},${endY} ${x1},${y1} ${x2},${y2}"
        fill="rgba(${r},${g},${b},${opacity})"/>
    `;
  }

  /**
   * Generate FFmpeg filter complex for overlaying touch effects
   */
  generateFFmpegFilter(touchOverlayPath, videoWidth, videoHeight) {
    return `[0:v][1:v]overlay=0:0:enable='between(t,0,9999)':format=auto`;
  }

  /**
   * Apply touch overlay to video using FFmpeg
   */
  async applyOverlay(videoPath, overlayPath, outputPath) {
    const filter = `[0:v][1:v]overlay=0:0:format=auto`;
    
    const cmd = `ffmpeg -y -i "${videoPath}" -i "${overlayPath}" \
      -filter_complex "${filter}" \
      -c:v libx264 -preset fast -crf 18 \
      -c:a copy \
      "${outputPath}"`;

    await execAsync(cmd, { timeout: 300000 });
    return outputPath;
  }
}

/**
 * Convenience function to add touch effects to a video
 */
export async function addTouchEffects(videoPath, touchData, options = {}) {
  const {
    fps = 60,
    width = 1920,
    height = 1080,
    tempDir,
    outputPath
  } = options;

  const renderer = new TouchEffectRenderer(options);
  
  // Get frames from touch data
  const duration = touchData.duration || touchData.touches[touchData.touches.length - 1]?.t || 0;
  const frames = touchData.getFrames ? touchData.getFrames(duration) : [];
  
  if (frames.length === 0) {
    // No touch data, return original video
    return videoPath;
  }

  // Generate overlay
  const overlayPath = await renderer.generateTouchOverlay(frames, fps, width, height, tempDir);
  
  // Apply overlay
  return await renderer.applyOverlay(videoPath, overlayPath, outputPath);
}

export default TouchEffectRenderer;
