/**
 * Lower Thirds - Professional name/title overlays
 * 
 * Features:
 * - Multiple animation styles (slide, fade, reveal)
 * - Customizable colors and typography
 * - Brand-consistent templates
 * - Multi-line support
 * - Social media handles
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * Animation styles for lower thirds
 */
export const LowerThirdStyle = {
  SLIDE_LEFT: 'slide_left',
  SLIDE_RIGHT: 'slide_right',
  SLIDE_UP: 'slide_up',
  FADE: 'fade',
  REVEAL: 'reveal',
  TYPEWRITER: 'typewriter',
  SPLIT: 'split',
  MINIMAL: 'minimal'
};

/**
 * Preset themes
 */
export const LowerThirdTheme = {
  MODERN: {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    textColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    accentColor: '#60A5FA',
    fontFamily: 'Inter, -apple-system, sans-serif',
    borderRadius: 8
  },
  CORPORATE: {
    primaryColor: '#1F2937',
    secondaryColor: '#374151',
    textColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    accentColor: '#10B981',
    fontFamily: 'Inter, -apple-system, sans-serif',
    borderRadius: 4
  },
  CREATIVE: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#6D28D9',
    textColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(91, 33, 182, 0.95)',
    accentColor: '#F472B6',
    fontFamily: 'Inter, -apple-system, sans-serif',
    borderRadius: 16
  },
  TECH: {
    primaryColor: '#06B6D4',
    secondaryColor: '#0891B2',
    textColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(8, 47, 73, 0.95)',
    accentColor: '#22D3EE',
    fontFamily: 'JetBrains Mono, monospace',
    borderRadius: 0
  },
  MINIMAL: {
    primaryColor: 'transparent',
    secondaryColor: 'transparent',
    textColor: '#FFFFFF',
    subtitleColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    accentColor: '#FFFFFF',
    fontFamily: 'Inter, -apple-system, sans-serif',
    borderRadius: 0
  }
};

/**
 * Lower Third Renderer
 */
export class LowerThirdRenderer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.theme = options.theme || LowerThirdTheme.MODERN;
    this.position = options.position || 'bottom-left'; // bottom-left, bottom-right, bottom-center
    this.margin = options.margin || { x: 60, y: 100 };
    this.lowerThirds = [];
  }

  /**
   * Add a lower third
   */
  add(options) {
    this.lowerThirds.push({
      name: options.name,
      title: options.title || '',
      subtitle: options.subtitle || '',
      social: options.social || null, // @handle
      logo: options.logo || null,
      style: options.style || LowerThirdStyle.SLIDE_LEFT,
      startTime: options.startTime || 0,
      duration: options.duration || 5,
      fadeIn: options.fadeIn || 0.5,
      fadeOut: options.fadeOut || 0.5,
      holdTime: options.holdTime || null // Auto-calculated if not set
    });
  }

  /**
   * Generate frames for all lower thirds
   */
  async generateFrames(outputDir, videoDuration) {
    await mkdir(outputDir, { recursive: true });

    const totalFrames = Math.ceil(videoDuration * this.fps);
    const framePaths = [];

    console.log(`  Generating ${totalFrames} lower third frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      const framePath = join(outputDir, `lt_${frame.toString().padStart(6, '0')}.png`);
      
      await this.renderFrame(time, framePath);
      framePaths.push(framePath);

      if (frame % 30 === 0) {
        process.stdout.write(`\r  Lower third frame ${frame}/${totalFrames}`);
      }
    }
    console.log();

    return framePaths;
  }

  /**
   * Render a single frame
   */
  async renderFrame(time, outputPath) {
    const activeLTs = this.getActiveLowerThirds(time);
    const svg = this.generateSVG(activeLTs, time);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
  }

  /**
   * Get active lower thirds at time
   */
  getActiveLowerThirds(time) {
    return this.lowerThirds
      .filter(lt => time >= lt.startTime && time <= lt.startTime + lt.duration)
      .map(lt => {
        const localTime = time - lt.startTime;
        const holdTime = lt.holdTime || (lt.duration - lt.fadeIn - lt.fadeOut);
        
        // Calculate animation progress
        let progress = 0;
        let opacity = 1;

        if (localTime < lt.fadeIn) {
          // Fading in
          progress = localTime / lt.fadeIn;
          opacity = progress;
        } else if (localTime > lt.fadeIn + holdTime) {
          // Fading out
          const fadeOutProgress = (localTime - lt.fadeIn - holdTime) / lt.fadeOut;
          progress = 1;
          opacity = 1 - fadeOutProgress;
        } else {
          // Holding
          progress = 1;
          opacity = 1;
        }

        return { ...lt, progress, opacity, localTime };
      })
      .filter(lt => lt.opacity > 0);
  }

  /**
   * Generate SVG for lower thirds
   */
  generateSVG(lowerThirds, time) {
    let svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">`;

    for (const lt of lowerThirds) {
      svg += this.renderLowerThird(lt);
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Render individual lower third
   */
  renderLowerThird(lt) {
    const { name, title, subtitle, social, style, progress, opacity } = lt;
    const theme = this.theme;

    // Calculate dimensions
    const padding = { x: 24, y: 16 };
    const fontSize = { name: 32, title: 20, subtitle: 16, social: 16 };
    const lineHeight = 1.3;

    const nameWidth = name.length * fontSize.name * 0.55;
    const titleWidth = title ? title.length * fontSize.title * 0.55 : 0;
    const subtitleWidth = subtitle ? subtitle.length * fontSize.subtitle * 0.55 : 0;
    const socialWidth = social ? social.length * fontSize.social * 0.55 : 0;

    const contentWidth = Math.max(nameWidth, titleWidth, subtitleWidth, socialWidth) + padding.x * 2;
    const accentWidth = 6;
    const totalWidth = contentWidth + accentWidth;

    let contentHeight = padding.y * 2 + fontSize.name * lineHeight;
    if (title) contentHeight += fontSize.title * lineHeight + 4;
    if (subtitle) contentHeight += fontSize.subtitle * lineHeight + 2;
    if (social) contentHeight += fontSize.social * lineHeight + 8;

    // Calculate position
    let x = this.margin.x;
    let y = this.height - this.margin.y - contentHeight;

    if (this.position === 'bottom-right') {
      x = this.width - this.margin.x - totalWidth;
    } else if (this.position === 'bottom-center') {
      x = (this.width - totalWidth) / 2;
    }

    // Apply animation transform
    let transform = '';
    let clipPath = '';

    switch (style) {
      case LowerThirdStyle.SLIDE_LEFT:
        const slideX = (1 - progress) * totalWidth;
        transform = `transform="translate(${-slideX}, 0)"`;
        break;
      case LowerThirdStyle.SLIDE_RIGHT:
        transform = `transform="translate(${(1 - progress) * totalWidth}, 0)"`;
        break;
      case LowerThirdStyle.SLIDE_UP:
        transform = `transform="translate(0, ${(1 - progress) * contentHeight})"`;
        break;
      case LowerThirdStyle.REVEAL:
        clipPath = `clip-path="inset(0 ${(1 - progress) * 100}% 0 0)"`;
        break;
      case LowerThirdStyle.SPLIT:
        // Name comes from left, title from right
        break;
    }

    let svg = `<g opacity="${opacity}" ${transform}>`;

    // Background
    svg += `
      <rect x="${x}" y="${y}" width="${totalWidth}" height="${contentHeight}"
            rx="${theme.borderRadius}" ry="${theme.borderRadius}"
            fill="${theme.backgroundColor}" ${clipPath}/>
    `;

    // Accent bar
    svg += `
      <rect x="${x}" y="${y}" width="${accentWidth}" height="${contentHeight}"
            rx="${theme.borderRadius}" ry="${theme.borderRadius}"
            fill="${theme.primaryColor}"/>
    `;

    // Content
    let textY = y + padding.y + fontSize.name * 0.8;
    const textX = x + accentWidth + padding.x;

    // Name
    svg += `
      <text x="${textX}" y="${textY}"
            font-family="${theme.fontFamily}"
            font-size="${fontSize.name}px" font-weight="700"
            fill="${theme.textColor}">
        ${this.escapeXml(name)}
      </text>
    `;

    // Title
    if (title) {
      textY += fontSize.name * lineHeight * 0.7 + 4;
      svg += `
        <text x="${textX}" y="${textY}"
              font-family="${theme.fontFamily}"
              font-size="${fontSize.title}px" font-weight="500"
              fill="${theme.subtitleColor}">
          ${this.escapeXml(title)}
        </text>
      `;
    }

    // Subtitle
    if (subtitle) {
      textY += (title ? fontSize.title : fontSize.name) * lineHeight * 0.7 + 2;
      svg += `
        <text x="${textX}" y="${textY}"
              font-family="${theme.fontFamily}"
              font-size="${fontSize.subtitle}px" font-weight="400"
              fill="${theme.subtitleColor}">
          ${this.escapeXml(subtitle)}
        </text>
      `;
    }

    // Social handle
    if (social) {
      textY += fontSize.subtitle * lineHeight + 8;
      svg += `
        <text x="${textX}" y="${textY}"
              font-family="${theme.fontFamily}"
              font-size="${fontSize.social}px" font-weight="500"
              fill="${theme.accentColor}">
          ${this.escapeXml(social)}
        </text>
      `;
    }

    svg += '</g>';
    return svg;
  }

  /**
   * Escape XML
   */
  escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Apply lower thirds to video
   */
  async applyToVideo(inputVideo, framesDir, outputPath) {
    const lowerThirdVideoPath = join(tmpdir(), `lt_${Date.now()}.mov`);

    await execAsync(
      `ffmpeg -y -framerate ${this.fps} -i "${framesDir}/lt_%06d.png" ` +
      `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${lowerThirdVideoPath}"`,
      { timeout: 300000 }
    );

    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -i "${lowerThirdVideoPath}" ` +
      `-filter_complex "[0:v][1:v]overlay=0:0:format=auto[out]" ` +
      `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${outputPath}"`,
      { timeout: 300000 }
    );

    try { await execAsync(`rm "${lowerThirdVideoPath}"`); } catch {}

    return outputPath;
  }
}

/**
 * Add lower thirds to video (convenience function)
 */
export async function addLowerThirds(inputVideo, outputPath, lowerThirds, options = {}) {
  if (!lowerThirds || lowerThirds.length === 0) {
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

  const renderer = new LowerThirdRenderer({
    width,
    height,
    fps,
    theme: options.theme || LowerThirdTheme.MODERN,
    position: options.position || 'bottom-left'
  });

  for (const lt of lowerThirds) {
    renderer.add(lt);
  }

  const tempDir = join(tmpdir(), `lt_${Date.now()}`);
  await renderer.generateFrames(tempDir, duration);
  await renderer.applyToVideo(inputVideo, tempDir, outputPath);

  try { await execAsync(`rm -rf "${tempDir}"`); } catch {}

  return outputPath;
}

/**
 * Create speaker introduction lower third
 */
export function createSpeakerIntro(name, title, options = {}) {
  return {
    name,
    title,
    subtitle: options.company || '',
    social: options.twitter || options.social || '',
    style: options.style || LowerThirdStyle.SLIDE_LEFT,
    startTime: options.startTime || 2,
    duration: options.duration || 6
  };
}

/**
 * Create chapter marker lower third
 */
export function createChapterMarker(chapterTitle, chapterNumber, startTime, options = {}) {
  return {
    name: chapterTitle,
    title: `Chapter ${chapterNumber}`,
    style: LowerThirdStyle.REVEAL,
    startTime,
    duration: options.duration || 4
  };
}

/**
 * Create social CTA lower third
 */
export function createSocialCTA(platform, handle, startTime, options = {}) {
  const platforms = {
    twitter: 'Follow on Twitter',
    youtube: 'Subscribe on YouTube',
    github: 'Star on GitHub',
    linkedin: 'Connect on LinkedIn'
  };

  return {
    name: platforms[platform] || 'Follow us',
    title: '',
    social: handle,
    style: LowerThirdStyle.SLIDE_UP,
    startTime,
    duration: options.duration || 5
  };
}

export default LowerThirdRenderer;
