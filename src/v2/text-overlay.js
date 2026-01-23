/**
 * TextOverlay - Add professional text overlays, captions, and titles to videos
 * Supports animated titles, lower thirds, and caption tracks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Text style presets
 */
export const TEXT_STYLES = {
  title: {
    fontsize: 72,
    fontcolor: 'white',
    borderw: 3,
    bordercolor: 'black',
    shadowcolor: 'black@0.5',
    shadowx: 4,
    shadowy: 4
  },
  subtitle: {
    fontsize: 36,
    fontcolor: 'white',
    borderw: 2,
    bordercolor: 'black@0.8',
    shadowcolor: 'black@0.3',
    shadowx: 2,
    shadowy: 2
  },
  lowerThird: {
    fontsize: 28,
    fontcolor: 'white',
    box: 1,
    boxcolor: 'black@0.7',
    boxborderw: 10
  },
  caption: {
    fontsize: 24,
    fontcolor: 'white',
    borderw: 2,
    bordercolor: 'black',
    box: 1,
    boxcolor: 'black@0.5',
    boxborderw: 8
  },
  watermark: {
    fontsize: 18,
    fontcolor: 'white@0.6',
    borderw: 1,
    bordercolor: 'black@0.3'
  }
};

/**
 * Position presets for text placement
 */
export const POSITIONS = {
  center: { x: '(w-text_w)/2', y: '(h-text_h)/2' },
  topCenter: { x: '(w-text_w)/2', y: 'h*0.1' },
  bottomCenter: { x: '(w-text_w)/2', y: 'h*0.85' },
  topLeft: { x: 'w*0.05', y: 'h*0.05' },
  topRight: { x: 'w*0.95-text_w', y: 'h*0.05' },
  bottomLeft: { x: 'w*0.05', y: 'h*0.9' },
  bottomRight: { x: 'w*0.95-text_w', y: 'h*0.9' },
  lowerThird: { x: 'w*0.05', y: 'h*0.75' }
};

/**
 * Add a text overlay to video
 */
export async function addTextOverlay(inputVideo, outputPath, overlays) {
  if (!overlays || overlays.length === 0) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  const filters = overlays.map((overlay, index) => {
    const style = TEXT_STYLES[overlay.style] || TEXT_STYLES.subtitle;
    const position = POSITIONS[overlay.position] || POSITIONS.center;
    
    // Escape text for FFmpeg
    const escapedText = escapeFFmpegText(overlay.text);
    
    // Build drawtext filter
    let filter = `drawtext=text='${escapedText}'`;
    filter += `:x=${position.x}:y=${position.y}`;
    filter += `:fontsize=${overlay.fontsize || style.fontsize}`;
    filter += `:fontcolor=${overlay.fontcolor || style.fontcolor}`;
    
    if (style.borderw) {
      filter += `:borderw=${style.borderw}:bordercolor=${style.bordercolor || 'black'}`;
    }
    if (style.shadowx) {
      filter += `:shadowcolor=${style.shadowcolor}:shadowx=${style.shadowx}:shadowy=${style.shadowy}`;
    }
    if (style.box) {
      filter += `:box=${style.box}:boxcolor=${style.boxcolor}:boxborderw=${style.boxborderw}`;
    }
    
    // Timing
    if (overlay.startTime !== undefined || overlay.endTime !== undefined) {
      const start = overlay.startTime || 0;
      const end = overlay.endTime || 9999;
      filter += `:enable='between(t,${start},${end})'`;
    }
    
    // Fade in/out
    if (overlay.fadeIn || overlay.fadeOut) {
      const fadeIn = overlay.fadeIn || 0;
      const fadeOut = overlay.fadeOut || 0;
      const start = overlay.startTime || 0;
      const end = overlay.endTime || 9999;
      filter += `:alpha='if(lt(t,${start + fadeIn}),(t-${start})/${fadeIn},if(gt(t,${end - fadeOut}),(${end}-t)/${fadeOut},1))'`;
    }
    
    return filter;
  });

  const filterString = filters.join(',');
  
  const command = `ffmpeg -y -i "${inputVideo}" \
    -vf "${filterString}" \
    -c:v libx264 -preset fast -crf 18 \
    -c:a copy \
    "${outputPath}"`;

  await execAsync(command, { timeout: 300000 });
  return outputPath;
}

/**
 * Add intro title card
 */
export async function addIntroTitle(inputVideo, outputPath, options = {}) {
  const {
    title = '',
    subtitle = '',
    duration = 3,
    fadeIn = 0.5,
    fadeOut = 0.5,
    backgroundColor = 'black',
    width = 1920,
    height = 1080
  } = options;

  if (!title) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  const tempDir = join(process.cwd(), '.look-temp');
  await mkdir(tempDir, { recursive: true });
  const introPath = join(tempDir, 'intro.mp4');

  // Create intro video with title
  const titleStyle = TEXT_STYLES.title;
  const subtitleStyle = TEXT_STYLES.subtitle;
  
  const escapedTitle = escapeFFmpegText(title);
  const escapedSubtitle = escapeFFmpegText(subtitle);

  let filterComplex = `color=c=${backgroundColor}:s=${width}x${height}:d=${duration}[bg];`;
  filterComplex += `[bg]drawtext=text='${escapedTitle}':x=(w-text_w)/2:y=(h-text_h)/2-30`;
  filterComplex += `:fontsize=${titleStyle.fontsize}:fontcolor=${titleStyle.fontcolor}`;
  filterComplex += `:borderw=${titleStyle.borderw}:bordercolor=${titleStyle.bordercolor}`;
  
  if (subtitle) {
    filterComplex += `,drawtext=text='${escapedSubtitle}':x=(w-text_w)/2:y=(h-text_h)/2+50`;
    filterComplex += `:fontsize=${subtitleStyle.fontsize}:fontcolor=${subtitleStyle.fontcolor}`;
    filterComplex += `:borderw=${subtitleStyle.borderw}:bordercolor=${subtitleStyle.bordercolor}`;
  }
  
  filterComplex += `,fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${duration - fadeOut}:d=${fadeOut}[intro]`;

  // Create intro
  const introCmd = `ffmpeg -y -f lavfi -i "color=c=${backgroundColor}:s=${width}x${height}:d=${duration}" \
    -vf "drawtext=text='${escapedTitle}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=${titleStyle.fontsize}:fontcolor=white:borderw=3:bordercolor=black,fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${duration - fadeOut}:d=${fadeOut}" \
    -c:v libx264 -preset fast -t ${duration} \
    "${introPath}"`;

  await execAsync(introCmd, { timeout: 60000 });

  // Concatenate intro with main video
  const concatList = join(tempDir, 'concat.txt');
  await writeFile(concatList, `file '${introPath}'\nfile '${inputVideo}'`);

  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatList}" \
    -c:v libx264 -preset fast -crf 18 \
    -c:a aac \
    "${outputPath}"`;

  await execAsync(concatCmd, { timeout: 300000 });
  return outputPath;
}

/**
 * Add watermark to video
 */
export async function addWatermark(inputVideo, outputPath, options = {}) {
  const {
    text = '',
    imagePath = null,
    position = 'bottomRight',
    opacity = 0.6,
    scale = 0.1  // For image watermarks, scale relative to video width
  } = options;

  if (!text && !imagePath) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  const pos = POSITIONS[position] || POSITIONS.bottomRight;
  let filter;

  if (imagePath) {
    // Image watermark
    filter = `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${pos.x.replace('text_w', 'overlay_w')}:${pos.y.replace('text_h', 'overlay_h')}`;
    
    const command = `ffmpeg -y -i "${inputVideo}" -i "${imagePath}" \
      -filter_complex "${filter}" \
      -c:v libx264 -preset fast -crf 18 \
      -c:a copy \
      "${outputPath}"`;
    
    await execAsync(command, { timeout: 300000 });
  } else {
    // Text watermark
    const style = TEXT_STYLES.watermark;
    const escapedText = escapeFFmpegText(text);
    
    filter = `drawtext=text='${escapedText}':x=${pos.x}:y=${pos.y}`;
    filter += `:fontsize=${style.fontsize}:fontcolor=white@${opacity}`;
    filter += `:borderw=1:bordercolor=black@0.3`;
    
    const command = `ffmpeg -y -i "${inputVideo}" \
      -vf "${filter}" \
      -c:v libx264 -preset fast -crf 18 \
      -c:a copy \
      "${outputPath}"`;
    
    await execAsync(command, { timeout: 300000 });
  }

  return outputPath;
}

/**
 * Generate captions from script with timestamps
 */
export function generateCaptionsFromScript(script, duration, options = {}) {
  const {
    wordsPerCaption = 8,
    minDuration = 2,
    maxDuration = 5
  } = options;

  const words = script.split(/\s+/);
  const captions = [];
  const wordsPerSecond = words.length / duration;
  
  let currentTime = 0;
  let i = 0;

  while (i < words.length) {
    const captionWords = words.slice(i, i + wordsPerCaption);
    const captionDuration = Math.min(maxDuration, Math.max(minDuration, captionWords.length / wordsPerSecond));
    
    captions.push({
      text: captionWords.join(' '),
      startTime: currentTime,
      endTime: currentTime + captionDuration,
      position: 'bottomCenter',
      style: 'caption',
      fadeIn: 0.2,
      fadeOut: 0.2
    });

    currentTime += captionDuration;
    i += wordsPerCaption;
  }

  return captions;
}

/**
 * Escape text for FFmpeg drawtext filter
 */
function escapeFFmpegText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%');
}
