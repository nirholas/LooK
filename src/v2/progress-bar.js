import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ProgressBarGenerator - Add progress indicators to demo videos
 * 
 * Provides visual feedback on video progress with multiple styles:
 * - bar: Standard horizontal progress bar
 * - line: Thin line at top or bottom  
 * - dots: Progress dots/circles
 * - circular: Circular progress indicator (corner)
 * - chapter: Segmented progress showing sections
 */
export class ProgressBarGenerator {
  constructor(options = {}) {
    this.style = options.style || 'line';
    this.position = options.position || 'bottom'; // top, bottom
    this.color = options.color || '#3B82F6';
    this.bgColor = options.bgColor || '#E5E7EB33';
    this.height = options.height || 4;
    this.padding = options.padding || 0;
    this.animated = options.animated !== false;
  }

  /**
   * Parse hex color to FFmpeg format
   */
  parseColorToFFmpeg(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle alpha
    if (hex.length === 8) {
      return `0x${hex}`;
    }
    
    return `0x${hex}`;
  }

  /**
   * Generate FFmpeg filter for progress bar
   */
  generateProgressFilter(duration, width, height) {
    const barHeight = this.height;
    const yPos = this.position === 'top' ? this.padding : height - barHeight - this.padding;
    
    const fgColor = this.parseColorToFFmpeg(this.color);
    const bgColor = this.parseColorToFFmpeg(this.bgColor);

    switch (this.style) {
      case 'bar':
        return this.generateBarFilter(duration, width, yPos, barHeight, fgColor, bgColor);
      
      case 'line':
        return this.generateLineFilter(duration, width, yPos, barHeight, fgColor, bgColor);
      
      case 'dots':
        return this.generateDotsFilter(duration, width, yPos, barHeight, fgColor, bgColor);
      
      case 'circular':
        return this.generateCircularFilter(duration, width, height, fgColor);
      
      default:
        return this.generateLineFilter(duration, width, yPos, barHeight, fgColor, bgColor);
    }
  }

  /**
   * Standard progress bar with background
   */
  generateBarFilter(duration, width, yPos, barHeight, fgColor, bgColor) {
    // Background bar
    const bg = `drawbox=x=0:y=${yPos}:w=${width}:h=${barHeight}:c=${bgColor}:t=fill`;
    
    // Progress bar - width grows with time
    // Using the 't' variable which represents time in seconds
    const progress = `drawbox=x=0:y=${yPos}:w='min(${width},t/${duration}*${width})':h=${barHeight}:c=${fgColor}:t=fill`;
    
    return `${bg},${progress}`;
  }

  /**
   * Thin line progress indicator
   */
  generateLineFilter(duration, width, yPos, barHeight, fgColor, bgColor) {
    const lineHeight = Math.max(2, Math.floor(barHeight / 2));
    const actualY = yPos + (barHeight - lineHeight) / 2;
    
    // Background line (subtle)
    const bg = `drawbox=x=0:y=${actualY}:w=${width}:h=${lineHeight}:c=${bgColor}:t=fill`;
    
    // Progress line
    const progress = `drawbox=x=0:y=${actualY}:w='min(${width},t/${duration}*${width})':h=${lineHeight}:c=${fgColor}:t=fill`;
    
    return `${bg},${progress}`;
  }

  /**
   * Dots progress indicator
   */
  generateDotsFilter(duration, width, yPos, barHeight, fgColor, bgColor) {
    const dotCount = 10;
    const dotSize = barHeight;
    const spacing = (width - dotSize * dotCount) / (dotCount + 1);
    
    let filters = [];
    
    for (let i = 0; i < dotCount; i++) {
      const xPos = spacing + i * (dotSize + spacing);
      const activateTime = (i / dotCount) * duration;
      
      // Background dot (always visible)
      filters.push(
        `drawbox=x=${Math.round(xPos)}:y=${yPos}:w=${dotSize}:h=${dotSize}:c=${bgColor}:t=fill`
      );
      
      // Active dot (visible when progress passes)
      filters.push(
        `drawbox=x=${Math.round(xPos)}:y=${yPos}:w=${dotSize}:h=${dotSize}:c=${fgColor}:t=fill:enable='gte(t,${activateTime})'`
      );
    }
    
    return filters.join(',');
  }

  /**
   * Circular progress indicator (simulated with rotating line)
   */
  generateCircularFilter(duration, width, height, fgColor) {
    // Place in bottom-right corner
    const centerX = width - 30;
    const centerY = height - 30;
    const radius = 15;
    
    // Draw a simple pie-like progress using multiple segments
    const segments = 12;
    let filters = [];
    
    // Background circle
    filters.push(
      `drawbox=x=${centerX - radius}:y=${centerY - radius}:w=${radius * 2}:h=${radius * 2}:c=0xFFFFFF33:t=fill`
    );
    
    // Progress segments (simplified as dots around the center)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      const x = Math.round(centerX + Math.cos(angle) * (radius - 2));
      const y = Math.round(centerY + Math.sin(angle) * (radius - 2));
      const activateTime = (i / segments) * duration;
      
      filters.push(
        `drawbox=x=${x - 2}:y=${y - 2}:w=4:h=4:c=${fgColor}:t=fill:enable='gte(t,${activateTime})'`
      );
    }
    
    return filters.join(',');
  }

  /**
   * Chapter/section-based progress bar
   */
  generateChapterFilter(duration, width, yPos, barHeight, fgColor, bgColor, chapters = []) {
    if (!chapters || chapters.length === 0) {
      return this.generateBarFilter(duration, width, yPos, barHeight, fgColor, bgColor);
    }

    let filters = [];
    const segmentCount = chapters.length;
    const gapWidth = 4;
    const segmentWidth = (width - gapWidth * (segmentCount - 1)) / segmentCount;
    
    for (let i = 0; i < segmentCount; i++) {
      const xPos = i * (segmentWidth + gapWidth);
      const chapter = chapters[i];
      const chapterDuration = chapter.duration || duration / segmentCount;
      const chapterStart = chapter.start || (i * duration / segmentCount);
      
      // Background segment
      filters.push(
        `drawbox=x=${Math.round(xPos)}:y=${yPos}:w=${Math.round(segmentWidth)}:h=${barHeight}:c=${bgColor}:t=fill`
      );
      
      // Progress within segment
      const relativeProgress = `min(1,max(0,(t-${chapterStart})/${chapterDuration}))`;
      filters.push(
        `drawbox=x=${Math.round(xPos)}:y=${yPos}:w='${Math.round(segmentWidth)}*${relativeProgress}':h=${barHeight}:c=${fgColor}:t=fill:enable='gte(t,${chapterStart})'`
      );
    }
    
    return filters.join(',');
  }
}

/**
 * Apply progress bar to video
 */
export async function applyProgressBar(inputVideo, outputPath, options = {}) {
  const {
    style = 'line',
    position = 'bottom',
    color = '#3B82F6',
    bgColor = '#E5E7EB33',
    height = 4,
    padding = 0
  } = options;

  // Get video metadata
  let width = 1920;
  let height2 = 1080;
  let duration = 10;

  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of json "${inputVideo}"`
    );
    const metadata = JSON.parse(stdout);
    
    if (metadata.streams && metadata.streams[0]) {
      width = metadata.streams[0].width || width;
      height2 = metadata.streams[0].height || height2;
    }
    if (metadata.format && metadata.format.duration) {
      duration = parseFloat(metadata.format.duration);
    }
  } catch (e) {
    console.warn('Could not get video metadata, using defaults');
  }

  const generator = new ProgressBarGenerator({
    style,
    position,
    color,
    bgColor,
    height,
    padding
  });

  const filter = generator.generateProgressFilter(duration, width, height2);

  const cmd = `ffmpeg -y -i "${inputVideo}" \
    -vf "${filter}" \
    -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
    -c:a copy \
    "${outputPath}"`;

  try {
    await execAsync(cmd, { timeout: 300000 });
  } catch (error) {
    console.warn('Progress bar failed:', error.message);
    // Fallback: copy original
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
  }

  return outputPath;
}

export default ProgressBarGenerator;
