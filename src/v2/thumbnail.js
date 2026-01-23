/**
 * Thumbnail Generator - Create professional thumbnails from videos
 * Extract frames, add overlays, generate preview images
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Thumbnail presets for different platforms
 */
export const THUMBNAIL_PRESETS = {
  youtube: { width: 1280, height: 720 },
  twitter: { width: 1200, height: 675 },
  linkedin: { width: 1200, height: 627 },
  instagram: { width: 1080, height: 1080 },
  og: { width: 1200, height: 630 },
  twitter_card: { width: 800, height: 418 },
  square: { width: 1000, height: 1000 }
};

/**
 * Extract a frame from video at specific timestamp
 */
export async function extractFrame(videoPath, outputPath, options = {}) {
  const {
    timestamp = '00:00:02', // Default to 2 seconds in
    width = null,
    height = null,
    quality = 2 // 1-31, lower is better
  } = options;

  const filters = [];
  
  if (width && height) {
    filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
  } else if (width) {
    filters.push(`scale=${width}:-1`);
  } else if (height) {
    filters.push(`scale=-1:${height}`);
  }

  const args = [
    '-ss', timestamp,
    '-i', videoPath,
    '-vframes', '1',
    '-q:v', String(quality)
  ];

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  args.push('-y', outputPath);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });
  });
}

/**
 * Extract multiple keyframes from video
 */
export async function extractKeyframes(videoPath, outputDir, options = {}) {
  const {
    count = 5, // Number of frames to extract
    format = 'jpg',
    quality = 2
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  // Get video duration first
  const duration = await getVideoDuration(videoPath);
  const interval = duration / (count + 1);

  const frames = [];
  
  for (let i = 1; i <= count; i++) {
    const timestamp = formatTimestamp(interval * i);
    const outputPath = path.join(outputDir, `frame_${String(i).padStart(3, '0')}.${format}`);
    
    await extractFrame(videoPath, outputPath, { timestamp, quality });
    frames.push(outputPath);
  }

  return frames;
}

/**
 * Create a thumbnail with text overlay
 */
export async function createThumbnailWithText(imagePath, outputPath, options = {}) {
  const {
    title = '',
    subtitle = '',
    logo = null,
    darkOverlay = 0.3, // 0-1
    textColor = 'white',
    font = 'Sans',
    titleSize = 72,
    subtitleSize = 36
  } = options;

  const filters = [];

  // Add dark overlay for text readability
  if (darkOverlay > 0) {
    filters.push(`colorchannelmixer=aa=${1 - darkOverlay}`);
    filters.push('[fg];color=black:size=1920x1080[bg];[bg][fg]overlay');
  }

  // Add title
  if (title) {
    const escapedTitle = escapeFFmpegText(title);
    filters.push(
      `drawtext=text='${escapedTitle}':fontcolor=${textColor}:fontsize=${titleSize}:` +
      `font=${font}:x=(w-text_w)/2:y=(h-text_h)/2-50:shadowcolor=black:shadowx=3:shadowy=3`
    );
  }

  // Add subtitle
  if (subtitle) {
    const escapedSubtitle = escapeFFmpegText(subtitle);
    filters.push(
      `drawtext=text='${escapedSubtitle}':fontcolor=${textColor}:fontsize=${subtitleSize}:` +
      `font=${font}:x=(w-text_w)/2:y=(h-text_h)/2+50:shadowcolor=black:shadowx=2:shadowy=2`
    );
  }

  const args = [
    '-i', imagePath,
    '-vf', filters.join(','),
    '-y', outputPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`));
      }
    });
  });
}

/**
 * Create animated GIF preview from video
 */
export async function createGifPreview(videoPath, outputPath, options = {}) {
  const {
    width = 480,
    fps = 10,
    duration = 5, // seconds
    startTime = 0,
    loop = 0 // 0 = infinite loop
  } = options;

  // Two-pass GIF creation for better quality
  const paletteFile = outputPath.replace(/\.gif$/, '_palette.png');

  // Generate palette
  await new Promise((resolve, reject) => {
    const args = [
      '-ss', String(startTime),
      '-t', String(duration),
      '-i', videoPath,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff`,
      '-y', paletteFile
    ];

    const ffmpeg = spawn('ffmpeg', args);
    ffmpeg.on('close', (code) => {
      code === 0 ? resolve() : reject(new Error('Palette generation failed'));
    });
  });

  // Create GIF with palette
  await new Promise((resolve, reject) => {
    const args = [
      '-ss', String(startTime),
      '-t', String(duration),
      '-i', videoPath,
      '-i', paletteFile,
      '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      '-loop', String(loop),
      '-y', outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`GIF creation failed: ${stderr}`));
      }
    });
  });

  // Clean up palette
  await fs.unlink(paletteFile).catch(() => {});

  return outputPath;
}

/**
 * Create video mosaic (contact sheet)
 */
export async function createMosaic(videoPath, outputPath, options = {}) {
  const {
    columns = 4,
    rows = 4,
    width = 1920,
    height = 1080
  } = options;

  const count = columns * rows;
  const duration = await getVideoDuration(videoPath);
  const interval = duration / (count + 1);

  // Extract frames at regular intervals and tile them
  const tileFilter = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${interval})',` +
    `scale=${Math.floor(width / columns)}:${Math.floor(height / rows)},` +
    `tile=${columns}x${rows}`;

  const args = [
    '-i', videoPath,
    '-frames', '1',
    '-vf', tileFilter,
    '-y', outputPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Mosaic creation failed: ${stderr}`));
      }
    });
  });
}

/**
 * Generate social media thumbnails in all common sizes
 */
export async function generateSocialThumbnails(videoPath, outputDir, options = {}) {
  const {
    timestamp = '00:00:02',
    presets = ['youtube', 'twitter', 'linkedin', 'og']
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  const results = {};

  for (const preset of presets) {
    const dims = THUMBNAIL_PRESETS[preset];
    if (!dims) continue;

    const outputPath = path.join(outputDir, `thumbnail_${preset}.jpg`);
    
    await extractFrame(videoPath, outputPath, {
      timestamp,
      width: dims.width,
      height: dims.height
    });

    results[preset] = outputPath;
  }

  return results;
}

/**
 * Auto-select best frame for thumbnail based on visual quality
 */
export async function selectBestFrame(videoPath, outputPath, options = {}) {
  const {
    sampleCount = 20,
    width = 1920,
    height = 1080
  } = options;

  const tempDir = path.join(path.dirname(outputPath), '.thumb_temp');
  await fs.mkdir(tempDir, { recursive: true });

  // Extract sample frames
  const frames = await extractKeyframes(videoPath, tempDir, { 
    count: sampleCount, 
    format: 'jpg' 
  });

  // Analyze frames for quality (focus on sharpness/contrast)
  // Using FFmpeg's signalstats filter
  let bestFrame = frames[0];
  let bestScore = 0;

  for (const frame of frames) {
    const score = await analyzeFrameQuality(frame);
    if (score > bestScore) {
      bestScore = score;
      bestFrame = frame;
    }
  }

  // Copy best frame to output
  await fs.copyFile(bestFrame, outputPath);

  // Resize if needed
  if (width || height) {
    await extractFrame(outputPath, outputPath, { 
      timestamp: '00:00:00', 
      width, 
      height 
    });
  }

  // Cleanup temp files
  for (const frame of frames) {
    await fs.unlink(frame).catch(() => {});
  }
  await fs.rmdir(tempDir).catch(() => {});

  return outputPath;
}

// Helper functions
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ];

    const ffprobe = spawn('ffprobe', args);
    
    let stdout = '';
    ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(stdout.trim()) || 10);
      } else {
        resolve(10); // Default fallback
      }
    });
  });
}

async function analyzeFrameQuality(imagePath) {
  // Simple quality estimation based on file size (larger usually means more detail)
  try {
    const stats = await fs.stat(imagePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function escapeFFmpegText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
