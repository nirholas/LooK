/**
 * Intelligent Demo Recorder - Context-aware AI recording engine
 * 
 * This is an enhanced recorder that uses AI analysis in real-time to:
 * - Understand page context and purpose
 * - Identify high-value elements to interact with
 * - Generate natural, purposeful cursor movements
 * - Create engaging demo flows that tell a story
 * - Adapt timing based on content complexity
 * - Handle dynamic content (modals, dropdowns, animations)
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { CursorTracker } from './cursor-tracker.js';
import { extractPageElements } from './ai-enhanced.js';

/**
 * @typedef {Object} DemoSegment
 * @property {string} type - hover, click, scroll, type, wait, highlight
 * @property {Object} target - Element selector and position
 * @property {string} narration - What to say during this segment
 * @property {number} duration - Duration in ms
 */

/**
 * @typedef {Object} IntelligentRecordingOptions
 * @property {number} width - Viewport width
 * @property {number} height - Viewport height
 * @property {number} duration - Target duration in ms
 * @property {string} style - Demo style: tour, walkthrough, showcase, tutorial
 * @property {string} focus - What to focus on: features, pricing, all
 * @property {boolean} interactive - Click things or just show them
 * @property {boolean} verbose - Log actions
 */

/**
 * Natural cursor movement with realistic human-like behavior
 */
class NaturalCursor {
  constructor(page, tracker, width, height) {
    this.page = page;
    this.tracker = tracker;
    this.width = width;
    this.height = height;
    this.currentX = width / 2;
    this.currentY = height / 2;
    this.velocity = { x: 0, y: 0 };
  }

  /**
   * Move to target with natural, human-like motion
   * Uses bezier curves with slight overshoot and micro-corrections
   */
  async moveTo(targetX, targetY, options = {}) {
    const {
      duration = 400,
      overshoot = true,
      wobble = true,
      pauseAtEnd = 100
    } = options;

    const startX = this.currentX;
    const startY = this.currentY;
    const distance = Math.hypot(targetX - startX, targetY - startY);
    
    // Adjust duration based on distance (farther = slightly longer)
    const adjustedDuration = Math.max(200, Math.min(800, duration + distance * 0.3));
    
    // Generate control points for bezier curve
    const midX = (startX + targetX) / 2;
    const midY = (startY + targetY) / 2;
    
    // Add slight curve/arc to movement
    const perpX = -(targetY - startY) * 0.15;
    const perpY = (targetX - startX) * 0.15;
    
    const cp1x = midX + perpX * (Math.random() * 0.5 + 0.5);
    const cp1y = midY + perpY * (Math.random() * 0.5 + 0.5);
    
    // Calculate overshoot if enabled
    let overshootX = targetX;
    let overshootY = targetY;
    if (overshoot && distance > 100) {
      const overshootAmount = Math.min(20, distance * 0.1);
      const angle = Math.atan2(targetY - startY, targetX - startX);
      overshootX = targetX + Math.cos(angle) * overshootAmount;
      overshootY = targetY + Math.sin(angle) * overshootAmount;
    }

    const steps = Math.ceil(adjustedDuration / 16); // ~60fps
    const startTime = Date.now();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Ease out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      
      // Quadratic bezier
      let x = Math.pow(1 - eased, 2) * startX + 
              2 * (1 - eased) * eased * cp1x + 
              Math.pow(eased, 2) * (overshoot ? overshootX : targetX);
      let y = Math.pow(1 - eased, 2) * startY + 
              2 * (1 - eased) * eased * cp1y + 
              Math.pow(eased, 2) * (overshoot ? overshootY : targetY);
      
      // Add subtle wobble for realism
      if (wobble && i < steps - 5) {
        x += (Math.random() - 0.5) * 2;
        y += (Math.random() - 0.5) * 2;
      }

      this.currentX = x;
      this.currentY = y;
      
      this.tracker.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      await this.sleep(adjustedDuration / steps);
    }

    // Correct overshoot with micro-movement
    if (overshoot && distance > 100) {
      await this.microCorrect(targetX, targetY, 80);
    }

    // Dwell at end position
    if (pauseAtEnd > 0) {
      await this.sleep(pauseAtEnd);
    }

    this.currentX = targetX;
    this.currentY = targetY;
  }

  /**
   * Micro-correction movement (like a human fixing aim)
   */
  async microCorrect(targetX, targetY, duration = 80) {
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this.currentX + (targetX - this.currentX) * t;
      const y = this.currentY + (targetY - this.currentY) * t;
      
      this.tracker.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      await this.sleep(duration / steps);
    }
    this.currentX = targetX;
    this.currentY = targetY;
  }

  /**
   * "Scan" movement - like eyes reading across content
   */
  async scan(startX, startY, endX, endY, duration = 1000) {
    const segments = Math.ceil(duration / 200);
    const stepX = (endX - startX) / segments;
    const stepY = (endY - startY) / segments;

    for (let i = 0; i <= segments; i++) {
      const x = startX + stepX * i + (Math.random() - 0.5) * 20;
      const y = startY + stepY * i + (Math.random() - 0.5) * 10;
      await this.moveTo(x, y, { duration: 150, overshoot: false, pauseAtEnd: 50 });
    }
  }

  /**
   * Idle movement - subtle movement like a waiting user
   */
  async idle(duration = 1000) {
    const endTime = Date.now() + duration;
    while (Date.now() < endTime) {
      const dx = (Math.random() - 0.5) * 5;
      const dy = (Math.random() - 0.5) * 5;
      this.currentX += dx;
      this.currentY += dy;
      this.tracker.record(this.currentX, this.currentY, Date.now());
      await this.page.mouse.move(this.currentX, this.currentY);
      await this.sleep(100 + Math.random() * 100);
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * Intelligent element prioritizer
 */
class ElementPrioritizer {
  constructor() {
    // Weight factors for different element characteristics
    this.weights = {
      isButton: 3,
      isCTA: 5,
      isPrimary: 4,
      isVisible: 2,
      hasText: 1,
      size: 0.5,
      position: 1 // Higher for above fold
    };
  }

  /**
   * Score and prioritize elements for demo interaction
   */
  prioritize(elements, context = {}) {
    const { currentSection, visitedElements = new Set(), focus = 'features' } = context;

    return elements
      .filter(el => !visitedElements.has(el.selector))
      .map(el => ({
        ...el,
        score: this.scoreElement(el, context)
      }))
      .sort((a, b) => b.score - a.score);
  }

  scoreElement(el, context) {
    let score = 0;
    const text = (el.text || '').toLowerCase();
    const classes = (el.selector || '').toLowerCase();

    // CTA buttons get highest priority
    if (/get started|try|sign up|start free|buy|subscribe|demo/i.test(text)) {
      score += this.weights.isCTA;
    }

    // Primary/prominent buttons
    if (/primary|main|hero|cta/i.test(classes)) {
      score += this.weights.isPrimary;
    }

    // Buttons in general
    if (el.isButton || el.tag === 'button') {
      score += this.weights.isButton;
    }

    // Has meaningful text
    if (el.text && el.text.length > 2 && el.text.length < 50) {
      score += this.weights.hasText;
    }

    // Size bonus (bigger = more important, up to a point)
    if (el.rect) {
      const area = el.rect.width * el.rect.height;
      score += Math.min(2, area / 10000) * this.weights.size;
    }

    // Position bonus (above fold preferred)
    if (el.rect && el.rect.y < 600) {
      score += this.weights.position * (1 - el.rect.y / 600);
    }

    // Focus-based scoring
    if (context.focus === 'pricing' && /price|pricing|plan|cost/i.test(text + classes)) {
      score += 3;
    }
    if (context.focus === 'features' && /feature|benefit|how it works/i.test(text + classes)) {
      score += 3;
    }

    return score;
  }
}

/**
 * Demo flow planner - creates a coherent story
 */
class DemoFlowPlanner {
  /**
   * Create a demo flow based on page analysis
   */
  createFlow(pageInfo, options = {}) {
    const {
      duration = 25000,
      style = 'walkthrough',
      focus = 'features'
    } = options;

    const flow = [];
    const sections = this.identifySections(pageInfo);
    const timePerSection = duration / (sections.length + 2); // +2 for intro/outro

    // Phase 1: Introduction (hero area)
    flow.push({
      phase: 'intro',
      type: 'scan',
      area: { x: 0.1, y: 0.1, w: 0.8, h: 0.4 },
      duration: Math.min(4000, timePerSection),
      narration: 'hero_overview'
    });

    // Phase 2: CTA highlight
    if (pageInfo.cta) {
      flow.push({
        phase: 'intro',
        type: 'highlight',
        target: pageInfo.cta,
        duration: 1500,
        narration: 'cta_callout'
      });
    }

    // Phase 3: Content sections
    for (const section of sections) {
      flow.push({
        phase: 'content',
        type: 'scroll_to_section',
        target: section,
        duration: 800,
        narration: null
      });

      flow.push({
        phase: 'content',
        type: 'explore_section',
        target: section,
        duration: Math.max(2000, timePerSection - 800),
        elements: section.elements,
        narration: section.type
      });
    }

    // Phase 4: Conclusion
    flow.push({
      phase: 'outro',
      type: 'scroll_top',
      duration: 1000,
      narration: null
    });

    flow.push({
      phase: 'outro',
      type: 'final_cta',
      target: pageInfo.cta,
      duration: 2000,
      narration: 'final_callout'
    });

    return flow;
  }

  identifySections(pageInfo) {
    const sections = [];
    const sectionPatterns = [
      { type: 'features', pattern: /feature|benefit|why|capability/i },
      { type: 'how_it_works', pattern: /how|step|process|workflow/i },
      { type: 'testimonials', pattern: /testimonial|review|customer|said/i },
      { type: 'pricing', pattern: /price|pricing|plan|tier/i },
      { type: 'faq', pattern: /faq|question|answer/i },
      { type: 'integrations', pattern: /integrat|connect|partner/i }
    ];

    // Group elements by vertical position (rough sections)
    const elements = pageInfo.elements || [];
    const viewportHeight = pageInfo.viewportHeight || 1080;
    const pageHeight = pageInfo.pageHeight || viewportHeight;
    
    const numSections = Math.ceil(pageHeight / viewportHeight);
    
    for (let i = 0; i < numSections && i < 5; i++) {
      const sectionTop = i * viewportHeight * 0.8;
      const sectionBottom = sectionTop + viewportHeight;
      
      const sectionElements = elements.filter(el => 
        el.rect && el.rect.y >= sectionTop && el.rect.y < sectionBottom
      );

      if (sectionElements.length === 0) continue;

      // Determine section type from content
      const sectionText = sectionElements.map(e => e.text).join(' ').toLowerCase();
      let sectionType = 'content';
      
      for (const { type, pattern } of sectionPatterns) {
        if (pattern.test(sectionText)) {
          sectionType = type;
          break;
        }
      }

      sections.push({
        index: i,
        type: sectionType,
        scrollY: sectionTop,
        elements: sectionElements,
        text: sectionText.slice(0, 200)
      });
    }

    return sections;
  }
}

/**
 * IntelligentRecorder - Main recording class
 */
export class IntelligentRecorder {
  constructor(options = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 60;
    this.duration = options.duration || 25000;
    this.style = options.style || 'walkthrough';
    this.focus = options.focus || 'features';
    this.interactive = options.interactive !== false;
    this.verbose = options.verbose || false;

    this.browser = null;
    this.context = null;
    this.page = null;
    this.tempDir = null;
    
    this.cursor = null;
    this.tracker = new CursorTracker({ fps: this.fps });
    this.prioritizer = new ElementPrioritizer();
    this.planner = new DemoFlowPlanner();
    
    this.visitedElements = new Set();
    this.recordingStartTime = 0;
  }

  /**
   * Record a demo of a URL
   */
  async record(url, options = {}) {
    const mergedOptions = { ...this, ...options };
    
    this.tempDir = join(tmpdir(), `look-intelligent-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });

    this.log(`🎬 Starting intelligent recording: ${url}`);
    this.log(`   Duration: ${mergedOptions.duration}ms, Style: ${mergedOptions.style}`);

    try {
      // Launch browser
      await this.initBrowser();
      
      // Navigate and analyze
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await this.dismissBlockers();
      await this.sleep(1000);

      // Initialize cursor
      this.cursor = new NaturalCursor(this.page, this.tracker, this.width, this.height);
      this.tracker.record(this.width / 2, this.height / 2, Date.now());

      // Extract page elements
      this.log('🔍 Analyzing page...');
      const pageInfo = await this.analyzePage();

      // Create demo flow
      this.log('📋 Planning demo flow...');
      const flow = this.planner.createFlow(pageInfo, mergedOptions);

      // Execute recording
      this.log('🎥 Recording...');
      this.recordingStartTime = Date.now();
      await this.executeFlow(flow, pageInfo);

      // Cleanup and get video
      await this.page.close();
      await this.context.close();
      await this.browser.close();

      // Find recorded video
      const files = await readdir(this.tempDir);
      const videoFile = files.find(f => f.endsWith('.webm'));

      this.log('✅ Recording complete');

      return {
        videoPath: join(this.tempDir, videoFile),
        cursorData: this.tracker.toJSON(),
        tempDir: this.tempDir,
        pageInfo,
        flow
      };

    } catch (error) {
      this.log(`❌ Recording failed: ${error.message}`);
      await this.cleanup();
      throw error;
    }
  }

  async initBrowser() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: this.width, height: this.height },
      recordVideo: {
        dir: this.tempDir,
        size: { width: this.width, height: this.height }
      }
    });

    this.page = await this.context.newPage();

    // Inject cursor tracking
    await this.page.addInitScript(() => {
      window.__lookData = { clicks: [], hovers: [] };
      document.addEventListener('click', e => {
        const target = e.target;
        window.__lookData.clicks.push({
          x: e.clientX, y: e.clientY, t: Date.now(),
          text: (target.textContent || '').slice(0, 50),
          tag: target.tagName
        });
      });
    });
  }

  async analyzePage() {
    // Extract elements
    const elements = await extractPageElements(this.page);
    
    // Get page dimensions and metadata
    const pageInfo = await this.page.evaluate(() => {
      return {
        pageHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || ''
      };
    });

    // Find CTA
    const cta = elements.find(el => 
      el.importance === 'high' && el.isButton &&
      /get started|try|sign up|demo/i.test(el.text)
    );

    return {
      ...pageInfo,
      elements,
      cta,
      interactiveCount: elements.filter(e => e.type === 'interactive').length
    };
  }

  async executeFlow(flow, pageInfo) {
    for (const step of flow) {
      if (this.getElapsedTime() >= this.duration - 1000) {
        break; // Leave 1s for wrap-up
      }

      this.log(`  → ${step.phase}: ${step.type}`);

      switch (step.type) {
        case 'scan':
          await this.executeScan(step);
          break;
        case 'highlight':
          await this.executeHighlight(step);
          break;
        case 'scroll_to_section':
          await this.executeScrollToSection(step);
          break;
        case 'explore_section':
          await this.executeExploreSection(step, pageInfo);
          break;
        case 'scroll_top':
          await this.executeScrollTop();
          break;
        case 'final_cta':
          await this.executeFinalCTA(step);
          break;
      }
    }
  }

  async executeScan(step) {
    const x1 = this.width * step.area.x;
    const y1 = this.height * step.area.y;
    const x2 = this.width * (step.area.x + step.area.w);
    const y2 = this.height * (step.area.y + step.area.h);
    
    await this.cursor.scan(x1, y1, x2, y2, step.duration);
  }

  async executeHighlight(step) {
    if (!step.target?.rect) return;
    
    const { centerX, centerY } = step.target.rect;
    await this.cursor.moveTo(centerX, centerY, { duration: 300 });
    
    if (this.interactive) {
      this.tracker.recordClick(centerX, centerY, Date.now(), {
        text: step.target.text,
        type: 'cta',
        section: 'hero'
      });
      await this.page.mouse.click(centerX, centerY);
    }
    
    await this.sleep(step.duration - 300);
  }

  async executeScrollToSection(step) {
    if (!step.target?.scrollY) return;
    
    await this.page.evaluate(y => {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, step.target.scrollY);
    
    await this.sleep(step.duration);
  }

  async executeExploreSection(step, pageInfo) {
    const elements = step.elements || [];
    const prioritized = this.prioritizer.prioritize(elements, {
      visitedElements: this.visitedElements,
      focus: this.focus
    });

    const timePerElement = Math.max(500, step.duration / Math.max(1, prioritized.length));
    let timeSpent = 0;

    for (const el of prioritized.slice(0, 4)) { // Max 4 elements per section
      if (timeSpent >= step.duration) break;

      if (el.rect) {
        // Move to element
        await this.cursor.moveTo(el.rect.centerX, el.rect.centerY, { duration: 300 });
        
        // Maybe click if interactive
        if (this.interactive && el.isButton && Math.random() > 0.5) {
          this.tracker.recordClick(el.rect.centerX, el.rect.centerY, Date.now(), {
            text: el.text,
            type: el.tag,
            section: step.target?.type || 'content'
          });
          await this.page.mouse.click(el.rect.centerX, el.rect.centerY);
          await this.sleep(400);
        } else {
          // Hover
          await this.cursor.idle(timePerElement - 300);
        }

        this.visitedElements.add(el.selector);
        timeSpent += timePerElement;
      }
    }

    // If no elements, just do a scan
    if (prioritized.length === 0) {
      await this.cursor.scan(
        this.width * 0.2, this.height * 0.3,
        this.width * 0.8, this.height * 0.6,
        step.duration
      );
    }
  }

  async executeScrollTop() {
    await this.page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await this.sleep(1000);
  }

  async executeFinalCTA(step) {
    if (!step.target?.rect) {
      // Fallback to center
      await this.cursor.moveTo(this.width / 2, this.height / 2, { duration: 400 });
      return;
    }

    const { centerX, centerY } = step.target.rect;
    await this.cursor.moveTo(centerX, centerY, { duration: 400 });
    
    // Subtle highlight movement
    await this.cursor.idle(step.duration - 400);
  }

  async dismissBlockers() {
    // Try to dismiss common blocking elements
    const blockerSelectors = [
      '[class*="cookie"] button',
      '[class*="consent"] button',
      '[class*="modal"] [class*="close"]',
      '[class*="popup"] [class*="close"]',
      '[aria-label="Close"]',
      '[aria-label="Dismiss"]',
      'button:has-text("Accept")',
      'button:has-text("Got it")',
      'button:has-text("OK")'
    ];

    for (const selector of blockerSelectors) {
      try {
        const el = await this.page.$(selector);
        if (el) {
          await el.click();
          await this.sleep(300);
        }
      } catch {}
    }
  }

  getElapsedTime() {
    return Date.now() - this.recordingStartTime;
  }

  async cleanup() {
    try {
      if (this.browser) await this.browser.close();
    } catch {}
  }

  log(msg) {
    if (this.verbose) {
      console.log(msg);
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * Quick intelligent recording function
 */
export async function recordIntelligent(url, options = {}) {
  const recorder = new IntelligentRecorder(options);
  return recorder.record(url, options);
}

export default IntelligentRecorder;
