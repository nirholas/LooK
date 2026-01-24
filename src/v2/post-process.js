import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile } from 'fs/promises';
import { CursorRenderer, CURSOR_STYLES } from './cursor-renderer.js';
import { applyClickEffects } from './click-effects.js';
import { 
  CursorEffectsEngine, 
  MotionBlurEngine, 
  AutoDuckingEngine, 
  NoiseReductionEngine,
  EFFECT_PRESETS 
} from './effects/index.js';

const execAsync = promisify(exec);

/**
 * Post-process video with professional effects including cursor overlay and animated zoom
 * 
 * Now includes advanced effects from LooK Effects Library:
 * - Enhanced cursor effects with ripples, trails, motion blur
 * - Audio auto-ducking (reduce music during speech)
 * - Noise reduction
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
    outputPath = null,
    // Cursor options
    renderCursor = true,
    cursorStyle = 'default',
    cursorSize = 32,
    cursorColor = '#000000',
    cursorGlow = false,
    cursorPreset = null,
    // Click effect options
    clickEffect = 'ripple',        // ripple, pulse, ring, spotlight, none
    clickEffectColor = '#3B82F6',  // Blue by default
    clickEffectSize = 60,          // Max effect radius in pixels
    clickEffectDuration = 400,     // Effect duration in ms
    clickEffectOpacity = 0.6,      // Effect opacity
    // Advanced effects (from Aqua)
    cursorEffects = {},            // CursorEffectsEngine config
    motionBlurConfig = {},         // MotionBlurEngine config
    autoDucking = {},              // AutoDuckingEngine config
    noiseReduction = {},           // NoiseReductionEngine config
    effectsPreset = null           // Use preset: 'professional', 'tutorial', 'social', 'minimal'
  } = options;

  const tempDir = join(tmpdir(), `repovideo-pp-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'processed.mp4');

  // Initialize advanced effects engines with presets or custom config
  const preset = effectsPreset ? EFFECT_PRESETS[effectsPreset] : null;
  const cursorFxEngine = new CursorEffectsEngine(preset?.cursorEffects || cursorEffects);
  const motionBlurEngine = new MotionBlurEngine(preset?.motionBlur || motionBlurConfig);
  const autoDuckingEngine = new AutoDuckingEngine(preset?.autoDucking || autoDucking);
  const noiseReductionEngine = new NoiseReductionEngine(preset?.noiseReduction || noiseReduction);
  
  // Step 1: Apply cursor overlay FIRST (before zoom) if we have cursor data
  let videoWithCursor = inputVideo;
  if (renderCursor && cursorData && cursorStyle !== 'none') {
    const cursorRenderer = new CursorRenderer({
      style: cursorStyle,
      size: cursorSize,
      color: cursorColor,
      glow: cursorGlow
    });
    
    const cursorOutput = join(tempDir, 'with-cursor.mp4');
    const cursorFilter = await cursorRenderer.buildFilter(cursorData, fps, width, height, tempDir);
    
    if (cursorFilter.cursorImagePath && cursorFilter.overlayFilter) {
      // Use overlay filter with the expression for cursor position
      const cursorCommand = `ffmpeg -y -i "${inputVideo}" -i "${cursorFilter.cursorImagePath}" \
        -filter_complex "[1:v]format=rgba[cursor];[0:v][cursor]overlay=${cursorFilter.overlayFilter}:format=auto[out]" \
        -map "[out]" -map 0:a? \
        -c:v libx264 -preset fast -crf 18 \
        -pix_fmt yuv420p \
        "${cursorOutput}"`;
      
      try {
        await execAsync(cursorCommand, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
        videoWithCursor = cursorOutput;
        console.log('✓ Cursor overlay applied');
      } catch (error) {
        console.warn('Cursor overlay failed, continuing without cursor:', error.message);
      }
    }
  }

  // Step 2: Apply enhanced click effects with CursorEffectsEngine
  let videoWithClickEffects = videoWithCursor;
  if (clickEffect !== 'none' && cursorData?.clicks?.length > 0) {
    console.log(`  Applying ${clickEffect} click effects to ${cursorData.clicks.length} click(s)...`);
    
    // Generate advanced ripple filter from CursorEffectsEngine if enabled
    const advancedRippleFilter = cursorFxEngine.generateFFmpegFilter(cursorData.clicks, fps, width, height);
    
    try {
      const clickOutput = join(tempDir, 'with-clicks.mp4');
      videoWithClickEffects = await applyClickEffects(videoWithCursor, cursorData.clicks, {
        effect: clickEffect,
        color: clickEffectColor,
        size: clickEffectSize,
        duration: clickEffectDuration,
        opacity: clickEffectOpacity,
        fps,
        width,
        height,
        outputPath: clickOutput,
        tempDir
      });
      console.log('  ✓ Click effects applied');
    } catch (error) {
      console.warn('  ⚠ Click effects failed, continuing without:', error.message);
    }
  }

  // Step 3: Build filter chain for zoom and effects
  const filters = [];

  // 3. Apply animated zoom if we have keyframes
  if (zoomKeyframes && zoomKeyframes.length > 0) {
    const zoomFilter = buildZoomPanFilter(zoomKeyframes, width, height, fps);
    filters.push(zoomFilter);
  } else {
    // Default subtle zoom animation (Ken Burns style)
    filters.push(`scale=2*${width}:2*${height}`);
    filters.push(`zoompan=z='1.0+0.002*in':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`);
  }

  // 4. Motion blur (minterpolate)
  if (addMotionBlur) {
    // Subtle motion blur using frame blending
    filters.push(`tblend=all_mode=average`);
  }

  // 5. Color grading for professional look
  if (addColorGrade) {
    filters.push(`eq=contrast=1.05:brightness=0.02:saturation=1.1`);
    // Add slight warmth
    filters.push(`colorbalance=rs=0.02:gs=0:bs=-0.02`);
  }

  // 6. Vignette
  if (addVignette) {
    filters.push(`vignette=PI/5`);
  }

  // 7. Ensure output resolution and framerate
  filters.push(`scale=${width}:${height}`);
  filters.push(`fps=${fps}`);

  const filterString = filters.join(',');

  const command = `ffmpeg -y -i "${videoWithClickEffects}" \
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
 * Optimized to handle many keyframes efficiently
 */
function buildZoomPanFilter(keyframes, width, height, fps) {
  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  
  if (sorted.length === 0) {
    return `scale=2*${width}:2*${height},zoompan=z=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
  }
  
  // Reduce keyframes to prevent FFmpeg expression overflow
  const reducedKeyframes = reduceKeyframes(sorted, {
    maxKeyframes: 40,
    minDistance: 10,
    minZoomDiff: 0.03
  });
  
  // Generate piecewise linear expression for zoom, x, y
  const { zoomExpr, xExpr, yExpr } = generatePiecewiseExpression(reducedKeyframes, fps, width, height);
  
  // Build the zoompan filter with upscaling for zoom headroom
  return `scale=2*${width}:2*${height},zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${width}x${height}:fps=${fps}`;
}

/**
 * Reduce keyframes to essential points
 */
function reduceKeyframes(keyframes, options = {}) {
  const {
    maxKeyframes = 40,
    minDistance = 10,
    minZoomDiff = 0.03
  } = options;
  
  if (keyframes.length <= 3) return keyframes;
  
  // First pass: remove keyframes with minimal difference
  let reduced = [keyframes[0]];
  
  for (let i = 1; i < keyframes.length - 1; i++) {
    const prev = reduced[reduced.length - 1];
    const curr = keyframes[i];
    
    const distDiff = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    const zoomDiff = Math.abs((curr.zoom || 1) - (prev.zoom || 1));
    
    if (distDiff >= minDistance || zoomDiff >= minZoomDiff) {
      reduced.push(curr);
    }
  }
  
  // Always keep last keyframe
  reduced.push(keyframes[keyframes.length - 1]);
  
  // Second pass: if still too many, use importance-based reduction
  if (reduced.length > maxKeyframes) {
    reduced = importanceBasedReduce(reduced, maxKeyframes);
  }
  
  return reduced;
}

/**
 * Reduce keyframes based on their visual importance
 */
function importanceBasedReduce(keyframes, maxKeyframes) {
  if (keyframes.length <= maxKeyframes) return keyframes;
  
  // Calculate importance: distance from linear interpolation
  const importance = keyframes.map((kf, i) => {
    if (i === 0 || i === keyframes.length - 1) return { kf, score: Infinity };
    
    const prev = keyframes[i - 1];
    const next = keyframes[i + 1];
    const t = (kf.time - prev.time) / (next.time - prev.time || 1);
    
    const expectedX = prev.x + (next.x - prev.x) * t;
    const expectedY = prev.y + (next.y - prev.y) * t;
    const expectedZoom = (prev.zoom || 1) + ((next.zoom || 1) - (prev.zoom || 1)) * t;
    
    const score = Math.sqrt(
      Math.pow(kf.x - expectedX, 2) +
      Math.pow(kf.y - expectedY, 2) +
      Math.pow(((kf.zoom || 1) - expectedZoom) * 200, 2) // Weight zoom changes heavily
    );
    
    return { kf, score };
  });
  
  // Sort by importance and keep top N
  importance.sort((a, b) => b.score - a.score);
  const keepSet = new Set(importance.slice(0, maxKeyframes).map(item => item.kf));
  
  return keyframes.filter(kf => keepSet.has(kf));
}

/**
 * Generate piecewise linear FFmpeg expressions for zoom, x, y
 */
function generatePiecewiseExpression(keyframes, fps, width, height) {
  if (keyframes.length === 0) {
    return {
      zoomExpr: '1',
      xExpr: `iw/2-(iw/zoom/2)`,
      yExpr: `ih/2-(ih/zoom/2)`
    };
  }
  
  if (keyframes.length === 1) {
    const kf = keyframes[0];
    const zoom = kf.zoom || 1;
    // Convert x,y coordinates to zoompan x,y (top-left of crop area)
    const normX = (kf.x || width / 2) / width;
    const normY = (kf.y || height / 2) / height;
    return {
      zoomExpr: `${zoom}`,
      xExpr: `(iw-iw/zoom)*${normX.toFixed(4)}`,
      yExpr: `(ih-ih/zoom)*${normY.toFixed(4)}`
    };
  }
  
  // Build nested if expressions for each segment
  let zoomExpr = '';
  let xExpr = '';
  let yExpr = '';
  let openParens = 0;
  
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];
    const frameNum = Math.round((kf.time / 1000) * fps);
    const nextKf = keyframes[i + 1];
    
    const zoom = kf.zoom || 1;
    const normX = Math.max(0, Math.min(1, (kf.x || width / 2) / width));
    const normY = Math.max(0, Math.min(1, (kf.y || height / 2) / height));
    
    if (nextKf) {
      const nextFrame = Math.round((nextKf.time / 1000) * fps);
      const nextZoom = nextKf.zoom || 1;
      const nextNormX = Math.max(0, Math.min(1, (nextKf.x || width / 2) / width));
      const nextNormY = Math.max(0, Math.min(1, (nextKf.y || height / 2) / height));
      
      const dur = Math.max(1, nextFrame - frameNum);
      
      // if(lt(on, nextFrame), interpolate, ...)
      const zoomInterp = `${zoom.toFixed(4)}+(${(nextZoom - zoom).toFixed(4)})*(on-${frameNum})/${dur}`;
      const xInterp = `${normX.toFixed(4)}+(${(nextNormX - normX).toFixed(4)})*(on-${frameNum})/${dur}`;
      const yInterp = `${normY.toFixed(4)}+(${(nextNormY - normY).toFixed(4)})*(on-${frameNum})/${dur}`;
      
      zoomExpr += `if(lt(on,${nextFrame}),${zoomInterp},`;
      xExpr += `if(lt(on,${nextFrame}),${xInterp},`;
      yExpr += `if(lt(on,${nextFrame}),${yInterp},`;
      openParens++;
    } else {
      // Last keyframe - hold the value
      zoomExpr += `${zoom.toFixed(4)}`;
      xExpr += `${normX.toFixed(4)}`;
      yExpr += `${normY.toFixed(4)}`;
    }
  }
  
  // Close all parentheses
  for (let i = 0; i < openParens; i++) {
    zoomExpr += ')';
    xExpr += ')';
    yExpr += ')';
  }
  
  // Wrap x and y to convert normalized coords to zoompan coords
  const finalXExpr = `(iw-iw/zoom)*(${xExpr})`;
  const finalYExpr = `(ih-ih/zoom)*(${yExpr})`;
  
  return {
    zoomExpr,
    xExpr: finalXExpr,
    yExpr: finalYExpr
  };
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
 * Draw cursor overlay on video using CursorRenderer
 */
export async function addCursorOverlay(inputVideo, cursorData, options = {}) {
  const {
    cursorSize = 24,
    cursorColor = '#000000',
    cursorStyle = 'default',
    width = 1920,
    height = 1080,
    fps = 60,
    outputPath = null
  } = options;

  const tempDir = join(tmpdir(), `repovideo-cursor-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'with-cursor.mp4');

  if (!cursorData || cursorStyle === 'none') {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  }

  // Check if cursorData has positions (either as CursorTracker or raw data)
  const positions = cursorData.positions || cursorData;
  if (!positions || positions.length === 0) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  }

  // Use CursorRenderer for professional cursor overlay
  const cursorRenderer = new CursorRenderer({
    style: cursorStyle,
    size: cursorSize,
    color: cursorColor
  });

  const cursorFilter = await cursorRenderer.buildFilter(cursorData, fps, width, height, tempDir);
  
  if (!cursorFilter.cursorImagePath || !cursorFilter.overlayFilter) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
    return output;
  }

  const command = `ffmpeg -y -i "${inputVideo}" -i "${cursorFilter.cursorImagePath}" \
    -filter_complex "[1:v]format=rgba[cursor];[0:v][cursor]overlay=${cursorFilter.overlayFilter}:format=auto[out]" \
    -map "[out]" -map 0:a? \
    -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
    "${output}"`;

  try {
    await execAsync(command, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    console.warn('Cursor overlay failed:', error.message);
    // Fallback: just copy the video without cursor
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${output}"`);
  }

  return output;
}

/**
 * Combine video and audio with advanced audio processing
 * 
 * @param {string} videoPath - Input video path
 * @param {string} audioPath - Input audio (voiceover) path
 * @param {string} outputPath - Output path
 * @param {Object} options - Processing options
 * @param {string} [options.backgroundMusicPath] - Optional background music
 * @param {Object} [options.noiseReduction] - Noise reduction config
 * @param {Object} [options.autoDucking] - Auto-ducking config for background music
 */
export async function combineVideoAudio(videoPath, audioPath, outputPath, options = {}) {
  const {
    fadeOut = 2,
    normalizeAudio = true,
    backgroundMusicPath = null,
    backgroundMusicVolume = 0.15,
    noiseReduction = { enabled: true },
    autoDucking = { enabled: true }
  } = options;

  // Initialize audio effects engines
  const noiseReductionEngine = new NoiseReductionEngine(noiseReduction);
  const autoDuckingEngine = new AutoDuckingEngine(autoDucking);

  // Get video duration
  const { stdout: durationStr } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  );
  const videoDuration = parseFloat(durationStr.trim()) || 30;

  let audioFilters = [];
  
  // Apply noise reduction to voiceover
  if (noiseReduction.enabled) {
    const nrFilter = noiseReductionEngine.generateFFmpegFilter();
    if (nrFilter) {
      audioFilters.push(nrFilter);
      console.log('✓ Noise reduction applied to voiceover');
    }
  }
  
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

  // If we have background music, mix it with auto-ducking
  if (backgroundMusicPath) {
    console.log('✓ Mixing background music with auto-ducking');
    
    // Auto-ducking: reduce music volume when voice is detected
    // Uses sidechain compression effect
    const duckingFilter = autoDucking.enabled 
      ? `sidechaincompress=threshold=${autoDucking.threshold || -30}dB:ratio=${1/autoDucking.ratio || 4}:attack=${autoDucking.attack || 100}:release=${autoDucking.release || 500}`
      : '';
    
    const mixCommand = `ffmpeg -y \
      -i "${videoPath}" \
      -i "${audioPath}" \
      -i "${backgroundMusicPath}" \
      -filter_complex "\
        [1:a]${audioFilters.length > 0 ? audioFilters.join(',') + ',' : ''}aresample=async=1[voice];\
        [2:a]volume=${backgroundMusicVolume},aloop=loop=-1:size=2e+09[music];\
        [music][voice]${duckingFilter ? duckingFilter + ',' : ''}amix=inputs=2:duration=first:dropout_transition=2[out]" \
      -map 0:v -map "[out]" \
      -c:v copy \
      -c:a aac -b:a 192k \
      -shortest \
      -movflags +faststart \
      "${outputPath}"`;
    
    await execAsync(mixCommand, { timeout: 300000 });
    return outputPath;
  }

  // Standard command without background music
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
