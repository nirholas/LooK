# LooK AI Agent Prompts

This document contains the AI prompts used by LooK's intelligent demo generation system and prompts for extending the system.

---

## Intelligent Demo System Prompts (v2.2)

These are the AI prompts used by the intelligent demo generation modules to create beautiful, story-driven product videos.

### Product Intelligence Prompts

Used by `src/v2/product-intelligence.js` to understand products deeply.

#### Product DNA Extraction Prompt

```markdown
Analyze this product screenshot to extract its "DNA" - the core essence that makes it valuable.

Identify:
1. **Product Category** (one of: B2B SaaS, E-commerce, Developer Tool, Consumer App, 
   Marketing Site, Dashboard/Analytics, Content Platform, Fintech, Healthcare, Education)

2. **Primary Value Proposition** - What's the ONE main thing this product does for users?

3. **Target Audience** - Who is the ideal user? Be specific.

4. **Positioning Statement** - How would you describe this in one sentence?

5. **Key Features Visible** - List the main features you can see

6. **Competitive Angle** - What makes this different from alternatives?

7. **Emotional Appeal** - What feeling does this product evoke?

8. **Trust Signals** - Security badges, testimonials, social proof visible

Return as JSON with these exact keys:
- category, valueProp, targetAudience, positioning, keyFeatures[], 
- competitiveAngle, emotionalAppeal, trustSignals[]
```

#### Feature Understanding Prompt

```markdown
Analyze these product screenshots to understand its features in depth.

For each distinct feature you identify:
1. **Feature Name** - Clear, descriptive name
2. **Category** - (core/advanced/integration/settings)
3. **User Benefit** - Why would someone use this?
4. **Complexity Level** - (simple/moderate/complex)
5. **Demo Priority** - (must-show/nice-to-have/skip)
6. **Wow Factor** - How impressive is this? (1-10)

Return as JSON array of features.
```

---

### Workflow Detection Prompts

Used by `src/v2/workflow-detector.js` to identify user journeys.

#### Workflow Analysis Prompt

```markdown
Analyze this screenshot to identify user workflows and journeys.

Look for:
1. **Authentication Flows** - Login, signup, password reset, OAuth buttons
2. **CRUD Operations** - Create, edit, delete, list interfaces
3. **E-commerce Flows** - Cart, checkout, payment, product browsing
4. **Search & Filter** - Search bars, filter panels, sort options
5. **Navigation Patterns** - Menus, tabs, breadcrumbs, pagination
6. **Form Submissions** - Contact, feedback, settings forms
7. **Content Interactions** - Comments, likes, shares, uploads
8. **Onboarding Steps** - Tours, tooltips, progress indicators

For each workflow detected, provide:
- type: workflow type from list above
- confidence: 0-1 confidence score
- elements: CSS selectors or descriptions of involved elements
- steps: ordered list of actions to complete this workflow
- demoValue: how good would this look in a demo (1-10)

Return as JSON array.
```

---

### Visual Moment Detection Prompts

Used by `src/v2/visual-moments.js` to find "wow" moments.

#### Visual Analysis Prompt

```markdown
Analyze this screenshot to find visually impressive moments for a demo video.

Identify these types of visual moments:
1. **Animations** - Elements that likely animate (loading spinners, progress bars)
2. **Hover Effects** - Buttons, cards, links with hover states
3. **Transitions** - Page transitions, modal opens, slide-ins
4. **Micro-interactions** - Subtle feedback animations
5. **Scroll Effects** - Parallax, reveal-on-scroll, sticky headers
6. **Data Visualizations** - Charts, graphs that might animate
7. **Carousels/Sliders** - Image galleries, testimonial sliders
8. **Hero Sections** - Impressive above-the-fold content

For each moment:
- type: category from above
- element: description or likely CSS selector
- impressiveness: 1-10 score
- triggerAction: how to activate (hover, click, scroll, wait)
- duration: estimated animation duration in ms
- demoTip: suggestion for showcasing this

Return as JSON array, sorted by impressiveness.
```

---

### Story Composition Prompts

Used by `src/v2/smart-composer.js` to create narrative-driven demos.

#### Story Arc Selection Prompt

```markdown
Given this product analysis, select the best story arc for the demo video.

Product DNA:
{productDNA}

Available Story Arcs:
1. **Problem-Solution** - Start with pain point, reveal solution
   Best for: Products solving clear problems
   
2. **Transformation** - Show before/after, the journey
   Best for: Productivity tools, makeover products
   
3. **Feature Showcase** - Tour of capabilities
   Best for: Feature-rich products, developer tools
   
4. **Quick Demo** - Fast-paced highlights
   Best for: Simple products, short attention spans
   
5. **Storytelling** - Character-driven narrative
   Best for: B2C products, emotional appeal

Consider:
- Product category and audience
- Number of features to show
- Target demo length
- Emotional goals

Return:
- selectedArc: arc name
- reasoning: why this arc fits
- keyBeats: 3-5 story beats to hit
- emotionalPeaks: where to create excitement
- callToAction: ending hook
```

#### Scene Planning Prompt

```markdown
Create a scene-by-scene plan for this demo video.

Product: {productName}
Story Arc: {storyArc}
Features to Show: {features}
Visual Moments: {visualMoments}
Target Duration: {duration} seconds

For each scene:
1. **Scene Name** - Descriptive title
2. **Duration** - Seconds for this scene
3. **Actions** - What happens (clicks, scrolls, typing)
4. **Visual Focus** - What to zoom in on
5. **Narration** - What to say (if voice-over)
6. **Transition** - How to move to next scene
7. **Emotional Beat** - What feeling to evoke

Create a complete timeline with:
- Opening hook (first 3 seconds)
- Feature demonstrations
- Wow moments
- Closing with CTA

Return as JSON array of scenes.
```

---

### Narration Generation Prompts

Used by `src/v2/smart-composer.js` for voice-over scripts.

#### Script Writing Prompt

```markdown
Write narration for this demo video scene.

Scene: {sceneName}
Action: {action}
Feature: {feature}
Duration: {duration} seconds
Tone: {tone}
Target Audience: {audience}

Guidelines:
- Keep it conversational, not robotic
- Match words to video timing (~150 words/minute)
- Use active voice
- Highlight benefits, not just features
- Include natural pauses
- End with soft transition to next scene

Return:
- text: the narration text
- emphasis: words to emphasize
- pauseAfter: add pause after this text? (boolean)
- emotion: emotional tone (excited/calm/curious/etc)
```

---

### Quality Scoring Prompts

Used by `src/v2/quality-scorer.js` to rate demos.

#### Demo Quality Analysis Prompt

```markdown
Analyze this demo plan for quality and suggest improvements.

Demo Plan:
{demoPlan}

Score these categories (1-10 each):
1. **Story Quality** - Does it have a compelling narrative?
2. **Visual Appeal** - Will it be visually impressive?
3. **Pacing** - Is timing appropriate throughout?
4. **Narration** - Is the script engaging and clear?
5. **Technical** - Are the actions smooth and error-free?
6. **Conversion** - Will it convince viewers to try the product?

For each category, provide:
- score: 1-10
- strengths: what's working
- weaknesses: what needs improvement
- suggestions: specific fixes

Also provide:
- overallGrade: A+ to F
- topPriorities: 3 most important improvements
- quickWins: easy fixes for immediate improvement
```

---

### Orchestration Prompts

Used by `src/v2/intelligent-orchestrator.js` to coordinate the system.

#### Demo Strategy Prompt

```markdown
You are planning an intelligent demo for a product.

URL: {url}
Detected Features: {features}
Visual Moments: {visualMoments}
Workflows: {workflows}

Create a comprehensive demo strategy:

1. **Demo Type** - Full tour, quick highlight, or feature deep-dive?
2. **Target Length** - Ideal duration based on content
3. **Must-Include** - Non-negotiable elements
4. **Skip** - What to leave out
5. **Order** - Optimal sequence of elements
6. **Emphasis** - What deserves extra time/attention
7. **Risk Areas** - Potential issues to watch for
8. **Success Criteria** - How to know if demo is good

Return as JSON with strategy fields.
```

---

## Using These Prompts

### With OpenAI GPT-4o (Vision)

```javascript
import { ProductIntelligence } from 'look/v2';

const pi = new ProductIntelligence({
  openaiApiKey: process.env.OPENAI_API_KEY
});

const dna = await pi.extractProductDNA(page);
```

### With Groq (Text-only, Free)

```javascript
import { SmartComposer } from 'look/v2';

const composer = new SmartComposer({
  groqApiKey: process.env.GROQ_API_KEY
});

const composition = await composer.compose(dna, features, moments);
```

### Full Intelligent Demo

```javascript
import { IntelligentOrchestrator } from 'look/v2';

const orchestrator = new IntelligentOrchestrator({
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY
});

// Generate a beautiful demo automatically
const result = await orchestrator.generateIntelligentDemo({
  url: 'https://your-product.com',
  outputPath: 'demo.mp4',
  storyArc: 'problem-solution',  // or let AI choose
  duration: 60
});

console.log(result.composition);  // Full demo plan
console.log(result.quality);       // Quality scores
```

---

## Prompt Engineering Tips

1. **Be specific about output format** - Always specify JSON structure
2. **Include examples** - Show the AI what good output looks like
3. **Set constraints** - Limit response length, require certain fields
4. **Use system context** - Remind AI of its role and capabilities
5. **Chain prompts** - Use output of one as input to another

---

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
