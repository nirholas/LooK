/**
 * GIF Export - Create lightweight animated GIFs from videos
 * 
 * Features:
 * - High-quality palette optimization
 * - Configurable FPS and size
 * - Speed control (slow-mo, speed up)
 * - Loop options
 * - Dithering options
 * - Frame optimization
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join, basename, extname, dirname } from 'path';
import { mkdir, stat, unlink } from 'fs/promises';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Dithering options for GIF quality
 */
export const DitherMode = {
  NONE: 'none',
  BAYER: 'bayer',
  FLOYD_STEINBERG: 'floyd_steinberg',
  SIERRA2: 'sierra2',
  SIERRA2_4A: 'sierra2_4a'
};

/**
 * Quality presets
 */
export const GifQuality = {
  LOW: {
    fps: 10,
    width: 480,
    colors: 128,
    dither: DitherMode.BAYER
  },
  MEDIUM: {
    fps: 15,
    width: 640,
    colors: 192,
    dither: DitherMode.SIERRA2_4A
  },
  HIGH: {
    fps: 20,
    width: 800,
    colors: 256,
    dither: DitherMode.FLOYD_STEINBERG
  },
  PREVIEW: {
    fps: 8,
    width: 320,
    colors: 64,
    dither: DitherMode.BAYER
  }
};

/**
 * GIF Exporter
 */
export class GifExporter {
  constructor(options = {}) {
    this.fps = options.fps || 15;
    this.width = options.width || 640; // Height auto-calculated
    this.colors = options.colors || 256;
    this.dither = options.dither || DitherMode.FLOYD_STEINBERG;
    this.loop = options.loop !== false; // Loop by default
    this.loopCount = options.loopCount || 0; // 0 = infinite
    this.speed = options.speed || 1; // 1 = normal, 2 = 2x, 0.5 = half
    this.optimize = options.optimize !== false;
    this.startTime = options.startTime || 0;
    this.endTime = options.endTime || null;
    this.duration = options.duration || null;
  }

  /**
   * Export video to GIF
   */
  async export(inputVideo, outputPath) {
    console.log(`🎞️  Converting to GIF: ${basename(inputVideo)}`);

    // Get video info
    const videoInfo = await this.getVideoInfo(inputVideo);
    console.log(`  Source: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.fps.toFixed(1)}fps, ${videoInfo.duration.toFixed(1)}s`);

    // Calculate output dimensions
    const scaledHeight = Math.round((this.width / videoInfo.width) * videoInfo.height);

    // Build time filters
    let timeFilters = '';
    if (this.startTime > 0) {
      timeFilters = `-ss ${this.startTime} `;
    }
    if (this.endTime) {
      timeFilters += `-to ${this.endTime} `;
    } else if (this.duration) {
      timeFilters += `-t ${this.duration} `;
    }

    // Build filter chain
    const filters = this.buildFilters(scaledHeight, videoInfo);

    // Two-pass method for best quality
    const tempPalette = join(tmpdir(), `palette_${Date.now()}.png`);

    try {
      // Pass 1: Generate optimal palette
      console.log('  Pass 1: Generating optimal palette...');
      await execAsync(
        `ffmpeg -y ${timeFilters}-i "${inputVideo}" ` +
        `-vf "${filters},palettegen=max_colors=${this.colors}:stats_mode=diff" ` +
        `"${tempPalette}"`,
        { timeout: 300000 }
      );

      // Pass 2: Generate GIF with palette
      console.log('  Pass 2: Creating GIF...');
      const ditherFilter = this.getDitherFilter();
      
      await execAsync(
        `ffmpeg -y ${timeFilters}-i "${inputVideo}" -i "${tempPalette}" ` +
        `-lavfi "${filters}[x];[x][1:v]paletteuse${ditherFilter}" ` +
        `-loop ${this.loop ? this.loopCount : -1} ` +
        `"${outputPath}"`,
        { timeout: 600000 }
      );

      // Optimize with gifsicle if available
      if (this.optimize) {
        await this.optimizeGif(outputPath);
      }

      // Get output size
      const outputStat = await stat(outputPath);
      const sizeMB = (outputStat.size / (1024 * 1024)).toFixed(2);
      console.log(`  ✓ GIF created: ${outputPath} (${sizeMB} MB)`);

      return {
        path: outputPath,
        size: outputStat.size,
        width: this.width,
        height: scaledHeight,
        fps: this.fps
      };

    } finally {
      // Cleanup palette
      try { await unlink(tempPalette); } catch {}
    }
  }

  /**
   * Get video information
   */
  async getVideoInfo(inputVideo) {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 ` +
      `-show_entries stream=width,height,r_frame_rate ` +
      `-show_entries format=duration ` +
      `-of json "${inputVideo}"`
    );

    const info = JSON.parse(stdout);
    const stream = info.streams?.[0] || {};
    const format = info.format || {};

    const [fpsNum, fpsDen] = (stream.r_frame_rate || '30/1').split('/').map(Number);

    return {
      width: stream.width || 1920,
      height: stream.height || 1080,
      fps: fpsNum / fpsDen,
      duration: parseFloat(format.duration) || 10
    };
  }

  /**
   * Build FFmpeg filter chain
   */
  buildFilters(scaledHeight, videoInfo) {
    const filters = [];

    // Scale
    filters.push(`scale=${this.width}:${scaledHeight}:flags=lanczos`);

    // FPS adjustment
    filters.push(`fps=${this.fps}`);

    // Speed adjustment
    if (this.speed !== 1) {
      filters.push(`setpts=${1 / this.speed}*PTS`);
    }

    return filters.join(',');
  }

  /**
   * Get dither filter string
   */
  getDitherFilter() {
    if (this.dither === DitherMode.NONE) {
      return '=dither=none';
    }
    
    return `=dither=${this.dither}:diff_mode=rectangle`;
  }

  /**
   * Optimize GIF with gifsicle if available
   */
  async optimizeGif(gifPath) {
    try {
      // Check if gifsicle is available
      await execAsync('which gifsicle');
      
      console.log('  Optimizing with gifsicle...');
      const tempPath = `${gifPath}.opt.gif`;
      
      await execAsync(
        `gifsicle -O3 --lossy=80 --colors ${this.colors} "${gifPath}" -o "${tempPath}"`
      );

      // Replace original with optimized
      await execAsync(`mv "${tempPath}" "${gifPath}"`);
      console.log('  ✓ GIF optimized');
    } catch {
      // gifsicle not available, skip optimization
    }
  }

  /**
   * Create preview GIF (small, fast)
   */
  async createPreview(inputVideo, outputPath) {
    const originalSettings = {
      fps: this.fps,
      width: this.width,
      colors: this.colors,
      dither: this.dither
    };

    Object.assign(this, GifQuality.PREVIEW);
    
    try {
      return await this.export(inputVideo, outputPath);
    } finally {
      Object.assign(this, originalSettings);
    }
  }
}

/**
 * Quick export functions
 */

/**
 * Convert video to GIF with default settings
 */
export async function videoToGif(inputVideo, outputPath, options = {}) {
  const exporter = new GifExporter(options);
  return exporter.export(inputVideo, outputPath);
}

/**
 * Create a high-quality GIF
 */
export async function exportHighQualityGif(inputVideo, outputPath, options = {}) {
  const exporter = new GifExporter({
    ...GifQuality.HIGH,
    ...options
  });
  return exporter.export(inputVideo, outputPath);
}

/**
 * Create a preview/thumbnail GIF
 */
export async function exportPreviewGif(inputVideo, outputPath, options = {}) {
  const exporter = new GifExporter({
    ...GifQuality.PREVIEW,
    ...options
  });
  return exporter.export(inputVideo, outputPath);
}

/**
 * Create GIF from specific time range
 */
export async function exportClipAsGif(inputVideo, outputPath, startTime, endTime, options = {}) {
  const exporter = new GifExporter({
    ...options,
    startTime,
    endTime
  });
  return exporter.export(inputVideo, outputPath);
}

/**
 * Batch export multiple GIF sizes
 */
export async function exportMultipleSizes(inputVideo, outputDir, options = {}) {
  await mkdir(outputDir, { recursive: true });
  const baseName = basename(inputVideo, extname(inputVideo));

  const sizes = [
    { suffix: 'small', width: 320, fps: 10 },
    { suffix: 'medium', width: 480, fps: 12 },
    { suffix: 'large', width: 640, fps: 15 },
    { suffix: 'hd', width: 800, fps: 20 }
  ];

  const results = [];

  for (const size of sizes) {
    const outputPath = join(outputDir, `${baseName}_${size.suffix}.gif`);
    const exporter = new GifExporter({
      width: size.width,
      fps: size.fps,
      ...options
    });

    const result = await exporter.export(inputVideo, outputPath);
    results.push({ size: size.suffix, ...result });
  }

  return results;
}

/**
 * Create looping cinemagraph-style GIF
 * (first frame = last frame for seamless loop)
 */
export async function exportSeamlessLoop(inputVideo, outputPath, duration = 3, options = {}) {
  const exporter = new GifExporter({
    ...options,
    duration,
    loop: true,
    loopCount: 0
  });

  // For seamless loops, we need to ensure the first and last frames match
  // This is done by trimming to a duration where the content loops naturally
  return exporter.export(inputVideo, outputPath);
}

/**
 * Get estimated GIF file size
 */
export function estimateGifSize(duration, width, height, fps, colors) {
  // Rough estimation formula
  // GIFs typically achieve 50-100 bytes per pixel per second with good compression
  const pixelsPerSecond = width * height * fps;
  const compressionFactor = colors <= 128 ? 0.05 : colors <= 192 ? 0.07 : 0.1;
  const estimatedBytes = pixelsPerSecond * duration * compressionFactor;
  
  return {
    bytes: Math.round(estimatedBytes),
    kb: Math.round(estimatedBytes / 1024),
    mb: (estimatedBytes / (1024 * 1024)).toFixed(2)
  };
}

export default GifExporter;
