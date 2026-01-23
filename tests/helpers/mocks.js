import { vi } from 'vitest';

/**
 * Shared mock factories for testing
 */

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAI(overrides = {}) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                name: 'Test Product',
                tagline: 'A great product',
                description: 'This is a test product',
                keyFeatures: ['Feature 1', 'Feature 2'],
                focusPoints: [],
                suggestedActions: [],
                tone: 'professional'
              })
            }
          }]
        }),
        ...overrides.chat?.completions
      }
    },
    audio: {
      speech: {
        create: vi.fn().mockResolvedValue({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000))
        }),
        ...overrides.audio?.speech
      }
    }
  };
}

/**
 * Create mock cursor data
 */
export function createMockCursorData(options = {}) {
  const {
    duration = 5000,
    numPositions = 100,
    numClicks = 3
  } = options;

  const positions = [];
  const clicks = [];

  // Generate positions
  for (let i = 0; i < numPositions; i++) {
    positions.push({
      t: (duration / numPositions) * i,
      x: 500 + Math.sin(i * 0.1) * 200,
      y: 300 + Math.cos(i * 0.1) * 150
    });
  }

  // Generate clicks
  for (let i = 0; i < numClicks; i++) {
    const t = (duration / (numClicks + 1)) * (i + 1);
    const posIndex = Math.floor((t / duration) * numPositions);
    clicks.push({
      t,
      x: positions[posIndex]?.x || 500,
      y: positions[posIndex]?.y || 300,
      button: 'left'
    });
  }

  return {
    positions,
    clicks,
    getFrames: vi.fn().mockImplementation((dur) => {
      return positions.map((p, i) => ({
        frame: i,
        time: p.t,
        x: p.x,
        y: p.y
      }));
    })
  };
}

/**
 * Create mock analysis result
 */
export function createMockAnalysis(overrides = {}) {
  return {
    name: 'Test App',
    tagline: 'The best app ever',
    description: 'A comprehensive application for testing purposes',
    targetAudience: 'Developers',
    keyFeatures: ['Fast', 'Reliable', 'Secure'],
    focusPoints: [
      { element: 'hero', x: 50, y: 20, importance: 'high' },
      { element: 'features', x: 50, y: 50, importance: 'medium' },
      { element: 'cta', x: 50, y: 80, importance: 'high' }
    ],
    suggestedActions: [
      { type: 'scroll', target: 'features', reason: 'Show key features' },
      { type: 'click', target: 'cta', reason: 'Highlight main CTA' }
    ],
    tone: 'professional',
    ...overrides
  };
}

/**
 * Create mock project
 */
export function createMockProject(overrides = {}) {
  return {
    id: 'test-project-id',
    url: 'https://example.com',
    analysis: createMockAnalysis(),
    script: 'This is a test voiceover script for the demo video.',
    settings: {
      duration: 25,
      voice: 'nova',
      style: 'professional',
      preset: 'youtube',
      width: 1920,
      height: 1080,
      fps: 60,
      zoom: {
        mode: 'smart',
        intensity: 0.5,
        maxZoom: 2.0,
        minZoom: 1.0,
        onClicks: true,
        onHover: true,
        speed: 'medium'
      },
      cursor: {
        style: 'default',
        size: 24,
        color: '#000000'
      },
      clickEffect: {
        type: 'ripple',
        color: '#3B82F6',
        size: 60,
        duration: 400,
        opacity: 0.6
      }
    },
    timeline: {
      trimStart: 0,
      trimEnd: null,
      markers: [],
      duration: 25
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create mock file system operations
 */
export function createMockFS() {
  const files = new Map();
  const directories = new Set();

  return {
    readFile: vi.fn().mockImplementation((path) => {
      if (files.has(path)) {
        return Promise.resolve(files.get(path));
      }
      return Promise.reject(new Error(`ENOENT: ${path}`));
    }),
    writeFile: vi.fn().mockImplementation((path, content) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    mkdir: vi.fn().mockImplementation((path) => {
      directories.add(path);
      return Promise.resolve();
    }),
    rm: vi.fn().mockImplementation((path) => {
      files.delete(path);
      directories.delete(path);
      return Promise.resolve();
    }),
    access: vi.fn().mockImplementation((path) => {
      if (files.has(path) || directories.has(path)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`ENOENT: ${path}`));
    }),
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false
    }),
    
    // Test helpers
    _setFile: (path, content) => files.set(path, content),
    _setDirectory: (path) => directories.add(path),
    _clear: () => {
      files.clear();
      directories.clear();
    }
  };
}

/**
 * Create mock FFmpeg executor
 */
export function createMockFFmpeg() {
  return vi.fn().mockImplementation((cmd, opts, callback) => {
    if (typeof opts === 'function') {
      opts(null, '', '');
    } else if (callback) {
      callback(null, '', '');
    }
    return { stdout: '', stderr: '' };
  });
}

/**
 * Create mock sharp instance
 */
export function createMockSharp() {
  const instance = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
    toFile: vi.fn().mockResolvedValue(undefined),
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'png'
    })
  };
  
  return vi.fn().mockImplementation(() => instance);
}
