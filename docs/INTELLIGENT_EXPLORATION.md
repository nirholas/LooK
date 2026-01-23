# Intelligent Site Exploration

LooK v2.0 includes an intelligent site exploration system that uses AI to understand website structure, discover interactive elements, and create coherent multi-page demo videos.

## Overview

The intelligent exploration system consists of five integrated components:

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| [State Detector](#state-detector) | Understand UI state | Modal detection, loading states, cookie consent |
| [Element Discovery](#element-discovery) | Find interactive elements | Tabs, accordions, dropdowns, carousels |
| [Navigation Graph](#navigation-graph) | Map site structure | Page relationships, SPA support, sub-flows |
| [Content Analyzer](#content-analyzer) | Understand content | Product story, USPs, demo-worthy moments |
| [Demo Orchestrator](#demo-orchestrator) | Coordinate everything | Adaptive timing, error recovery, transitions |

## Quick Start

```javascript
import { DemoOrchestrator } from 'look/v2';

const orchestrator = new DemoOrchestrator({
  duration: 60,           // 60 second demo
  maxPages: 5,            // Visit up to 5 pages
  style: 'professional',  // Demo style
  focus: 'features'       // Emphasize features
});

const result = await orchestrator.generateDemo('https://example.com');
console.log(`Demo saved to: ${result.videoPath}`);
```

## State Detector

The State Detector understands the current UI state and handles dynamic elements.

### Features

- **Modal Detection**: Automatically detects and can dismiss modals, dialogs, and overlays
- **Cookie Consent**: Identifies and accepts cookie consent banners
- **Loading States**: Waits for spinners, skeletons, and progress indicators
- **Navigation Awareness**: Tracks page transitions and navigation state

### Usage

```javascript
import { StateDetector } from 'look/v2/state-detector';

const detector = new StateDetector(page);

// Detect current state
const state = await detector.detectCurrentState();
console.log(state.type); // 'normal' | 'modal' | 'loading' | 'error'

// Wait for page to be ready
await detector.waitForContentReady(5000);

// Dismiss blocking elements (modals, cookie banners)
await detector.dismissBlockingElements();

// Check if page is stable
const isStable = await detector.isPageStable();
```

### Modal Handling

The detector recognizes common modal patterns:

```javascript
// Automatically detected selectors
const MODAL_SELECTORS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  '.modal:visible',
  '[class*="popup"]',
  '[class*="overlay"]'
];

// Dismiss modals
await detector.dismissBlockingElements();
// Clicks: X button, Close button, backdrop, or Escape key
```

### Cookie Consent

```javascript
// Detects consent banners and accepts them
await detector.detectCookieConsent();
// Returns: { found: true, accepted: true }

// Or manually:
const hasCookieBanner = await detector.detectCookieConsent();
if (hasCookieBanner.found) {
  await detector.acceptCookies();
}
```

## Element Discovery

Discovers and categorizes all interactive elements on a page.

### Features

- **Tabs**: Tab interfaces with panels
- **Accordions**: Collapsible sections, FAQs
- **Dropdowns**: Menus, select alternatives
- **Carousels**: Image sliders, testimonial carousels
- **Hover Elements**: Tooltips, hover states
- **Demo Scoring**: Ranks elements by demo worthiness

### Usage

```javascript
import { ElementDiscovery } from 'look/v2/element-discovery';

const discovery = new ElementDiscovery(page);

// Discover all interactive elements
const elements = await discovery.discoverAll();

// Get specific types
const tabs = await discovery.findTabs();
const accordions = await discovery.findAccordions();
const carousels = await discovery.findCarousels();

// Get ranked list for demo
const demoElements = await discovery.rankByDemoValue(elements);
```

### Element Types

```javascript
// Each discovered element includes:
{
  type: 'tab',              // Element type
  selector: '.tab-item',    // CSS selector
  text: 'Features',         // Visible text
  position: { x, y, width, height },
  isVisible: true,          // Currently visible
  demoScore: 85,            // 0-100 demo value
  category: 'navigation',   // Element category
  children: [...]           // Child elements (for tabs/accordions)
}
```

### Tab Detection

```javascript
// Detected tab patterns:
[
  { container: '[role="tablist"]', tab: '[role="tab"]', panel: '[role="tabpanel"]' },
  { container: '.tabs', tab: '.tab', panel: '.tab-content' },
  { container: '[data-tabs]', tab: '[data-tab]', panel: '[data-tab-content]' }
]

// Demo tabs:
for (const tab of tabs) {
  await page.click(tab.selector);
  await page.waitForTimeout(1500); // Show content
}
```

### Accordion Detection

```javascript
// Detected accordion patterns:
[
  { trigger: '[aria-expanded]', content: '[aria-hidden]' },
  { trigger: '.accordion-header', content: '.accordion-content' },
  { trigger: 'summary', content: 'details > *:not(summary)' }
]

// Expand accordions:
for (const accordion of accordions) {
  if (!accordion.isExpanded) {
    await page.click(accordion.selector);
    await page.waitForTimeout(800);
  }
}
```

## Navigation Graph

Maps the complete structure of a website as a graph.

### Features

- **Graph Structure**: Pages as nodes, links as edges
- **Parent-Child Relationships**: Track navigation hierarchy
- **Sub-flow Exploration**: Click into detail pages, then return
- **SPA Support**: Handle apps where URLs don't change
- **Exploration Strategies**: Breadth-first, depth-first, AI-guided

### Usage

```javascript
import { NavigationGraph, SiteExplorer } from 'look/v2/navigation-graph';

const explorer = new SiteExplorer({
  maxPages: 8,
  maxDepth: 2,
  strategy: 'ai-guided'
});

// Explore the site
const graph = await explorer.explore('https://example.com');

// Query the graph
const root = graph.getRoot();
const children = graph.getChildren(root.id);
const unexplored = graph.getUnexploredNodes();

// Get path between pages
const path = graph.getPath(pageA.id, pageB.id);

// Export as visualization
const mermaid = graph.toMermaid();
```

### SPA Detection

```javascript
import { SPADetector } from 'look/v2/spa-detector';

const spaDetector = new SPADetector(page);

// Check if site is a SPA
const isSPA = await spaDetector.isSPA();

// Detect framework
const framework = await spaDetector.detectFramework();
// Returns: 'react' | 'vue' | 'angular' | 'svelte' | 'unknown'

// Track state changes (for SPAs)
const initialHash = await spaDetector.getStateHash();
await page.click('.nav-link');
const changed = await spaDetector.detectStateChange(initialHash);
```

### Exploration Strategies

```javascript
import { ExplorationStrategy } from 'look/v2/exploration-strategy';

const strategy = new ExplorationStrategy(graph, {
  maxDepth: 2,
  maxNodesPerLevel: 5
});

// Set strategy
strategy.setStrategy('ai-guided'); // Best for demos
strategy.setStrategy('breadth-first'); // Explore all top-level first
strategy.setStrategy('depth-first'); // Go deep into flows

// Add filters
strategy.addLinkFilter(ExplorationStrategy.skipAuthPages);
strategy.addLinkFilter(ExplorationStrategy.skipLegalPages);
strategy.addLinkFilter(ExplorationStrategy.skipExternalLinks);

// Get next action
const action = await strategy.selectNextAction(currentNode, availableLinks);
// Returns: { action: 'click', target: 'Features', reason: 'High demo value' }
```

## Content Analyzer

Uses AI vision to understand page content semantically.

### Features

- **Section Identification**: Hero, features, pricing, testimonials, footer
- **Product Story Extraction**: Problem → Solution → Features → CTA
- **USP Detection**: Unique selling points
- **Demo Moment Discovery**: Animations, interactions worth showing
- **Content Deduplication**: Skip repeated headers/footers

### Usage

```javascript
import { ContentAnalyzer } from 'look/v2/content-analyzer';

const analyzer = new ContentAnalyzer(page);

// Full page analysis
const content = await analyzer.analyzeStructure();

// Get product story
const story = await analyzer.extractProductStory();
console.log(story.problem);   // "Teams struggle with..."
console.log(story.solution);  // "Our platform enables..."

// Find demo-worthy moments
const moments = await analyzer.findDemoMoments();
// [{ type: 'animation', location: {...}, trigger: 'scroll' }]

// Get section rankings
const rankedSections = await analyzer.scoreContentSections();
```

### Section Types

```javascript
// Content sections include:
{
  id: 'section-1',
  type: 'hero',              // hero | features | pricing | testimonials | cta | footer
  bounds: { x, y, width, height },
  headline: 'Build faster',
  subheadline: 'Ship products in half the time',
  demoScore: 90,
  suggestedDuration: 8,      // Seconds to spend here
  skipReason: null           // Non-null if should skip
}
```

### Content Deduplication

```javascript
import { ContentDeduplicator } from 'look/v2/content-analyzer';

const dedup = new ContentDeduplicator();

// After visiting multiple pages:
for (const section of page2Sections) {
  const isRepeat = await dedup.isRepetitive(section.fingerprint);
  if (isRepeat) {
    section.skipReason = 'Seen on previous page';
  }
}

// Get only unique content
const uniqueSections = await dedup.getUniqueContent(allSections);
```

## Demo Orchestrator

The master coordinator that brings everything together.

### Features

- **Pipeline Orchestration**: Explore → Plan → Execute → Finalize
- **Adaptive Timing**: Adjust duration based on content
- **Error Recovery**: Graceful handling of failures
- **Smooth Transitions**: Professional page/section transitions
- **Fallback Mode**: Simple demo if intelligence fails

### Usage

```javascript
import { DemoOrchestrator } from 'look/v2/demo-orchestrator';

const orchestrator = new DemoOrchestrator({
  duration: 60,
  maxPages: 5,
  style: 'professional',
  focus: 'features',
  adaptiveTiming: true,
  errorRecovery: true
});

// Generate demo
const result = await orchestrator.generateDemo('https://example.com');

// Result includes:
{
  success: true,
  videoPath: '/path/to/demo.mp4',
  plan: DemoPlan,
  graph: NavigationGraph,
  duration: 58.5
}
```

### Demo Planning

```javascript
import { DemoPlan } from 'look/v2/demo-plan';

// Create optimized plan
const plan = await DemoPlan.create(graph, analyses, {
  totalDuration: 60,
  focus: 'features'
});

// Plan includes:
{
  pages: [
    { url, duration, timeline, transitionMethod }
  ],
  narrative: 'Full voiceover script...',
  totalDuration: 60
}
```

### Adaptive Timing

```javascript
import { PacingController } from 'look/v2/pacing-controller';

const pacing = new PacingController(plan);

// During execution:
for (const action of timeline) {
  const duration = pacing.getAdjustedDuration(action);
  await executeAction(action, duration);
  pacing.update(action);
  
  // Check pacing
  if (pacing.shouldSpeedUp()) {
    console.log('Behind schedule, speeding up');
  }
}
```

### Error Recovery

```javascript
import { ErrorRecovery } from 'look/v2/error-recovery';

const recovery = new ErrorRecovery(orchestrator);

try {
  await page.click('.missing-element');
} catch (error) {
  const result = await recovery.recover(error, context);
  
  switch (result.action) {
    case 'retry': // Try the action again
      break;
    case 'skip': // Skip this action, continue
      break;
    case 'fallback': // Fall back to simple demo
      break;
  }
}
```

### Transitions

```javascript
import { TransitionManager } from 'look/v2/transition-manager';

const transitions = new TransitionManager(page, cursorTracker);

// Page transition
await transitions.transitionToPage(currentUrl, newUrl, 'click');

// Section transition
await transitions.transitionToSection(section, 800);

// Effects
await transitions.dramaticPause(500);
await transitions.highlightArea(bounds, 1000);
```

## Configuration Options

### Global Options

```javascript
const options = {
  // Timing
  duration: 60,              // Target duration (seconds)
  minSectionTime: 3,         // Minimum time per section
  maxSectionTime: 15,        // Maximum time per section
  
  // Exploration
  maxPages: 5,               // Maximum pages to visit
  maxDepth: 2,               // Maximum navigation depth
  strategy: 'ai-guided',     // Exploration strategy
  
  // Style
  style: 'professional',     // professional | casual | energetic | minimal
  focus: 'features',         // features | pricing | overview | technical
  
  // Behavior
  adaptiveTiming: true,      // Adjust timing dynamically
  errorRecovery: true,       // Attempt error recovery
  dismissModals: true,       // Auto-dismiss modals
  acceptCookies: true,       // Auto-accept cookie banners
  
  // Voiceover
  narrativeMode: 'auto',     // auto | scripted | silent
  voice: 'nova',             // TTS voice
  voiceSpeed: 1.0            // Speech speed
};
```

### Filter Options

```javascript
// Skip certain types of pages/elements
const filters = {
  skipPatterns: [
    /login/i,
    /signup/i,
    /privacy/i,
    /terms/i,
    /careers/i
  ],
  skipSelectors: [
    '.login-button',
    '[data-testid="auth-modal"]'
  ],
  requirePatterns: [
    /feature/i,
    /pricing/i
  ]
};
```

## Best Practices

### 1. Start Simple

```javascript
// Start with basic options
const result = await orchestrator.generateDemo(url);

// Then customize based on results
const result2 = await orchestrator.generateDemo(url, {
  duration: 45,  // Shorter
  focus: 'pricing'  // Different focus
});
```

### 2. Handle Complex Sites

```javascript
// For complex sites, increase timeouts
const orchestrator = new DemoOrchestrator({
  stateDetector: {
    loadingTimeout: 10000,
    stabilityDelay: 2000
  }
});
```

### 3. Review Plans Before Execution

```javascript
// Generate plan without executing
const plan = await orchestrator.plan(url);
console.log(plan.pages.map(p => p.url));

// Modify if needed
plan.pages = plan.pages.filter(p => !p.url.includes('blog'));

// Then execute
const result = await orchestrator.execute(plan);
```

### 4. Graceful Degradation

```javascript
const result = await orchestrator.generateDemo(url);

if (!result.success) {
  // Fallback was used - may need manual intervention
  console.log('Intelligent demo failed, using simple demo');
  console.log('Errors:', result.errors);
}
```

## Troubleshooting

### Modal Not Detected

```javascript
// Add custom modal selector
detector.addModalSelector('.my-custom-modal');

// Or dismiss manually
await page.click('.modal-close');
```

### Elements Not Found

```javascript
// Wait longer for dynamic content
await detector.waitForContentReady(10000);

// Or discover after specific interaction
await page.click('.load-more');
await discovery.discoverInViewport();
```

### SPA Not Detected

```javascript
// Force SPA mode
explorer.forceSPAMode(true);

// Or provide hash function
spaDetector.setStateHashFunction(async (page) => {
  return await page.evaluate(() => window.__APP_STATE__);
});
```

### Timing Issues

```javascript
// Disable adaptive timing for predictable results
const orchestrator = new DemoOrchestrator({
  adaptiveTiming: false
});

// Or set explicit durations
plan.pages.forEach(p => p.duration = 10);
```
