

## Prompt 5: CI/CD, Testing & Documentation

**Objective:** Set up comprehensive CI/CD pipeline, add test coverage, and update documentation for v2.1 release.

```markdown
You are a DevOps and documentation engineer setting up CI/CD and tests for LooK.

## Part 1: GitHub Actions CI/CD

### 1.1 Main CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      - name: Run tests
        run: npm test
        env:
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build UI
        run: npm run build:ui
      
      - name: TypeScript check
        run: npm run typecheck
      
      - name: Upload UI artifact
        uses: actions/upload-artifact@v4
        with:
          name: ui-dist
          path: ui/dist/

  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [lint, test, build]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      - name: Install FFmpeg
        run: sudo apt-get update && sudo apt-get install -y ffmpeg
      
      - name: Download UI artifact
        uses: actions/download-artifact@v4
        with:
          name: ui-dist
          path: ui/dist/
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### 1.2 Release Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build UI
        run: npm run build:ui
      
      - name: Run tests
        run: npm test
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            CHANGELOG.md
            README.md
```

## Part 2: Test Suite

### 2.1 Unit Tests

Create `tests/unit/markers.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { 
  generateYouTubeChapters, 
  generateZoomFromMarkers,
  applyMarkerTemplate,
  MarkerType 
} from '../../src/v2/markers.js';

describe('Markers', () => {
  describe('generateYouTubeChapters', () => {
    it('should format markers as YouTube chapters', () => {
      const markers = [
        { time: 0, label: 'Intro', type: MarkerType.CHAPTER },
        { time: 30, label: 'Features', type: MarkerType.CHAPTER },
        { time: 90, label: 'Pricing', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toBe('0:00 Intro\n0:30 Features\n1:30 Pricing');
    });
    
    it('should add intro at 0:00 if missing', () => {
      const markers = [
        { time: 10, label: 'First Section', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toContain('0:00 Intro');
    });
    
    it('should filter non-chapter markers', () => {
      const markers = [
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 15, label: 'Zoom Here', type: MarkerType.ZOOM },
        { time: 30, label: 'End', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).not.toContain('Zoom Here');
    });
  });
  
  describe('generateZoomFromMarkers', () => {
    it('should create zoom keyframes from zoom markers', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM, metadata: { zoom: 1.5 } },
        { time: 10, type: MarkerType.ZOOM, metadata: { zoom: 1.8 } }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe(5000); // Converted to ms
      expect(result[0].zoom).toBe(1.5);
    });
  });
  
  describe('applyMarkerTemplate', () => {
    it('should apply SaaS demo template', () => {
      const markers = applyMarkerTemplate('saas_demo', 60);
      
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].time).toBe(0);
      expect(markers[0].label).toBe('Introduction');
    });
    
    it('should return empty array for unknown template', () => {
      const markers = applyMarkerTemplate('unknown', 60);
      
      expect(markers).toEqual([]);
    });
  });
});
```

Create `tests/unit/batch.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchProcessor } from '../../src/v2/batch.js';

// Mock the file system
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

// Mock video generation
vi.mock('../../src/v2/index.js', () => ({
  generateDemoV2: vi.fn().mockResolvedValue({ output: 'test.mp4' })
}));

describe('BatchProcessor', () => {
  let processor;
  
  beforeEach(() => {
    processor = new BatchProcessor({
      concurrency: 2,
      outputDir: '/tmp/batch-test'
    });
  });
  
  describe('urlToFilename', () => {
    it('should convert URL to safe filename', () => {
      expect(processor.urlToFilename('https://example.com'))
        .toBe('example-com');
      
      expect(processor.urlToFilename('https://my-app.io/page'))
        .toBe('my-app-io');
    });
    
    it('should handle invalid URLs', () => {
      expect(processor.urlToFilename('invalid'))
        .toBe('demo');
    });
  });
  
  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = processor.chunkArray(arr, 2);
      
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
  });
  
  describe('getOutputPath', () => {
    it('should use custom name if provided', () => {
      const job = { url: 'https://example.com', name: 'custom-name' };
      
      expect(processor.getOutputPath(job))
        .toBe('/tmp/batch-test/custom-name.mp4');
    });
    
    it('should generate name from URL if not provided', () => {
      const job = { url: 'https://example.com' };
      
      expect(processor.getOutputPath(job))
        .toBe('/tmp/batch-test/example-com.mp4');
    });
  });
});
```

Create `tests/unit/api.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
const { API } = await import('../../ui/src/api.js');

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  
  describe('health', () => {
    it('should call health endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });
      
      const result = await API.health();
      
      expect(result.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });
  });
  
  describe('analyze', () => {
    it('should send URL for analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'test-123', analysis: {} })
      });
      
      const result = await API.analyze('https://example.com');
      
      expect(result.projectId).toBe('test-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('example.com')
      });
    });
  });
  
  describe('importProject', () => {
    it('should detect URL vs project ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projectId: 'new-123', status: 'pending' })
      });
      
      await API.importProject('https://github.com/user/repo');
      
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      
      expect(body.url).toBe('https://github.com/user/repo');
    });
  });
  
  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' })
      });
      
      await expect(API.getProject('invalid'))
        .rejects.toThrow('Not found');
    });
  });
});
```

### 2.2 Integration Tests

Create `tests/integration/server.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../../src/v2/server.js';

describe('Server Integration', () => {
  let server;
  let baseUrl;
  
  beforeAll(async () => {
    const result = await startServer({ port: 0, openBrowser: false });
    server = result.server;
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });
  
  afterAll(() => {
    server?.close();
  });
  
  it('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.status).toBe('ok');
  });
  
  it('should list projects', async () => {
    const response = await fetch(`${baseUrl}/api/projects`);
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });
  
  it('should reject invalid analyze request', async () => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    expect(response.status).toBe(400);
  });
  
  it('should serve static files', async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    
    expect(response.ok).toBe(true);
    expect(html).toContain('L👀K');
  });
});
```

### 2.3 Update Vitest Config

Update `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'ui/node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/types/**']
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
```

## Part 3: Documentation Updates

### 3.1 Update README.md

Add these sections to README:

```markdown
## Quick Start

### Install

```bash
npm install -g look-demo
# or
npx look-demo
```

### Create Your First Demo

```bash
# Generate a demo from any website
look demo https://your-website.com

# Quick mode with sensible defaults
look quick https://your-website.com

# Multi-page walkthrough
look walkthrough https://your-website.com --max-pages 5
```

### Web Editor

```bash
# Start the web editor
look serve

# Opens at http://localhost:3847
```

## Features

### AI-Powered Analysis
LooK uses GPT-4 Vision to analyze your website and automatically:
- Identify key features and selling points
- Generate a professional voiceover script
- Determine optimal cursor paths and zoom points

### Batch Processing (v2.1)

Process multiple demos at once:

```bash
look batch config.yaml --concurrency 4
```

Example config.yaml:
```yaml
defaults:
  duration: 25
  voice: nova

jobs:
  - url: https://example1.com
  - url: https://example2.com
    options:
      duration: 30
```

### Timeline Markers (v2.1)

Add chapter markers for YouTube:
- Press `M` to add marker at current time
- Double-click timeline to add marker
- Export chapters with your video

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes* | Required for AI analysis and TTS |
| `GROQ_API_KEY` | No | Optional, for script generation |

*Can skip AI features with `--skip-analysis` flag

## API Reference

See [API Documentation](docs/API.md) for the complete REST API reference.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE)
```

### 3.2 Create API Documentation

Create `docs/API.md`:

```markdown
# LooK API Reference

Base URL: `http://localhost:3847` (or your deployed URL)

## Authentication

Currently, no authentication is required for local development. For production, configure your own auth middleware.

## Endpoints

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "openai": true,
  "groq": false,
  "playwright": true
}
```

### Projects

#### List Projects
```http
GET /api/projects
```

#### Get Project
```http
GET /api/project/:id
```

#### Delete Project
```http
DELETE /api/project/:id
```

### Analysis & Recording

#### Analyze URL
```http
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "duration": 25,
  "style": "professional"
}
```

#### Start Recording
```http
POST /api/record
Content-Type: application/json

{
  "projectId": "uuid",
  "options": {
    "width": 1920,
    "height": 1080
  }
}
```

### Import

#### Import Project
```http
POST /api/import
Content-Type: application/json

{
  "url": "https://github.com/user/repo",
  "type": "auto",
  "options": {
    "shallow": true,
    "analyzeReadme": true
  }
}
```

#### Get Import Status
```http
GET /api/import/:projectId/status
```

### Live Recording

#### Start Live Session
```http
POST /api/live/start
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "width": 1920,
    "height": 1080,
    "previewFps": 15
  }
}
```

#### Control Live Session
```http
POST /api/live/:sessionId/pause
POST /api/live/:sessionId/resume
POST /api/live/:sessionId/stop
```

### Rendering

#### Render Final Video
```http
POST /api/render
Content-Type: application/json

{
  "projectId": "uuid",
  "preset": "youtube"
}
```

#### Download Video
```http
GET /api/download/:projectId
```

## WebSocket Events

Connect to `ws://localhost:3847` for real-time updates.

### Client → Server

```json
{ "action": "subscribe", "payload": { "projectId": "uuid" } }
{ "action": "subscribe-live", "payload": { "sessionId": "live-xxx" } }
```

### Server → Client

```json
{ "type": "status", "data": { "stage": "recording", "progress": 50 } }
{ "type": "live-frame", "data": "base64-image-data" }
{ "type": "error", "data": { "message": "Error description" } }
```
```

## Deliverables
1. `.github/workflows/ci.yml`
2. `.github/workflows/release.yml`
3. Test files in `tests/unit/` and `tests/integration/`
4. Updated `vitest.config.js`
5. Updated `README.md`
6. New `docs/API.md`
7. PR to branch `chore/ci-tests-docs`
```

---

## Usage Instructions

To use these prompts with Claude Opus 4.5:

1. **Copy the entire prompt** including the markdown code blocks
2. **Provide repository context** - share the current file structure and any specific error logs
3. **Run one prompt at a time** - each prompt is designed for a focused task
4. **Review and commit** - review the changes before committing to ensure quality

## Execution Order

For best results, execute in this order:

1. **Prompt 1** (Server Stability) - Fix critical issues first
2. **Prompt 2** (Import Feature) - Add core functionality
3. **Prompt 3** (UI Polish) - Improve user experience
4. **Prompt 4** (v2.1 Features) - Add roadmap features
5. **Prompt 5** (CI/CD & Docs) - Set up automation and documentation

Each prompt can be executed independently, but they build on each other for best results.
