import { writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * SubtitleGenerator - Generate SRT subtitles from voiceover scripts
 * 
 * Features:
 * - Automatic timing based on word count
 * - Smart sentence breaking
 * - SRT and VTT format support
 * - Burn-in option with FFmpeg
 */
export class SubtitleGenerator {
  constructor(options = {}) {
    this.wordsPerMinute = options.wordsPerMinute || 150; // Average speaking speed
    this.maxWordsPerLine = options.maxWordsPerLine || 10;
    this.maxCharsPerLine = options.maxCharsPerLine || 42;
    this.minDuration = options.minDuration || 1.5; // Minimum seconds per subtitle
    this.maxDuration = options.maxDuration || 5; // Maximum seconds per subtitle
    this.fontSize = options.fontSize || 24;
    this.fontColor = options.fontColor || 'white';
    this.backgroundColor = options.backgroundColor || 'rgba(0,0,0,0.7)';
    this.position = options.position || 'bottom'; // bottom, top
  }

  /**
   * Convert seconds to SRT timestamp format (HH:MM:SS,mmm)
   */
  secondsToSRT(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Convert seconds to VTT timestamp format (HH:MM:SS.mmm)
   */
  secondsToVTT(seconds) {
    return this.secondsToSRT(seconds).replace(',', '.');
  }

  /**
   * Split script into timed subtitle segments
   * @param {string} script - The voiceover script text
   * @param {number} totalDuration - Total video duration in seconds
   * @returns {Array} Array of {text, start, end} objects
   */
  splitIntoSegments(script, totalDuration) {
    if (!script || !script.trim()) {
      return [];
    }

    // Clean and split into sentences
    const sentences = script
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0);

    const segments = [];
    const totalWords = script.split(/\s+/).length;
    const secondsPerWord = totalDuration / totalWords;

    let currentTime = 0;

    for (const sentence of sentences) {
      // Split long sentences
      const chunks = this.splitLongSentence(sentence);
      
      for (const chunk of chunks) {
        const wordCount = chunk.split(/\s+/).length;
        let duration = wordCount * secondsPerWord;
        
        // Clamp duration
        duration = Math.max(this.minDuration, Math.min(this.maxDuration, duration));
        
        // Add small buffer between subtitles
        const start = currentTime;
        const end = Math.min(currentTime + duration, totalDuration);
        
        segments.push({
          text: chunk.trim(),
          start,
          end
        });
        
        currentTime = end + 0.1; // Small gap between subtitles
      }
    }

    // Adjust timing to fit total duration
    if (segments.length > 0 && currentTime > totalDuration) {
      const scale = (totalDuration - 0.5) / currentTime;
      let adjustedTime = 0;
      
      for (const seg of segments) {
        const duration = (seg.end - seg.start) * scale;
        seg.start = adjustedTime;
        seg.end = adjustedTime + duration;
        adjustedTime = seg.end + 0.1;
      }
    }

    return segments;
  }

  /**
   * Split a long sentence into readable chunks
   */
  splitLongSentence(sentence) {
    const words = sentence.split(/\s+/);
    
    if (words.length <= this.maxWordsPerLine && sentence.length <= this.maxCharsPerLine) {
      return [sentence];
    }

    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const word of words) {
      const wouldExceedWords = currentChunk.length >= this.maxWordsPerLine;
      const wouldExceedChars = currentLength + word.length + 1 > this.maxCharsPerLine;

      if (currentChunk.length > 0 && (wouldExceedWords || wouldExceedChars)) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentLength = 0;
      }

      currentChunk.push(word);
      currentLength += word.length + 1;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Generate SRT format subtitles
   * @param {string} script - The script text
   * @param {number} duration - Video duration in seconds
   * @returns {string} SRT formatted string
   */
  generateSRT(script, duration) {
    const segments = this.splitIntoSegments(script, duration);
    
    return segments.map((seg, i) => {
      return `${i + 1}\n${this.secondsToSRT(seg.start)} --> ${this.secondsToSRT(seg.end)}\n${seg.text}\n`;
    }).join('\n');
  }

  /**
   * Generate WebVTT format subtitles
   * @param {string} script - The script text
   * @param {number} duration - Video duration in seconds
   * @returns {string} VTT formatted string
   */
  generateVTT(script, duration) {
    const segments = this.splitIntoSegments(script, duration);
    
    let vtt = 'WEBVTT\n\n';
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      vtt += `${i + 1}\n`;
      vtt += `${this.secondsToVTT(seg.start)} --> ${this.secondsToVTT(seg.end)}\n`;
      vtt += `${seg.text}\n\n`;
    }
    
    return vtt;
  }

  /**
   * Save subtitles to file
   * @param {string} script - The script text
   * @param {number} duration - Video duration in seconds
   * @param {string} outputPath - Output file path (.srt or .vtt)
   */
  async saveSubtitles(script, duration, outputPath) {
    const isVTT = outputPath.toLowerCase().endsWith('.vtt');
    const content = isVTT 
      ? this.generateVTT(script, duration)
      : this.generateSRT(script, duration);
    
    await writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  /**
   * Burn subtitles into video using FFmpeg
   * @param {string} inputVideo - Input video path
   * @param {string} subtitlePath - SRT/VTT file path
   * @param {string} outputVideo - Output video path
   * @param {Object} style - Styling options
   */
  async burnSubtitles(inputVideo, subtitlePath, outputVideo, style = {}) {
    const {
      fontSize = this.fontSize,
      fontColor = this.fontColor,
      backgroundColor = 'Black@0.5',
      position = this.position,
      fontName = 'Arial'
    } = style;

    // Position: MarginV controls vertical position
    const marginV = position === 'top' ? 50 : 30;
    const alignment = position === 'top' ? 8 : 2; // ASS alignment: 2=bottom-center, 8=top-center

    // Use FFmpeg's subtitles filter with force_style
    const forceStyle = `FontSize=${fontSize},FontName=${fontName},PrimaryColour=&HFFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=${marginV},Alignment=${alignment}`;

    const cmd = `ffmpeg -y -i "${inputVideo}" \
      -vf "subtitles='${subtitlePath}':force_style='${forceStyle}'" \
      -c:v libx264 -preset fast -crf 18 \
      -c:a copy \
      "${outputVideo}"`;

    await execAsync(cmd, { timeout: 300000 });
    return outputVideo;
  }
}

/**
 * Quick helper to add subtitles to a video
 */
export async function addSubtitlesToVideo(inputVideo, script, outputVideo, options = {}) {
  const {
    duration = null, // If null, will probe video
    burnIn = false,
    outputSRT = null, // Save SRT to this path
    outputVTT = null, // Save VTT to this path
    ...styleOptions
  } = options;

  // Get video duration if not provided
  let videoDuration = duration;
  if (!videoDuration) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`
      );
      videoDuration = parseFloat(stdout.trim()) || 30;
    } catch {
      videoDuration = 30; // Default fallback
    }
  }

  const generator = new SubtitleGenerator(styleOptions);

  // Save subtitle files if requested
  if (outputSRT) {
    await generator.saveSubtitles(script, videoDuration, outputSRT);
  }
  if (outputVTT) {
    await generator.saveSubtitles(script, videoDuration, outputVTT);
  }

  // Burn in if requested
  if (burnIn) {
    const tempSRT = outputSRT || join('/tmp', `subs-${Date.now()}.srt`);
    if (!outputSRT) {
      await generator.saveSubtitles(script, videoDuration, tempSRT);
    }
    await generator.burnSubtitles(inputVideo, tempSRT, outputVideo, styleOptions);
    return outputVideo;
  }

  return { srt: outputSRT, vtt: outputVTT };
}

export default SubtitleGenerator;
