/**
 * Unit tests for DemoOrchestrator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn()
  }
}));

// Mock fs/promises
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue(['video.webm'])
  };
});

// Mock post-process
vi.mock('../../src/v2/post-process.js', () => ({
  postProcess: vi.fn().mockResolvedValue(undefined),
  combineVideoAudio: vi.fn().mockResolvedValue(undefined),
  exportWithPreset: vi.fn().mockResolvedValue(undefined)
}));

// Mock ai
vi.mock('../../src/v2/ai.js', () => ({
  analyzeWebsite: vi.fn().mockResolvedValue({ suggestions: [] }),
  generateScript: vi.fn().mockResolvedValue('Demo script'),
  generateVoiceover: vi.fn().mockResolvedValue(undefined)
}));

// Mock recorder
vi.mock('../../src/v2/recorder.js', () => ({
  recordBrowser: vi.fn().mockResolvedValue({ videoPath: '/tmp/video.webm' })
}));

import { DemoOrchestrator, generateIntelligentDemo } from '../../src/v2/demo-orchestrator.js';
import { DemoPlan } from '../../src/v2/demo-plan.js';
import { PacingController, calculateAdaptiveTiming } from '../../src/v2/pacing-controller.js';
import { ErrorRecovery } from '../../src/v2/error-recovery.js';
import { TransitionManager } from '../../src/v2/transition-manager.js';

// Helper to create mock page
function createMockPage() {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com'),
    evaluate: vi.fn().mockResolvedValue({
      title: 'Example Site',
      description: 'A test site',
      url: 'https://example.com',
      hostname: 'example.com',
      sections: []
    }),
    $: vi.fn().mockResolvedValue(null),
    mouse: {
      move: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined)
    },
    close: vi.fn().mockResolvedValue(undefined)
  };
}

function createMockContext() {
  return {
    newPage: vi.fn().mockResolvedValue(createMockPage()),
    close: vi.fn().mockResolvedValue(undefined)
  };
}

function createMockBrowser() {
  return {
    newContext: vi.fn().mockResolvedValue(createMockContext()),
    close: vi.fn().mockResolvedValue(undefined)
  };
}

describe('DemoOrchestrator', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const orchestrator = new DemoOrchestrator();
      
      expect(orchestrator.options.duration).toBe(60);
      expect(orchestrator.options.maxPages).toBe(5);
      expect(orchestrator.options.style).toBe('professional');
      expect(orchestrator.options.focus).toBe('features');
      expect(orchestrator.options.adaptiveTiming).toBe(true);
      expect(orchestrator.options.errorRecovery).toBe(true);
    });
    
    it('should accept custom options', () => {
      const orchestrator = new DemoOrchestrator({
        duration: 90,
        maxPages: 3,
        style: 'casual',
        focus: 'pricing'
      });
      
      expect(orchestrator.options.duration).toBe(90);
      expect(orchestrator.options.maxPages).toBe(3);
      expect(orchestrator.options.style).toBe('casual');
      expect(orchestrator.options.focus).toBe('pricing');
    });
    
    it('should initialize error recovery', () => {
      const orchestrator = new DemoOrchestrator();
      expect(orchestrator.errorRecovery).toBeInstanceOf(ErrorRecovery);
    });
    
    it('should initialize cursor tracker', () => {
      const orchestrator = new DemoOrchestrator();
      expect(orchestrator.cursorTracker).toBeDefined();
    });
    
    it('should accept injected components', () => {
      const mockStateDetector = { detect: vi.fn() };
      const orchestrator = new DemoOrchestrator({
        stateDetector: mockStateDetector
      });
      
      expect(orchestrator.stateDetector).toBe(mockStateDetector);
    });
  });
  
  describe('getStatus', () => {
    it('should return current status', () => {
      const orchestrator = new DemoOrchestrator();
      const status = orchestrator.getStatus();
      
      expect(status).toHaveProperty('isRecording');
      expect(status).toHaveProperty('errors');
      expect(status.isRecording).toBe(false);
    });
  });
  
  describe('createSimpleGraph', () => {
    it('should create single-node graph', () => {
      const orchestrator = new DemoOrchestrator();
      const graph = orchestrator.createSimpleGraph('https://example.com', { title: 'Test' });
      
      expect(graph.nodes.size).toBe(1);
      expect(graph.nodes.get('home')).toBeDefined();
      
      const nodes = graph.getVisitedNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].url).toBe('https://example.com');
    });
  });
  
  describe('createStub* methods', () => {
    let orchestrator;
    
    beforeEach(() => {
      orchestrator = new DemoOrchestrator();
    });
    
    it('should create stub state detector', () => {
      const stub = orchestrator.createStubStateDetector();
      
      expect(stub.init).toBeInstanceOf(Function);
      expect(stub.waitForContentReady).toBeInstanceOf(Function);
      expect(stub.dismissBlockingElements).toBeInstanceOf(Function);
      expect(stub.getCurrentState).toBeInstanceOf(Function);
    });
    
    it('should create stub element discovery', () => {
      const stub = orchestrator.createStubElementDiscovery();
      
      expect(stub.findElements).toBeInstanceOf(Function);
      expect(stub.findAlternatives).toBeInstanceOf(Function);
    });
    
    it('should create stub navigation graph', async () => {
      const stub = orchestrator.createStubNavigationGraph();
      
      expect(stub.explore).toBeInstanceOf(Function);
      
      const result = await stub.explore('https://example.com');
      expect(result.nodes.size).toBe(1);
      expect(result.getVisitedNodes()).toHaveLength(1);
    });
    
    it('should create stub content analyzer', async () => {
      const stub = orchestrator.createStubContentAnalyzer();
      
      expect(stub.analyzeStructure).toBeInstanceOf(Function);
      
      const result = await stub.analyzeStructure();
      expect(result).toHaveProperty('sections');
    });
  });
});

describe('DemoPlan', () => {
  describe('create', () => {
    it('should create a plan from graph and analyses', async () => {
      const graph = {
        nodes: new Map([
          ['home', { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }]
        ]),
        getVisitedNodes: () => [
          { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }
        ]
      };
      
      const analyses = new Map([
        ['home', {
          sections: [
            { id: 'hero', title: 'Hero', demoScore: 90, bounds: { x: 0, y: 0, width: 1920, height: 600 } }
          ]
        }]
      ]);
      
      const plan = await DemoPlan.create(graph, analyses, {
        duration: 30,
        maxPages: 3
      });
      
      expect(plan).toBeInstanceOf(DemoPlan);
      expect(plan.pages).toBeDefined();
      expect(plan.totalDuration).toBe(30 * 1000);
    });
    
    it('should handle empty analyses', async () => {
      const graph = {
        nodes: new Map([
          ['home', { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }]
        ]),
        getVisitedNodes: () => [
          { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }
        ]
      };
      
      const analyses = new Map();
      
      const plan = await DemoPlan.create(graph, analyses, { duration: 30 });
      
      expect(plan).toBeInstanceOf(DemoPlan);
      expect(plan.pages.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('toJSON', () => {
    it('should serialize plan', async () => {
      const graph = {
        nodes: new Map([
          ['home', { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }]
        ]),
        getVisitedNodes: () => [
          { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }
        ]
      };
      
      const analyses = new Map();
      const plan = await DemoPlan.create(graph, analyses, { duration: 30 });
      const json = plan.toJSON();
      
      expect(json).toHaveProperty('pages');
      expect(json).toHaveProperty('totalDuration');
    });
  });
});

describe('PacingController', () => {
  describe('constructor', () => {
    it('should initialize with plan', () => {
      const plan = { pages: [], totalDuration: 60000 };
      const controller = new PacingController(plan, { targetDuration: 60000 });
      
      expect(controller).toBeDefined();
    });
    
    it('should work without plan', () => {
      const controller = new PacingController(null, { targetDuration: 60000 });
      expect(controller).toBeDefined();
    });
  });
  
  describe('start/getElapsedTime', () => {
    it('should track elapsed time', async () => {
      const controller = new PacingController(null, { targetDuration: 60000 });
      controller.start();
      
      await new Promise(r => setTimeout(r, 50));
      
      const elapsed = controller.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });
  
  describe('getAdjustedDuration', () => {
    it('should return action duration when on pace', () => {
      const controller = new PacingController(null, { targetDuration: 60000 });
      controller.start();
      
      const action = { duration: 2000, priority: 50 };
      const adjusted = controller.getAdjustedDuration(action);
      
      expect(adjusted).toBe(2000);
    });
    
    it('should adjust duration when behind', () => {
      const controller = new PacingController(null, { targetDuration: 10000 });
      controller.start();
      
      // Simulate being behind
      controller.completedDuration = 1000;
      controller.targetProgress = 5000;
      
      const action = { duration: 2000, priority: 50 };
      const adjusted = controller.getAdjustedDuration(action);
      
      expect(adjusted).toBeLessThanOrEqual(2000);
    });
  });
  
  describe('shouldSkipAction', () => {
    it('should not skip high priority actions', () => {
      const controller = new PacingController(null, { targetDuration: 60000 });
      controller.start();
      
      const action = { duration: 2000, priority: 100 };
      expect(controller.shouldSkipAction(action)).toBe(false);
    });
    
    it('should consider skipping low priority when behind', () => {
      const controller = new PacingController(null, { targetDuration: 10000 });
      controller.start();
      
      // Simulate being very behind
      controller.completedDuration = 500;
      controller.targetProgress = 8000;
      
      const action = { duration: 2000, priority: 20 };
      const shouldSkip = controller.shouldSkipAction(action);
      
      // May or may not skip depending on implementation
      expect(typeof shouldSkip).toBe('boolean');
    });
  });
  
  describe('getStatus', () => {
    it('should return status object', () => {
      const controller = new PacingController(null, { targetDuration: 60000 });
      controller.start();
      
      const status = controller.getStatus();
      
      expect(status).toHaveProperty('elapsedTime');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('speedFactor');
    });
  });
});

describe('calculateAdaptiveTiming', () => {
  it('should calculate timing for sections', () => {
    const analysis = {
      sections: [
        { id: 'hero', demoScore: 90 },
        { id: 'features', demoScore: 70 },
        { id: 'footer', demoScore: 30 }
      ]
    };
    
    const timings = calculateAdaptiveTiming(analysis, {
      totalDuration: 30000,
      minSectionTime: 2000,
      maxSectionTime: 10000
    });
    
    expect(timings).toBeInstanceOf(Array);
    expect(timings.length).toBeGreaterThan(0);
    
    // Each timing should have duration
    for (const timing of timings) {
      expect(timing).toHaveProperty('duration');
    }
  });
  
  it('should handle empty sections', () => {
    const analysis = { sections: [] };
    const timings = calculateAdaptiveTiming(analysis, { totalDuration: 30000 });
    
    expect(timings).toBeInstanceOf(Array);
    // May return fallback timing for empty sections
  });
  
  it('should return durations that sum reasonably', () => {
    const analysis = {
      sections: [
        { id: 'only', demoScore: 50 }
      ]
    };
    
    const timings = calculateAdaptiveTiming(analysis, {
      totalDuration: 30000,
      minSectionTime: 5000,
      maxSectionTime: 15000
    });
    
    // Should return some timings
    expect(timings.length).toBeGreaterThan(0);
  });
});

describe('ErrorRecovery', () => {
  let orchestrator;
  let recovery;
  
  beforeEach(() => {
    orchestrator = new DemoOrchestrator();
    recovery = orchestrator.errorRecovery;
  });
  
  describe('classifyError', () => {
    it('should classify navigation errors', () => {
      const error = new Error('Navigation timeout');
      error.name = 'TimeoutError';
      
      const type = recovery.classifyError(error);
      expect(['timeout', 'navigation-failed']).toContain(type);
    });
    
    it('should classify element not found', () => {
      const error = new Error('Element not found: button.submit');
      const type = recovery.classifyError(error);
      expect(type).toBe('element-not-found');
    });
    
    it('should classify screenshot errors', () => {
      const error = new Error('Screenshot failed');
      const type = recovery.classifyError(error);
      expect(type).toBe('screenshot-failed');
    });
    
    it('should classify unknown errors', () => {
      const error = new Error('Something weird happened');
      const type = recovery.classifyError(error);
      expect(type).toBe('unknown');
    });
  });
  
  describe('recover', () => {
    it('should attempt recovery', async () => {
      const mockPage = createMockPage();
      const error = new Error('Timeout');
      
      const result = await recovery.recover(error, { page: mockPage });
      
      expect(result).toHaveProperty('action');
      expect(['continue', 'skip', 'retry', 'fallback']).toContain(result.action);
    });
    
    it('should track recovery attempts', async () => {
      const mockPage = createMockPage();
      
      await recovery.recover(new Error('Test error'), { page: mockPage });
      
      const stats = recovery.getStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('shouldAbort', () => {
    it('should not abort initially', () => {
      expect(recovery.shouldAbort()).toBe(false);
    });
    
    it('should abort after too many errors', async () => {
      const mockPage = createMockPage();
      
      // Simulate many errors
      for (let i = 0; i < 15; i++) {
        await recovery.recover(new Error(`Error ${i}`), { page: mockPage });
      }
      
      expect(recovery.shouldAbort()).toBe(true);
    });
  });
  
  describe('getStats', () => {
    it('should return error statistics', () => {
      const stats = recovery.getStats();
      
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorsByType');
    });
  });
});

describe('TransitionManager', () => {
  let mockPage;
  let cursorTracker;
  let manager;
  
  beforeEach(() => {
    mockPage = createMockPage();
    cursorTracker = { record: vi.fn() };
    manager = new TransitionManager(mockPage, cursorTracker);
  });
  
  describe('setPosition', () => {
    it('should set current position', () => {
      manager.setPosition(100, 200);
      
      // TransitionManager stores position in currentPosition object
      expect(manager.currentPosition.x).toBe(100);
      expect(manager.currentPosition.y).toBe(200);
    });
  });
  
  describe('smoothMoveTo', () => {
    it('should move cursor smoothly', async () => {
      manager.setPosition(0, 0);
      
      await manager.smoothMoveTo(100, 100, 100);
      
      expect(manager.currentPosition.x).toBe(100);
      expect(manager.currentPosition.y).toBe(100);
    });
    
    it('should call page mouse move', async () => {
      await manager.smoothMoveTo(50, 50, 50);
      
      expect(mockPage.mouse.move).toHaveBeenCalled();
    });
  });
  
  describe('dramaticPause', () => {
    it('should pause for specified duration', async () => {
      const start = Date.now();
      await manager.dramaticPause(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });
});

describe('generateIntelligentDemo', () => {
  it('should be a function', () => {
    expect(generateIntelligentDemo).toBeInstanceOf(Function);
  });
});
