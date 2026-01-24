import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { escapeXml as escapeXmlUtil } from './utils.js';

const execAsync = promisify(exec);

/**
 * WatermarkGenerator - Add branding/watermarks to demo videos
 * 
 * Supports:
 * - Text watermarks with customizable font, size, position
 * - Image/logo watermarks (PNG, SVG)
 * - Animated watermarks (fade in/out)
 * - Dynamic watermarks (change position/opacity over time)
 */
export class WatermarkGenerator {
  constructor(options = {}) {
    this.type = options.type || 'text';  // text, image
    this.position = options.position || 'bottom-right';  // top-left, top-right, bottom-left, bottom-right, center
    this.opacity = options.opacity || 0.7;
    this.padding = options.padding || 20;
    this.animated = options.animated || false;
    
    // Text options
    this.text = options.text || 'Demo Video';
    this.fontColor = options.fontColor || '#FFFFFF';
    this.fontSize = options.fontSize || 24;
    this.fontFamily = options.fontFamily || 'Arial';
    this.bgColor = options.bgColor || null;  // Background behind text
    this.bgPadding = options.bgPadding || 10;
    
    // Image options
    this.imagePath = options.imagePath || null;
    this.imageWidth = options.imageWidth || 120;
    this.imageHeight = options.imageHeight || null;  // Auto if null
  }

  /**
   * Get position coordinates for watermark
   */
  getPositionCoords(videoWidth, videoHeight, watermarkWidth, watermarkHeight) {
    const p = this.padding;
    
    switch (this.position) {
      case 'top-left':
        return { x: p, y: p };
      case 'top-right':
        return { x: videoWidth - watermarkWidth - p, y: p };
      case 'bottom-left':
        return { x: p, y: videoHeight - watermarkHeight - p };
      case 'bottom-right':
        return { x: videoWidth - watermarkWidth - p, y: videoHeight - watermarkHeight - p };
      case 'center':
        return { 
          x: (videoWidth - watermarkWidth) / 2, 
          y: (videoHeight - watermarkHeight) / 2 
        };
      default:
        return { x: videoWidth - watermarkWidth - p, y: videoHeight - watermarkHeight - p };
    }
  }

  /**
   * Generate text watermark SVG
   */
  generateTextWatermarkSVG(width, height) {
    // Estimate text dimensions (rough approximation)
    const charWidth = this.fontSize * 0.6;
    const textWidth = this.text.length * charWidth;
    const textHeight = this.fontSize * 1.2;
    
    const totalWidth = this.bgColor ? textWidth + this.bgPadding * 2 : textWidth;
    const totalHeight = this.bgColor ? textHeight + this.bgPadding * 2 : textHeight;
    
    let background = '';
    if (this.bgColor) {
      background = `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" 
        rx="4" ry="4" fill="${this.bgColor}" opacity="${this.opacity}"/>`;
    }

    const textX = this.bgColor ? this.bgPadding : 0;
    const textY = this.bgColor ? this.bgPadding + textHeight * 0.8 : textHeight * 0.8;

    return {
      svg: `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        ${background}
        <text x="${textX}" y="${textY}" 
          fill="${this.fontColor}" 
          font-family="${this.fontFamily}, sans-serif" 
          font-size="${this.fontSize}px"
          font-weight="500"
          opacity="${this.bgColor ? 1 : this.opacity}">
          ${this.escapeXml(this.text)}
        </text>
      </svg>`,
      width: totalWidth,
      height: totalHeight
    };
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return escapeXmlUtil(text);
  }

  /**
   * Generate FFmpeg filter for text watermark
   */
  generateTextWatermarkFilter(videoWidth, videoHeight) {
    // Use FFmpeg's drawtext filter for text watermarks
    const x = this.getPositionX(videoWidth);
    const y = this.getPositionY(videoHeight);
    
    let filter = `drawtext=text='${this.text.replace(/'/g, "'\\''")}':`;
    filter += `fontcolor=${this.fontColor}@${this.opacity}:`;
    filter += `fontsize=${this.fontSize}:`;
    filter += `x=${x}:y=${y}`;
    
    if (this.bgColor) {
      filter += `:box=1:boxcolor=${this.bgColor}@${this.opacity}:boxborderw=${this.bgPadding}`;
    }
    
    if (this.animated) {
      // Fade in during first second
      filter += `:alpha='min(1, t)'`;
    }
    
    return filter;
  }

  /**
   * Get X position expression for FFmpeg
   */
  getPositionX(videoWidth) {
    const p = this.padding;
    switch (this.position) {
      case 'top-left':
      case 'bottom-left':
        return p;
      case 'top-right':
      case 'bottom-right':
        return `w-tw-${p}`;
      case 'center':
        return `(w-tw)/2`;
      default:
        return `w-tw-${p}`;
    }
  }

  /**
   * Get Y position expression for FFmpeg
   */
  getPositionY(videoHeight) {
    const p = this.padding;
    switch (this.position) {
      case 'top-left':
      case 'top-right':
        return p;
      case 'bottom-left':
      case 'bottom-right':
        return `h-th-${p}`;
      case 'center':
        return `(h-th)/2`;
      default:
        return `h-th-${p}`;
    }
  }

  /**
   * Create watermark image from SVG
   */
  async createWatermarkImage(outputPath) {
    const { svg, width, height } = this.generateTextWatermarkSVG();
    
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    await writeFile(outputPath, pngBuffer);
    
    return { path: outputPath, width, height };
  }

  /**
   * Prepare logo image for overlay
   */
  async prepareLogoImage(outputPath) {
    if (!this.imagePath) {
      throw new Error('No image path provided for logo watermark');
    }

    const imageBuffer = await readFile(this.imagePath);
    
    let image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Resize to desired width, maintaining aspect ratio
    const resizeOptions = { width: this.imageWidth };
    if (this.imageHeight) {
      resizeOptions.height = this.imageHeight;
    }
    
    // Add transparency based on opacity
    const resized = await image
      .resize(resizeOptions)
      .ensureAlpha()
      .png()
      .toBuffer();
    
    await writeFile(outputPath, resized);
    
    const resizedMeta = await sharp(resized).metadata();
    return { 
      path: outputPath, 
      width: resizedMeta.width, 
      height: resizedMeta.height 
    };
  }
}

/**
 * Apply watermark to video
 */
export async function applyWatermark(inputVideo, outputPath, options = {}) {
  const {
    type = 'text',
    text = 'Demo Video',
    imagePath = null,
    position = 'bottom-right',
    opacity = 0.7,
    fontSize = 24,
    fontColor = '#FFFFFF',
    bgColor = null,
    padding = 20,
    animated = false
  } = options;

  const generator = new WatermarkGenerator({
    type,
    text,
    imagePath,
    position,
    opacity,
    fontSize,
    fontColor,
    bgColor,
    padding,
    animated
  });

  // Get video dimensions
  let videoWidth = 1920;
  let videoHeight = 1080;
  
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${inputVideo}"`
    );
    const metadata = JSON.parse(stdout);
    if (metadata.streams && metadata.streams[0]) {
      videoWidth = metadata.streams[0].width;
      videoHeight = metadata.streams[0].height;
    }
  } catch (e) {
    console.warn('Could not get video dimensions');
  }

  let cmd;

  if (type === 'text') {
    // Use drawtext filter for text watermarks
    const filter = generator.generateTextWatermarkFilter(videoWidth, videoHeight);
    
    cmd = `ffmpeg -y -i "${inputVideo}" \
      -vf "${filter}" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -c:a copy \
      "${outputPath}"`;
  } else if (type === 'image' && imagePath) {
    // Use overlay for image watermarks
    const tmpDir = join(tmpdir(), `watermark-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    
    const logoPath = join(tmpDir, 'logo.png');
    const { width, height } = await generator.prepareLogoImage(logoPath);
    const coords = generator.getPositionCoords(videoWidth, videoHeight, width, height);
    
    let overlayFilter = `overlay=${Math.round(coords.x)}:${Math.round(coords.y)}`;
    if (animated) {
      overlayFilter = `overlay=${Math.round(coords.x)}:${Math.round(coords.y)}:format=auto:alpha=min(1\\,t)`;
    }
    
    cmd = `ffmpeg -y -i "${inputVideo}" -i "${logoPath}" \
      -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=${opacity}[logo];[0:v][logo]${overlayFilter}[out]" \
      -map "[out]" -map 0:a? \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -c:a copy \
      "${outputPath}"`;
  } else {
    // Fallback: just copy
    cmd = `ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`;
  }

  try {
    await execAsync(cmd, { timeout: 300000 });
  } catch (error) {
    console.warn('Watermark failed:', error.message);
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
  }

  return outputPath;
}

export default WatermarkGenerator;
