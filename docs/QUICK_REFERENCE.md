# Quick Reference: Intelligent Site Exploration

## Quick Start

```javascript
import { DemoOrchestrator } from './src/v2/demo-orchestrator.js';

const demo = new DemoOrchestrator();
await demo.generateDemo('https://example.com', {
  maxPages: 10,
  maxDuration: 90
});
```

## Common Patterns

### State Detection

```javascript
import { StateDetector } from './src/v2/state-detector.js';

const detector = new StateDetector(page);
const state = await detector.detectCurrentState();

if (state.modals.length > 0) {
  await detector.dismissBlockingElements();
}

await detector.waitForContentReady();
```

### Element Discovery

```javascript
import { ElementDiscovery } from './src/v2/element-discovery.js';

const discovery = new ElementDiscovery(page);
const elements = await discovery.discoverAll();

// Get top elements for demo
const top5 = elements.slice(0, 5);

// Interact with a tab group
const tabs = await discovery.findTabs();
for (const tab of tabs[0].items) {
  await discovery.activateTab(tab);
  await page.waitForTimeout(1000);
}
```

### Navigation

```javascript
import { NavigationGraph } from './src/v2/navigation-graph.js';

const graph = new NavigationGraph();
await graph.explore(page, 'https://example.com', {
  maxDepth: 3,
  maxPages: 15
});

// Get demo order
const visitOrder = graph.getDemoOrder();
```

### Content Analysis

```javascript
import { ContentAnalyzer } from './src/v2/content-analyzer.js';

const analyzer = new ContentAnalyzer(page, openaiClient);
const content = await analyzer.analyzeStructure();

console.log(content.sections);
console.log(content.productStory);
console.log(content.demoMoments);
```

## Configuration Cheatsheet

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxPages` | number | 10 | Max pages to explore |
| `maxDepth` | number | 3 | Max link depth |
| `maxDuration` | number | 60 | Target video length (seconds) |
| `exploration.strategy` | string | 'bfs' | 'bfs', 'dfs', 'ai' |
| `elements.types` | array | all | Which element types to find |
| `state.dismissCookies` | boolean | true | Auto-dismiss cookie banners |
| `state.dismissModals` | boolean | true | Auto-dismiss modals |
| `pacing.baseMultiplier` | number | 1.0 | Speed adjustment |
| `transitions.type` | string | 'smooth' | Transition style |

## Element Selectors

### Tabs
```javascript
// Container selectors
'.tabs', '[role="tablist"]', '.nav-tabs'

// Tab selectors
'[role="tab"]', '.tab-item', '.nav-link'

// Panel selectors
'[role="tabpanel"]', '.tab-pane', '.tab-content > *'
```

### Accordions
```javascript
// Container selectors
'.accordion', '[data-accordion]', '.faq'

// Trigger selectors
'.accordion-header', '.accordion-button', 'details > summary'

// Content selectors
'.accordion-body', '.accordion-content', 'details > *:not(summary)'
```

### Dropdowns
```javascript
// Trigger selectors
'.dropdown-toggle', '[data-toggle="dropdown"]', 'select'

// Menu selectors
'.dropdown-menu', '.dropdown-content', '.select-options'
```

### Carousels
```javascript
// Container selectors
'.carousel', '.slider', '.swiper'

// Navigation selectors
'.carousel-control-prev', '.carousel-control-next'
'.slick-prev', '.slick-next'
'.swiper-button-prev', '.swiper-button-next'

// Indicator selectors
'.carousel-indicators button', '.slick-dots li', '.swiper-pagination-bullet'
```

## State Detection Patterns

### Modal Detection
```javascript
// Common modal selectors
'[role="dialog"]', '.modal.show', '.modal.open'
'.overlay.active', '.popup.visible', '.lightbox:not(.hidden)'
```

### Cookie Banner Detection
```javascript
// Common cookie selectors
'#cookie-banner', '.cookie-consent', '[class*="cookie"]'
'#gdpr-banner', '.privacy-notice', '.consent-popup'
```

### Loading Detection
```javascript
// Common loading selectors
'.loading', '.spinner', '[class*="loading"]'
'.skeleton', '[aria-busy="true"]', '.progress:not([value="100"])'
```

## Demo Score Calculation

```javascript
// Base scores by element type
const BASE_SCORES = {
  tab: 25,
  accordion: 20,
  carousel: 25,
  dropdown: 15,
  hover: 10
};

// Positive modifiers
+15: Contains "feature" text
+15: Contains "demo" text
+10: Above the fold
+20: Large visible area
+10: Multiple items

// Negative modifiers
-30: Contains "login" or "sign in"
-25: Contains "subscribe" or "newsletter"
-40: Contains "legal" or "terms"
-20: Very small size
-15: In footer area
```

## AI Prompt Templates

### Content Analysis Prompt
```
Analyze this webpage screenshot and identify:
1. Page type (landing, features, pricing, about, etc.)
2. Main sections with their content
3. Key interactive elements
4. Call-to-action elements
5. Unique selling propositions

Return as JSON with sections, usps, demoMoments arrays.
```

### Navigation Decision Prompt
```
Given this page with links: [links]
Current exploration depth: [depth]
Pages visited: [count]
Site purpose: [purpose]

Which link should be explored next for best demo value?
Consider: relevance, content uniqueness, visual interest.

Return: { action: 'click', link: '...', reason: '...' }
```

### Script Generation Prompt
```
Create a voiceover script for a demo video of [product].

Content discovered:
- USPs: [usps]
- Features: [features]
- Target audience: [audience]

Style: [professional/casual/energetic]
Duration: [duration] seconds

Focus on benefits, not technical details.
```

## Error Handling

### Navigation Errors
```javascript
try {
  await page.goto(url);
} catch (e) {
  if (e.name === 'TimeoutError') {
    await page.reload();
    await page.goto(url, { timeout: 60000 });
  }
}
```

### Element Not Found
```javascript
const element = await page.$('.target');
if (!element) {
  // Try alternatives
  const alt = await page.$('[data-target]');
  if (!alt) {
    // Skip this action
    return { skipped: true, reason: 'element_not_found' };
  }
}
```

### Modal Blocking
```javascript
const clicked = await page.click('.action-button').catch(() => false);
if (!clicked) {
  const state = await detector.detectCurrentState();
  if (state.modals.length > 0) {
    await detector.dismissBlockingElements();
    await page.click('.action-button');
  }
}
```

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/state-detector.test.js

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Debugging

### Enable Verbose Logging
```bash
DEBUG=look:* npm run demo
```

### Save Exploration State
```javascript
orchestrator.on('pageExplored', (data) => {
  fs.writeFileSync('debug/exploration.json', JSON.stringify(data));
});
```

### Screenshot on Error
```javascript
orchestrator.on('error', async (error, context) => {
  await page.screenshot({ path: `debug/error-${Date.now()}.png` });
});
```

## File Locations

| Component | File |
|-----------|------|
| Orchestrator | `src/v2/demo-orchestrator.js` |
| Intelligent Orchestrator | `src/v2/intelligent-orchestrator.js` |
| State Detection | `src/v2/state-detector.js` |
| Element Discovery | `src/v2/element-discovery.js` |
| Navigation Graph | `src/v2/navigation-graph.js` |
| Content Analyzer | `src/v2/content-analyzer.js` |
| Demo Engine | `src/v2/demo-engine.js` |
| Product Intelligence | `src/v2/product-intelligence.js` |
| Workflow Detector | `src/v2/workflow-detector.js` |
| Visual Moments | `src/v2/visual-moments.js` |
| Smart Composer | `src/v2/smart-composer.js` |
| Quality Scorer | `src/v2/quality-scorer.js` |
| Voice Enhancer | `src/v2/voice-enhancer.js` |
| Smart Pacing | `src/v2/smart-pacing.js` |
| AI Integration | `src/v2/ai.js` |
| Interactions | `src/v2/interactions.js` |

## Enterprise Modules

| Module | File | Description |
|--------|------|-------------|
| GIF Export | `src/v2/gif-export.js` | Video to GIF conversion |
| Auto Thumbnail | `src/v2/auto-thumbnail.js` | AI frame selection |
| Animated Captions | `src/v2/animated-captions.js` | Karaoke/pop subtitles |
| Lower Thirds | `src/v2/lower-thirds.js` | Name/title overlays |
| Keyboard Visualizer | `src/v2/keyboard-visualizer.js` | Shortcut display |
| Callout Annotations | `src/v2/callout-annotations.js` | Arrows, badges, boxes |
| Spotlight | `src/v2/spotlight.js` | Focus effects |
| Scene Transitions | `src/v2/scene-transitions.js` | Fade, blur, slide |
| Watermark | `src/v2/watermark.js` | Text/logo overlays |
| Progress Bar | `src/v2/progress-bar.js` | Timeline indicator |
| Intro/Outro | `src/v2/intro-outro.js` | Branded cards |
| Focus Effects | `src/v2/focus-effects.js` | Glow, arrows |

## CLI Commands Quick Reference

```bash
# Core Commands
look demo <url>          # Full AI demo
look quick <url>         # Smart defaults
look mobile <app>        # Mobile app demo
look repo <url>          # Terminal demo
look serve               # Web editor
look walkthrough <url>   # Multi-page exploration

# Post-Production
look gif <video>         # Export as GIF
look thumbnail <video>   # Generate thumbnail
look overlay <video>     # Add overlays
look captions <video>    # Add captions

# Management
look projects            # List projects
look edit [id]           # Open in editor
look batch --config      # Batch process

# Testing
look test                # Verify setup
look test --full         # Full pipeline test
look mobile-test         # Mobile prerequisites
look devices             # List device frames
```
