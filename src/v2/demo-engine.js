/**
 * DemoEngine - The core engine that orchestrates demo video generation
 * This is the main workhorse that makes everything actually work
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, readFile, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if FFmpeg is available
 */
export async function checkDependencies() {
  const deps = {
    ffmpeg: false,
    ffprobe: false
  };

  try {
    await execAsync('ffmpeg -version');
    deps.ffmpeg = true;
  } catch (e) {
    console.error('FFmpeg not found. Please install FFmpeg.');
  }

  try {
    await execAsync('ffprobe -version');
    deps.ffprobe = true;
  } catch (e) {
    console.error('FFprobe not found. Please install FFmpeg.');
  }

  return deps;
}

/**
 * DemoEngine class - handles the complete demo generation pipeline
 */
export class DemoEngine {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 60;
    this.duration = options.duration || 25000; // ms
    this.tempDir = null;
    this.browser = null;
    this.page = null;
    
    // Recording state
    this.cursorPositions = [];
    this.clicks = [];
    this.startTime = null;
    this.isRecording = false;
  }

  /**
   * Initialize temp directory
   */
  async init() {
    this.tempDir = join(tmpdir(), `look-demo-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });
    return this.tempDir;
  }

  /**
   * Launch browser and navigate to URL
   */
  async launchBrowser(url) {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width: this.width, height: this.height },
      recordVideo: {
        dir: this.tempDir,
        size: { width: this.width, height: this.height }
      }
    });

    this.page = await context.newPage();

    // Inject cursor tracking script before page load
    await this.page.addInitScript(() => {
      window.__lookCursor = {
        positions: [],
        clicks: [],
        startTime: null
      };

      const recordPosition = (e) => {
        if (!window.__lookCursor.startTime) {
          window.__lookCursor.startTime = performance.now();
        }
        window.__lookCursor.positions.push({
          x: e.clientX,
          y: e.clientY,
          t: performance.now() - window.__lookCursor.startTime
        });
      };

      const recordClick = (e) => {
        if (!window.__lookCursor.startTime) {
          window.__lookCursor.startTime = performance.now();
        }
        window.__lookCursor.clicks.push({
          x: e.clientX,
          y: e.clientY,
          t: performance.now() - window.__lookCursor.startTime
        });
      };

      document.addEventListener('mousemove', recordPosition, { passive: true });
      document.addEventListener('click', recordClick, { passive: true });
      
      // Also capture touch for mobile emulation
      document.addEventListener('touchmove', (e) => {
        if (e.touches[0]) {
          recordPosition({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
      }, { passive: true });
    });

    // Navigate with timeout and retry
    let retries = 3;
    while (retries > 0) {
      try {
        await this.page.goto(url, { 
          waitUntil: 'networkidle', 
          timeout: 30000 
        });
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await this.sleep(1000);
      }
    }

    // Wait for page to stabilize
    await this.sleep(1000);

    return this.page;
  }

  /**
   * Get page info for smart demo planning
   */
  async getPageInfo() {
    return await this.page.evaluate(() => {
      const getInteractiveElements = () => {
        const elements = [];
        const selectors = [
          'button',
          'a[href]',
          'input',
          'select',
          '[role="button"]',
          '[onclick]',
          '.btn',
          '[class*="button"]',
          '[class*="cta"]'
        ];

        for (const selector of selectors) {
          const els = document.querySelectorAll(selector);
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 20 && rect.height > 15 && rect.top >= 0) {
              elements.push({
                tag: el.tagName,
                text: el.textContent?.trim().slice(0, 50) || '',
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height,
                visible: rect.top < window.innerHeight && rect.bottom > 0
              });
            }
          }
        }

        return elements;
      };

      const getHeadings = () => {
        const headings = [];
        for (const h of document.querySelectorAll('h1, h2, h3')) {
          const rect = h.getBoundingClientRect();
          headings.push({
            tag: h.tagName,
            text: h.textContent?.trim().slice(0, 100) || '',
            y: rect.top + window.scrollY
          });
        }
        return headings;
      };

      return {
        title: document.title,
        pageHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        interactiveElements: getInteractiveElements(),
        headings: getHeadings(),
        hasHeroSection: !!document.querySelector('[class*="hero"], [class*="banner"], header > div')
      };
    });
  }

  /**
   * Record cursor movement (called during demo)
   */
  recordCursor(x, y) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    this.cursorPositions.push({
      x: Math.round(x),
      y: Math.round(y),
      t: Date.now() - this.startTime
    });
  }

  /**
   * Record a click
   */
  recordClick(x, y) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    this.clicks.push({
      x: Math.round(x),
      y: Math.round(y),
      t: Date.now() - this.startTime
    });
  }

  /**
   * Smooth move cursor from current position to target
   */
  async smoothMoveTo(targetX, targetY, duration = 500) {
    const startX = this.cursorPositions.length > 0 
      ? this.cursorPositions[this.cursorPositions.length - 1].x 
      : this.width / 2;
    const startY = this.cursorPositions.length > 0 
      ? this.cursorPositions[this.cursorPositions.length - 1].y 
      : this.height / 2;

    const steps = Math.max(10, Math.floor(duration / 16)); // ~60fps
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease-out cubic for natural movement
      const eased = 1 - Math.pow(1 - t, 3);
      
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      this.recordCursor(x, y);
      await this.page.mouse.move(x, y);
      await this.sleep(duration / steps);
    }
  }

  /**
   * Perform a click at current cursor position
   */
  async click(x, y) {
    await this.smoothMoveTo(x, y, 300);
    this.recordClick(x, y);
    await this.page.mouse.click(x, y);
    await this.sleep(200);
  }

  /**
   * Smooth scroll to a Y position
   */
  async smoothScrollTo(targetY, duration = 800) {
    await this.page.evaluate(async (args) => {
      const { targetY, duration } = args;
      const startY = window.scrollY;
      const startTime = performance.now();

      return new Promise((resolve) => {
        const scroll = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease-in-out
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          window.scrollTo(0, startY + (targetY - startY) * eased);

          if (progress < 1) {
            requestAnimationFrame(scroll);
          } else {
            resolve();
          }
        };
        scroll();
      });
    }, { targetY, duration });

    await this.sleep(duration + 100);
  }

  /**
   * Execute an intelligent auto-demo based on page analysis
   */
  async autoDemo(pageInfo) {
    const { pageHeight, viewportHeight, interactiveElements, headings } = pageInfo;
    
    // Start with cursor in center
    this.recordCursor(this.width / 2, this.height / 3);
    await this.page.mouse.move(this.width / 2, this.height / 3);
    await this.sleep(1500);

    // Move around hero section
    await this.smoothMoveTo(this.width * 0.35, this.height * 0.4, 600);
    await this.sleep(800);
    await this.smoothMoveTo(this.width * 0.65, this.height * 0.35, 500);
    await this.sleep(1000);

    // Find and hover over primary CTA if visible
    const primaryCta = interactiveElements.find(el => 
      el.visible && 
      el.tag === 'BUTTON' &&
      (el.text.toLowerCase().includes('start') ||
       el.text.toLowerCase().includes('try') ||
       el.text.toLowerCase().includes('get') ||
       el.text.toLowerCase().includes('sign'))
    );

    if (primaryCta) {
      await this.smoothMoveTo(primaryCta.x, primaryCta.y, 500);
      await this.sleep(1200);
      // Hover effect without actual click
    }

    // Calculate scroll sections
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    const numSections = Math.min(4, Math.max(2, Math.ceil(maxScroll / viewportHeight)));
    const scrollPerSection = maxScroll / numSections;
    const timeRemaining = this.duration - 5000; // Reserve 5s
    const timePerSection = timeRemaining / numSections;

    // Scroll through page sections
    for (let i = 1; i <= numSections; i++) {
      const targetScroll = Math.min(scrollPerSection * i, maxScroll);
      
      await this.smoothScrollTo(targetScroll, 1000);
      
      // Get visible elements after scroll
      const visibleElements = await this.page.evaluate(() => {
        const elements = [];
        for (const el of document.querySelectorAll('button, a.btn, [class*="button"], h2, h3')) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 100 && rect.top < window.innerHeight - 100 && rect.width > 50) {
            elements.push({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              isButton: el.tagName === 'BUTTON' || el.className.includes('btn')
            });
          }
        }
        return elements.slice(0, 3);
      });

      // Move cursor to interesting element
      if (visibleElements.length > 0) {
        const target = visibleElements[0];
        await this.smoothMoveTo(target.x, target.y, 400);
        await this.sleep(1000);
        
        if (target.isButton && Math.random() > 0.7) {
          // Occasionally "click" a button
          this.recordClick(target.x, target.y);
          await this.sleep(300);
        }
      }

      await this.sleep(Math.max(500, timePerSection - 2000));
    }

    // Scroll back to top
    await this.smoothScrollTo(0, 1200);
    await this.sleep(1000);
    
    // Final cursor position at center
    await this.smoothMoveTo(this.width / 2, this.height / 2, 500);
    await this.sleep(500);
  }

  /**
   * Stop recording and collect data
   */
  async stopRecording() {
    // Collect any remaining cursor data from page
    try {
      const pageData = await this.page.evaluate(() => window.__lookCursor);
      
      if (pageData && pageData.positions) {
        // Merge page cursor data with our tracked data
        const baseTime = this.startTime || Date.now();
        for (const pos of pageData.positions) {
          // Only add if we don't have a position close to this time
          const exists = this.cursorPositions.some(p => Math.abs(p.t - pos.t) < 10);
          if (!exists) {
            this.cursorPositions.push({
              x: pos.x,
              y: pos.y,
              t: pos.t
            });
          }
        }
        // Sort by time
        this.cursorPositions.sort((a, b) => a.t - b.t);
      }
    } catch (e) {
      // Page might be closed
    }

    // Close page to finalize video
    if (this.page) {
      await this.page.close();
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
    }

    // Wait for video file to be written
    await this.sleep(1000);

    // Find recorded video
    const files = await readdir(this.tempDir);
    const videoFile = files.find(f => f.endsWith('.webm'));

    if (!videoFile) {
      throw new Error('No video file recorded');
    }

    return {
      videoPath: join(this.tempDir, videoFile),
      cursorData: {
        positions: this.cursorPositions,
        clicks: this.clicks,
        duration: this.cursorPositions.length > 0 
          ? this.cursorPositions[this.cursorPositions.length - 1].t 
          : this.duration
      },
      tempDir: this.tempDir
    };
  }

  /**
   * Convert WebM to MP4 for better compatibility
   */
  async convertToMp4(webmPath, outputPath = null) {
    const mp4Path = outputPath || webmPath.replace('.webm', '.mp4');
    
    const command = `ffmpeg -y -i "${webmPath}" \
      -c:v libx264 -preset fast -crf 18 \
      -pix_fmt yuv420p \
      -movflags +faststart \
      "${mp4Path}"`;

    await execAsync(command, { timeout: 300000 });
    return mp4Path;
  }

  /**
   * Apply cursor overlay to video
   */
  async applyCursorOverlay(inputVideo, cursorData, outputPath) {
    // Generate cursor images
    const cursorSize = 28;
    const cursorPath = join(this.tempDir, 'cursor.png');
    
    // Create a simple cursor SVG
    const cursorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
          </filter>
        </defs>
        <g filter="url(#shadow)" transform="translate(4, 4)">
          <path d="M 0 0 L 0 22 L 5 17 L 9 26 L 12 25 L 8 16 L 15 15 Z" 
                fill="#000000" 
                stroke="#FFFFFF" 
                stroke-width="2"
                stroke-linejoin="round"/>
        </g>
      </svg>
    `;

    // Use sharp to convert SVG to PNG
    const sharp = (await import('sharp')).default;
    await sharp(Buffer.from(cursorSvg)).png().toFile(cursorPath);

    // Build position expression for FFmpeg
    const positions = cursorData.positions || [];
    if (positions.length === 0) {
      // No cursor data, just copy video
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
      return outputPath;
    }

    // Sample positions to reduce expression complexity
    const sampleRate = Math.max(1, Math.floor(positions.length / 100));
    const keyframes = positions.filter((_, i) => i % sampleRate === 0);

    // Build expression
    let xExpr = '';
    let yExpr = '';

    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const nextKf = keyframes[i + 1];
      const frameNum = Math.round(kf.t / 1000 * this.fps);
      const x = Math.max(0, kf.x - 4); // Offset for cursor hotspot
      const y = Math.max(0, kf.y - 4);

      if (!nextKf) {
        xExpr += `${x}`;
        yExpr += `${y}`;
        for (let j = 0; j < i; j++) {
          xExpr += ')';
          yExpr += ')';
        }
      } else {
        const nextFrame = Math.round(nextKf.t / 1000 * this.fps);
        const nextX = Math.max(0, nextKf.x - 4);
        const nextY = Math.max(0, nextKf.y - 4);
        const dur = Math.max(1, nextFrame - frameNum);

        xExpr += `if(lt(n,${nextFrame}),${x}+(${nextX}-${x})*(n-${frameNum})/${dur},`;
        yExpr += `if(lt(n,${nextFrame}),${y}+(${nextY}-${y})*(n-${frameNum})/${dur},`;
      }
    }

    const command = `ffmpeg -y -i "${inputVideo}" -i "${cursorPath}" \
      -filter_complex "[0:v][1:v]overlay=x='${xExpr}':y='${yExpr}'[out]" \
      -map "[out]" \
      -c:v libx264 -preset fast -crf 18 \
      -pix_fmt yuv420p \
      "${outputPath}"`;

    try {
      await execAsync(command, { timeout: 600000 });
    } catch (error) {
      // If expression is too complex, fallback to simpler approach
      console.warn('Complex cursor overlay failed, using simplified version');
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    }

    return outputPath;
  }

  /**
   * Apply zoom effects to video
   */
  async applyZoomEffects(inputVideo, zoomKeyframes, outputPath) {
    if (!zoomKeyframes || zoomKeyframes.length < 2) {
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
      return outputPath;
    }

    // Build zoom expression
    const sortedKf = [...zoomKeyframes].sort((a, b) => a.time - b.time);
    
    // Limit keyframes
    const maxKf = 30;
    const sampledKf = sortedKf.length > maxKf
      ? sortedKf.filter((_, i) => i % Math.ceil(sortedKf.length / maxKf) === 0)
      : sortedKf;

    let zoomExpr = '';
    let xExpr = '';
    let yExpr = '';

    for (let i = 0; i < sampledKf.length; i++) {
      const kf = sampledKf[i];
      const nextKf = sampledKf[i + 1];
      const frameNum = Math.round(kf.time / 1000 * this.fps);
      const zoom = kf.zoom || 1;
      const normX = (kf.x || this.width / 2) / this.width;
      const normY = (kf.y || this.height / 2) / this.height;

      if (!nextKf) {
        zoomExpr += `${zoom.toFixed(3)}`;
        xExpr += `${normX.toFixed(4)}`;
        yExpr += `${normY.toFixed(4)}`;
        for (let j = 0; j < i; j++) {
          zoomExpr += ')';
          xExpr += ')';
          yExpr += ')';
        }
      } else {
        const nextFrame = Math.round(nextKf.time / 1000 * this.fps);
        const nextZoom = nextKf.zoom || 1;
        const nextNormX = (nextKf.x || this.width / 2) / this.width;
        const nextNormY = (nextKf.y || this.height / 2) / this.height;
        const dur = Math.max(1, nextFrame - frameNum);

        zoomExpr += `if(lt(on,${nextFrame}),${zoom.toFixed(3)}+(${(nextZoom - zoom).toFixed(3)})*(on-${frameNum})/${dur},`;
        xExpr += `if(lt(on,${nextFrame}),${normX.toFixed(4)}+(${(nextNormX - normX).toFixed(4)})*(on-${frameNum})/${dur},`;
        yExpr += `if(lt(on,${nextFrame}),${normY.toFixed(4)}+(${(nextNormY - normY).toFixed(4)})*(on-${frameNum})/${dur},`;
      }
    }

    const command = `ffmpeg -y -i "${inputVideo}" \
      -vf "scale=2*${this.width}:2*${this.height},zoompan=z='${zoomExpr}':x='(iw-iw/zoom)*(${xExpr})':y='(ih-ih/zoom)*(${yExpr})':d=1:s=${this.width}x${this.height}:fps=${this.fps}" \
      -c:v libx264 -preset slow -crf 18 \
      -pix_fmt yuv420p \
      "${outputPath}"`;

    try {
      await execAsync(command, { timeout: 600000 });
    } catch (error) {
      console.warn('Zoom effects failed, copying video:', error.message);
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
    }

    return outputPath;
  }

  /**
   * Add professional color grading and effects
   */
  async applyPostEffects(inputVideo, outputPath, options = {}) {
    const {
      addVignette = true,
      addColorGrade = true
    } = options;

    const filters = [];

    if (addColorGrade) {
      filters.push('eq=contrast=1.03:brightness=0.01:saturation=1.08');
      filters.push('colorbalance=rs=0.01:gs=0:bs=-0.01');
    }

    if (addVignette) {
      filters.push('vignette=PI/6');
    }

    if (filters.length === 0) {
      await execAsync(`ffmpeg -y -i "${inputVideo}" -c copy "${outputPath}"`);
      return outputPath;
    }

    const filterString = filters.join(',');
    const command = `ffmpeg -y -i "${inputVideo}" \
      -vf "${filterString}" \
      -c:v libx264 -preset slow -crf 18 \
      -pix_fmt yuv420p \
      "${outputPath}"`;

    await execAsync(command, { timeout: 300000 });
    return outputPath;
  }

  /**
   * Combine video with audio
   */
  async combineAudio(videoPath, audioPath, outputPath) {
    // Get video duration
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const videoDuration = parseFloat(stdout.trim()) || 30;

    const fadeStart = Math.max(0, videoDuration - 2);

    const command = `ffmpeg -y \
      -i "${videoPath}" \
      -i "${audioPath}" \
      -c:v copy \
      -c:a aac -b:a 192k \
      -af "loudnorm=I=-16:LRA=11:TP=-1,afade=t=out:st=${fadeStart}:d=2" \
      -shortest \
      -movflags +faststart \
      "${outputPath}"`;

    await execAsync(command, { timeout: 300000 });
    return outputPath;
  }

  /**
   * Export with platform preset
   */
  async exportWithPreset(inputVideo, preset, outputPath) {
    const presets = {
      youtube: { w: 1920, h: 1080, fps: 60, crf: 18 },
      twitter: { w: 1280, h: 720, fps: 30, crf: 23 },
      instagram: { w: 1080, h: 1080, fps: 30, crf: 23 },
      tiktok: { w: 1080, h: 1920, fps: 30, crf: 23 },
      linkedin: { w: 1920, h: 1080, fps: 30, crf: 20 }
    };

    const settings = presets[preset] || presets.youtube;

    const command = `ffmpeg -y -i "${inputVideo}" \
      -vf "scale=${settings.w}:${settings.h}:force_original_aspect_ratio=decrease,pad=${settings.w}:${settings.h}:(ow-iw)/2:(oh-ih)/2,fps=${settings.fps}" \
      -c:v libx264 -preset slow -crf ${settings.crf} \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      "${outputPath}"`;

    await execAsync(command, { timeout: 600000 });
    return outputPath;
  }

  /**
   * Clean up temp files
   */
  async cleanup() {
    if (this.tempDir) {
      try {
        await execAsync(`rm -rf "${this.tempDir}"`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Simple one-shot demo generation
 * This is the main entry point for quick demos
 */
export async function generateQuickDemo(url, outputPath, options = {}) {
  const engine = new DemoEngine({
    width: options.width || 1920,
    height: options.height || 1080,
    duration: (options.duration || 25) * 1000,
    fps: options.fps || 60
  });

  try {
    await engine.init();
    await engine.launchBrowser(url);
    
    const pageInfo = await engine.getPageInfo();
    await engine.autoDemo(pageInfo);
    
    const { videoPath, cursorData } = await engine.stopRecording();
    
    // Convert to MP4
    const mp4Path = await engine.convertToMp4(videoPath);
    
    // Apply cursor
    const withCursorPath = join(engine.tempDir, 'with-cursor.mp4');
    await engine.applyCursorOverlay(mp4Path, cursorData, withCursorPath);
    
    // Apply effects
    const finalPath = join(engine.tempDir, 'final.mp4');
    await engine.applyPostEffects(withCursorPath, finalPath);
    
    // Export to output
    await engine.exportWithPreset(finalPath, options.preset || 'youtube', outputPath);
    
    return { success: true, output: outputPath };
  } finally {
    await engine.cleanup();
  }
}
