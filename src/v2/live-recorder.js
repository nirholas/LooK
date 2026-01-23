import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { CursorTracker } from './cursor-tracker.js';
import { EventEmitter } from 'events';

/**
 * @typedef {import('../types/options.js').RecordingOptions} RecordingOptions
 * @typedef {import('../types/options.js').ScriptedAction} ScriptedAction
 * @typedef {import('../types/project.js').CursorData} CursorData
 */

/**
 * @typedef {'idle' | 'recording' | 'paused' | 'stopped'} RecorderState
 */

/**
 * @typedef {Object} LivePreviewFrame
 * @property {string} image - Base64-encoded screenshot
 * @property {number} timestamp - Frame timestamp in ms
 * @property {number} width - Frame width
 * @property {number} height - Frame height
 * @property {{x: number, y: number}} cursor - Current cursor position
 */

/**
 * LiveRecorder - Real-time recording with preview and pause controls
 * 
 * This recorder runs in headed mode (visible browser) and streams
 * screenshots via WebSocket for remote monitoring. Supports pause,
 * resume, and manual intervention during recording.
 * 
 * @extends EventEmitter
 * @fires LiveRecorder#frame - Emitted for each preview frame
 * @fires LiveRecorder#stateChange - Emitted when recording state changes
 * @fires LiveRecorder#click - Emitted when a click is detected
 * @fires LiveRecorder#complete - Emitted when recording is complete
 * @fires LiveRecorder#error - Emitted on error
 */
export class LiveRecorder extends EventEmitter {
  /**
   * Create a new LiveRecorder instance
   * @param {RecordingOptions} options - Recording options
   */
  constructor(options = {}) {
    super();
    
    this.options = {
      width: options.width || 1920,
      height: options.height || 1080,
      fps: options.fps || 60,
      previewFps: options.previewFps || 10, // Lower FPS for streaming
      duration: options.duration || 20000,
      headless: options.headless ?? false, // Default to visible
      actions: options.actions || null,
      autoDemo: options.autoDemo ?? true
    };
    
    /** @type {RecorderState} */
    this.state = 'idle';
    
    /** @type {import('playwright').Browser | null} */
    this.browser = null;
    
    /** @type {import('playwright').BrowserContext | null} */
    this.context = null;
    
    /** @type {import('playwright').Page | null} */
    this.page = null;
    
    /** @type {CursorTracker | null} */
    this.cursorTracker = null;
    
    /** @type {string | null} */
    this.tempDir = null;
    
    /** @type {number} */
    this.startTime = 0;
    
    /** @type {number} */
    this.pausedTime = 0;
    
    /** @type {number} */
    this.totalPausedDuration = 0;
    
    /** @type {NodeJS.Timeout | null} */
    this.previewInterval = null;
    
    /** @type {{x: number, y: number}} */
    this.currentCursor = { x: 0, y: 0 };
    
    /** @type {boolean} */
    this.manualMode = false;
  }
  
  /**
   * Get elapsed recording time (excluding paused time)
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    if (this.state === 'idle') return 0;
    if (this.state === 'paused') return this.pausedTime - this.startTime - this.totalPausedDuration;
    return Date.now() - this.startTime - this.totalPausedDuration;
  }
  
  /**
   * Start recording a URL with live preview
   * @param {string} url - The URL to record
   * @returns {Promise<void>}
   */
  async start(url) {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start recording: already in ${this.state} state`);
    }
    
    this.tempDir = join(tmpdir(), `look-live-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });
    
    this.cursorTracker = new CursorTracker({ fps: this.options.fps });
    this.cursorTracker.record(this.options.width / 2, this.options.height / 2, Date.now());
    this.currentCursor = { x: this.options.width / 2, y: this.options.height / 2 };
    
    // Launch visible browser
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=' + this.options.width + ',' + this.options.height
      ]
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: this.options.width, height: this.options.height },
      recordVideo: {
        dir: this.tempDir,
        size: { width: this.options.width, height: this.options.height }
      }
    });
    
    this.page = await this.context.newPage();
    
    // Inject cursor tracking script
    await this.page.addInitScript(() => {
      window.__cursorPositions = [];
      window.__clicks = [];
      window.__startTime = performance.now();
      window.__isPaused = false;
      
      document.addEventListener('mousemove', (e) => {
        if (!window.__isPaused) {
          window.__cursorPositions.push({
            x: e.clientX,
            y: e.clientY,
            t: performance.now() - window.__startTime
          });
          // Keep buffer manageable
          if (window.__cursorPositions.length > 10000) {
            window.__cursorPositions = window.__cursorPositions.slice(-5000);
          }
        }
      });
      
      document.addEventListener('click', (e) => {
        if (!window.__isPaused) {
          const target = e.target;
          window.__clicks.push({
            x: e.clientX,
            y: e.clientY,
            t: performance.now(),
            element: {
              text: (target.innerText || '').substring(0, 50).split('\\n')[0].trim(),
              type: target.tagName.toLowerCase(),
              id: target.id || '',
              className: target.className || ''
            }
          });
        }
      });
    });
    
    // Navigate to URL
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await this.sleep(500);
    
    this.state = 'recording';
    this.startTime = Date.now();
    this.emit('stateChange', { state: this.state, elapsed: 0 });
    
    // Start preview streaming
    this.startPreviewStream();
    
    // Start auto-demo if enabled and no manual mode
    if (this.options.autoDemo && !this.manualMode && !this.options.actions) {
      this.runAutoDemo();
    } else if (this.options.actions) {
      this.runScriptedActions();
    }
  }
  
  /**
   * Start streaming preview frames
   * @private
   */
  startPreviewStream() {
    const intervalMs = 1000 / this.options.previewFps;
    
    this.previewInterval = setInterval(async () => {
      if (this.state !== 'recording' || !this.page) return;
      
      try {
        const screenshot = await this.page.screenshot({
          type: 'jpeg',
          quality: 60, // Lower quality for streaming
          encoding: 'base64'
        });
        
        /** @type {LivePreviewFrame} */
        const frame = {
          image: screenshot,
          timestamp: this.getElapsedTime(),
          width: this.options.width,
          height: this.options.height,
          cursor: { ...this.currentCursor }
        };
        
        this.emit('frame', frame);
      } catch (err) {
        // Page might be closed, ignore
      }
    }, intervalMs);
  }
  
  /**
   * Pause recording
   * @returns {Promise<void>}
   */
  async pause() {
    if (this.state !== 'recording') {
      throw new Error(`Cannot pause: not recording (state: ${this.state})`);
    }
    
    this.state = 'paused';
    this.pausedTime = Date.now();
    
    // Tell page we're paused
    if (this.page) {
      await this.page.evaluate(() => {
        window.__isPaused = true;
      });
    }
    
    this.emit('stateChange', { state: this.state, elapsed: this.getElapsedTime() });
  }
  
  /**
   * Resume recording
   * @returns {Promise<void>}
   */
  async resume() {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume: not paused (state: ${this.state})`);
    }
    
    this.totalPausedDuration += Date.now() - this.pausedTime;
    this.state = 'recording';
    
    // Tell page we're resumed
    if (this.page) {
      await this.page.evaluate(() => {
        window.__isPaused = false;
      });
    }
    
    this.emit('stateChange', { state: this.state, elapsed: this.getElapsedTime() });
  }
  
  /**
   * Enable manual control mode (stops auto-demo)
   */
  enableManualMode() {
    this.manualMode = true;
    this.emit('stateChange', { state: this.state, manualMode: true, elapsed: this.getElapsedTime() });
  }
  
  /**
   * Move cursor to position (in manual mode)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} [duration=300] - Movement duration in ms
   */
  async moveCursor(x, y, duration = 300) {
    if (!this.page || this.state === 'paused') return;
    
    const steps = Math.ceil(duration / 16); // ~60fps
    const startX = this.currentCursor.x;
    const startY = this.currentCursor.y;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic
      
      const newX = startX + (x - startX) * eased;
      const newY = startY + (y - startY) * eased;
      
      this.currentCursor = { x: newX, y: newY };
      this.cursorTracker?.record(newX, newY, Date.now());
      
      await this.page.mouse.move(newX, newY);
      await this.sleep(duration / steps);
    }
  }
  
  /**
   * Click at current cursor position (in manual mode)
   */
  async click() {
    if (!this.page || this.state === 'paused') return;
    
    await this.page.mouse.click(this.currentCursor.x, this.currentCursor.y);
    this.cursorTracker?.recordClick(this.currentCursor.x, this.currentCursor.y, Date.now());
    
    this.emit('click', { x: this.currentCursor.x, y: this.currentCursor.y, timestamp: this.getElapsedTime() });
  }
  
  /**
   * Scroll the page
   * @param {number} deltaY - Scroll amount (positive = down)
   */
  async scroll(deltaY) {
    if (!this.page || this.state === 'paused') return;
    
    await this.page.evaluate((dy) => {
      window.scrollBy({ top: dy, behavior: 'smooth' });
    }, deltaY);
  }
  
  /**
   * Type text (in manual mode)
   * @param {string} text - Text to type
   */
  async type(text) {
    if (!this.page || this.state === 'paused') return;
    await this.page.keyboard.type(text, { delay: 50 });
  }
  
  /**
   * Navigate to URL (in manual mode)
   * @param {string} url - URL to navigate to
   */
  async navigate(url) {
    if (!this.page) return;
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  }
  
  /**
   * Stop recording and get results
   * @returns {Promise<{videoPath: string, cursorData: CursorData, tempDir: string}>}
   */
  async stop() {
    if (this.state === 'idle') {
      throw new Error('Recording not started');
    }
    
    this.state = 'stopped';
    
    // Stop preview streaming
    if (this.previewInterval) {
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
    
    // Collect cursor data from page
    if (this.page) {
      try {
        const pageData = await this.page.evaluate(() => ({
          positions: window.__cursorPositions || [],
          clicks: window.__clicks || []
        }));
        
        // Merge with tracker
        for (const pos of pageData.positions) {
          this.cursorTracker?.record(pos.x, pos.y, this.startTime + pos.t);
        }
        for (const click of pageData.clicks) {
          this.cursorTracker?.recordClick(click.x, click.y, this.startTime + click.t, click.element);
        }
      } catch {
        // Page might already be closed
      }
    }
    
    // Close browser
    try {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    } catch {
      // Ignore close errors
    }
    
    // Find recorded video
    const files = await readdir(this.tempDir);
    const videoFile = files.find(f => f.endsWith('.webm'));
    
    const result = {
      videoPath: videoFile ? join(this.tempDir, videoFile) : null,
      cursorData: this.cursorTracker?.toJSON() || { frames: [], clicks: [] },
      tempDir: this.tempDir,
      duration: this.getElapsedTime()
    };
    
    this.emit('complete', result);
    this.emit('stateChange', { state: 'stopped', elapsed: result.duration });
    
    // Reset state
    this.state = 'idle';
    this.browser = null;
    this.context = null;
    this.page = null;
    
    return result;
  }
  
  /**
   * Run auto-demo sequence
   * @private
   */
  async runAutoDemo() {
    const { width, height, duration } = this.options;
    const startTime = Date.now();
    
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    // Wait for initial load
    await sleep(1500);
    
    // Get page info
    const pageInfo = await this.page?.evaluate(() => ({
      pageHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight
    }));
    
    if (!pageInfo) return;
    
    const maxScroll = Math.max(0, pageInfo.pageHeight - pageInfo.viewportHeight);
    
    // Helper to check if we should continue
    const shouldContinue = () => {
      if (this.state === 'stopped' || this.manualMode) return false;
      if (this.state === 'paused') return 'pause';
      return this.getElapsedTime() < duration - 2000;
    };
    
    // Wait while paused
    const waitWhilePaused = async () => {
      while (this.state === 'paused') {
        await sleep(100);
      }
    };
    
    // Phase 1: Hero section
    await this.moveCursor(width * 0.25, height * 0.35, 500);
    await sleep(600);
    
    if (!shouldContinue()) return;
    await waitWhilePaused();
    
    await this.moveCursor(width * 0.65, height * 0.35, 800);
    await sleep(400);
    
    // Find and click CTA
    const heroBtn = await this.findVisibleClickable();
    if (heroBtn) {
      await this.moveCursor(heroBtn.x, heroBtn.y, 400);
      await sleep(200);
      await this.click();
      await sleep(600);
    }
    
    // Phase 2: Scroll through content
    const numSections = Math.min(4, Math.max(2, Math.ceil(maxScroll / height)));
    const scrollPerSection = maxScroll / numSections;
    const timePerSection = Math.max(2000, (duration - 8000) / numSections);
    
    for (let i = 1; i <= numSections && shouldContinue(); i++) {
      await waitWhilePaused();
      
      const targetScroll = Math.min(scrollPerSection * i, maxScroll);
      await this.scroll(targetScroll);
      await sleep(1000);
      
      await this.moveCursor(width * 0.3, height * 0.4, 400);
      await sleep(400);
      await this.moveCursor(width * 0.6, height * 0.5, 600);
      
      const clickTarget = await this.findVisibleClickable();
      if (clickTarget && Math.random() > 0.3) {
        await this.moveCursor(clickTarget.x, clickTarget.y, 350);
        await sleep(150);
        await this.click();
        await sleep(400);
      }
      
      await sleep(Math.max(300, timePerSection - 2200));
    }
    
    // Phase 3: Return to top
    if (shouldContinue()) {
      await waitWhilePaused();
      await this.scroll(-maxScroll);
      await sleep(1200);
      await this.moveCursor(width * 0.5, height * 0.4, 400);
      await sleep(500);
    }
  }
  
  /**
   * Run scripted actions
   * @private
   */
  async runScriptedActions() {
    if (!this.options.actions) return;
    
    for (const action of this.options.actions) {
      if (this.state === 'stopped' || this.manualMode) break;
      
      while (this.state === 'paused') {
        await this.sleep(100);
      }
      
      await this.executeAction(action);
    }
  }
  
  /**
   * Execute a single scripted action
   * @param {ScriptedAction} action
   * @private
   */
  async executeAction(action) {
    if (!this.page) return;
    
    switch (action.type) {
      case 'click':
        const el = await this.page.$(action.selector);
        if (el) {
          const box = await el.boundingBox();
          if (box) {
            await this.moveCursor(box.x + box.width / 2, box.y + box.height / 2, 300);
            await this.click();
          }
        }
        await this.sleep(action.wait || 1000);
        break;
        
      case 'scroll':
        await this.scroll(action.amount || 500);
        await this.sleep(action.wait || 1000);
        break;
        
      case 'hover':
        const hoverEl = await this.page.$(action.selector);
        if (hoverEl) {
          const box = await hoverEl.boundingBox();
          if (box) {
            await this.moveCursor(box.x + box.width / 2, box.y + box.height / 2, 300);
          }
        }
        await this.sleep(action.wait || 1000);
        break;
        
      case 'type':
        await this.type(action.text || '');
        await this.sleep(action.wait || 500);
        break;
        
      case 'wait':
        await this.sleep(action.duration || 1000);
        break;
        
      case 'navigate':
        await this.navigate(action.url);
        await this.sleep(action.wait || 2000);
        break;
    }
  }
  
  /**
   * Find a visible clickable element
   * @returns {Promise<{x: number, y: number, text: string} | null>}
   * @private
   */
  async findVisibleClickable() {
    if (!this.page) return null;
    
    return this.page.evaluate(() => {
      const selectors = [
        'button:not([disabled])', 'a.btn', '.btn', '[class*="button"]:not([disabled])',
        '[class*="cta"]', 'a[href]:not([href^="#"])', '[role="button"]'
      ];
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 80 && rect.top < window.innerHeight - 80 &&
              rect.left > 50 && rect.left < window.innerWidth - 50 &&
              rect.width > 40 && rect.height > 25) {
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              text: (el.textContent || '').substring(0, 30).trim()
            };
          }
        }
      }
      return null;
    });
  }
  
  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helper to create a simple live recording session
 * @param {string} url - URL to record
 * @param {RecordingOptions} options - Recording options
 * @returns {LiveRecorder} The recorder instance
 */
export function createLiveRecorder(url, options = {}) {
  return new LiveRecorder(options);
}

export default LiveRecorder;
