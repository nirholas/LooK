# API Documentation

LooK can be used programmatically in your Node.js applications.

## Installation

```bash
npm install look-demo
```

## Quick Start

```javascript
import { generateDemo, generateDemoV2, generateMobileDemo } from 'look-demo';

// Generate a demo video
await generateDemo('https://myapp.com', {
  output: './demo.mp4',
  duration: 30,
  voice: 'nova'
});
```

## Core Functions

### `generateDemo(url, options)`

Generate a polished website demo video with AI analysis.

```javascript
import { generateDemo } from 'look-demo';

const result = await generateDemo('https://stripe.com', {
  // Output settings
  output: './output/demo.mp4',
  duration: 25,                    // seconds
  width: 1920,
  height: 1080,
  
  // AI settings
  voice: 'nova',                   // nova, alloy, echo, fable, onyx, shimmer
  style: 'professional',           // professional, casual, energetic
  skipVoice: false,
  skipAnalysis: false,
  
  // Export preset
  preset: 'youtube',               // youtube, twitter, instagram, tiktok, gif
  
  // Zoom settings
  zoomMode: 'smart',               // none, basic, smart, follow
  followIntensity: 0.5,            // 0-1, for follow mode
  maxZoom: 2.0,
  minZoom: 1.0,
  zoomOnClicks: true,
  zoomOnHover: true,
  zoomSpeed: 'medium',             // slow, medium, fast
  
  // Cursor settings
  cursorStyle: 'default',          // default, arrow-modern, pointer, dot, circle, crosshair, spotlight, none
  cursorSize: 32,
  cursorColor: '#000000',
  cursorPreset: null,              // light, dark, blue, github, figma, notion, etc.
  cursorGlow: false,
  
  // Click effects
  clickEffect: 'ripple',           // ripple, pulse, ring, spotlight, none
  clickEffectColor: '#3B82F6',
  clickEffectSize: 60,
  clickEffectDuration: 400,        // ms
  
  // Preview only
  dryRun: false
});

console.log('Video created:', result.output);
```

### `generateDemoV2(url, options)`

Use the V2 engine for more reliable recording. Same options as `generateDemo`.

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://myapp.com', {
  output: './demo.mp4',
  duration: 30
});
```

### `generateMobileDemo(app, options)`

Generate mobile app demos using Appium.

```javascript
import { generateMobileDemo } from 'look-demo';

await generateMobileDemo('./MyApp.app', {
  // Output settings
  output: './mobile-demo.mp4',
  duration: 25,
  
  // Platform settings
  platform: 'ios',                 // ios, android
  device: 'iPhone 15 Pro',
  orientation: 'portrait',         // portrait, landscape
  
  // Touch effects
  touchIndicator: 'circle',        // circle, finger, ripple, dot
  touchColor: 'rgba(255,255,255,0.8)',
  touchSize: 80,
  showSwipeTrail: true,
  
  // Device frame
  addDeviceFrame: true,
  frameStyle: 'modern',            // modern, minimal
  
  // AI settings
  voice: 'nova',
  style: 'professional',
  skipVoice: false,
  
  // Actions script
  actionsScript: './actions.json',
  
  dryRun: false
});
```

## Project Management

### `Project` Class

Manage saved projects programmatically.

```javascript
import { Project } from 'look-demo';

// List all projects
const projects = await Project.list();
console.log(projects);

// Load a specific project
const project = await Project.load('abc12345');
console.log(project.name, project.url);

// Create a new project
const newProject = await Project.create({
  name: 'My Demo',
  url: 'https://myapp.com'
});
console.log('Created:', newProject.id);

// Update project
project.name = 'Updated Name';
await project.save();

// Delete project
await project.delete();
```

## Individual Components

### AI Analysis

```javascript
import { analyzeWebsite, generateScript, generateVoiceover } from 'look-demo/v2/ai';

// Analyze a website screenshot
const analysis = await analyzeWebsite(screenshotBase64, {
  title: 'My App',
  description: 'A cool app',
  url: 'https://myapp.com'
});

console.log(analysis.name);        // Detected product name
console.log(analysis.tagline);     // Detected tagline
console.log(analysis.features);    // Key features
console.log(analysis.cta);         // Call to action

// Generate voiceover script
const script = await generateScript(analysis, {
  duration: 25,
  style: 'professional'
});

// Generate audio
const audioPath = await generateVoiceover(script, {
  voice: 'nova'
});
```

### Auto Zoom

```javascript
import { AutoZoom } from 'look-demo/v2/auto-zoom';

const autoZoom = new AutoZoom({
  minZoom: 1.0,
  maxZoom: 2.0,
  defaultZoom: 1.3,
  zoomDuration: 800,       // ms
  holdDuration: 1500,      // ms
  zoomMode: 'smart',       // none, basic, smart, follow
  followIntensity: 0.5,
  deadzone: 0.2
});

// Generate zoom keyframes from cursor data
const keyframes = autoZoom.generateFromCursor(cursorData, 1920, 1080);

// For follow-cam mode
const followKeyframes = autoZoom.generateFollowZoom(cursorData, 1920, 1080, {
  followIntensity: 0.7
});
```

### Cursor Rendering

```javascript
import { CursorRenderer, getCursorPreset } from 'look-demo/v2/cursor-renderer';

// Get a preset
const preset = getCursorPreset('github');
// { color: '#24292f', outlineColor: '#ffffff', ... }

const cursor = new CursorRenderer({
  style: 'arrow-modern',   // default, arrow-modern, pointer, dot, circle, crosshair, spotlight
  size: 32,
  color: '#000000',
  outlineColor: '#ffffff',
  shadowBlur: 6,
  glow: true,
  glowIntensity: 0.5,
  trail: false,
  trailLength: 5
});

// Generate cursor image
const cursorPath = await cursor.generateCursorImage('./temp');
const clickCursorPath = await cursor.generateCursorImage('./temp', true);
```

### Click Effects

```javascript
import { ClickEffectRenderer } from 'look-demo/v2/click-effects';

const clickEffect = new ClickEffectRenderer({
  effect: 'ripple',        // ripple, pulse, ring, spotlight
  color: '#3B82F6',
  size: 60,
  duration: 400,           // ms
  opacity: 0.6
});

// Generate FFmpeg filter for click effects
const clicks = [
  { x: 500, y: 300, t: 1000 },
  { x: 800, y: 450, t: 3500 }
];
const filter = clickEffect.generateSimpleFilter(clicks, 60);
```

### Post Processing

```javascript
import { postProcess, combineVideoAudio, exportWithPreset } from 'look-demo/v2/post-process';

// Apply post-processing effects
await postProcess(inputPath, outputPath, {
  colorGrade: true,
  vignette: true,
  motionBlur: false
});

// Combine video with audio
await combineVideoAudio(videoPath, audioPath, outputPath);

// Export with preset
await exportWithPreset(inputPath, outputPath, 'twitter');
```

## Server API

The web editor exposes a REST API.

### Starting the Server

```javascript
import { startServer } from 'look-demo/v2/server';

const { url, port } = await startServer({
  port: 3847,
  openBrowser: false
});

console.log(`Server running at ${url}`);
```

### REST Endpoints

#### Projects

```http
GET /api/projects
```
List all projects.

```http
GET /api/projects/:id
```
Get project details.

```http
POST /api/projects
Content-Type: application/json

{
  "name": "My Demo",
  "url": "https://myapp.com"
}
```
Create a new project.

```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Name"
}
```
Update a project.

```http
DELETE /api/projects/:id
```
Delete a project.

#### Rendering

```http
POST /api/render
Content-Type: application/json

{
  "projectId": "abc12345",
  "options": {
    "preset": "youtube",
    "quality": "high"
  }
}
```
Start a render job.

```http
GET /api/render/:jobId/status
```
Check render status.

```http
GET /api/render/:jobId/download
```
Download rendered video.

## Error Handling

```javascript
import { generateDemo } from 'look-demo';

try {
  await generateDemo('https://myapp.com', options);
} catch (error) {
  if (error.message.includes('FFmpeg')) {
    console.error('FFmpeg not installed');
  } else if (error.message.includes('OpenAI')) {
    console.error('OpenAI API error:', error.message);
  } else if (error.message.includes('Playwright')) {
    console.error('Browser error:', error.message);
  } else {
    console.error('Error:', error.message);
  }
}
```

## TypeScript Support

LooK includes TypeScript definitions:

```typescript
import { 
  generateDemo, 
  GenerateDemoOptions,
  Project,
  AutoZoom,
  CursorRenderer 
} from 'look-demo';

const options: GenerateDemoOptions = {
  output: './demo.mp4',
  duration: 30,
  voice: 'nova',
  zoomMode: 'smart'
};

await generateDemo('https://myapp.com', options);
```

## Examples

See the [examples/](../examples/) directory for complete examples:

- [Basic Demo](../examples/basic/) - Simple one-liner
- [SaaS Landing](../examples/saas-landing/) - Configuration-based
- [Mobile App](../examples/mobile-app/) - Mobile demo
- [Batch Processing](../examples/batch/) - Multiple demos
- [Custom Cursor](../examples/custom-cursor/) - Custom implementation
