import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Post-process video with professional effects including animated zoom
 */
export async function postProcess(inputVideo, options = {}) {
  const {
    cursorData = null,
    zoomKeyframes = null,
    width = 1920,
    height = 1080,
    fps = 60,
    addMotionBlur = true,
    addVignette = true,
    addColorGrade = true,
    outputPath = null
  } = options;

  const tempDir = join(tmpdir(), `repovideo-pp-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'processed.mp4');
  const filters = [];

  // 1. Apply animated zoom if we have keyframes
  if (zoomKeyframes && zoomKeyframes.length > 0) {
    const zoomFilter = buildZoomPanFilter(zoomKeyframes, width, height, fps);
    filters.push(zoomFilter);
  } else {
    // Default subtle zoom animation (Ken Burns style)
    filters.push(`scale=2*${width}:2*${height}`);
    filters.push(`zoompan=z='1.0+0.002*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`);
  }

  // 2. Motion blur (minterpolate)
  if (addMotionBlur) {
    // Subtle motion blur using frame blending
    filters.push(`tblend=all_mode=average`);
  }

  // 3. Color grading for professional look
  if (addColorGrade) {
    filters.push(`eq=contrast=1.05:brightness=0.02:saturation=1.1`);
    // Add slight warmth
    filters.push(`colorbalance=rs=0.02:gs=0:bs=-0.02`);
  }

  // 4. Vignette
  if (addVignette) {
    filters.push(`vignette=PI/5`);
  }

  // 5. Ensure output resolution and framerate
  filters.push(`scale=${width}:${height}`);
  filters.push(`fps=${fps}`);

  const filterString = filters.join(',');

  const command = `ffmpeg -y -i "${inputVideo}" \
    -vf "${filterString}" \
    -c:v libx264 -preset slow -crf 18 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "${output}"`;

  try {
    await execAsync(command, { timeout: 600000 }); // 10 min timeout
  } catch (error) {
    throw new Error(`Post-processing failed: ${error.message}`);
  }

  return output;
}

/**
 * Build FFmpeg zoompan filter expression from keyframes
 */
function buildZoomPanFilter(keyframes, width, height, fps) {
  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  
  // Build zoom expression with interpolation between keyframes
  // FFmpeg expressions using 'on' (output frame number)
  
  // Create zoom expression that interpolates between keyframes
  let zoomExpr = '';
  let xExpr = '';
  let yExpr = '';
  
  for (let i = 0; i < sorted.length; i++) {
    const kf = sorted[i];
    const frameNum = Math.round((kf.time / 1000) * fps);
    const nextKf = sorted[i + 1];
    const nextFrame = nextKf ? Math.round((nextKf.time / 1000) * fps) : frameNum + fps * 5;
    
    const zoom = kf.zoom || 1.0;
    const x = kf.x !== undefined ? kf.x : 0.5;
    const y = kf.y !== undefined ? kf.y : 0.5;
    
    // Add conditional for this keyframe range
    if (i === 0) {
      // First segment: from start to first keyframe
      zoomExpr = `if(lt(on,${frameNum}),${zoom},`;
      xExpr = `if(lt(on,${frameNum}),${x},`;
      yExpr = `if(lt(on,${frameNum}),${y},`;
    }
    
    if (nextKf) {
      const nextZoom = nextKf.zoom || 1.0;
      const nextX = nextKf.x !== undefined ? nextKf.x : 0.5;
      const nextY = nextKf.y !== undefined ? nextKf.y : 0.5;
      
      // Interpolate between this keyframe and next
      // linear interpolation: value = start + (end - start) * progress
      const dur = nextFrame - frameNum;
      zoomExpr += `if(lt(on,${nextFrame}),${zoom}+(${nextZoom}-${zoom})*(on-${frameNum})/${dur},`;
      xExpr += `if(lt(on,${nextFrame}),${x}+(${nextX}-${x})*(on-${frameNum})/${dur},`;
      yExpr += `if(lt(on,${nextFrame}),${y}+(${nextY}-${y})*(on-${frameNum})/${dur},`;
    } else {
      // Last keyframe - hold the value
      zoomExpr += `${zoom}`;
      xExpr += `${x}`;
      yExpr += `${y}`;
    }
  }
  
  // Close all the if statements
  for (let i = 0; i < sorted.length - 1; i++) {
    zoomExpr += ')';
    xExpr += ')';
    yExpr += ')';
  }
  zoomExpr += ')';
  xExpr += ')';
  yExpr += ')';
  
  // Build the zoompan filter
  // We need to upscale first for zoom headroom
  return `scale=2*${width}:2*${height},zoompan=z='${zoomExpr}':x='(iw-iw/zoom)*${xExpr}':y='(ih-ih/zoom)*${yExpr}':d=1:s=${width}x${height}:fps=${fps}`;
}

/**
 * Apply zoom effect using FFmpeg
 */
export async function applyZoom(inputVideo, zoomKeyframes, options = {}) {
  const {
    width = 1920,
    height = 1080,
    fps = 60,
    outputPath = null
  } = options;

  const tempDir = join(tmpdir(), `repovideo-zoom-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'zoomed.mp4');

  if (!zoomKeyframes || zoomKeyframes.length === 0) {
    // No zoom, just copy
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  }

  // For complex keyframed zoom, we'd need to:
  // 1. Extract frames
  // 2. Apply zoom to each frame based on keyframes
  // 3. Reassemble
  
  // Simplified version: single zoom level
  const avgZoom = zoomKeyframes.reduce((sum, kf) => sum + kf.zoom, 0) / zoomKeyframes.length;
  
  const command = `ffmpeg -y -i "${inputVideo}" \
    -vf "scale=${Math.round(width * avgZoom)}:${Math.round(height * avgZoom)},crop=${width}:${height}" \
    -c:v libx264 -preset fast -crf 20 \
    "${output}"`;

  try {
    await execAsync(command, { timeout: 300000 });
  } catch (error) {
    // Fallback: just copy
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c:v libx264 "${output}"`);
  }

  return output;
}

/**
 * Draw cursor overlay on video
 */
export async function addCursorOverlay(inputVideo, cursorData, options = {}) {
  const {
    cursorSize = 24,
    cursorColor = 'white',
    clickRipple = true,
    outputPath = null
  } = options;

  const tempDir = join(tmpdir(), `repovideo-cursor-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'with-cursor.mp4');

  if (!cursorData || !cursorData.positions || cursorData.positions.length === 0) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  }

  // Generate cursor position file for FFmpeg
  const cursorFile = join(tempDir, 'cursor.txt');
  const cursorLines = cursorData.positions.map(p => 
    `${p.t / 1000} ${Math.round(p.x)} ${Math.round(p.y)}`
  ).join('\n');
  await writeFile(cursorFile, cursorLines);

  // For now, simplified: draw a static cursor indicator
  // Real implementation would use drawbox with expressions based on time
  const command = `ffmpeg -y -i "${inputVideo}" \
    -vf "drawbox=x=10:y=10:w=${cursorSize}:h=${cursorSize}:c=${cursorColor}@0.3:t=fill" \
    -c:v libx264 -preset fast -crf 20 \
    "${output}"`;

  try {
    await execAsync(command, { timeout: 300000 });
  } catch (error) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
  }

  return output;
}

/**
 * Combine video and audio
 */
export async function combineVideoAudio(videoPath, audioPath, outputPath, options = {}) {
  const {
    fadeOut = 2,
    normalizeAudio = true
  } = options;

  // Get video duration
  const { stdout: durationStr } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  );
  const videoDuration = parseFloat(durationStr.trim()) || 30;

  let audioFilters = [];
  
  // Normalize audio
  if (normalizeAudio) {
    audioFilters.push('loudnorm=I=-16:LRA=11:TP=-1');
  }
  
  // Fade out audio at end
  if (fadeOut > 0) {
    const fadeStart = Math.max(0, videoDuration - fadeOut);
    audioFilters.push(`afade=t=out:st=${fadeStart}:d=${fadeOut}`);
  }

  const audioFilterStr = audioFilters.length > 0 ? `-af "${audioFilters.join(',')}"` : '';

  const command = `ffmpeg -y \
    -i "${videoPath}" \
    -i "${audioPath}" \
    -c:v copy \
    -c:a aac -b:a 192k \
    ${audioFilterStr} \
    -shortest \
    -movflags +faststart \
    "${outputPath}"`;

  await execAsync(command, { timeout: 300000 });
  return outputPath;
}

/**
 * Export presets for different platforms
 */
export const exportPresets = {
  youtube: {
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: '8M',
    codec: 'libx264',
    preset: 'slow',
    crf: 18
  },
  twitter: {
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: '5M',
    codec: 'libx264',
    preset: 'medium',
    crf: 23
  },
  instagram: {
    width: 1080,
    height: 1080,
    fps: 30,
    bitrate: '4M',
    codec: 'libx264',
    preset: 'medium',
    crf: 23
  },
  tiktok: {
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: '4M',
    codec: 'libx264',
    preset: 'medium',
    crf: 23
  },
  gif: {
    width: 640,
    height: 360,
    fps: 15,
    format: 'gif'
  }
};

/**
 * Export video with platform preset
 */
export async function exportWithPreset(inputVideo, preset, outputPath) {
  const settings = exportPresets[preset] || exportPresets.youtube;
  
  if (settings.format === 'gif') {
    // GIF export with palette optimization
    const tempDir = join(tmpdir(), `repovideo-gif-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const palette = join(tempDir, 'palette.png');
    
    await execAsync(`ffmpeg -y -i "${inputVideo}" -vf "fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos,palettegen" "${palette}"`);
    await execAsync(`ffmpeg -y -i "${inputVideo}" -i "${palette}" -lavfi "fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos[x];[x][1:v]paletteuse" "${outputPath}"`);
  } else {
    const command = `ffmpeg -y -i "${inputVideo}" \
      -vf "scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2,fps=${settings.fps}" \
      -c:v ${settings.codec} -preset ${settings.preset} -crf ${settings.crf} \
      -b:v ${settings.bitrate} \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      "${outputPath}"`;
    
    await execAsync(command, { timeout: 600000 });
  }
  
  return outputPath;
}
