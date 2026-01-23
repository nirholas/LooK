/**
 * Multi-Page Demo Recorder
 * 
 * Records demos that navigate through multiple pages of a website,
 * creating a comprehensive product walkthrough.
 */

import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { SiteExplorer, generateDemoJourney, findDemoWorthyElements, analyzePageForDemo } from './site-explorer.js';
import { CursorTracker } from './cursor-tracker.js';
import { generateVoiceover, generateScript } from './ai.js';
import { applyAutoZoom } from './auto-zoom.js';
import { applyClickEffects } from './click-effects.js';

/**
 * MultiPageRecorder - Record demos across multiple pages
 */
export class MultiPageRecorder {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.duration = options.duration || 60000; // 60 seconds default for multi-page
    this.maxPages = options.maxPages || 5;
    this.tempDir = null;
    this.browser = null;
    this.page = null;
    this.cursorTracker = null;
    this.frameCount = 0;
    this.recording = false;
  }

  /**
   * Initialize the recorder
   */
  async init() {
    this.tempDir = join(tmpdir(), `look-multipage-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });
    await mkdir(join(this.tempDir, 'frames'), { recursive: true });

    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    });

    this.page = await this.browser.newPage({
      viewport: { width: this.width, height: this.height },
      deviceScaleFactor: 1
    });

    this.cursorTracker = new CursorTracker(this.width, this.height);
  }

  /**
   * Record a multi-page demo
   */
  async record(startUrl, options = {}) {
    const {
      style = 'professional',
      focus = 'features',
      skipVoice = false,
      zoomMode = 'smart',
      maxZoom = 1.6,
      onProgress = () => {}
    } = options;

    const startTime = Date.now();

    try {
      // Phase 1: Explore the site
      onProgress({ phase: 'exploring', message: 'Discovering site structure...' });
      
      const explorer = new SiteExplorer({
        maxPages: this.maxPages,
        width: this.width,
        height: this.height
      });
      
      await explorer.init();
      const siteMap = await explorer.explore(startUrl);
      await explorer.close();

      onProgress({ 
        phase: 'explored', 
        message: `Found ${siteMap.totalDiscovered} pages`,
        pages: siteMap.pages.map(p => p.path)
      });

      // Phase 2: Generate demo journey
      onProgress({ phase: 'planning', message: 'Creating demo journey...' });
      
      const journey = await generateDemoJourney(siteMap, {
        duration: this.duration / 1000,
        style,
        focus
      });

      onProgress({ 
        phase: 'planned', 
        message: `Planned ${journey.journey.length}-page walkthrough`,
        journey: journey.journey.map(j => j.url)
      });

      // Phase 3: Record the journey
      onProgress({ phase: 'recording', message: 'Recording demo...' });
      
      await this.recordJourney(journey, onProgress);

      // Phase 4: Compile video
      onProgress({ phase: 'compiling', message: 'Compiling video...' });
      
      const rawVideo = await this.compileFrames();

      // Phase 5: Post-process
      onProgress({ phase: 'processing', message: 'Adding effects...' });
      
      let processedVideo = rawVideo;

      // Apply zoom
      if (zoomMode !== 'none') {
        const zoomedVideo = join(this.tempDir, 'zoomed.mp4');
        await applyAutoZoom(rawVideo, zoomedVideo, {
          cursorData: this.cursorTracker.positions,
          clicks: this.cursorTracker.clicks,
          mode: zoomMode,
          maxZoom,
          fps: this.fps
        });
        processedVideo = zoomedVideo;
      }

      // Apply click effects
      if (this.cursorTracker.clicks.length > 0) {
        const effectsVideo = join(this.tempDir, 'effects.mp4');
        await applyClickEffects(processedVideo, this.cursorTracker.clicks, {
          outputPath: effectsVideo
        });
        processedVideo = effectsVideo;
      }

      // Phase 6: Generate voiceover
      let voiceoverPath = null;
      if (!skipVoice && journey.totalNarrative) {
        onProgress({ phase: 'voiceover', message: 'Generating voiceover...' });
        voiceoverPath = await generateVoiceover(journey.totalNarrative, {
          outputPath: join(this.tempDir, 'voiceover.mp3')
        });
      }

      // Phase 7: Combine with audio
      const finalVideo = join(this.tempDir, 'final.mp4');
      
      if (voiceoverPath) {
        await this.combineVideoAudio(processedVideo, voiceoverPath, finalVideo);
      } else {
        await this.copyFile(processedVideo, finalVideo);
      }

      onProgress({ phase: 'complete', message: 'Demo complete!' });

      return {
        video: finalVideo,
        tempDir: this.tempDir,
        journey,
        duration: (Date.now() - startTime) / 1000,
        pages: journey.journey.length
      };

    } catch (error) {
      onProgress({ phase: 'error', message: error.message });
      throw error;
    }
  }

  /**
   * Record the journey through pages
   */
  async recordJourney(journey, onProgress) {
    this.recording = true;
    const frameInterval = 1000 / this.fps;
    let lastFrameTime = 0;

    // Start frame capture loop
    const captureLoop = setInterval(async () => {
      if (!this.recording) return;
      
      const now = Date.now();
      if (now - lastFrameTime >= frameInterval) {
        await this.captureFrame();
        lastFrameTime = now;
      }
    }, frameInterval / 2);

    try {
      for (let i = 0; i < journey.journey.length; i++) {
        const step = journey.journey[i];
        
        onProgress({ 
          phase: 'recording', 
          message: `Recording page ${i + 1}/${journey.journey.length}`,
          currentPage: step.url
        });

        // Navigate to page
        await this.page.goto(step.url, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        await this.sleep(1000);

        // Execute actions for this page
        await this.executePageActions(step, journey.journey[i + 1]);
      }
    } finally {
      this.recording = false;
      clearInterval(captureLoop);
    }
  }

  /**
   * Execute actions on a page
   */
  async executePageActions(step, nextStep) {
    const pageDuration = (step.duration || 10) * 1000;
    const startTime = Date.now();

    // Initial pause to show page
    await this.sleep(1500);
    await this.moveCursorSmooth(this.width * 0.4, this.height * 0.3, 500);

    // Find demo-worthy elements on this page
    const elements = await findDemoWorthyElements(this.page);

    // Get page height for scrolling
    const pageHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
    const maxScroll = Math.max(0, pageHeight - this.height);

    // Execute predefined actions or auto-demo
    if (step.actions && step.actions.length > 0) {
      for (const action of step.actions) {
        if (Date.now() - startTime > pageDuration - 2000) break;
        await this.executeAction(action);
      }
    } else {
      // Auto-demo: scroll and hover on interesting elements
      await this.autoDemoPage(elements, maxScroll, pageDuration - 3000);
    }

    // If there's a next page, click navigation
    if (nextStep) {
      // Find nav link to next page
      const navElement = elements.find(el => 
        el.href && el.href.includes(new URL(nextStep.url).pathname)
      );

      if (navElement) {
        await this.moveCursorSmooth(navElement.x, navElement.y, 400);
        await this.sleep(300);
        this.cursorTracker.recordClick(navElement.x, navElement.y, Date.now());
        await this.page.mouse.click(navElement.x, navElement.y);
        await this.sleep(500);
      }
    }

    // Return to top before leaving
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await this.sleep(800);
  }

  /**
   * Auto-demo a page
   */
  async autoDemoPage(elements, maxScroll, duration) {
    const startTime = Date.now();
    const sections = Math.min(4, Math.ceil(maxScroll / this.height) + 1);
    const timePerSection = duration / sections;

    for (let i = 0; i < sections && Date.now() - startTime < duration; i++) {
      // Scroll to section
      const scrollY = (maxScroll / sections) * i;
      await this.page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, scrollY);
      await this.sleep(800);

      // Find visible elements in this section
      const visibleElements = await this.page.evaluate((viewportHeight) => {
        return Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.top < viewportHeight && rect.width > 0;
          })
          .slice(0, 3)
          .map(el => ({
            x: el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2,
            y: el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
            text: el.textContent?.trim()
          }));
      }, this.height);

      // Hover on first interesting element
      if (visibleElements.length > 0) {
        const target = visibleElements[0];
        await this.moveCursorSmooth(target.x, target.y, 400);
        await this.sleep(1200);
      } else {
        // Just move cursor around
        await this.moveCursorSmooth(
          this.width * (0.3 + Math.random() * 0.4),
          this.height * 0.4,
          500
        );
        await this.sleep(800);
      }

      await this.sleep(Math.max(500, timePerSection - 2500));
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'wait':
        await this.sleep(action.duration || 1000);
        break;

      case 'scroll':
        if (action.target === 'bottom') {
          const maxScroll = await this.page.evaluate(() => 
            document.documentElement.scrollHeight - window.innerHeight
          );
          await this.page.evaluate((y) => {
            window.scrollTo({ top: y, behavior: 'smooth' });
          }, maxScroll);
        } else if (action.target === 'top') {
          await this.page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        } else if (typeof action.y === 'number') {
          await this.page.evaluate((y) => {
            window.scrollTo({ top: y, behavior: 'smooth' });
          }, action.y);
        }
        await this.sleep(action.duration || 800);
        break;

      case 'click':
        if (action.x && action.y) {
          await this.moveCursorSmooth(action.x, action.y, 300);
          this.cursorTracker.recordClick(action.x, action.y, Date.now());
          await this.page.mouse.click(action.x, action.y);
        }
        await this.sleep(action.duration || 500);
        break;

      case 'hover':
        if (action.x && action.y) {
          await this.moveCursorSmooth(action.x, action.y, 400);
        }
        await this.sleep(action.duration || 800);
        break;

      case 'move':
        await this.moveCursorSmooth(
          action.x || this.width / 2,
          action.y || this.height / 2,
          action.duration || 500
        );
        break;
    }
  }

  /**
   * Smooth cursor movement
   */
  async moveCursorSmooth(targetX, targetY, duration) {
    const steps = Math.max(10, Math.round(duration / 16));
    const current = this.cursorTracker.positions[this.cursorTracker.positions.length - 1] || { x: 0, y: 0 };
    const startX = current.x;
    const startY = current.y;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;

      this.cursorTracker.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      await this.sleep(duration / steps);
    }
  }

  /**
   * Capture a frame
   */
  async captureFrame() {
    try {
      const framePath = join(this.tempDir, 'frames', `frame-${String(this.frameCount).padStart(6, '0')}.png`);
      await this.page.screenshot({ path: framePath });
      this.frameCount++;
    } catch (e) {
      // Skip failed frames
    }
  }

  /**
   * Compile frames into video
   */
  async compileFrames() {
    const outputPath = join(this.tempDir, 'raw.mp4');
    const framesPattern = join(this.tempDir, 'frames', 'frame-%06d.png');

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-framerate', String(this.fps),
        '-i', framesPattern,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Combine video with audio
   */
  async combineVideoAudio(videoPath, audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`FFmpeg audio merge failed with code ${code}`));
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Copy file helper
   */
  async copyFile(src, dest) {
    const data = await readFile(src);
    await writeFile(dest, data);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Generate a multi-page demo video
 */
export async function generateMultiPageDemo(url, options = {}) {
  const {
    output = './demo.mp4',
    duration = 60,
    maxPages = 5,
    style = 'professional',
    focus = 'features',
    skipVoice = false,
    zoomMode = 'smart',
    maxZoom = 1.6,
    width = 1920,
    height = 1080,
    onProgress = (p) => console.log(`[${p.phase}] ${p.message}`)
  } = options;

  const recorder = new MultiPageRecorder({
    width,
    height,
    duration: duration * 1000,
    maxPages
  });

  try {
    await recorder.init();

    const result = await recorder.record(url, {
      style,
      focus,
      skipVoice,
      zoomMode,
      maxZoom,
      onProgress
    });

    // Copy to final output
    await mkdir(dirname(output), { recursive: true });
    await recorder.copyFile(result.video, output);

    console.log(`\n✅ Multi-page demo saved to ${output}`);
    console.log(`   Pages visited: ${result.pages}`);
    console.log(`   Total time: ${result.duration.toFixed(1)}s`);

    return {
      output,
      pages: result.pages,
      duration: result.duration,
      journey: result.journey
    };

  } finally {
    await recorder.cleanup();
  }
}

export default MultiPageRecorder;
