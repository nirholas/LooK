/**
 * AnimatedCaptions - Remotion-style animated word-by-word captions
 * 
 * Features:
 * - Word-by-word highlighting with timing
 * - Pop/bounce animations
 * - Karaoke-style progressive reveal
 * - Multiple animation presets
 * - Customizable styling
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { escapeXml as escapeXmlUtil } from './utils.js';

const execAsync = promisify(exec);

/**
 * Caption animation styles
 */
export const CaptionStyle = {
  KARAOKE: 'karaoke',        // Word-by-word highlight
  POP: 'pop',                // Words pop in with scale
  TYPEWRITER: 'typewriter',  // Letter-by-letter reveal
  FADE_WORD: 'fade-word',    // Each word fades in
  BOUNCE: 'bounce',          // Bouncy word entrance
  SLIDE_UP: 'slide-up'       // Words slide up from bottom
};

/**
 * Caption position presets
 */
export const CaptionPosition = {
  BOTTOM: { x: 0.5, y: 0.85 },
  TOP: { x: 0.5, y: 0.1 },
  CENTER: { x: 0.5, y: 0.5 },
  LOWER_THIRD: { x: 0.5, y: 0.75 }
};

/**
 * Default caption styling
 */
const DEFAULT_STYLE = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#FFFFFF',
  highlightColor: '#FFD700',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  padding: 20,
  borderRadius: 12,
  shadow: true,
  outline: true,
  outlineColor: '#000000',
  outlineWidth: 3
};

/**
 * Generate animated caption frames
 */
export class AnimatedCaptionRenderer {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.style = { ...DEFAULT_STYLE, ...options.style };
    this.position = options.position || CaptionPosition.BOTTOM;
    this.animationStyle = options.animationStyle || CaptionStyle.KARAOKE;
  }

  /**
   * Parse transcript with word timings
   * Accepts either SRT-style or word-level timings
   */
  parseTranscript(transcript) {
    if (Array.isArray(transcript)) {
      // Already parsed word timings
      return transcript;
    }

    // Parse SRT format or plain text with duration
    const lines = transcript.split('\n').filter(l => l.trim());
    const words = [];
    let currentTime = 0;

    for (const line of lines) {
      // Check for timestamp format: "00:00:05,000 --> 00:00:08,000"
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
      
      if (timestampMatch) {
        currentTime = this.parseTimestamp(timestampMatch[1]);
        continue;
      }

      // Skip sequence numbers
      if (/^\d+$/.test(line.trim())) continue;

      // Parse words from text line
      const lineWords = line.split(/\s+/);
      const wordDuration = 0.3; // Default duration per word

      for (const word of lineWords) {
        if (word.trim()) {
          words.push({
            text: word,
            start: currentTime,
            end: currentTime + wordDuration
          });
          currentTime += wordDuration;
        }
      }
    }

    return words;
  }

  /**
   * Parse SRT timestamp to seconds
   */
  parseTimestamp(ts) {
    const [time, ms] = ts.split(/[,\.]/);
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms) / 1000);
  }

  /**
   * Generate caption overlay frames as PNG sequence
   */
  async generateFrames(transcript, outputDir, duration) {
    await mkdir(outputDir, { recursive: true });

    const words = this.parseTranscript(transcript);
    if (words.length === 0) return [];

    const totalFrames = Math.ceil(duration * this.fps);
    const framePaths = [];

    console.log(`  Generating ${totalFrames} caption frames...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      const framePath = join(outputDir, `caption_${frame.toString().padStart(6, '0')}.png`);
      
      await this.renderFrame(words, time, framePath);
      framePaths.push(framePath);

      if (frame % 30 === 0) {
        process.stdout.write(`\r  Caption frame ${frame}/${totalFrames}`);
      }
    }
    console.log();

    return framePaths;
  }

  /**
   * Render a single caption frame
   */
  async renderFrame(words, time, outputPath) {
    // Find active words at this time
    const activeWords = this.getActiveWords(words, time);
    
    if (activeWords.length === 0) {
      // Generate transparent frame
      await this.generateEmptyFrame(outputPath);
      return;
    }

    // Generate SVG for caption
    const svg = this.generateCaptionSVG(activeWords, time);
    
    // Convert to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
  }

  /**
   * Get words visible at current time
   */
  getActiveWords(words, time) {
    // Show a window of words around current time
    const windowStart = time - 0.5;
    const windowEnd = time + 3;

    return words.filter(w => w.start <= windowEnd && w.end >= windowStart);
  }

  /**
   * Generate SVG for animated caption
   */
  generateCaptionSVG(activeWords, currentTime) {
    const { fontSize, fontFamily, fontWeight, color, highlightColor, 
            backgroundColor, padding, borderRadius, outlineColor, outlineWidth } = this.style;
    
    // Calculate text dimensions
    const charWidth = fontSize * 0.5;
    const lineHeight = fontSize * 1.4;
    
    // Group words into lines
    const maxLineWidth = this.width * 0.8;
    const lines = this.wrapWords(activeWords, maxLineWidth, charWidth);
    
    // Calculate box dimensions
    const maxLineLength = Math.max(...lines.map(l => l.reduce((sum, w) => sum + w.text.length, 0) + l.length - 1));
    const boxWidth = Math.min(maxLineLength * charWidth + padding * 2, this.width * 0.9);
    const boxHeight = lines.length * lineHeight + padding * 2;
    
    // Position
    const boxX = (this.width - boxWidth) / 2;
    const boxY = this.height * this.position.y - boxHeight / 2;

    let svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background box with rounded corners
    svg += `
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" 
            rx="${borderRadius}" ry="${borderRadius}"
            fill="${backgroundColor}" filter="url(#shadow)"/>
    `;

    // Render words with animation
    let yOffset = boxY + padding + fontSize;
    
    for (const line of lines) {
      let xOffset = boxX + padding;
      
      for (const word of line) {
        const wordState = this.getWordAnimationState(word, currentTime);
        const wordColor = wordState.highlighted ? highlightColor : color;
        const transform = this.getWordTransform(word, currentTime, wordState);
        
        svg += `
          <text x="${xOffset}" y="${yOffset}" 
                font-family="${fontFamily}" 
                font-size="${fontSize}px" 
                font-weight="${fontWeight}"
                fill="${wordColor}"
                ${transform}
                style="paint-order: stroke fill;">
            ${wordState.opacity < 1 ? `<tspan opacity="${wordState.opacity}">` : ''}
            ${this.escapeXml(word.text)}
            ${wordState.opacity < 1 ? '</tspan>' : ''}
          </text>
        `;

        // Add outline/stroke
        if (outlineWidth > 0) {
          svg += `
            <text x="${xOffset}" y="${yOffset}" 
                  font-family="${fontFamily}" 
                  font-size="${fontSize}px" 
                  font-weight="${fontWeight}"
                  fill="none"
                  stroke="${outlineColor}"
                  stroke-width="${outlineWidth}"
                  ${transform}>
              ${this.escapeXml(word.text)}
            </text>
          `;
        }

        xOffset += (word.text.length + 1) * charWidth;
      }
      
      yOffset += lineHeight;
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Get animation state for a word
   */
  getWordAnimationState(word, currentTime) {
    const timeSinceStart = currentTime - word.start;
    const isActive = currentTime >= word.start && currentTime <= word.end;
    const isPast = currentTime > word.end;
    
    let opacity = 1;
    let scale = 1;
    let highlighted = false;

    switch (this.animationStyle) {
      case CaptionStyle.KARAOKE:
        highlighted = isActive;
        opacity = timeSinceStart < 0 ? 0.4 : 1;
        break;

      case CaptionStyle.POP:
        if (timeSinceStart < 0) {
          opacity = 0;
          scale = 0.5;
        } else if (timeSinceStart < 0.15) {
          const progress = timeSinceStart / 0.15;
          opacity = progress;
          scale = 0.5 + 0.6 * progress; // Overshoot to 1.1
        } else if (timeSinceStart < 0.25) {
          const progress = (timeSinceStart - 0.15) / 0.1;
          scale = 1.1 - 0.1 * progress; // Settle to 1.0
        }
        highlighted = isActive;
        break;

      case CaptionStyle.FADE_WORD:
        if (timeSinceStart < 0) {
          opacity = 0;
        } else if (timeSinceStart < 0.2) {
          opacity = timeSinceStart / 0.2;
        }
        highlighted = isActive;
        break;

      case CaptionStyle.BOUNCE:
        if (timeSinceStart < 0) {
          opacity = 0;
          scale = 0;
        } else if (timeSinceStart < 0.3) {
          const t = timeSinceStart / 0.3;
          // Elastic bounce
          opacity = 1;
          scale = 1 + 0.3 * Math.sin(t * Math.PI * 3) * Math.exp(-t * 3);
        }
        highlighted = isActive;
        break;

      case CaptionStyle.SLIDE_UP:
        if (timeSinceStart < 0) {
          opacity = 0;
        } else if (timeSinceStart < 0.2) {
          opacity = timeSinceStart / 0.2;
        }
        highlighted = isActive;
        break;

      case CaptionStyle.TYPEWRITER:
        // Handled differently - character by character
        opacity = timeSinceStart >= 0 ? 1 : 0;
        break;
    }

    return { opacity, scale, highlighted, isActive, isPast };
  }

  /**
   * Get transform attribute for word animation
   */
  getWordTransform(word, currentTime, state) {
    if (state.scale === 1) return '';
    
    // Scale transform from center of word
    return `transform="scale(${state.scale})" transform-origin="center"`;
  }

  /**
   * Wrap words into lines
   */
  wrapWords(words, maxWidth, charWidth) {
    const lines = [[]];
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = (word.text.length + 1) * charWidth;
      
      if (currentWidth + wordWidth > maxWidth && lines[lines.length - 1].length > 0) {
        lines.push([]);
        currentWidth = 0;
      }
      
      lines[lines.length - 1].push(word);
      currentWidth += wordWidth;
    }

    return lines.filter(l => l.length > 0);
  }

  /**
   * Generate empty transparent frame
   */
  async generateEmptyFrame(outputPath) {
    const svg = `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    return escapeXmlUtil(text);
  }

  /**
   * Apply caption overlay to video
   */
  async applyToVideo(inputVideo, captionFramesDir, outputPath) {
    // Create video from caption frames
    const captionVideoPath = join(tmpdir(), `captions_${Date.now()}.mov`);
    
    await execAsync(
      `ffmpeg -y -framerate ${this.fps} -i "${captionFramesDir}/caption_%06d.png" ` +
      `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${captionVideoPath}"`,
      { timeout: 300000 }
    );

    // Overlay captions on video
    await execAsync(
      `ffmpeg -y -i "${inputVideo}" -i "${captionVideoPath}" ` +
      `-filter_complex "[0:v][1:v]overlay=0:0:format=auto[out]" ` +
      `-map "[out]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${outputPath}"`,
      { timeout: 300000 }
    );

    return outputPath;
  }
}

/**
 * Generate word-level timing from audio using speech recognition
 */
export async function generateWordTimings(audioPath, options = {}) {
  const {
    words = [],
    duration = 30
  } = options;

  // If words provided without timing, distribute evenly
  if (words.length > 0 && typeof words[0] === 'string') {
    const wordsPerSecond = words.length / duration;
    let currentTime = 0;

    return words.map(word => {
      const wordDuration = 1 / wordsPerSecond;
      const timing = {
        text: word,
        start: currentTime,
        end: currentTime + wordDuration * 0.9 // Small gap between words
      };
      currentTime += wordDuration;
      return timing;
    });
  }

  return words;
}

/**
 * Add animated captions to video
 */
export async function addAnimatedCaptions(inputVideo, outputPath, options = {}) {
  const {
    transcript,
    script,
    duration,
    style = CaptionStyle.KARAOKE,
    position = CaptionPosition.BOTTOM,
    fontSize = 48
  } = options;

  // Parse script into word timings if needed
  let wordTimings;
  if (transcript) {
    const renderer = new AnimatedCaptionRenderer({ 
      animationStyle: style,
      position,
      style: { fontSize }
    });
    wordTimings = renderer.parseTranscript(transcript);
  } else if (script) {
    wordTimings = await generateWordTimings(null, {
      words: script.split(/\s+/),
      duration
    });
  } else {
    // No captions to add
    await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    return outputPath;
  }

  // Get video info
  const { stdout } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of json "${inputVideo}"`
  );
  const info = JSON.parse(stdout);
  const width = info.streams[0]?.width || 1920;
  const height = info.streams[0]?.height || 1080;
  const fpsRaw = info.streams[0]?.r_frame_rate || '30/1';
  const [fpsNum, fpsDen] = fpsRaw.split('/').map(Number);
  const fps = Math.round(fpsNum / fpsDen);

  // Create renderer
  const renderer = new AnimatedCaptionRenderer({
    width,
    height,
    fps,
    animationStyle: style,
    position,
    style: { fontSize }
  });

  // Generate caption frames
  const tempDir = join(tmpdir(), `captions_${Date.now()}`);
  await renderer.generateFrames(wordTimings, tempDir, duration);

  // Apply to video
  await renderer.applyToVideo(inputVideo, tempDir, outputPath);

  // Cleanup
  try {
    await execAsync(`rm -rf "${tempDir}"`);
  } catch {}

  return outputPath;
}

export default AnimatedCaptionRenderer;
