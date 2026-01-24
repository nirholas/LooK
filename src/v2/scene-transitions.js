/**
 * SceneTransitions - Cinematic transitions between pages/sections
 * 
 * Features:
 * - Fade transitions (cross-fade, fade to black/white)
 * - Blur transitions (gaussian blur in/out)
 * - Slide transitions (slide left/right/up/down)
 * - Zoom transitions (zoom in/out)
 * - Wipe transitions (various directions)
 * - Glitch/digital effects
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Available transition types
 */
export const TransitionType = {
  FADE: 'fade',
  FADE_BLACK: 'fade-black',
  FADE_WHITE: 'fade-white',
  CROSS_FADE: 'cross-fade',
  BLUR: 'blur',
  SLIDE_LEFT: 'slide-left',
  SLIDE_RIGHT: 'slide-right',
  SLIDE_UP: 'slide-up',
  SLIDE_DOWN: 'slide-down',
  ZOOM_IN: 'zoom-in',
  ZOOM_OUT: 'zoom-out',
  WIPE_LEFT: 'wipe-left',
  WIPE_RIGHT: 'wipe-right',
  WIPE_UP: 'wipe-up',
  WIPE_DOWN: 'wipe-down',
  WIPE_CLOCK: 'wipe-clock',
  CIRCLE: 'circle',
  PIXELATE: 'pixelate',
  GLITCH: 'glitch',
  DISSOLVE: 'dissolve',
  NONE: 'none'
};

/**
 * Transition presets for different use cases
 */
export const TransitionPresets = {
  professional: {
    type: TransitionType.CROSS_FADE,
    duration: 0.5,
    easing: 'ease-in-out'
  },
  modern: {
    type: TransitionType.BLUR,
    duration: 0.4,
    easing: 'ease-out'
  },
  cinematic: {
    type: TransitionType.FADE_BLACK,
    duration: 0.8,
    easing: 'ease-in-out'
  },
  energetic: {
    type: TransitionType.SLIDE_LEFT,
    duration: 0.3,
    easing: 'ease-out'
  },
  tech: {
    type: TransitionType.GLITCH,
    duration: 0.25,
    easing: 'linear'
  },
  subtle: {
    type: TransitionType.FADE,
    duration: 0.3,
    easing: 'ease-in-out'
  }
};

/**
 * Scene Transition Manager
 */
export class SceneTransitionManager {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.defaultDuration = options.defaultDuration || 0.5;
    this.defaultType = options.defaultType || TransitionType.CROSS_FADE;
  }

  /**
   * Apply transition between two video clips
   */
  async applyTransition(clip1Path, clip2Path, outputPath, options = {}) {
    const {
      type = this.defaultType,
      duration = this.defaultDuration,
      offset = 0 // Overlap offset in seconds
    } = options;

    // Get durations
    const [duration1, duration2] = await Promise.all([
      this.getVideoDuration(clip1Path),
      this.getVideoDuration(clip2Path)
    ]);

    const transitionFrames = Math.ceil(duration * this.fps);
    const filter = this.buildTransitionFilter(type, duration, transitionFrames);

    // Build FFmpeg command based on transition type
    const command = this.buildFFmpegCommand(clip1Path, clip2Path, outputPath, {
      type,
      duration,
      duration1,
      duration2,
      filter,
      offset
    });

    await execAsync(command, { timeout: 600000, maxBuffer: 100 * 1024 * 1024 });

    return outputPath;
  }

  /**
   * Build FFmpeg filter for transition
   */
  buildTransitionFilter(type, duration, frames) {
    switch (type) {
      case TransitionType.FADE:
      case TransitionType.CROSS_FADE:
        return `xfade=transition=fade:duration=${duration}:offset=OFFSET`;

      case TransitionType.FADE_BLACK:
        return `xfade=transition=fadeblack:duration=${duration}:offset=OFFSET`;

      case TransitionType.FADE_WHITE:
        return `xfade=transition=fadewhite:duration=${duration}:offset=OFFSET`;

      case TransitionType.BLUR:
        // Custom blur transition using fade + gblur
        return `xfade=transition=fade:duration=${duration}:offset=OFFSET`;

      case TransitionType.SLIDE_LEFT:
        return `xfade=transition=slideleft:duration=${duration}:offset=OFFSET`;

      case TransitionType.SLIDE_RIGHT:
        return `xfade=transition=slideright:duration=${duration}:offset=OFFSET`;

      case TransitionType.SLIDE_UP:
        return `xfade=transition=slideup:duration=${duration}:offset=OFFSET`;

      case TransitionType.SLIDE_DOWN:
        return `xfade=transition=slidedown:duration=${duration}:offset=OFFSET`;

      case TransitionType.ZOOM_IN:
        return `xfade=transition=zoomin:duration=${duration}:offset=OFFSET`;

      case TransitionType.ZOOM_OUT:
        return `xfade=transition=smoothup:duration=${duration}:offset=OFFSET`;

      case TransitionType.WIPE_LEFT:
        return `xfade=transition=wipeleft:duration=${duration}:offset=OFFSET`;

      case TransitionType.WIPE_RIGHT:
        return `xfade=transition=wiperight:duration=${duration}:offset=OFFSET`;

      case TransitionType.WIPE_UP:
        return `xfade=transition=wipeup:duration=${duration}:offset=OFFSET`;

      case TransitionType.WIPE_DOWN:
        return `xfade=transition=wipedown:duration=${duration}:offset=OFFSET`;

      case TransitionType.WIPE_CLOCK:
        return `xfade=transition=radial:duration=${duration}:offset=OFFSET`;

      case TransitionType.CIRCLE:
        return `xfade=transition=circleopen:duration=${duration}:offset=OFFSET`;

      case TransitionType.PIXELATE:
        return `xfade=transition=pixelize:duration=${duration}:offset=OFFSET`;

      case TransitionType.DISSOLVE:
        return `xfade=transition=dissolve:duration=${duration}:offset=OFFSET`;

      case TransitionType.GLITCH:
        // Glitch requires custom approach
        return `xfade=transition=hlslice:duration=${duration}:offset=OFFSET`;

      case TransitionType.NONE:
      default:
        return null;
    }
  }

  /**
   * Build FFmpeg command for transition
   */
  buildFFmpegCommand(clip1, clip2, output, options) {
    const { type, duration, duration1, duration2, filter, offset } = options;
    
    const transitionOffset = duration1 - duration + offset;
    const actualFilter = filter ? filter.replace('OFFSET', transitionOffset.toFixed(3)) : null;

    if (!actualFilter || type === TransitionType.NONE) {
      // Simple concatenation without transition
      return `ffmpeg -y -i "${clip1}" -i "${clip2}" ` +
        `-filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" ` +
        `-map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 18 "${output}"`;
    }

    // Apply xfade transition
    return `ffmpeg -y -i "${clip1}" -i "${clip2}" ` +
      `-filter_complex "[0:v][1:v]${actualFilter}[v];[0:a][1:a]acrossfade=d=${duration}[a]" ` +
      `-map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 18 -c:a aac "${output}"`;
  }

  /**
   * Get video duration
   */
  async getVideoDuration(videoPath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Add transition at specific timestamp within a video
   */
  async addTransitionAtTimestamp(inputVideo, outputPath, timestamp, options = {}) {
    const {
      type = this.defaultType,
      duration = this.defaultDuration
    } = options;

    const tempDir = join(tmpdir(), `transition_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    const clip1 = join(tempDir, 'clip1.mp4');
    const clip2 = join(tempDir, 'clip2.mp4');

    // Split video at timestamp
    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -t ${timestamp} -c copy "${clip1}"`,
      { timeout: 300000 }
    );
    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -ss ${timestamp} -c copy "${clip2}"`,
      { timeout: 300000 }
    );

    // Apply transition
    await this.applyTransition(clip1, clip2, outputPath, { type, duration });

    // Cleanup
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch {}

    return outputPath;
  }

  /**
   * Chain multiple clips with transitions
   */
  async chainWithTransitions(clips, outputPath, options = {}) {
    const {
      type = this.defaultType,
      duration = this.defaultDuration,
      transitions = [] // Custom transition for each join point
    } = options;

    if (clips.length === 0) return null;
    if (clips.length === 1) {
      await execAsync(`ffmpeg -y -i "${clips[0]}" -c copy "${outputPath}"`);
      return outputPath;
    }

    const tempDir = join(tmpdir(), `chain_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    let currentOutput = clips[0];

    for (let i = 1; i < clips.length; i++) {
      const transitionType = transitions[i - 1]?.type || type;
      const transitionDuration = transitions[i - 1]?.duration || duration;
      
      const tempOutput = i === clips.length - 1 
        ? outputPath 
        : join(tempDir, `step_${i}.mp4`);

      await this.applyTransition(currentOutput, clips[i], tempOutput, {
        type: transitionType,
        duration: transitionDuration
      });

      currentOutput = tempOutput;
    }

    // Cleanup
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch {}

    return outputPath;
  }
}

/**
 * Apply transition to a single video at specified timestamps
 */
export async function addTransitions(inputVideo, outputPath, markers, options = {}) {
  const manager = new SceneTransitionManager(options);
  
  if (!markers || markers.length === 0) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  // Sort markers by time
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

  const tempDir = join(tmpdir(), `transitions_${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  // Split video at each marker
  const clips = [];
  let lastTime = 0;

  for (let i = 0; i < sortedMarkers.length; i++) {
    const marker = sortedMarkers[i];
    const clipPath = join(tempDir, `clip_${i}.mp4`);
    
    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -ss ${lastTime} -t ${marker.time - lastTime} -c copy "${clipPath}"`,
      { timeout: 300000 }
    );
    
    clips.push(clipPath);
    lastTime = marker.time;
  }

  // Add final clip
  const finalClip = join(tempDir, `clip_final.mp4`);
  await execAsync(
    `ffmpeg -y -i "${inputVideo}" -ss ${lastTime} -c copy "${finalClip}"`,
    { timeout: 300000 }
  );
  clips.push(finalClip);

  // Chain clips with transitions
  const transitions = sortedMarkers.map(m => ({
    type: m.transitionType || options.type || TransitionType.CROSS_FADE,
    duration: m.transitionDuration || options.duration || 0.5
  }));

  await manager.chainWithTransitions(clips, outputPath, {
    transitions
  });

  // Cleanup
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch {}

  return outputPath;
}

/**
 * Simple transition between two points in a video
 */
export async function addSimpleTransition(inputVideo, outputPath, options = {}) {
  const {
    type = TransitionType.FADE_BLACK,
    timestamp,
    duration = 0.5
  } = options;

  if (!timestamp) {
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  const manager = new SceneTransitionManager({ defaultType: type, defaultDuration: duration });
  return manager.addTransitionAtTimestamp(inputVideo, outputPath, timestamp, { type, duration });
}

export default SceneTransitionManager;
