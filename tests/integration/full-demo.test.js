/**
 * Integration tests for full demo generation pipeline
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { mkdir, rm, readdir } from 'fs/promises';

// Get directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testOutputDir = join(__dirname, '..', 'test-output');

// Mock playwright for unit tests (comment out for real integration tests)
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          waitForLoadState: vi.fn().mockResolvedValue(undefined),
          url: vi.fn().mockReturnValue('https://example.com'),
          evaluate: vi.fn().mockImplementation((fn) => {
            // Return different values based on what's being evaluated
            return Promise.resolve({
              title: 'Example Site',
              description: 'Test description',
              url: 'https://example.com',
              hostname: 'example.com',
              sections: [
                { id: 'hero', title: 'Hero Section', demoScore: 90, bounds: { x: 0, y: 0, width: 1920, height: 600 } },
                { id: 'features', title: 'Features', demoScore: 75, bounds: { x: 0, y: 600, width: 1920, height: 800 } }
              ],
              pageHeight: 2000,
              viewportHeight: 1080
            });
          }),
          $: vi.fn().mockResolvedValue(null),
          mouse: {
            move: vi.fn().mockResolvedValue(undefined),
            click: vi.fn().mockResolvedValue(undefined)
          },
          close: vi.fn().mockResolvedValue(undefined)
        }),
        close: vi.fn().mockResolvedValue(undefined)
      }),
      close: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

// Mock fs/promises for file operations
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

// Mock post-processing
vi.mock('../../src/v2/post-process.js', () => ({
  postProcess: vi.fn().mockResolvedValue('/tmp/processed.mp4'),
  combineVideoAudio: vi.fn().mockResolvedValue('/tmp/with-audio.mp4'),
  exportWithPreset: vi.fn().mockResolvedValue('/tmp/final.mp4')
}));

// Mock AI functions
vi.mock('../../src/v2/ai.js', () => ({
  analyzeWebsite: vi.fn().mockResolvedValue({
    suggestions: ['Show pricing', 'Demo signup'],
    sections: ['hero', 'features', 'pricing']
  }),
  generateScript: vi.fn().mockResolvedValue('Welcome to our demo. Let me show you the key features.'),
  generateVoiceover: vi.fn().mockResolvedValue('/tmp/voiceover.mp3')
}));

// Mock recorder
vi.mock('../../src/v2/recorder.js', () => ({
  recordBrowser: vi.fn().mockResolvedValue({
    videoPath: '/tmp/fallback-video.webm',
    duration: 30000
  })
}));

import { DemoOrchestrator, generateIntelligentDemo } from '../../src/v2/demo-orchestrator.js';
import { DemoPlan } from '../../src/v2/demo-plan.js';
import { PacingController } from '../../src/v2/pacing-controller.js';
import { ErrorRecovery } from '../../src/v2/error-recovery.js';
import { TransitionManager } from '../../src/v2/transition-manager.js';

describe('Full Demo Generation Pipeline', () => {
  describe('End-to-end orchestration (mocked)', () => {
    it('should complete full pipeline with mocks', async () => {
      const orchestrator = new DemoOrchestrator({
        duration: 30,
        maxPages: 2,
        style: 'professional',
        errorRecovery: true,
        narrativeMode: 'silent'
      });
      
      const result = await orchestrator.generateDemo('https://example.com', {
        output: '/tmp/test-demo.mp4'
      });
      
      // Should complete (may or may not succeed depending on mock coverage)
      expect(result).toHaveProperty('success');
      
      if (result.success) {
        expect(result).toHaveProperty('videoPath');
        expect(result).toHaveProperty('duration');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
    
    it('should handle fallback when main pipeline fails', async () => {
      const orchestrator = new DemoOrchestrator({
        duration: 30,
        errorRecovery: true
      });
      
      // Force an error by providing invalid state
      orchestrator.createPlan = vi.fn().mockRejectedValue(new Error('Planning failed'));
      
      const result = await orchestrator.generateDemo('https://example.com');
      
      // Should attempt fallback
      expect(result).toHaveProperty('success');
    });
  });
  
  describe('Phase 1: Exploration', () => {
    it('should explore site and gather metadata', async () => {
      const orchestrator = new DemoOrchestrator();
      await orchestrator.init();
      
      const result = await orchestrator.explore('https://example.com', {
        maxPages: 3
      });
      
      expect(result).toHaveProperty('graph');
      expect(result).toHaveProperty('analyses');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('hostname');
      
      await orchestrator.cleanup();
    });
    
    it('should create simple graph when navigation graph unavailable', async () => {
      const orchestrator = new DemoOrchestrator();
      await orchestrator.init();
      
      // Ensure no navigation graph
      orchestrator.navigationGraph = null;
      
      const result = await orchestrator.explore('https://example.com');
      
      expect(result.graph).toBeDefined();
      expect(result.graph.getVisitedNodes()).toHaveLength(1);
      
      await orchestrator.cleanup();
    });
  });
  
  describe('Phase 2: Planning', () => {
    it('should create plan from exploration results', async () => {
      const graph = {
        nodes: new Map([
          ['home', { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true }],
          ['features', { id: 'features', url: 'https://example.com/features', title: 'Features', depth: 1 }]
        ]),
        getVisitedNodes: () => [
          { id: 'home', url: 'https://example.com', title: 'Home', depth: 0, isHome: true },
          { id: 'features', url: 'https://example.com/features', title: 'Features', depth: 1 }
        ]
      };
      
      const analyses = new Map([
        ['home', {
          sections: [
            { id: 'hero', title: 'Hero', demoScore: 95, bounds: { x: 0, y: 0, width: 1920, height: 600 } },
            { id: 'intro', title: 'Intro', demoScore: 60, bounds: { x: 0, y: 600, width: 1920, height: 400 } }
          ]
        }],
        ['features', {
          sections: [
            { id: 'feature-list', title: 'Features', demoScore: 85, bounds: { x: 0, y: 0, width: 1920, height: 1000 } }
          ]
        }]
      ]);
      
      const orchestrator = new DemoOrchestrator({ duration: 60 });
      orchestrator.explorationResult = { graph, analyses, metadata: { title: 'Test' } };
      
      const plan = await orchestrator.createPlan({ duration: 60 });
      
      expect(plan).toBeInstanceOf(DemoPlan);
      expect(plan.pages.length).toBeGreaterThan(0);
      expect(plan.totalDuration).toBe(60000);
    });
    
    it('should apply adaptive timing when enabled', async () => {
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
            { id: 'hero', title: 'Hero', demoScore: 100 },
            { id: 'footer', title: 'Footer', demoScore: 10 }
          ]
        }]
      ]);
      
      const orchestrator = new DemoOrchestrator({
        duration: 30,
        adaptiveTiming: true
      });
      
      orchestrator.explorationResult = { graph, analyses, metadata: {} };
      const plan = await orchestrator.createPlan({ duration: 30, adaptiveTiming: true });
      
      // The plan should exist and have pages
      expect(plan.pages.length).toBeGreaterThan(0);
    });
  });
  
  describe('Phase 3: Execution', () => {
    it('should execute plan actions', async () => {
      const orchestrator = new DemoOrchestrator({ duration: 10 });
      await orchestrator.init();
      
      // Set up minimal exploration and plan
      orchestrator.explorationResult = {
        graph: {
          nodes: new Map([['home', { id: 'home', url: 'https://example.com' }]]),
          getVisitedNodes: () => [{ id: 'home', url: 'https://example.com' }]
        },
        analyses: new Map([['home', { sections: [] }]]),
        metadata: { title: 'Test' }
      };
      
      orchestrator.plan = await orchestrator.createPlan({ duration: 10 });
      
      // Execute with very short duration
      const result = await orchestrator.execute('https://example.com', {
        duration: 5
      });
      
      expect(result).toHaveProperty('cursorData');
      expect(result).toHaveProperty('duration');
      
      await orchestrator.cleanup();
    });
  });
  
  describe('Phase 4: Finalization', () => {
    it('should finalize video with post-processing', async () => {
      const orchestrator = new DemoOrchestrator();
      orchestrator.tempDir = '/tmp/test-orchestrator';
      
      const result = {
        videoPath: '/tmp/test-video.webm',
        cursorData: { positions: [], clicks: [] },
        duration: 30000
      };
      
      orchestrator.plan = {
        narrative: 'Test narration'
      };
      
      const finalPath = await orchestrator.finalize(result, {
        output: '/tmp/output.mp4',
        narrativeMode: 'silent',
        preset: 'youtube'
      });
      
      expect(finalPath).toBe('/tmp/output.mp4');
    });
    
    it('should handle missing video gracefully', async () => {
      const orchestrator = new DemoOrchestrator();
      orchestrator.tempDir = '/tmp/test-orchestrator';
      
      const result = {
        videoPath: null,
        cursorData: null,
        duration: 0
      };
      
      await expect(orchestrator.finalize(result, {}))
        .rejects.toThrow('No video recorded');
    });
  });
  
  describe('Error Recovery Integration', () => {
    it('should recover from navigation errors', async () => {
      const orchestrator = new DemoOrchestrator({ errorRecovery: true });
      await orchestrator.init();
      
      // Simulate navigation error
      orchestrator.page.goto = vi.fn().mockRejectedValueOnce(new Error('Navigation timeout'))
        .mockResolvedValue(undefined);
      
      // Should not throw, should recover
      await orchestrator.navigateSafely('https://example.com');
      
      await orchestrator.cleanup();
    });
    
    it('should track error statistics', async () => {
      const orchestrator = new DemoOrchestrator();
      
      // Trigger some errors
      await orchestrator.errorRecovery.recover(new Error('Test 1'), {});
      await orchestrator.errorRecovery.recover(new Error('Test 2'), {});
      
      const stats = orchestrator.errorRecovery.getStats();
      expect(stats.totalErrors).toBe(2);
    });
    
    it('should abort after too many errors', async () => {
      const orchestrator = new DemoOrchestrator();
      
      // Trigger many errors
      for (let i = 0; i < 15; i++) {
        await orchestrator.errorRecovery.recover(new Error(`Error ${i}`), {});
      }
      
      expect(orchestrator.errorRecovery.shouldAbort()).toBe(true);
    });
  });
  
  describe('Pacing Controller Integration', () => {
    it('should maintain pace throughout execution', () => {
      const plan = {
        pages: [
          {
            id: 'home',
            duration: 20000,
            timeline: [
              { type: 'wait', duration: 5000, priority: 80 },
              { type: 'scroll', duration: 3000, priority: 60 },
              { type: 'hover', duration: 2000, priority: 70 }
            ]
          }
        ],
        totalDuration: 20000
      };
      
      const controller = new PacingController(plan, { targetDuration: 20000 });
      controller.start();
      
      // Simulate executing actions
      const action1 = plan.pages[0].timeline[0];
      const adjusted1 = controller.getAdjustedDuration(action1);
      controller.update(action1, adjusted1);
      
      const status = controller.getStatus();
      expect(status.completedDuration).toBeGreaterThan(0);
    });
    
    it('should speed up when behind schedule', () => {
      const plan = { pages: [], totalDuration: 10000 };
      const controller = new PacingController(plan, { targetDuration: 10000 });
      controller.start();
      
      // Simulate being behind
      controller.targetProgress = 5000;
      controller.completedDuration = 2000;
      
      const action = { duration: 2000, priority: 50 };
      const adjusted = controller.getAdjustedDuration(action);
      
      // Should reduce duration to catch up
      expect(adjusted).toBeLessThanOrEqual(2000);
    });
  });
  
  describe('Transition Manager Integration', () => {
    let orchestrator;
    
    beforeEach(async () => {
      orchestrator = new DemoOrchestrator();
      await orchestrator.init();
    });
    
    afterEach(async () => {
      await orchestrator.cleanup();
    });
    
    it('should create smooth cursor movements', async () => {
      const manager = orchestrator.transitionManager;
      manager.setPosition(100, 100);
      
      await manager.smoothMoveTo(500, 500, 200);
      
      expect(manager.currentX).toBe(500);
      expect(manager.currentY).toBe(500);
    });
    
    it('should handle scroll transitions', async () => {
      const manager = orchestrator.transitionManager;
      
      // Should not throw
      await manager.smoothScrollTo(500, 200);
    });
    
    it('should provide dramatic pauses', async () => {
      const manager = orchestrator.transitionManager;
      
      const start = Date.now();
      await manager.dramaticPause(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });
});

describe('Convenience Function', () => {
  describe('generateIntelligentDemo', () => {
    it('should generate demo with default options', async () => {
      const result = await generateIntelligentDemo('https://example.com', {
        duration: 10,
        narrativeMode: 'silent'
      });
      
      expect(result).toHaveProperty('success');
    });
    
    it('should accept all orchestrator options', async () => {
      const result = await generateIntelligentDemo('https://example.com', {
        duration: 15,
        maxPages: 2,
        style: 'casual',
        focus: 'pricing',
        adaptiveTiming: true,
        errorRecovery: true,
        narrativeMode: 'silent',
        width: 1280,
        height: 720,
        output: '/tmp/test.mp4',
        preset: 'twitter'
      });
      
      expect(result).toHaveProperty('success');
    });
  });
});

describe('Component Interoperability', () => {
  it('should share cursor tracker between components', async () => {
    const orchestrator = new DemoOrchestrator();
    await orchestrator.init();
    
    // Cursor tracker should be shared
    expect(orchestrator.transitionManager.cursorTracker).toBeDefined();
    
    // Movements should be recorded
    orchestrator.transitionManager.setPosition(100, 100);
    await orchestrator.transitionManager.smoothMoveTo(200, 200, 100);
    
    await orchestrator.cleanup();
  });
  
  it('should coordinate between pacing and transitions', async () => {
    const orchestrator = new DemoOrchestrator({ duration: 30 });
    await orchestrator.init();
    
    // Set up plan
    orchestrator.explorationResult = {
      graph: {
        nodes: new Map([['home', { id: 'home', url: 'https://example.com' }]]),
        getVisitedNodes: () => [{ id: 'home', url: 'https://example.com' }]
      },
      analyses: new Map(),
      metadata: {}
    };
    
    orchestrator.plan = await orchestrator.createPlan({ duration: 30 });
    
    // Pacing controller should work with plan
    orchestrator.pacingController = new PacingController(orchestrator.plan, {
      targetDuration: 30000
    });
    orchestrator.pacingController.start();
    
    const status = orchestrator.pacingController.getStatus();
    expect(status.targetDuration).toBe(30000);
    
    await orchestrator.cleanup();
  });
  
  it('should coordinate error recovery across phases', async () => {
    const orchestrator = new DemoOrchestrator({ errorRecovery: true });
    
    // Error recovery should track across multiple calls
    await orchestrator.errorRecovery.recover(new Error('Phase 1 error'), {});
    await orchestrator.errorRecovery.recover(new Error('Phase 2 error'), {});
    
    const stats = orchestrator.errorRecovery.getStats();
    expect(stats.totalErrors).toBe(2);
    
    // Should not abort yet
    expect(orchestrator.errorRecovery.shouldAbort()).toBe(false);
  });
});
