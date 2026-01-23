import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * IntroOutroGenerator - Create professional title cards and call-to-action screens
 * 
 * Features:
 * - Animated intro with product name and tagline
 * - Outro with CTA and branding
 * - Customizable themes (dark, light, brand colors)
 * - Smooth transitions (fade, slide, zoom)
 */
export class IntroOutroGenerator {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 60;
    
    // Branding
    this.brandColor = options.brandColor || '#3B82F6';
    this.accentColor = options.accentColor || '#10B981';
    this.backgroundColor = options.backgroundColor || '#0F172A';
    this.textColor = options.textColor || '#FFFFFF';
    
    // Durations (in seconds)
    this.introDuration = options.introDuration || 3;
    this.outroDuration = options.outroDuration || 4;
    
    // Theme: 'dark', 'light', 'gradient', 'minimal'
    this.theme = options.theme || 'dark';
  }

  /**
   * Parse hex color to RGB
   */
  parseColor(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 59, g: 130, b: 246 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  /**
   * Get theme-specific background
   */
  getBackgroundSVG() {
    const { r, g, b } = this.parseColor(this.brandColor);
    const { r: ar, g: ag, b: ab } = this.parseColor(this.accentColor);
    
    switch (this.theme) {
      case 'gradient':
        return `
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(${r},${g},${b},1)"/>
              <stop offset="100%" stop-color="rgba(${ar},${ag},${ab},1)"/>
            </linearGradient>
          </defs>
          <rect width="${this.width}" height="${this.height}" fill="url(#bg)"/>
        `;
      
      case 'light':
        return `
          <rect width="${this.width}" height="${this.height}" fill="#F8FAFC"/>
          <circle cx="${this.width * 0.8}" cy="${this.height * 0.2}" r="300" 
            fill="rgba(${r},${g},${b},0.1)"/>
          <circle cx="${this.width * 0.2}" cy="${this.height * 0.8}" r="400" 
            fill="rgba(${ar},${ag},${ab},0.08)"/>
        `;
      
      case 'minimal':
        return `<rect width="${this.width}" height="${this.height}" fill="${this.backgroundColor}"/>`;
      
      case 'dark':
      default:
        return `
          <rect width="${this.width}" height="${this.height}" fill="${this.backgroundColor}"/>
          <defs>
            <radialGradient id="glow1" cx="30%" cy="30%" r="50%">
              <stop offset="0%" stop-color="rgba(${r},${g},${b},0.3)"/>
              <stop offset="100%" stop-color="rgba(${r},${g},${b},0)"/>
            </radialGradient>
            <radialGradient id="glow2" cx="70%" cy="70%" r="50%">
              <stop offset="0%" stop-color="rgba(${ar},${ag},${ab},0.2)"/>
              <stop offset="100%" stop-color="rgba(${ar},${ag},${ab},0)"/>
            </radialGradient>
          </defs>
          <ellipse cx="${this.width * 0.3}" cy="${this.height * 0.3}" rx="500" ry="400" fill="url(#glow1)"/>
          <ellipse cx="${this.width * 0.7}" cy="${this.height * 0.7}" rx="600" ry="500" fill="url(#glow2)"/>
        `;
    }
  }

  /**
   * Generate intro frame SVG
   * @param {Object} content - { title, tagline, logo? }
   * @param {number} progress - Animation progress 0-1
   */
  generateIntroFrameSVG(content, progress) {
    const { title, tagline } = content;
    const { r, g, b } = this.parseColor(this.brandColor);
    
    // Animation phases
    const titleOpacity = Math.min(1, progress * 3);
    const titleY = this.height / 2 - 40 + (1 - Math.min(1, progress * 2)) * 30;
    
    const taglineOpacity = Math.max(0, Math.min(1, (progress - 0.3) * 3));
    const taglineY = this.height / 2 + 40 + (1 - Math.max(0, Math.min(1, (progress - 0.3) * 2))) * 20;
    
    // Accent line animation
    const lineWidth = Math.min(200, progress * 400);
    const lineOpacity = Math.min(1, progress * 2);

    const textColor = this.theme === 'light' ? '#1E293B' : this.textColor;
    const subtextColor = this.theme === 'light' ? '#64748B' : '#94A3B8';

    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
      ${this.getBackgroundSVG()}
      
      <!-- Animated accent line -->
      <rect x="${(this.width - lineWidth) / 2}" y="${this.height / 2 - 80}" 
        width="${lineWidth}" height="3" rx="1.5"
        fill="rgba(${r},${g},${b},${lineOpacity})"/>
      
      <!-- Title -->
      <text x="${this.width / 2}" y="${titleY}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="72" font-weight="700" fill="${textColor}" 
        text-anchor="middle" opacity="${titleOpacity}">
        ${this.escapeXml(title || 'Product Demo')}
      </text>
      
      <!-- Tagline -->
      <text x="${this.width / 2}" y="${taglineY}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="28" font-weight="400" fill="${subtextColor}" 
        text-anchor="middle" opacity="${taglineOpacity}">
        ${this.escapeXml(tagline || 'See how it works')}
      </text>
    </svg>`;
  }

  /**
   * Generate outro frame SVG
   * @param {Object} content - { title, cta, url, tagline? }
   * @param {number} progress - Animation progress 0-1
   */
  generateOutroFrameSVG(content, progress) {
    const { title, cta, url, tagline } = content;
    const { r, g, b } = this.parseColor(this.brandColor);
    const { r: ar, g: ag, b: ab } = this.parseColor(this.accentColor);
    
    // Staggered animations
    const titleOpacity = Math.min(1, progress * 4);
    const ctaOpacity = Math.max(0, Math.min(1, (progress - 0.2) * 4));
    const urlOpacity = Math.max(0, Math.min(1, (progress - 0.35) * 4));
    
    // CTA button animation (scale effect via width)
    const buttonScale = Math.max(0, Math.min(1, (progress - 0.2) * 3));
    const buttonWidth = 280 * buttonScale;
    const buttonHeight = 60;
    
    const textColor = this.theme === 'light' ? '#1E293B' : this.textColor;
    const subtextColor = this.theme === 'light' ? '#64748B' : '#94A3B8';

    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
      ${this.getBackgroundSVG()}
      
      <!-- Title -->
      <text x="${this.width / 2}" y="${this.height / 2 - 100}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="56" font-weight="700" fill="${textColor}" 
        text-anchor="middle" opacity="${titleOpacity}">
        ${this.escapeXml(title || 'Ready to get started?')}
      </text>
      
      ${tagline ? `
        <text x="${this.width / 2}" y="${this.height / 2 - 40}" 
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-size="24" font-weight="400" fill="${subtextColor}" 
          text-anchor="middle" opacity="${titleOpacity}">
          ${this.escapeXml(tagline)}
        </text>
      ` : ''}
      
      <!-- CTA Button -->
      <g opacity="${ctaOpacity}" transform="translate(${(this.width - buttonWidth) / 2}, ${this.height / 2})">
        <rect width="${buttonWidth}" height="${buttonHeight}" rx="12"
          fill="rgba(${r},${g},${b},1)"/>
        <text x="${buttonWidth / 2}" y="${buttonHeight / 2 + 7}" 
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-size="22" font-weight="600" fill="white" 
          text-anchor="middle" opacity="${buttonScale}">
          ${this.escapeXml(cta || 'Try It Free')}
        </text>
      </g>
      
      <!-- URL -->
      <text x="${this.width / 2}" y="${this.height / 2 + 120}" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="24" font-weight="500" fill="rgba(${r},${g},${b},${urlOpacity})" 
        text-anchor="middle">
        ${this.escapeXml(url || 'example.com')}
      </text>
    </svg>`;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate intro video
   * @param {Object} content - { title, tagline }
   * @param {string} outputPath - Output video path
   */
  async generateIntroVideo(content, outputPath) {
    const framesDir = join(outputPath + '_frames');
    await mkdir(framesDir, { recursive: true });
    
    const totalFrames = this.fps * this.introDuration;
    
    // Generate frames
    for (let i = 0; i < totalFrames; i++) {
      const progress = i / (totalFrames - 1);
      const svg = this.generateIntroFrameSVG(content, progress);
      const framePath = join(framesDir, `frame_${String(i).padStart(5, '0')}.png`);
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(framePath);
    }
    
    // Compile to video
    const cmd = `ffmpeg -y -framerate ${this.fps} -i "${framesDir}/frame_%05d.png" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -t ${this.introDuration} "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 120000 });
    
    // Cleanup frames
    await execAsync(`rm -rf "${framesDir}"`);
    
    return outputPath;
  }

  /**
   * Generate outro video
   * @param {Object} content - { title, cta, url, tagline? }
   * @param {string} outputPath - Output video path
   */
  async generateOutroVideo(content, outputPath) {
    const framesDir = join(outputPath + '_frames');
    await mkdir(framesDir, { recursive: true });
    
    const totalFrames = this.fps * this.outroDuration;
    
    // Generate frames (with hold at end)
    for (let i = 0; i < totalFrames; i++) {
      // Animate for first 60%, hold for last 40%
      const animProgress = Math.min(1, (i / totalFrames) / 0.6);
      const svg = this.generateOutroFrameSVG(content, animProgress);
      const framePath = join(framesDir, `frame_${String(i).padStart(5, '0')}.png`);
      
      await sharp(Buffer.from(svg))
        .png()
        .toFile(framePath);
    }
    
    // Compile to video
    const cmd = `ffmpeg -y -framerate ${this.fps} -i "${framesDir}/frame_%05d.png" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -t ${this.outroDuration} "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 120000 });
    
    // Cleanup frames
    await execAsync(`rm -rf "${framesDir}"`);
    
    return outputPath;
  }

  /**
   * Concatenate intro + main video + outro
   * @param {string} introPath - Intro video path (or null)
   * @param {string} mainPath - Main demo video path
   * @param {string} outroPath - Outro video path (or null)
   * @param {string} outputPath - Final output path
   */
  async concatenateVideos(introPath, mainPath, outroPath, outputPath) {
    const tempDir = join(tmpdir(), `concat-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    // Build file list
    const videos = [];
    if (introPath) videos.push(introPath);
    videos.push(mainPath);
    if (outroPath) videos.push(outroPath);
    
    if (videos.length === 1) {
      // Just copy if no intro/outro
      await execAsync(`ffmpeg -y -i "${mainPath}" -c copy "${outputPath}"`);
      return outputPath;
    }
    
    // Create concat file
    const concatFile = join(tempDir, 'concat.txt');
    const concatContent = videos.map(v => `file '${v}'`).join('\n');
    await writeFile(concatFile, concatContent);
    
    // Concatenate with re-encoding to ensure compatibility
    const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatFile}" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
      -c:a aac -b:a 192k \
      "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 300000 });
    
    // Cleanup
    await execAsync(`rm -rf "${tempDir}"`);
    
    return outputPath;
  }
}

/**
 * Quick helper to add intro/outro to a video
 */
export async function addIntroOutro(inputVideo, outputVideo, options = {}) {
  const {
    title = 'Product Demo',
    tagline = 'See how it works',
    cta = 'Try It Free',
    url = null,
    outroTitle = 'Ready to get started?',
    includeIntro = true,
    includeOutro = true,
    theme = 'dark',
    brandColor = '#3B82F6',
    width = 1920,
    height = 1080
  } = options;

  const tempDir = join(tmpdir(), `intro-outro-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const generator = new IntroOutroGenerator({
    width,
    height,
    theme,
    brandColor
  });

  let introPath = null;
  let outroPath = null;

  try {
    // Generate intro
    if (includeIntro) {
      introPath = join(tempDir, 'intro.mp4');
      await generator.generateIntroVideo({ title, tagline }, introPath);
    }

    // Generate outro
    if (includeOutro) {
      outroPath = join(tempDir, 'outro.mp4');
      await generator.generateOutroVideo({ 
        title: outroTitle, 
        cta, 
        url: url || title?.toLowerCase().replace(/\s+/g, '') + '.com'
      }, outroPath);
    }

    // Concatenate
    await generator.concatenateVideos(introPath, inputVideo, outroPath, outputVideo);

    return outputVideo;
  } finally {
    // Cleanup
    await execAsync(`rm -rf "${tempDir}"`).catch(() => {});
  }
}

export default IntroOutroGenerator;
