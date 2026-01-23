/**
 * DemoOrchestrator - Master orchestrator for intelligent demo generation
 * 
 * Coordinates all intelligent systems (state detection, element discovery,
 * navigation, content analysis) to produce coherent, engaging multi-page
 * demo videos with adaptive timing, smooth transitions, and error recovery.
 * 
 * @module demo-orchestrator
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { DemoPlan } from './demo-plan.js';
import { PacingController, calculateAdaptiveTiming } from './pacing-controller.js';
import { ErrorRecovery } from './error-recovery.js';
import { TransitionManager } from './transition-manager.js';
import { CursorTracker } from './cursor-tracker.js';
import { recordBrowser } from './recorder.js';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { analyzeWebsite, generateScript, generateVoiceover } from './ai.js';

/**
 * @typedef {Object} OrchestratorOptions
 * @property {number} [duration=60] - Target duration in seconds
 * @property {number} [maxPages=5] - Maximum pages to visit
 * @property {'professional' | 'casual' | 'energetic' | 'minimal'} [style='professional'] - Demo style
 * @property {'features' | 'pricing' | 'overview' | 'all'} [focus='features'] - What to emphasize
 * @property {boolean} [adaptiveTiming=true] - Adjust timing based on content
 * @property {boolean} [errorRecovery=true] - Try to recover from errors
 * @property {'auto' | 'scripted' | 'silent'} [narrativeMode='auto'] - Voice narration mode
 * @property {number} [width=1920] - Video width
 * @property {number} [height=1080] - Video height
 * @property {string} [output] - Output path
 * @property {string} [voice='nova'] - Voice for narration
 * @property {string} [preset='youtube'] - Export preset
 */

/**
 * @typedef {Object} DemoResult
 * @property {boolean} success - Whether demo was generated successfully
 * @property {string} [videoPath] - Path to final video
 * @property {Object} [plan] - The demo plan used
 * @property {Object} [graph] - Navigation graph
 * @property {number} [duration] - Actual duration in ms
 * @property {Object} [error] - Error info if failed
 */

/**
 * @typedef {Object} ExplorationResult
 * @property {Object} graph - Navigation graph
 * @property {Map<string, Object>} analyses - Content analyses by page ID
 * @property {Object} metadata - Site metadata
 */

/**
 * Master orchestrator for intelligent demo generation
 */
export class DemoOrchestrator {
  /**
   * Create a DemoOrchestrator
   * @param {OrchestratorOptions} [options={}] - Configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.options = {
      duration: options.duration || 60,
      maxPages: options.maxPages || 5,
      style: options.style || 'professional',
      focus: options.focus || 'features',
      adaptiveTiming: options.adaptiveTiming !== false,
      errorRecovery: options.errorRecovery !== false,
      narrativeMode: options.narrativeMode || 'auto',
      width: options.width || 1920,
      height: options.height || 1080,
      output: options.output || './output/demo.mp4',
      voice: options.voice || 'nova',
      preset: options.preset || 'youtube',
      ...options
    };
    
    // Core components - will be initialized or injected
    /** @type {Object|null} */
    this.stateDetector = options.stateDetector || null;
    
    /** @type {Object|null} */
    this.elementDiscovery = options.elementDiscovery || null;
    
    /** @type {Object|null} */
    this.navigationGraph = options.navigationGraph || null;
    
    /** @type {Object|null} */
    this.contentAnalyzer = options.contentAnalyzer || null;
    
    // These we always create
    /** @type {ErrorRecovery} */
    this.errorRecovery = new ErrorRecovery(this);
    
    /** @type {CursorTracker} */
    this.cursorTracker = new CursorTracker({ fps: 60 });
    
    /** @type {TransitionManager|null} */
    this.transitionManager = null;
    
    /** @type {PacingController|null} */
    this.pacingController = null;
    
    // Browser state
    /** @type {import('playwright').Browser|null} */
    this.browser = null;
    
    /** @type {import('playwright').BrowserContext|null} */
    this.context = null;
    
    /** @type {import('playwright').Page|null} */
    this.page = null;
    
    // Recording state
    /** @type {string|null} */
    this.tempDir = null;
    
    /** @type {boolean} */
    this.isRecording = false;
    
    /** @type {number} */
    this.recordingStartTime = 0;
    
    // Results
    /** @type {DemoPlan|null} */
    this.plan = null;
    
    /** @type {ExplorationResult|null} */
    this.explorationResult = null;
  }
  
  // ============================================================
  // Main Entry Point
  // ============================================================
  
  /**
   * Generate a complete demo video
   * @param {string} url - URL to demo
   * @param {OrchestratorOptions} [userOptions={}] - Override options
   * @returns {Promise<DemoResult>} Demo result
   */
  async generateDemo(url, userOptions = {}) {
    const options = { ...this.options, ...userOptions };
    
    console.log('🎬 Starting intelligent demo generation...');
    console.log(`   URL: ${url}`);
    console.log(`   Duration: ${options.duration}s`);
    console.log(`   Style: ${options.style}`);
    
    try {
      // Initialize
      await this.init();
      
      // Phase 1: Exploration
      console.log('\n🔍 Phase 1: Exploring site...');
      this.explorationResult = await this.explore(url, options);
      
      // Phase 2: Planning
      console.log('\n📋 Phase 2: Creating demo plan...');
      this.plan = await this.createPlan(options);
      
      // Phase 3: Execution
      console.log('\n🎥 Phase 3: Recording demo...');
      const recordingResult = await this.execute(url, options);
      
      // Phase 4: Finalization
      console.log('\n✨ Phase 4: Finalizing video...');
      const finalPath = await this.finalize(recordingResult, options);
      
      console.log(`\n✅ Demo complete: ${finalPath}`);
      
      return {
        success: true,
        videoPath: finalPath,
        plan: this.plan?.toJSON(),
        duration: this.pacingController?.getElapsedTime() || options.duration * 1000
      };
      
    } catch (error) {
      console.error('\n❌ Demo generation failed:', error.message);
      
      // Try fallback
      if (options.errorRecovery) {
        console.log('\n🔄 Attempting fallback demo...');
        try {
          return await this.fallbackDemo(url, options);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError.message);
        }
      }
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
      
    } finally {
      await this.cleanup();
    }
  }
  
  // ============================================================
  // Initialization
  // ============================================================
  
  /**
   * Initialize the orchestrator
   * @private
   */
  async init() {
    // Create temp directory
    this.tempDir = join(tmpdir(), `look-orchestrator-${Date.now()}`);
    await mkdir(this.tempDir, { recursive: true });
    
    // Launch browser
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
    
    this.context = await this.browser.newContext({
      viewport: { width: this.options.width, height: this.options.height },
      recordVideo: {
        dir: this.tempDir,
        size: { width: this.options.width, height: this.options.height }
      }
    });
    
    this.page = await this.context.newPage();
    
    // Initialize transition manager
    this.transitionManager = new TransitionManager(this.page, this.cursorTracker);
    
    // Try to initialize optional components
    await this.initOptionalComponents();
  }
  
  /**
   * Initialize optional intelligent components
   * @private
   */
  async initOptionalComponents() {
    // Try to load state detector
    if (!this.stateDetector) {
      try {
        const { StateDetector } = await import('./state-detector.js');
        this.stateDetector = new StateDetector();
        await this.stateDetector.init(this.page);
      } catch {
        // State detector not available
        this.stateDetector = this.createStubStateDetector();
      }
    }
    
    // Try to load element discovery
    if (!this.elementDiscovery) {
      try {
        const { ElementDiscovery } = await import('./element-discovery.js');
        this.elementDiscovery = new ElementDiscovery(this.page);
      } catch {
        this.elementDiscovery = this.createStubElementDiscovery();
      }
    }
    
    // Try to load navigation graph
    if (!this.navigationGraph) {
      try {
        const { NavigationGraph } = await import('./navigation-graph.js');
        this.navigationGraph = new NavigationGraph(this.page);
      } catch {
        this.navigationGraph = this.createStubNavigationGraph();
      }
    }
    
    // Try to load content analyzer
    if (!this.contentAnalyzer) {
      try {
        const { ContentAnalyzer } = await import('./content-analyzer.js');
        this.contentAnalyzer = new ContentAnalyzer(this.page);
      } catch {
        this.contentAnalyzer = this.createStubContentAnalyzer();
      }
    }
  }
  
  // ============================================================
  // Phase 1: Exploration
  // ============================================================
  
  /**
   * Explore the site to understand structure and content
   * @param {string} url - Starting URL
   * @param {Object} options - Options
   * @returns {Promise<ExplorationResult>}
   */
  async explore(url, options = {}) {
    // Navigate to starting URL
    await this.navigateSafely(url);
    
    // Handle blocking elements (modals, cookie banners)
    await this.dismissBlockingElements();
    
    // Get site metadata
    const metadata = await this.getSiteMetadata();
    
    // Build navigation graph
    let graph;
    if (this.navigationGraph?.explore) {
      graph = await this.navigationGraph.explore(url, {
        maxPages: options.maxPages,
        maxDepth: 2
      });
    } else {
      // Simple single-page graph
      graph = this.createSimpleGraph(url, metadata);
    }
    
    // Analyze content on each visited page
    const analyses = new Map();
    const nodes = graph.getVisitedNodes?.() || [{ id: 'home', url }];
    
    for (const node of nodes) {
      try {
        // Navigate to page if not current
        if (this.page.url() !== node.url) {
          await this.navigateSafely(node.url);
          await this.dismissBlockingElements();
        }
        
        // Analyze content
        let analysis;
        if (this.contentAnalyzer?.analyzeStructure) {
          analysis = await this.contentAnalyzer.analyzeStructure();
        } else {
          analysis = await this.simpleAnalysis();
        }
        
        analyses.set(node.id, analysis);
      } catch (error) {
        console.warn(`Could not analyze ${node.url}:`, error.message);
        analyses.set(node.id, { sections: [], error: error.message });
      }
    }
    
    return { graph, analyses, metadata };
  }
  
  /**
   * Navigate safely with error handling
   * @param {string} url - URL to navigate to
   * @private
   */
  async navigateSafely(url) {
    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for network to settle
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      await this.sleep(500);
    } catch (error) {
      const recovery = await this.errorRecovery.recover(error, {
        page: this.page,
        stateDetector: this.stateDetector
      });
      
      if (recovery.action === 'fallback') {
        throw error;
      }
    }
  }
  
  /**
   * Dismiss modals, cookie banners, popups
   * @private
   */
  async dismissBlockingElements() {
    if (this.stateDetector?.dismissBlockingElements) {
      await this.stateDetector.dismissBlockingElements();
    } else {
      // Manual dismissal
      await this.errorRecovery.dismissModalsManually?.(this.page);
    }
  }
  
  /**
   * Get basic site metadata
   * @returns {Promise<Object>}
   * @private
   */
  async getSiteMetadata() {
    return await this.page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      url: window.location.href,
      hostname: window.location.hostname
    }));
  }
  
  /**
   * Create simple navigation graph for single page
   * @param {string} url - URL
   * @param {Object} metadata - Metadata
   * @returns {Object} Simple graph
   * @private
   */
  createSimpleGraph(url, metadata) {
    return {
      nodes: new Map([['home', { id: 'home', url, title: metadata.title, depth: 0 }]]),
      getVisitedNodes: () => [{ id: 'home', url, title: metadata.title, depth: 0, isHome: true }]
    };
  }
  
  /**
   * Simple content analysis without AI
   * @returns {Promise<Object>}
   * @private
   */
  async simpleAnalysis() {
    return await this.page.evaluate(() => {
      const sections = [];
      
      // Find major sections
      const sectionEls = document.querySelectorAll('section, [class*="section"], main > div, article');
      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 100) {
          const heading = el.querySelector('h1, h2, h3');
          sections.push({
            id: `section-${i}`,
            title: heading?.textContent?.trim().slice(0, 50) || `Section ${i + 1}`,
            bounds: {
              x: rect.left,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            },
            demoScore: 50 + (heading ? 20 : 0),
            keyElements: []
          });
        }
      });
      
      // Find key interactive elements
      const buttons = document.querySelectorAll('button, a.btn, [class*="cta"]');
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 30) {
          // Add to nearest section
          const parentSection = sections.find(s => 
            rect.top + window.scrollY >= s.bounds.y &&
            rect.top + window.scrollY < s.bounds.y + s.bounds.height
          );
          if (parentSection) {
            parentSection.keyElements = parentSection.keyElements || [];
            parentSection.keyElements.push({
              type: 'cta',
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              text: btn.textContent?.trim().slice(0, 30),
              priority: 70
            });
          }
        }
      });
      
      return {
        sections,
        title: document.title,
        pageHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight
      };
    });
  }
  
  // ============================================================
  // Phase 2: Planning
  // ============================================================
  
  /**
   * Create the demo plan
   * @param {Object} options - Options
   * @returns {Promise<DemoPlan>}
   */
  async createPlan(options = {}) {
    const { graph, analyses } = this.explorationResult;
    
    const plan = await DemoPlan.create(graph, analyses, {
      duration: options.duration,
      maxPages: options.maxPages,
      style: options.style,
      focus: options.focus,
      includeNarrative: options.narrativeMode !== 'silent'
    });
    
    // Apply adaptive timing if enabled
    if (options.adaptiveTiming) {
      this.applyAdaptiveTiming(plan, analyses);
    }
    
    return plan;
  }
  
  /**
   * Apply adaptive timing to plan
   * @param {DemoPlan} plan - The plan
   * @param {Map<string, Object>} analyses - Content analyses
   * @private
   */
  applyAdaptiveTiming(plan, analyses) {
    for (const page of plan.pages) {
      const analysis = analyses.get(page.id);
      if (analysis) {
        const timings = calculateAdaptiveTiming(analysis, {
          totalDuration: page.duration,
          minSectionTime: 2000,
          maxSectionTime: 10000
        });
        
        // Update timeline with adaptive timings
        let currentTime = 0;
        page.timeline = [];
        
        for (const timing of timings) {
          page.timeline.push({
            startTime: currentTime,
            duration: timing.duration,
            type: 'section',
            target: timing.sectionId,
            actions: timing.actions,
            priority: timing.score || 50
          });
          currentTime += timing.duration;
        }
      }
    }
  }
  
  // ============================================================
  // Phase 3: Execution
  // ============================================================
  
  /**
   * Execute the demo plan
   * @param {string} startUrl - Starting URL
   * @param {Object} options - Options
   * @returns {Promise<Object>} Recording result
   */
  async execute(startUrl, options = {}) {
    // Initialize pacing controller
    this.pacingController = new PacingController(this.plan, {
      targetDuration: options.duration * 1000
    });
    this.pacingController.start();
    
    // Reset cursor tracker
    this.cursorTracker = new CursorTracker({ fps: 60 });
    this.transitionManager.cursorTracker = this.cursorTracker;
    
    // Start from center of viewport
    const centerX = this.options.width / 2;
    const centerY = this.options.height / 2;
    this.transitionManager.setPosition(centerX, centerY);
    this.cursorTracker.record(centerX, centerY, Date.now());
    
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    
    // Navigate to start URL
    await this.navigateSafely(startUrl);
    await this.dismissBlockingElements();
    await this.sleep(1000);
    
    // Execute plan
    for (const pageEntry of this.plan.pages) {
      try {
        await this.executePage(pageEntry, options);
      } catch (error) {
        const recovery = await this.errorRecovery.recover(error, {
          page: this.page,
          stateDetector: this.stateDetector,
          action: { type: 'page', target: pageEntry.url }
        });
        
        if (recovery.action === 'fallback') {
          throw new Error(`Cannot continue: ${error.message}`);
        }
        // Skip this page and continue
      }
      
      // Check pacing
      if (this.errorRecovery.shouldAbort()) {
        console.warn('Too many errors, stopping early');
        break;
      }
    }
    
    this.isRecording = false;
    
    // Get video path
    await this.page.close();
    await this.context.close();
    
    const { readdir } = await import('fs/promises');
    const files = await readdir(this.tempDir);
    const videoFile = files.find(f => f.endsWith('.webm'));
    
    return {
      videoPath: videoFile ? join(this.tempDir, videoFile) : null,
      cursorData: this.cursorTracker.toJSON(),
      duration: Date.now() - this.recordingStartTime
    };
  }
  
  /**
   * Execute actions for a single page
   * @param {Object} pageEntry - Page from plan
   * @param {Object} options - Options
   * @private
   */
  async executePage(pageEntry, options) {
    // Navigate if not on this page
    const currentUrl = this.page.url();
    if (!currentUrl.includes(pageEntry.url) && pageEntry.url !== '/' && pageEntry.url !== currentUrl) {
      await this.transitionManager.transitionToPage(
        currentUrl,
        pageEntry.url,
        pageEntry.transitionMethod,
        { duration: 500 }
      );
      await this.dismissBlockingElements();
    }
    
    // Execute timeline
    for (const action of pageEntry.timeline) {
      // Check if we should skip
      if (this.pacingController.shouldSkipAction(action)) {
        this.pacingController.recordSkip(action);
        continue;
      }
      
      try {
        const adjustedDuration = this.pacingController.getAdjustedDuration(action);
        await this.executeAction(action, adjustedDuration);
        this.pacingController.update(action, adjustedDuration);
      } catch (error) {
        const recovery = await this.errorRecovery.recover(error, {
          page: this.page,
          action,
          stateDetector: this.stateDetector,
          elementDiscovery: this.elementDiscovery,
          selector: action.target
        });
        
        if (recovery.action === 'fallback') {
          throw error;
        }
        // Continue with next action
        this.pacingController.recordSkip(action);
      }
    }
  }
  
  /**
   * Execute a single action
   * @param {Object} action - Action to execute
   * @param {number} duration - Duration in ms
   * @private
   */
  async executeAction(action, duration) {
    switch (action.type) {
      case 'wait':
        await this.transitionManager.dramaticPause(duration);
        break;
        
      case 'scroll':
        const scrollAmount = action.params?.distance || 500;
        await this.transitionManager.scrollBy(scrollAmount, duration);
        break;
        
      case 'scroll-to':
        const targetY = action.y || action.params?.y || 0;
        await this.transitionManager.smoothScrollTo(targetY, duration);
        break;
        
      case 'hover':
        if (action.x && action.y) {
          await this.transitionManager.smoothMoveTo(action.x, action.y, duration * 0.6);
          await this.sleep(duration * 0.4);
        } else if (action.target) {
          const element = await this.findElement(action.target);
          if (element) {
            await this.transitionManager.smoothMoveTo(element.x, element.y, duration * 0.6);
            await this.sleep(duration * 0.4);
          }
        }
        break;
        
      case 'click':
        if (action.x && action.y) {
          await this.transitionManager.smoothMoveTo(action.x, action.y, duration * 0.4);
          await this.transitionManager.showClickEffect(action.x, action.y);
          await this.page.mouse.click(action.x, action.y);
          await this.sleep(duration * 0.4);
        } else if (action.target) {
          const element = await this.findElement(action.target);
          if (element) {
            await this.transitionManager.smoothMoveTo(element.x, element.y, duration * 0.4);
            await this.transitionManager.showClickEffect(element.x, element.y);
            await this.page.mouse.click(element.x, element.y);
            await this.sleep(duration * 0.4);
          }
        }
        break;
        
      case 'pan':
        if (action.params?.bounds) {
          await this.transitionManager.panAcross(action.params.bounds, duration);
        } else {
          // Generic pan across viewport
          const startX = (action.params?.startX || 0.2) * this.options.width;
          const startY = (action.params?.startY || 0.3) * this.options.height;
          const endX = (action.params?.endX || 0.8) * this.options.width;
          const endY = (action.params?.endY || 0.5) * this.options.height;
          
          await this.transitionManager.smoothMoveTo(startX, startY, duration * 0.3);
          await this.sleep(200);
          await this.transitionManager.smoothMoveTo(endX, endY, duration * 0.5);
        }
        break;
        
      case 'section':
        // Execute sub-actions for section
        if (action.actions && Array.isArray(action.actions)) {
          const timePerAction = duration / action.actions.length;
          for (const subAction of action.actions) {
            await this.executeAction(subAction, subAction.duration || timePerAction);
          }
        }
        break;
        
      case 'transition':
        // Handled at page level
        break;
        
      default:
        await this.sleep(duration);
    }
  }
  
  /**
   * Find an element on the page
   * @param {string} selector - Element selector
   * @returns {Promise<{x: number, y: number}|null>}
   * @private
   */
  async findElement(selector) {
    try {
      const element = await this.page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          return {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2
          };
        }
      }
    } catch {
      // Element not found
    }
    return null;
  }
  
  // ============================================================
  // Phase 4: Finalization
  // ============================================================
  
  /**
   * Finalize the demo video
   * @param {Object} recordingResult - Recording result
   * @param {Object} options - Options
   * @returns {Promise<string>} Path to final video
   */
  async finalize(recordingResult, options = {}) {
    if (!recordingResult.videoPath) {
      throw new Error('No video recorded');
    }
    
    let finalPath = recordingResult.videoPath;
    
    // Post-process with cursor overlay
    if (recordingResult.cursorData) {
      try {
        const processedPath = join(this.tempDir, 'processed.mp4');
        await postProcess(finalPath, processedPath, {
          cursorData: recordingResult.cursorData,
          width: this.options.width,
          height: this.options.height
        });
        finalPath = processedPath;
      } catch (error) {
        console.warn('Cursor overlay failed, continuing without:', error.message);
      }
    }
    
    // Generate and add voiceover if not silent
    if (options.narrativeMode !== 'silent' && this.plan?.narrative) {
      try {
        const voicePath = join(this.tempDir, 'voice.mp3');
        await generateVoiceover(this.plan.narrative, {
          voice: options.voice || 'nova',
          outputPath: voicePath
        });
        
        const withVoicePath = join(this.tempDir, 'with-voice.mp4');
        await combineVideoAudio(finalPath, voicePath, withVoicePath);
        finalPath = withVoicePath;
      } catch (error) {
        console.warn('Voiceover generation failed:', error.message);
      }
    }
    
    // Export with preset
    const outputPath = options.output || './output/demo.mp4';
    await mkdir(join(outputPath, '..'), { recursive: true });
    
    try {
      await exportWithPreset(finalPath, outputPath, options.preset || 'youtube');
    } catch (error) {
      // Fallback: just copy the file
      console.warn('Preset export failed, copying raw:', error.message);
      await copyFile(finalPath, outputPath);
    }
    
    return outputPath;
  }
  
  // ============================================================
  // Fallback Demo
  // ============================================================
  
  /**
   * Generate a simple fallback demo when intelligence fails
   * @param {string} url - URL to demo
   * @param {Object} options - Options
   * @returns {Promise<DemoResult>}
   */
  async fallbackDemo(url, options = {}) {
    console.log('Using simple fallback demo...');
    
    try {
      // Use the basic recorder
      const result = await recordBrowser(url, {
        width: options.width || 1920,
        height: options.height || 1080,
        duration: (options.duration || 30) * 1000
      });
      
      // Simple post-processing
      const outputPath = options.output || './output/demo.mp4';
      await mkdir(join(outputPath, '..'), { recursive: true });
      await copyFile(result.videoPath, outputPath);
      
      return {
        success: true,
        videoPath: outputPath,
        duration: (options.duration || 30) * 1000,
        fallback: true
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message },
        fallback: true
      };
    }
  }
  
  // ============================================================
  // Stub Components (when real ones not available)
  // ============================================================
  
  /**
   * Create stub state detector
   * @returns {Object}
   * @private
   */
  createStubStateDetector() {
    return {
      init: async () => {},
      waitForContentReady: async () => {},
      dismissBlockingElements: async () => {},
      getCurrentState: () => ({ state: 'ready' })
    };
  }
  
  /**
   * Create stub element discovery
   * @returns {Object}
   * @private
   */
  createStubElementDiscovery() {
    return {
      findElements: async () => [],
      findAlternatives: async () => []
    };
  }
  
  /**
   * Create stub navigation graph
   * @returns {Object}
   * @private
   */
  createStubNavigationGraph() {
    return {
      explore: async (url) => ({
        nodes: new Map([['home', { id: 'home', url, depth: 0, isHome: true }]]),
        getVisitedNodes: () => [{ id: 'home', url, depth: 0, isHome: true }]
      })
    };
  }
  
  /**
   * Create stub content analyzer
   * @returns {Object}
   * @private
   */
  createStubContentAnalyzer() {
    return {
      analyzeStructure: async () => ({ sections: [] })
    };
  }
  
  // ============================================================
  // Cleanup & Utilities
  // ============================================================
  
  /**
   * Cleanup resources
   * @private
   */
  async cleanup() {
    try {
      await this.page?.close().catch(() => {});
      await this.context?.close().catch(() => {});
      await this.browser?.close().catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
    
    this.page = null;
    this.context = null;
    this.browser = null;
  }
  
  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      pacing: this.pacingController?.getStatus(),
      errors: this.errorRecovery.getStats(),
      plan: this.plan?.toJSON()
    };
  }
}

/**
 * Convenience function to generate a demo
 * @param {string} url - URL to demo
 * @param {OrchestratorOptions} [options={}] - Options
 * @returns {Promise<DemoResult>}
 */
export async function generateIntelligentDemo(url, options = {}) {
  const orchestrator = new DemoOrchestrator(options);
  return orchestrator.generateDemo(url, options);
}

export default DemoOrchestrator;
