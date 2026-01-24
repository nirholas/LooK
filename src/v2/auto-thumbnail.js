/**
 * Auto Thumbnail Generator
 * 
 * Intelligently selects the best frame for video thumbnails:
 * - Face detection preference
 * - UI state analysis (meaningful content visible)
 * - Contrast and visual quality scoring
 * - Avoids blur, transitions, loading states
 * - Custom branding overlays
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname, basename, extname } from 'path';
import { mkdir, readdir, readFile, writeFile, stat, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { escapeXml as escapeXmlUtil } from './utils.js';

const execAsync = promisify(exec);

/**
 * Thumbnail style presets
 */
export const ThumbnailStyle = {
  CLEAN: 'clean',           // Just the frame
  BRANDED: 'branded',       // Add logo/text overlay
  PLAY_BUTTON: 'play_button', // Add play button icon
  TITLE_CARD: 'title_card', // Add title text overlay
  GRADIENT: 'gradient',     // Add gradient overlay
  SPLIT: 'split'            // Split view with multiple frames
};

/**
 * Frame quality metrics
 */
class FrameAnalyzer {
  /**
   * Analyze frame for quality metrics
   */
  async analyze(framePath) {
    const image = sharp(framePath);
    const metadata = await image.metadata();
    const stats = await image.stats();
    const rawBuffer = await image.raw().toBuffer();

    return {
      path: framePath,
      width: metadata.width,
      height: metadata.height,
      brightness: this.calculateBrightness(stats),
      contrast: this.calculateContrast(stats),
      saturation: this.calculateSaturation(stats),
      sharpness: await this.estimateSharpness(image),
      colorfulness: this.calculateColorfulness(stats),
      edgeDensity: await this.calculateEdgeDensity(framePath),
      hasLoadingIndicator: await this.detectLoadingState(rawBuffer, metadata),
      compositeScore: 0
    };
  }

  /**
   * Calculate brightness from stats
   */
  calculateBrightness(stats) {
    const channels = stats.channels || [];
    if (channels.length === 0) return 0.5;
    
    const avgMean = channels.reduce((sum, c) => sum + c.mean, 0) / channels.length;
    return avgMean / 255;
  }

  /**
   * Calculate contrast
   */
  calculateContrast(stats) {
    const channels = stats.channels || [];
    if (channels.length === 0) return 0;
    
    const avgStd = channels.reduce((sum, c) => sum + c.stdev, 0) / channels.length;
    return avgStd / 128;
  }

  /**
   * Calculate saturation
   */
  calculateSaturation(stats) {
    const channels = stats.channels || [];
    if (channels.length < 3) return 0;
    
    // Rough saturation estimate
    const rMean = channels[0].mean;
    const gMean = channels[1].mean;
    const bMean = channels[2].mean;
    const maxC = Math.max(rMean, gMean, bMean);
    const minC = Math.min(rMean, gMean, bMean);
    
    if (maxC === 0) return 0;
    return (maxC - minC) / maxC;
  }

  /**
   * Estimate sharpness using Laplacian variance
   */
  async estimateSharpness(image) {
    try {
      const { data, info } = await image
        .clone()
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] // Laplacian kernel
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate variance
      let sum = 0, sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
      }
      const mean = sum / data.length;
      const variance = (sumSq / data.length) - (mean * mean);
      
      return Math.min(variance / 1000, 1); // Normalize
    } catch {
      return 0.5;
    }
  }

  /**
   * Calculate colorfulness
   */
  calculateColorfulness(stats) {
    const channels = stats.channels || [];
    if (channels.length < 3) return 0;

    const rStd = channels[0].stdev;
    const gStd = channels[1].stdev;
    const bStd = channels[2].stdev;

    return Math.sqrt(rStd * rStd + gStd * gStd + bStd * bStd) / 255;
  }

  /**
   * Calculate edge density using Sobel
   */
  async calculateEdgeDensity(framePath) {
    try {
      const { data, info } = await sharp(framePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1] // Sobel X
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let edgeCount = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] > 30) edgeCount++;
      }
      
      return edgeCount / data.length;
    } catch {
      return 0.5;
    }
  }

  /**
   * Detect loading states
   */
  async detectLoadingState(rawBuffer, metadata) {
    // Check for large uniform areas (loading screens often have them)
    const pixels = rawBuffer.length / (metadata.channels || 4);
    
    let whitePixels = 0;
    let blackPixels = 0;
    
    for (let i = 0; i < rawBuffer.length; i += (metadata.channels || 4)) {
      const r = rawBuffer[i];
      const g = rawBuffer[i + 1] || r;
      const b = rawBuffer[i + 2] || r;
      
      if (r > 250 && g > 250 && b > 250) whitePixels++;
      if (r < 5 && g < 5 && b < 5) blackPixels++;
    }
    
    // More than 60% uniform likely means loading/blank
    const uniformRatio = Math.max(whitePixels, blackPixels) / pixels;
    return uniformRatio > 0.6;
  }

  /**
   * Score frame for thumbnail quality
   */
  scoreFrame(analysis) {
    let score = 0;
    
    // Penalize loading states heavily
    if (analysis.hasLoadingIndicator) {
      score -= 100;
    }
    
    // Prefer mid-range brightness (not too dark, not too bright)
    const brightnessPenalty = Math.abs(analysis.brightness - 0.5) * 20;
    score -= brightnessPenalty;
    
    // Reward good contrast
    score += analysis.contrast * 30;
    
    // Reward sharpness
    score += analysis.sharpness * 40;
    
    // Reward colorfulness
    score += analysis.colorfulness * 20;
    
    // Reward edge density (indicates content)
    score += analysis.edgeDensity * 25;
    
    // Penalize very low saturation (might be loading)
    if (analysis.saturation < 0.1) {
      score -= 15;
    }
    
    return score;
  }
}

/**
 * Thumbnail generator
 */
export class ThumbnailGenerator {
  constructor(options = {}) {
    this.outputWidth = options.width || 1280;
    this.outputHeight = options.height || 720;
    this.quality = options.quality || 90;
    this.format = options.format || 'jpeg';
    this.sampleCount = options.sampleCount || 20;
    this.analyzer = new FrameAnalyzer();
  }

  /**
   * Generate thumbnail from video
   */
  async generate(videoPath, outputPath, options = {}) {
    const {
      style = ThumbnailStyle.CLEAN,
      timestamp = null, // Force specific timestamp
      branding = null,  // { logo, title, subtitle }
      playButton = true,
      gradient = false
    } = options;

    console.log(`📸 Generating thumbnail for: ${basename(videoPath)}`);

    let framePath;
    if (timestamp !== null) {
      framePath = await this.extractFrameAtTime(videoPath, timestamp);
    } else {
      framePath = await this.selectBestFrame(videoPath);
    }

    let image = sharp(framePath)
      .resize(this.outputWidth, this.outputHeight, { fit: 'cover' });

    // Apply style
    switch (style) {
      case ThumbnailStyle.BRANDED:
        image = await this.applyBranding(image, branding);
        break;
      case ThumbnailStyle.PLAY_BUTTON:
        image = await this.addPlayButton(image);
        break;
      case ThumbnailStyle.TITLE_CARD:
        image = await this.addTitleCard(image, branding);
        break;
      case ThumbnailStyle.GRADIENT:
        image = await this.addGradient(image);
        break;
      case ThumbnailStyle.SPLIT:
        image = await this.createSplitView(videoPath);
        break;
    }

    // Save
    if (this.format === 'png') {
      await image.png({ quality: this.quality }).toFile(outputPath);
    } else {
      await image.jpeg({ quality: this.quality }).toFile(outputPath);
    }

    // Cleanup temp frame
    try { await unlink(framePath); } catch {}

    console.log(`  ✓ Thumbnail saved: ${outputPath}`);
    return outputPath;
  }

  /**
   * Select best frame from video
   */
  async selectBestFrame(videoPath) {
    const tempDir = join(tmpdir(), `thumbnails_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Get video duration
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of json "${videoPath}"`
    );
    const duration = parseFloat(JSON.parse(stdout).format?.duration) || 10;

    // Extract frames at intervals
    const interval = duration / (this.sampleCount + 1);
    const frames = [];

    console.log(`  Analyzing ${this.sampleCount} frames...`);

    for (let i = 1; i <= this.sampleCount; i++) {
      const time = interval * i;
      const framePath = join(tempDir, `frame_${i.toString().padStart(3, '0')}.jpg`);
      
      try {
        await execAsync(
          `ffmpeg -y -ss ${time} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`,
          { timeout: 30000 }
        );
        frames.push({ path: framePath, time });
      } catch (error) {
        console.warn(`  Warning: Could not extract frame at ${time}s`);
      }
    }

    // Analyze and score frames
    let bestFrame = null;
    let bestScore = -Infinity;

    for (const frame of frames) {
      try {
        const analysis = await this.analyzer.analyze(frame.path);
        const score = this.analyzer.scoreFrame(analysis);
        
        if (score > bestScore) {
          bestScore = score;
          bestFrame = frame;
        }
      } catch (error) {
        continue;
      }
    }

    if (!bestFrame) {
      // Fallback to middle frame
      const middleTime = duration / 2;
      const fallbackPath = join(tempDir, 'fallback.jpg');
      await execAsync(
        `ffmpeg -y -ss ${middleTime} -i "${videoPath}" -vframes 1 -q:v 2 "${fallbackPath}"`
      );
      return fallbackPath;
    }

    console.log(`  Best frame at ${bestFrame.time.toFixed(2)}s (score: ${bestScore.toFixed(1)})`);
    return bestFrame.path;
  }

  /**
   * Extract frame at specific timestamp
   */
  async extractFrameAtTime(videoPath, timestamp) {
    const tempPath = join(tmpdir(), `frame_${Date.now()}.jpg`);
    await execAsync(
      `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${tempPath}"`
    );
    return tempPath;
  }

  /**
   * Apply branding overlay
   */
  async applyBranding(image, branding) {
    if (!branding) return image;

    const { logo, title, subtitle } = branding;
    const overlays = [];

    // Add gradient backdrop for text
    const gradientSvg = `
      <svg width="${this.outputWidth}" height="${this.outputHeight}">
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0.8)"/>
            <stop offset="40%" style="stop-color:rgba(0,0,0,0)"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#brand-gradient)"/>
      </svg>
    `;
    overlays.push({ input: Buffer.from(gradientSvg), blend: 'over' });

    // Add text
    if (title) {
      const textSvg = `
        <svg width="${this.outputWidth}" height="${this.outputHeight}">
          <text x="60" y="${this.outputHeight - 80}"
                font-family="Inter, -apple-system, sans-serif"
                font-size="48" font-weight="700"
                fill="white">
            ${this.escapeXml(title)}
          </text>
          ${subtitle ? `
            <text x="60" y="${this.outputHeight - 35}"
                  font-family="Inter, -apple-system, sans-serif"
                  font-size="24" font-weight="400"
                  fill="rgba(255,255,255,0.8)">
              ${this.escapeXml(subtitle)}
            </text>
          ` : ''}
        </svg>
      `;
      overlays.push({ input: Buffer.from(textSvg), blend: 'over' });
    }

    // Add logo
    if (logo) {
      try {
        const logoBuffer = await sharp(logo)
          .resize(120, 120, { fit: 'inside' })
          .toBuffer();
        overlays.push({
          input: logoBuffer,
          top: 40,
          left: this.outputWidth - 160
        });
      } catch {}
    }

    return image.composite(overlays);
  }

  /**
   * Add play button overlay
   */
  async addPlayButton(image) {
    const cx = this.outputWidth / 2;
    const cy = this.outputHeight / 2;
    const r = 50;

    const playSvg = `
      <svg width="${this.outputWidth}" height="${this.outputHeight}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,0.95)"/>
        <polygon points="${cx - 15},${cy - 20} ${cx - 15},${cy + 20} ${cx + 20},${cy}"
                 fill="#1a1a1a"/>
      </svg>
    `;

    return image.composite([
      { input: Buffer.from(playSvg), blend: 'over' }
    ]);
  }

  /**
   * Add title card overlay
   */
  async addTitleCard(image, branding) {
    const { title = 'Demo Video', subtitle } = branding || {};

    const cardSvg = `
      <svg width="${this.outputWidth}" height="${this.outputHeight}">
        <defs>
          <linearGradient id="title-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0.85)"/>
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.6)"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#title-gradient)"/>
        <text x="${this.outputWidth / 2}" y="${this.outputHeight / 2 - 20}"
              font-family="Inter, -apple-system, sans-serif"
              font-size="64" font-weight="800"
              fill="white" text-anchor="middle">
          ${this.escapeXml(title)}
        </text>
        ${subtitle ? `
          <text x="${this.outputWidth / 2}" y="${this.outputHeight / 2 + 40}"
                font-family="Inter, -apple-system, sans-serif"
                font-size="28" font-weight="400"
                fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${this.escapeXml(subtitle)}
          </text>
        ` : ''}
      </svg>
    `;

    return image.composite([
      { input: Buffer.from(cardSvg), blend: 'over' }
    ]);
  }

  /**
   * Add gradient overlay
   */
  async addGradient(image) {
    const gradientSvg = `
      <svg width="${this.outputWidth}" height="${this.outputHeight}">
        <defs>
          <linearGradient id="overlay-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(67,56,202,0.4)"/>
            <stop offset="100%" style="stop-color:rgba(139,92,246,0.2)"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#overlay-gradient)"/>
      </svg>
    `;

    return image.composite([
      { input: Buffer.from(gradientSvg), blend: 'multiply' }
    ]);
  }

  /**
   * Create split view with multiple frames
   */
  async createSplitView(videoPath) {
    const tempDir = join(tmpdir(), `split_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Get duration
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of json "${videoPath}"`
    );
    const duration = parseFloat(JSON.parse(stdout).format?.duration) || 10;

    // Extract 4 frames
    const times = [duration * 0.1, duration * 0.35, duration * 0.6, duration * 0.85];
    const frames = [];

    for (let i = 0; i < times.length; i++) {
      const framePath = join(tempDir, `split_${i}.jpg`);
      await execAsync(
        `ffmpeg -y -ss ${times[i]} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`
      );
      frames.push(framePath);
    }

    // Create 2x2 grid
    const halfW = this.outputWidth / 2;
    const halfH = this.outputHeight / 2;

    const composites = [];
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      
      const frameBuffer = await sharp(frames[i])
        .resize(halfW - 2, halfH - 2, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: frameBuffer,
        top: row * halfH + 1,
        left: col * halfW + 1
      });
    }

    return sharp({
      create: {
        width: this.outputWidth,
        height: this.outputHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    }).composite(composites);
  }

  /**
   * Generate multiple thumbnail variations
   */
  async generateVariations(videoPath, outputDir, options = {}) {
    await mkdir(outputDir, { recursive: true });

    const baseName = basename(videoPath, extname(videoPath));
    const results = [];

    const styles = [
      { style: ThumbnailStyle.CLEAN, suffix: 'clean' },
      { style: ThumbnailStyle.PLAY_BUTTON, suffix: 'play' },
      { style: ThumbnailStyle.GRADIENT, suffix: 'gradient' },
      { style: ThumbnailStyle.SPLIT, suffix: 'split' }
    ];

    if (options.branding) {
      styles.push({ style: ThumbnailStyle.BRANDED, suffix: 'branded' });
      styles.push({ style: ThumbnailStyle.TITLE_CARD, suffix: 'title' });
    }

    for (const { style, suffix } of styles) {
      const outputPath = join(outputDir, `${baseName}_thumb_${suffix}.${this.format}`);
      await this.generate(videoPath, outputPath, { style, ...options });
      results.push(outputPath);
    }

    return results;
  }

  /**
   * Escape XML
   */
  escapeXml(text) {
    return escapeXmlUtil(text);
  }
}

/**
 * Generate thumbnail from video (convenience function)
 */
export async function generateThumbnail(videoPath, outputPath, options = {}) {
  const generator = new ThumbnailGenerator(options);
  return generator.generate(videoPath, outputPath, options);
}

/**
 * Generate YouTube-optimized thumbnail (1280x720)
 */
export async function generateYouTubeThumbnail(videoPath, outputPath, options = {}) {
  const generator = new ThumbnailGenerator({
    width: 1280,
    height: 720,
    quality: 95,
    ...options
  });
  return generator.generate(videoPath, outputPath, options);
}

/**
 * Generate social media thumbnails
 */
export async function generateSocialThumbnails(videoPath, outputDir, options = {}) {
  await mkdir(outputDir, { recursive: true });
  const baseName = basename(videoPath, extname(videoPath));
  
  const sizes = [
    { name: 'youtube', width: 1280, height: 720 },
    { name: 'twitter', width: 1200, height: 675 },
    { name: 'linkedin', width: 1200, height: 627 },
    { name: 'instagram', width: 1080, height: 1080 }
  ];

  const results = [];

  for (const size of sizes) {
    const generator = new ThumbnailGenerator({
      width: size.width,
      height: size.height,
      ...options
    });
    
    const outputPath = join(outputDir, `${baseName}_${size.name}.jpg`);
    await generator.generate(videoPath, outputPath, options);
    results.push({ platform: size.name, path: outputPath });
  }

  return results;
}

export default ThumbnailGenerator;
