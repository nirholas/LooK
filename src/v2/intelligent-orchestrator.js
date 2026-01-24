/**
 * Intelligent Demo Orchestrator - Smart demo generation with deep product understanding
 * 
 * Orchestrates the entire intelligent demo pipeline:
 * 1. Product Intelligence - Understand what the product does
 * 2. Workflow Detection - Find demo-worthy user journeys
 * 3. Visual Moments - Identify wow moments
 * 4. Smart Composition - Create story-driven demo
 * 5. Quality Scoring - Ensure professional output
 * 
 * @module intelligent-orchestrator
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { ProductIntelligence } from './product-intelligence.js';
import { WorkflowDetector } from './workflow-detector.js';
import { VisualMomentDetector } from './visual-moments.js';
import { SmartComposer, STORY_ARCS, PACING_STYLES } from './smart-composer.js';
import { QualityScorer } from './quality-scorer.js';
import { CursorTracker } from './cursor-tracker.js';
import { recordBrowser } from './recorder.js';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { generateScript, generateVoiceover } from './ai.js';
import { createLogger } from './logger.js';

const log = createLogger('intelligent-orchestrator');

/**
 * @typedef {Object} IntelligentDemoOptions
 * @property {number} [duration=30] - Target duration in seconds
 * @property {'PROFESSIONAL'|'ENERGETIC'|'CALM'|'TUTORIAL'} [style='PROFESSIONAL'] - Demo style
 * @property {string} [storyArc] - Story arc override (auto-selected if not specified)
 * @property {boolean} [includeVoiceover=true] - Generate voiceover
 * @property {string} [voice='nova'] - OpenAI TTS voice
 * @property {boolean} [includeZoom=true] - Add zoom effects
 * @property {number} [minQualityScore=70] - Minimum quality score to accept
 * @property {boolean} [autoRetry=true] - Retry if quality too low
 * @property {number} [width=1920] - Video width
 * @property {number} [height=1080] - Video height
 * @property {string} [output] - Output path
 * @property {string} [preset='youtube'] - Export preset
 */

/**
 * @typedef {Object} IntelligentDemoResult
 * @property {boolean} success - Whether demo was generated
 * @property {string} [videoPath] - Path to output video
 * @property {Object} intelligence - Product intelligence data
 * @property {Object} composition - Demo composition
 * @property {Object} quality - Quality score
 * @property {number} duration - Actual duration in ms
 * @property {Object} [error] - Error if failed
 */

/**
 * Intelligent Demo Orchestrator
 * Creates smart, story-driven product demos
 */
export class IntelligentOrchestrator {
  /**
   * @param {IntelligentDemoOptions} [options={}] - Configuration
   */
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 30,
      style: options.style || 'PROFESSIONAL',
      storyArc: options.storyArc || null,
      includeVoiceover: options.includeVoiceover !== false,
      voice: options.voice || 'nova',
      includeZoom: options.includeZoom !== false,
      minQualityScore: options.minQualityScore ?? 70,
      autoRetry: options.autoRetry !== false,
      width: options.width || 1920,
      height: options.height || 1080,
      output: options.output || './output/demo.mp4',
      preset: options.preset || 'youtube',
      ...options
    };
    
    // Components
    this.productIntelligence = null;
    this.workflowDetector = null;
    this.visualMomentDetector = null;
    this.smartComposer = null;
    this.qualityScorer = null;
    this.cursorTracker = null;
    
    // Browser state
    this.browser = null;
    this.context = null;
    this.page = null;
    this.tempDir = null;
    
    // Results
    this.intelligence = null;
    this.composition = null;
    this.quality = null;
  }
  
  // ============================================================
  // Main Entry Point
  // ============================================================
  
  /**
   * Generate an intelligent demo video
   * @param {string} url - URL to demo
   * @returns {Promise<IntelligentDemoResult>}
   */
  async generate(url) {
    console.log('🧠 Starting Intelligent Demo Generation...');
    console.log(`   URL: ${url}`);
    console.log(`   Duration: ${this.options.duration}s`);
    console.log(`   Style: ${this.options.style}`);
    console.log('');
    
    try {
      // Initialize
      await this.init();
      
      // Navigate to URL
      console.log('🌐 Loading website...');
      await this.navigateSafely(url);
      await this.dismissBlockingElements();
      
      // Phase 1: Understand the product
      console.log('\n📊 Phase 1: Understanding Product...');
      this.intelligence = await this.gatherIntelligence();
      console.log(`   ✓ Product: ${this.intelligence.product.name}`);
      console.log(`   ✓ Category: ${this.intelligence.product.category}`);
      console.log(`   ✓ Workflows found: ${this.intelligence.workflows.length}`);
      console.log(`   ✓ Visual moments: ${this.intelligence.visualMoments.length}`);
      
      // Phase 2: Compose the demo
      console.log('\n🎬 Phase 2: Composing Demo...');
      this.composition = await this.composeDemo();
      console.log(`   ✓ Story arc: ${this.composition.storyArc}`);
      console.log(`   ✓ Phases: ${this.composition.phases.length}`);
      console.log(`   ✓ Actions: ${this.composition.timeline.length}`);
      
      // Phase 3: Score quality
      console.log('\n📈 Phase 3: Scoring Quality...');
      this.quality = await this.scoreQuality();
      console.log(`   ✓ Score: ${this.quality.overall}/100 (${this.quality.grade})`);
      
      // Check quality and optionally retry
      if (this.quality.overall < this.options.minQualityScore && this.options.autoRetry) {
        console.log('\n🔄 Quality below threshold, optimizing...');
        await this.optimizeDemo();
        this.quality = await this.scoreQuality();
        console.log(`   ✓ New score: ${this.quality.overall}/100 (${this.quality.grade})`);
      }
      
      // Phase 4: Record
      console.log('\n🎥 Phase 4: Recording Demo...');
      const recordingPath = await this.recordDemo();
      
      // Phase 5: Post-process
      console.log('\n✨ Phase 5: Finalizing...');
      const finalPath = await this.finalizeDemo(recordingPath);
      
      console.log(`\n✅ Demo complete!`);
      console.log(`   📹 Video: ${finalPath}`);
      console.log(`   ⭐ Quality: ${this.quality.grade}`);
      
      return {
        success: true,
        videoPath: finalPath,
        intelligence: this.intelligence,
        composition: this.composition,
        quality: this.quality,
        duration: this.options.duration * 1000
      };
      
    } catch (error) {
      console.error('\n❌ Demo generation failed:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        },
        intelligence: this.intelligence,
        composition: this.composition,
        quality: this.quality
      };
      
    } finally {
      await this.cleanup();
    }
  }
  
  // ============================================================
  // Initialization
  // ============================================================
  
  async init() {
    // Create temp directory
    this.tempDir = join(tmpdir(), `look-intelligent-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
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
    
    // Initialize cursor tracker
    this.cursorTracker = new CursorTracker({ 
      fps: 60,
      width: this.options.width,
      height: this.options.height
    });
    
    // Initialize components
    this.productIntelligence = new ProductIntelligence();
    this.smartComposer = new SmartComposer({
      duration: this.options.duration * 1000,
      style: this.options.style,
      storyArc: this.options.storyArc,
      viewport: { width: this.options.width, height: this.options.height },
      includeNarration: this.options.includeVoiceover,
      includeZoom: this.options.includeZoom
    });
    this.qualityScorer = new QualityScorer({
      minAcceptableScore: this.options.minQualityScore
    });
  }
  
  // ============================================================
  // Phase 1: Intelligence Gathering
  // ============================================================
  
  async gatherIntelligence() {
    // Extract product DNA
    const productDNA = await this.productIntelligence.analyze(this.page);
    
    // Detect workflows
    this.workflowDetector = new WorkflowDetector(this.page, {
      includeAuth: false,
      maxWorkflows: 10
    });
    const workflows = await this.workflowDetector.detectWorkflows();
    
    // Find visual moments
    this.visualMomentDetector = new VisualMomentDetector(this.page, {
      testHoverEffects: true,
      detectScrollAnimations: true
    });
    const visualMoments = await this.visualMomentDetector.detectMoments();
    
    // Get page info for context
    const pageInfo = await this.extractPageInfo();
    
    return {
      product: productDNA,
      workflows,
      visualMoments,
      pageInfo,
      strategy: this.productIntelligence.getDemoStrategy()
    };
  }
  
  async extractPageInfo() {
    return this.page.evaluate(() => {
      const elements = [];
      
      // Get interactive elements
      document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'interactive',
            text: (el.textContent || '').trim().slice(0, 100),
            importance: el.className?.toLowerCase().match(/cta|primary|hero/) ? 'high' : 'medium',
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            selector: el.id ? `#${el.id}` : null
          });
        }
      });
      
      // Get headings
      document.querySelectorAll('h1, h2, h3').forEach(el => {
        const rect = el.getBoundingClientRect();
        elements.push({
          type: 'heading',
          text: el.textContent.trim().slice(0, 200),
          level: parseInt(el.tagName[1]),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      });
      
      return {
        url: window.location.href,
        meta: {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          h1: document.querySelector('h1')?.textContent?.trim() || ''
        },
        elements,
        dimensions: {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight
        }
      };
    });
  }
  
  // ============================================================
  // Phase 2: Demo Composition
  // ============================================================
  
  async composeDemo() {
    const composition = await this.smartComposer.compose(this.intelligence);
    return composition;
  }
  
  // ============================================================
  // Phase 3: Quality Scoring
  // ============================================================
  
  async scoreQuality() {
    return this.qualityScorer.scoreDemo(this.composition, this.intelligence);
  }
  
  // ============================================================
  // Optimization
  // ============================================================
  
  async optimizeDemo() {
    const issues = this.quality.issues;
    const suggestions = this.quality.suggestions;
    
    // Apply automatic optimizations based on issues
    for (const suggestion of suggestions.slice(0, 3)) {
      switch (suggestion.category) {
        case 'Story Arc':
          // Try a different story arc
          if (this.composition.storyArc !== 'PROBLEM_SOLUTION') {
            this.smartComposer.options.storyArc = 'PROBLEM_SOLUTION';
            this.composition = await this.smartComposer.compose(this.intelligence);
          }
          break;
          
        case 'Visual Engagement':
          // Add more visual moments
          const moreVisualMoments = await this.visualMomentDetector.detectMoments();
          this.intelligence.visualMoments = moreVisualMoments;
          this.composition = await this.smartComposer.compose(this.intelligence);
          break;
          
        case 'Pacing':
          // Adjust pacing style
          if (this.composition.pacing === 'Professional') {
            this.smartComposer.options.style = 'ENERGETIC';
          } else {
            this.smartComposer.options.style = 'CALM';
          }
          this.composition = await this.smartComposer.compose(this.intelligence);
          break;
          
        default:
          // Re-compose with current settings
          this.composition = await this.smartComposer.compose(this.intelligence);
      }
    }
  }
  
  // ============================================================
  // Phase 4: Recording
  // ============================================================
  
  async recordDemo() {
    // Navigate to start
    await this.page.goto(this.intelligence.pageInfo?.url || this.page.url());
    await this.dismissBlockingElements();
    
    // Execute timeline actions
    const timeline = this.composition.timeline || [];
    let lastTime = 0;
    
    for (const action of timeline) {
      // Wait until action time
      const waitTime = action.time - lastTime;
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      
      // Execute action
      await this.executeAction(action);
      
      lastTime = action.time + (action.duration || 0);
    }
    
    // Wait for recording to complete
    await this.sleep(1000);
    
    // Get video path
    await this.page.close();
    const video = await this.context.pages()[0]?.video?.();
    const videoPath = await video?.path() || join(this.tempDir, 'recording.webm');
    
    return videoPath;
  }
  
  async executeAction(action) {
    try {
      switch (action.type) {
        case 'phase':
          // Phase marker - just log
          console.log(`     → ${action.params?.name || 'Phase'}`);
          break;
          
        case 'moveTo':
          await this.moveCursor(action.params?.x, action.params?.y, action.duration);
          break;
          
        case 'click':
          if (action.params?.selector) {
            await this.page.click(action.params.selector, { timeout: 3000 }).catch(() => {});
          } else if (action.params?.x && action.params?.y) {
            await this.page.mouse.click(action.params.x, action.params.y);
          }
          break;
          
        case 'hover':
          if (action.params?.selector) {
            await this.page.hover(action.params.selector, { timeout: 3000 }).catch(() => {});
          } else if (action.params?.x && action.params?.y) {
            await this.page.mouse.move(action.params.x, action.params.y);
          }
          await this.sleep(action.duration || 300);
          break;
          
        case 'scroll':
          const scrollY = action.params?.y || action.params?.scrollY || 300;
          await this.page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), scrollY);
          await this.sleep(action.duration || 800);
          break;
          
        case 'wait':
          await this.sleep(action.duration || 500);
          break;
          
        case 'highlight':
          // Add visual highlight (could be enhanced with overlay)
          if (action.params?.selector) {
            await this.page.evaluate(sel => {
              const el = document.querySelector(sel);
              if (el) {
                el.style.transition = 'box-shadow 0.3s';
                el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
                setTimeout(() => { el.style.boxShadow = ''; }, 2000);
              }
            }, action.params.selector);
          }
          await this.sleep(action.duration || 500);
          break;
          
        case 'transition':
          await this.sleep(action.duration || 500);
          break;
          
        case 'zoom':
          // Zoom would be applied in post-processing
          this.cursorTracker?.addZoomMarker?.(action.time, action.params?.level || 1.0);
          break;
          
        default:
          console.log(`     (Unknown action: ${action.type})`);
      }
    } catch (e) {
      console.warn(`     Action failed: ${action.type} - ${e.message}`);
    }
  }
  
  async moveCursor(x, y, duration = 800) {
    const currentPos = this.cursorTracker?.getPosition?.() || { x: 960, y: 540 };
    const startX = currentPos.x;
    const startY = currentPos.y;
    const steps = Math.max(10, Math.round(duration / 16));
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Ease-out curve for natural movement
      const eased = 1 - Math.pow(1 - progress, 3);
      const curX = startX + (x - startX) * eased;
      const curY = startY + (y - startY) * eased;
      
      await this.page.mouse.move(curX, curY);
      this.cursorTracker?.update?.(curX, curY);
      await this.sleep(16);
    }
  }
  
  // ============================================================
  // Phase 5: Finalization
  // ============================================================
  
  async finalizeDemo(recordingPath) {
    const outputDir = join(this.tempDir, 'output');
    await mkdir(outputDir, { recursive: true });
    
    let currentPath = recordingPath;
    
    // Generate voiceover if enabled
    if (this.options.includeVoiceover && this.composition.narration?.fullScript) {
      try {
        console.log('   Generating voiceover...');
        const voiceoverPath = join(outputDir, 'voiceover.mp3');
        await generateVoiceover(this.composition.narration.fullScript, {
          voice: this.options.voice,
          output: voiceoverPath
        });
        
        // Combine video and audio
        const combinedPath = join(outputDir, 'combined.mp4');
        await combineVideoAudio(currentPath, voiceoverPath, combinedPath);
        currentPath = combinedPath;
      } catch (e) {
        console.warn('   Voiceover generation failed:', e.message);
      }
    }
    
    // Post-process (add cursor, etc.)
    try {
      console.log('   Post-processing...');
      const processedPath = join(outputDir, 'processed.mp4');
      await postProcess(currentPath, processedPath, {
        cursorStyle: 'macos',
        cursorSize: 32
      });
      currentPath = processedPath;
    } catch (e) {
      console.warn('   Post-processing skipped:', e.message);
    }
    
    // Export with preset
    try {
      const finalPath = this.options.output;
      await mkdir(join(finalPath, '..'), { recursive: true }).catch(() => {});
      await exportWithPreset(currentPath, finalPath, this.options.preset);
      return finalPath;
    } catch (e) {
      // If export fails, just copy the current video
      const { copyFile } = await import('fs/promises');
      await copyFile(currentPath, this.options.output);
      return this.options.output;
    }
  }
  
  // ============================================================
  // Helpers
  // ============================================================
  
  async navigateSafely(url) {
    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await this.sleep(1000);
    } catch (error) {
      console.warn('Navigation warning:', error.message);
    }
  }
  
  async dismissBlockingElements() {
    // Try common cookie/modal dismissal patterns
    const dismissSelectors = [
      '[class*="cookie"] button[class*="accept"]',
      '[class*="cookie"] button[class*="agree"]',
      '[class*="consent"] button[class*="accept"]',
      '[class*="modal"] button[class*="close"]',
      '[aria-label="Close"]',
      '[aria-label="Dismiss"]',
      'button:has-text("Accept")',
      'button:has-text("Got it")',
      'button:has-text("OK")'
    ];
    
    for (const selector of dismissSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          await this.sleep(300);
        }
      } catch {}
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async cleanup() {
    try {
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch {}
  }
  
  // ============================================================
  // Public API
  // ============================================================
  
  /**
   * Get intelligence data
   * @returns {Object|null}
   */
  getIntelligence() {
    return this.intelligence;
  }
  
  /**
   * Get composition
   * @returns {Object|null}
   */
  getComposition() {
    return this.composition;
  }
  
  /**
   * Get quality report
   * @returns {string}
   */
  getQualityReport() {
    return this.qualityScorer?.getReport() || 'No quality data available';
  }
  
  /**
   * Get available story arcs
   * @returns {Object}
   */
  static getStoryArcs() {
    return STORY_ARCS;
  }
  
  /**
   * Get available pacing styles
   * @returns {Object}
   */
  static getPacingStyles() {
    return PACING_STYLES;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate an intelligent demo
 * @param {string} url - URL to demo
 * @param {IntelligentDemoOptions} [options={}] - Options
 * @returns {Promise<IntelligentDemoResult>}
 */
export async function generateIntelligentDemo(url, options = {}) {
  const orchestrator = new IntelligentOrchestrator(options);
  return orchestrator.generate(url);
}

/**
 * Quick demo with defaults
 * @param {string} url - URL to demo
 * @returns {Promise<IntelligentDemoResult>}
 */
export async function quickDemo(url) {
  return generateIntelligentDemo(url, {
    duration: 30,
    style: 'PROFESSIONAL',
    minQualityScore: 60
  });
}

export default IntelligentOrchestrator;
