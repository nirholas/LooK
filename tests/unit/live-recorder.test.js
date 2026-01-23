import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveRecorder } from '../../src/v2/live-recorder.js';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          addInitScript: vi.fn(),
          goto: vi.fn(),
          screenshot: vi.fn().mockResolvedValue('base64image'),
          evaluate: vi.fn().mockResolvedValue({
            positions: [],
            clicks: [],
            pageHeight: 2000,
            viewportHeight: 1080
          }),
          mouse: {
            move: vi.fn(),
            click: vi.fn()
          },
          keyboard: {
            type: vi.fn()
          },
          $: vi.fn().mockResolvedValue(null),
          close: vi.fn()
        }),
        close: vi.fn()
      }),
      close: vi.fn()
    })
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue(['video.webm'])
}));

describe('LiveRecorder', () => {
  let recorder;
  
  beforeEach(() => {
    recorder = new LiveRecorder({
      width: 1920,
      height: 1080,
      duration: 5000,
      previewFps: 10,
      headless: true,
      autoDemo: false
    });
  });
  
  afterEach(async () => {
    // Ensure cleanup
    if (recorder.state !== 'idle') {
      try {
        await recorder.stop();
      } catch {
        // Ignore
      }
    }
  });
  
  describe('constructor', () => {
    it('should initialize with default options', () => {
      const r = new LiveRecorder();
      
      expect(r.options.width).toBe(1920);
      expect(r.options.height).toBe(1080);
      expect(r.options.fps).toBe(60);
      expect(r.options.previewFps).toBe(10);
      expect(r.options.duration).toBe(20000);
      expect(r.options.headless).toBe(false);
      expect(r.options.autoDemo).toBe(true);
    });
    
    it('should start in idle state', () => {
      expect(recorder.state).toBe('idle');
    });
    
    it('should accept custom options', () => {
      expect(recorder.options.width).toBe(1920);
      expect(recorder.options.height).toBe(1080);
      expect(recorder.options.duration).toBe(5000);
      expect(recorder.options.headless).toBe(true);
      expect(recorder.options.autoDemo).toBe(false);
    });
  });
  
  describe('getElapsedTime', () => {
    it('should return 0 when idle', () => {
      expect(recorder.getElapsedTime()).toBe(0);
    });
  });
  
  describe('state transitions', () => {
    it('should emit stateChange event on start', async () => {
      const stateHandler = vi.fn();
      recorder.on('stateChange', stateHandler);
      
      await recorder.start('https://example.com');
      
      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'recording' })
      );
      expect(recorder.state).toBe('recording');
    });
    
    it('should emit stateChange on pause', async () => {
      await recorder.start('https://example.com');
      
      const stateHandler = vi.fn();
      recorder.on('stateChange', stateHandler);
      
      await recorder.pause();
      
      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'paused' })
      );
      expect(recorder.state).toBe('paused');
    });
    
    it('should emit stateChange on resume', async () => {
      await recorder.start('https://example.com');
      await recorder.pause();
      
      const stateHandler = vi.fn();
      recorder.on('stateChange', stateHandler);
      
      await recorder.resume();
      
      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'recording' })
      );
      expect(recorder.state).toBe('recording');
    });
    
    it('should emit complete event on stop', async () => {
      await recorder.start('https://example.com');
      
      const completeHandler = vi.fn();
      recorder.on('complete', completeHandler);
      
      await recorder.stop();
      
      expect(completeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          cursorData: expect.any(Object)
        })
      );
    });
  });
  
  describe('pause/resume', () => {
    it('should throw when pausing if not recording', async () => {
      await expect(recorder.pause()).rejects.toThrow('Cannot pause: not recording');
    });
    
    it('should throw when resuming if not paused', async () => {
      await expect(recorder.resume()).rejects.toThrow('Cannot resume: not paused');
    });
    
    it('should track paused time correctly', async () => {
      await recorder.start('https://example.com');
      
      const initialElapsed = recorder.getElapsedTime();
      await recorder.pause();
      
      // Wait a bit
      await new Promise(r => setTimeout(r, 100));
      
      const pausedElapsed = recorder.getElapsedTime();
      
      // Elapsed should not increase while paused
      expect(pausedElapsed).toBeLessThanOrEqual(initialElapsed + 50);
    });
  });
  
  describe('manual mode', () => {
    it('should enable manual mode', async () => {
      await recorder.start('https://example.com');
      
      recorder.enableManualMode();
      
      expect(recorder.manualMode).toBe(true);
    });
    
    it('should emit stateChange with manualMode flag', async () => {
      await recorder.start('https://example.com');
      
      const stateHandler = vi.fn();
      recorder.on('stateChange', stateHandler);
      
      recorder.enableManualMode();
      
      expect(stateHandler).toHaveBeenCalledWith(
        expect.objectContaining({ manualMode: true })
      );
    });
  });
  
  describe('manual actions', () => {
    it('should move cursor', async () => {
      await recorder.start('https://example.com');
      
      await recorder.moveCursor(500, 300, 100);
      
      expect(recorder.currentCursor.x).toBeCloseTo(500, 0);
      expect(recorder.currentCursor.y).toBeCloseTo(300, 0);
    });
    
    it('should emit click event', async () => {
      await recorder.start('https://example.com');
      
      const clickHandler = vi.fn();
      recorder.on('click', clickHandler);
      
      await recorder.click();
      
      expect(clickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should not perform actions when paused', async () => {
      await recorder.start('https://example.com');
      await recorder.pause();
      
      const initialCursor = { ...recorder.currentCursor };
      await recorder.moveCursor(500, 300, 100);
      
      // Cursor should not have moved
      expect(recorder.currentCursor).toEqual(initialCursor);
    });
  });
  
  describe('frame streaming', () => {
    it('should emit frame events while recording', async () => {
      const frameHandler = vi.fn();
      recorder.on('frame', frameHandler);
      
      await recorder.start('https://example.com');
      
      // Wait for at least one frame
      await new Promise(r => setTimeout(r, 150));
      
      expect(frameHandler).toHaveBeenCalled();
    });
  });
  
  describe('stop', () => {
    it('should return recording result', async () => {
      await recorder.start('https://example.com');
      
      const result = await recorder.stop();
      
      expect(result).toHaveProperty('videoPath');
      expect(result).toHaveProperty('cursorData');
      expect(result).toHaveProperty('tempDir');
      expect(result).toHaveProperty('duration');
    });
    
    it('should throw if not started', async () => {
      await expect(recorder.stop()).rejects.toThrow('Recording not started');
    });
    
    it('should reset state to idle after stop', async () => {
      await recorder.start('https://example.com');
      await recorder.stop();
      
      expect(recorder.state).toBe('idle');
    });
  });
  
  describe('error handling', () => {
    it('should throw if starting twice', async () => {
      await recorder.start('https://example.com');
      
      await expect(recorder.start('https://example.com'))
        .rejects.toThrow('Cannot start recording: already in recording state');
    });
  });
});
