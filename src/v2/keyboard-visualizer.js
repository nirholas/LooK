/**
 * KeyboardVisualizer - Display keyboard shortcuts and keypresses on screen
 * 
 * Features:
 * - Show key combinations as overlays
 * - Animated key press effects
 * - Customizable styling (Mac/Windows/Linux)
 * - Support for modifier keys (Cmd, Ctrl, Alt, Shift)
 * - Timed display with fade animations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * Key visualization styles
 */
export const KeyStyle = {
  MAC: 'mac',           // macOS-style keys with symbols
  WINDOWS: 'windows',   // Windows-style keys
  MINIMAL: 'minimal',   // Simple text-only
  DARK: 'dark',         // Dark theme
  LIGHT: 'light'        // Light theme
};

/**
 * Key position presets
 */
export const KeyPosition = {
  BOTTOM_CENTER: { x: 0.5, y: 0.9 },
  BOTTOM_LEFT: { x: 0.15, y: 0.9 },
  BOTTOM_RIGHT: { x: 0.85, y: 0.9 },
  TOP_CENTER: { x: 0.5, y: 0.1 },
  CENTER: { x: 0.5, y: 0.5 }
};

/**
 * Mac key symbols
 */
const MAC_SYMBOLS = {
  cmd: '⌘',
  command: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  enter: '↵',
  return: '↵',
  tab: '⇥',
  delete: '⌫',
  backspace: '⌫',
  esc: '⎋',
  escape: '⎋',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: '␣',
  capslock: '⇪'
};

/**
 * Windows key symbols
 */
const WIN_SYMBOLS = {
  cmd: 'Win',
  command: 'Win',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  delete: 'Del',
  backspace: '←',
  esc: 'Esc',
  escape: 'Esc',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
  capslock: 'Caps'
};

/**
 * Default styling
 */
const DEFAULT_STYLE = {
  keyBackground: '#1a1a1a',
  keyBorder: '#333333',
  keyText: '#ffffff',
  keyHighlight: '#3b82f6',
  fontSize: 24,
  padding: 12,
  borderRadius: 8,
  shadowBlur: 10,
  gap: 8
};

/**
 * Keyboard Visualizer class
 */
export class KeyboardVisualizer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.style = options.style || KeyStyle.MAC;
    this.position = options.position || KeyPosition.BOTTOM_CENTER;
    this.theme = { ...DEFAULT_STYLE, ...options.theme };
    this.keyEvents = [];
  }

  /**
   * Add a key press event
   */
  addKeyPress(keys, timestamp, duration = 1.5) {
    this.keyEvents.push({
      keys: Array.isArray(keys) ? keys : [keys],
      start: timestamp,
      end: timestamp + duration
    });
  }

  /**
   * Parse key combination string (e.g., "Cmd+Shift+P")
   */
  parseKeyCombo(combo) {
    return combo.split(/[+\s]/).filter(k => k.trim());
  }

  /**
   * Get display symbol for a key
   */
  getKeySymbol(key) {
    const lowerKey = key.toLowerCase();
    const symbols = this.style === KeyStyle.MAC ? MAC_SYMBOLS : WIN_SYMBOLS;
    return symbols[lowerKey] || key.toUpperCase();
  }

  /**
   * Generate frames for key visualization
   */
  async generateFrames(outputDir, duration) {
    await mkdir(outputDir, { recursive: true });

    const totalFrames = Math.ceil(duration * this.fps);
    const framePaths = [];

    console.log(`  Generating ${totalFrames} keyboard overlay frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      const framePath = join(outputDir, `key_${frame.toString().padStart(6, '0')}.png`);
      
      await this.renderFrame(time, framePath);
      framePaths.push(framePath);

      if (frame % 30 === 0) {
        process.stdout.write(`\r  Keyboard frame ${frame}/${totalFrames}`);
      }
    }
    console.log();

    return framePaths;
  }

  /**
   * Render a single frame
   */
  async renderFrame(time, outputPath) {
    // Find active key events
    const activeEvents = this.keyEvents.filter(
      e => time >= e.start && time <= e.end
    );

    if (activeEvents.length === 0) {
      // Empty transparent frame
      const svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
      await sharp(Buffer.from(svg)).png().toFile(outputPath);
      return;
    }

    // Render all active key combinations
    const svg = this.generateKeysSVG(activeEvents, time);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
  }

  /**
   * Generate SVG for keys
   */
  generateKeysSVG(events, currentTime) {
    const { keyBackground, keyBorder, keyText, fontSize, padding, borderRadius, gap } = this.theme;
    
    let svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add filters
    svg += `
      <defs>
        <filter id="keyShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.4"/>
        </filter>
        <linearGradient id="keyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#333;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1"/>
        </linearGradient>
      </defs>
    `;

    // Render each event's keys
    let yOffset = 0;
    for (const event of events) {
      // Calculate animation state
      const elapsed = currentTime - event.start;
      const remaining = event.end - currentTime;
      const fadeInDuration = 0.15;
      const fadeOutDuration = 0.3;
      
      let opacity = 1;
      let scale = 1;
      
      if (elapsed < fadeInDuration) {
        // Fade/scale in
        const progress = elapsed / fadeInDuration;
        opacity = progress;
        scale = 0.8 + 0.2 * progress;
      } else if (remaining < fadeOutDuration) {
        // Fade out
        opacity = remaining / fadeOutDuration;
      }

      // Render keys
      const keySvg = this.renderKeyGroup(event.keys, opacity, scale, yOffset);
      svg += keySvg;
      
      yOffset += fontSize + padding * 2 + gap;
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Render a group of keys
   */
  renderKeyGroup(keys, opacity, scale, yOffset) {
    const { keyBackground, keyBorder, keyText, fontSize, padding, borderRadius, gap } = this.theme;
    
    // Calculate total width
    const keySymbols = keys.map(k => this.getKeySymbol(k));
    const charWidth = fontSize * 0.7;
    const keyWidths = keySymbols.map(s => Math.max(s.length * charWidth + padding * 2, fontSize + padding * 2));
    const totalWidth = keyWidths.reduce((sum, w) => sum + w + gap, 0) - gap;
    const keyHeight = fontSize + padding * 2;

    // Calculate position
    const groupX = this.width * this.position.x - (totalWidth * scale) / 2;
    const groupY = this.height * this.position.y - (keyHeight * scale) / 2 + yOffset;

    let svg = `<g transform="translate(${groupX}, ${groupY}) scale(${scale})" opacity="${opacity}">`;

    let xOffset = 0;
    for (let i = 0; i < keys.length; i++) {
      const symbol = keySymbols[i];
      const keyWidth = keyWidths[i];

      // Key background
      svg += `
        <rect x="${xOffset}" y="0" width="${keyWidth}" height="${keyHeight}"
              rx="${borderRadius}" ry="${borderRadius}"
              fill="url(#keyGradient)"
              stroke="${keyBorder}" stroke-width="2"
              filter="url(#keyShadow)"/>
      `;

      // Key text
      svg += `
        <text x="${xOffset + keyWidth / 2}" y="${keyHeight / 2 + fontSize * 0.35}"
              font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
              font-size="${fontSize}px"
              font-weight="500"
              fill="${keyText}"
              text-anchor="middle">
          ${this.escapeXml(symbol)}
        </text>
      `;

      // Plus sign between keys
      if (i < keys.length - 1) {
        svg += `
          <text x="${xOffset + keyWidth + gap / 2}" y="${keyHeight / 2 + fontSize * 0.35}"
                font-family="Inter, sans-serif"
                font-size="${fontSize * 0.8}px"
                font-weight="300"
                fill="${keyText}"
                opacity="0.6"
                text-anchor="middle">
            +
          </text>
        `;
      }

      xOffset += keyWidth + gap;
    }

    svg += '</g>';
    return svg;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Apply keyboard overlay to video
   */
  async applyToVideo(inputVideo, keyFramesDir, outputPath) {
    const keyVideoPath = join(tmpdir(), `keys_${Date.now()}.mov`);
    
    // Create video from key frames
    await execAsync(
      `ffmpeg -y -framerate ${this.fps} -i "${keyFramesDir}/key_%06d.png" ` +
      `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${keyVideoPath}"`,
      { timeout: 300000 }
    );

    // Overlay on video
    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -i "${keyVideoPath}" ` +
      `-filter_complex "[0:v][1:v]overlay=0:0:format=auto[out]" ` +
      `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${outputPath}"`,
      { timeout: 300000 }
    );

    return outputPath;
  }
}

/**
 * Add keyboard visualization to video
 */
export async function addKeyboardOverlay(inputVideo, outputPath, keyEvents, options = {}) {
  const {
    style = KeyStyle.MAC,
    position = KeyPosition.BOTTOM_CENTER,
    duration
  } = options;

  if (!keyEvents || keyEvents.length === 0) {
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
  const videoDuration = duration || parseFloat(info.format?.duration) || 30;

  // Create visualizer
  const visualizer = new KeyboardVisualizer({
    width,
    height,
    fps,
    style,
    position
  });

  // Add key events
  for (const event of keyEvents) {
    const keys = typeof event.keys === 'string' 
      ? visualizer.parseKeyCombo(event.keys)
      : event.keys;
    visualizer.addKeyPress(keys, event.timestamp, event.duration || 1.5);
  }

  // Generate frames
  const tempDir = join(tmpdir(), `keyboard_${Date.now()}`);
  await visualizer.generateFrames(tempDir, videoDuration);

  // Apply to video
  await visualizer.applyToVideo(inputVideo, tempDir, outputPath);

  // Cleanup
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch {}

  return outputPath;
}

/**
 * Parse keyboard events from demo script
 */
export function parseKeyboardFromScript(script) {
  const keyEvents = [];
  const keyPattern = /\[([A-Za-z+]+)\]/g;
  
  // Simple heuristic - find key combinations in brackets
  let match;
  let index = 0;
  
  while ((match = keyPattern.exec(script)) !== null) {
    keyEvents.push({
      keys: match[1],
      timestamp: (index * 2) + 1, // Rough timing
      duration: 1.5
    });
    index++;
  }

  return keyEvents;
}

export default KeyboardVisualizer;
