# Architecture: Intelligent Site Exploration

This document describes the architecture of LooK's intelligent site exploration system.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Demo Orchestrator                             │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      Pipeline Coordinator                        ││
│  │  explore() → plan() → execute() → finalize()                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   State     │  │  Element    │  │ Navigation  │  │  Content    │ │
│  │  Detector   │  │  Discovery  │  │    Graph    │  │  Analyzer   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                │                │         │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │
│  │                      Demo Engine                                │ │
│  │  Browser Control │ Cursor Tracking │ Recording │ FFmpeg        │ │
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────┐
                        │    Playwright   │
                        │     Browser     │
                        └─────────────────┘
```

## Component Architecture

### 1. Demo Orchestrator

The central coordinator that manages the entire demo generation pipeline.

```
DemoOrchestrator
├── explore(url)         # Phase 1: Site exploration
├── plan()               # Phase 2: Demo planning
├── execute()            # Phase 3: Demo execution
└── finalize()           # Phase 4: Video finalization

Dependencies:
├── StateDetector
├── ElementDiscovery
├── NavigationGraph
├── ContentAnalyzer
├── DemoEngine
├── DemoPlan
├── PacingController
├── ErrorRecovery
└── TransitionManager
```

### 2. State Detector

Understands and tracks UI state.

```
StateDetector
├── detectCurrentState()
│   ├── Check for modals
│   ├── Check for loading indicators
│   ├── Check for cookie banners
│   └── Return UIState
│
├── dismissBlockingElements()
│   ├── Find all blocking elements
│   ├── Try dismiss strategies:
│   │   ├── Click close button
│   │   ├── Click backdrop
│   │   └── Press Escape
│   └── Verify dismissed
│
└── waitForContentReady()
    ├── Wait for network idle
    ├── Wait for loading indicators gone
    └── Wait for DOM stable
```

### 3. Element Discovery

Finds and categorizes interactive elements.

```
ElementDiscovery
├── discoverAll()
│   ├── findTabs()
│   │   └── Match TAB_PATTERNS
│   ├── findAccordions()
│   │   └── Match ACCORDION_PATTERNS
│   ├── findDropdowns()
│   │   └── Match DROPDOWN_PATTERNS
│   ├── findCarousels()
│   │   └── Match CAROUSEL_PATTERNS
│   └── findHoverElements()
│       └── Check hover states/tooltips
│
└── rankByDemoValue()
    ├── Calculate base score
    ├── Apply positive modifiers
    ├── Apply negative modifiers
    └── Sort by score
```

### 4. Navigation Graph

Maps website structure.

```
NavigationGraph
├── Nodes (Pages)
│   ├── id: unique identifier
│   ├── url: page URL
│   ├── stateHash: for SPA detection
│   ├── children: linked pages
│   └── unexploredLinks: links not clicked
│
├── Edges (Transitions)
│   ├── from: source node
│   ├── to: target node
│   └── via: link used
│
└── Operations
    ├── addNode/addEdge
    ├── getPath(from, to)
    ├── bfs/dfs traversal
    └── findBestNextNode (AI)
```

### 5. Content Analyzer

Semantic understanding of page content.

```
ContentAnalyzer
├── analyzeStructure()
│   ├── Take screenshot
│   ├── Send to GPT-4o Vision
│   ├── Parse sections:
│   │   ├── hero
│   │   ├── features
│   │   ├── pricing
│   │   ├── testimonials
│   │   └── cta
│   └── Return PageContent
│
├── extractProductStory()
│   └── Identify problem → solution → features → CTA
│
└── findDemoMoments()
    └── Identify animations, interactions
```

## Data Flow

### Demo Generation Pipeline

```
1. EXPLORE
   ┌───────────────────────────────────────────────────┐
   │ URL → StateDetector.init()                        │
   │    → dismissBlockingElements()                    │
   │    → NavigationGraph.explore()                    │
   │       ├── Visit page                              │
   │       ├── ElementDiscovery.discoverAll()          │
   │       ├── ContentAnalyzer.analyzeStructure()      │
   │       ├── ExplorationStrategy.selectNextAction()  │
   │       └── Repeat for each page                    │
   └───────────────────────────────────────────────────┘
                          │
                          ▼
2. PLAN
   ┌───────────────────────────────────────────────────┐
   │ NavigationGraph + Analyses → DemoPlan             │
   │    ├── optimizeOrder()                            │
   │    ├── allocateTime()                             │
   │    ├── Generate timeline                          │
   │    └── Generate narrative                         │
   └───────────────────────────────────────────────────┘
                          │
                          ▼
3. EXECUTE
   ┌───────────────────────────────────────────────────┐
   │ DemoPlan → DemoEngine.startRecording()            │
   │    FOR each page in plan:                         │
   │       ├── TransitionManager.transitionToPage()    │
   │       ├── FOR each action in timeline:            │
   │       │   ├── PacingController.getAdjustedDuration│
   │       │   ├── Execute action (scroll/click/hover) │
   │       │   ├── ErrorRecovery if needed             │
   │       │   └── Update pacing                       │
   │       └── TransitionManager.transitionToSection() │
   │    DemoEngine.stopRecording()                     │
   └───────────────────────────────────────────────────┘
                          │
                          ▼
4. FINALIZE
   ┌───────────────────────────────────────────────────┐
   │ Raw recording → Post-processing                   │
   │    ├── Add cursor overlay                         │
   │    ├── Add click effects                          │
   │    ├── Generate voiceover (TTS)                   │
   │    ├── Mix audio                                  │
   │    └── Export final video                         │
   └───────────────────────────────────────────────────┘
```

### State Detection Flow

```
Page Load
    │
    ▼
detectCurrentState()
    │
    ├─── Normal ──────────────────────────► Continue demo
    │
    ├─── Modal ───────► dismissBlockingElements()
    │                        │
    │                        ├─── Success ──► Continue demo
    │                        │
    │                        └─── Failed ───► Skip/Fallback
    │
    ├─── Loading ─────► waitForContentReady()
    │                        │
    │                        └─── Ready ────► Continue demo
    │
    └─── Cookie ──────► acceptCookies()
                             │
                             └─── Accepted ─► Continue demo
```

### Element Discovery Flow

```
discoverAll()
    │
    ├── Query DOM for patterns
    │   ├── Tab patterns
    │   ├── Accordion patterns
    │   ├── Dropdown patterns
    │   ├── Carousel patterns
    │   └── Hover elements
    │
    ├── Create InteractiveElement objects
    │   ├── Extract position
    │   ├── Extract text
    │   └── Determine visibility
    │
    ├── Calculate demo scores
    │   ├── Type bonus (tabs +20, carousel +15)
    │   ├── Text analysis (feature +15, demo +15)
    │   ├── Position (above fold +10)
    │   └── Penalties (login -30, legal -40)
    │
    └── Return sorted list
```

### Navigation Graph Flow

```
explore(startUrl)
    │
    ├── Create root node
    │
    ├── Visit page
    │   ├── Wait for content ready
    │   ├── Extract links
    │   └── Store in node.unexploredLinks
    │
    ├── While unexplored links exist:
    │   │
    │   ├── ExplorationStrategy.selectNextAction()
    │   │   │
    │   │   ├── 'click' ──► Click link
    │   │   │               ├── Create child node
    │   │   │               ├── Add edge
    │   │   │               ├── Recursively explore
    │   │   │               └── Navigate back
    │   │   │
    │   │   ├── 'back' ───► Navigate to parent
    │   │   │
    │   │   └── 'done' ───► Stop exploring this node
    │   │
    │   └── Mark link as explored
    │
    └── Return NavigationGraph
```

## Error Handling

### Error Classification

```
Error
  │
  ├── Navigation Failed
  │   └── Strategy: Reload page, retry
  │
  ├── Element Not Found
  │   └── Strategy: Find alternatives or skip
  │
  ├── Modal Blocked
  │   └── Strategy: Dismiss modal, retry
  │
  ├── Timeout
  │   └── Strategy: Skip action
  │
  └── Unknown
      └── Strategy: Log and skip
```

### Recovery Flow

```
Error occurs
    │
    ▼
ErrorRecovery.recover(error, context)
    │
    ├── Classify error
    │
    ├── Get strategy for error type
    │
    ├── Execute strategy (up to maxRetries)
    │   │
    │   ├── 'retry' ──► Return to action
    │   │
    │   ├── 'skip' ───► Continue to next action
    │   │
    │   └── 'abort' ──► Fallback demo
    │
    └── Return result
```

## AI Integration Points

### GPT-4o Vision (Content Analysis)

```
Screenshot (base64)
    │
    ▼
Compress to 1024px, JPEG 80%
    │
    ▼
OpenAI GPT-4o Chat Completion
    │
    ├── System prompt: Analysis instructions
    │
    └── User prompt: Image + context
    │
    ▼
Parse JSON response
    │
    ▼
PageContent object
```

### GPT-4o Mini (Decision Making)

```
Context (current state, options)
    │
    ▼
OpenAI GPT-4o-mini Chat Completion
    │
    ├── System: Decision criteria
    │
    └── User: Current situation + options
    │
    ▼
Parse JSON response
    │
    ▼
Action decision
```

### Groq (Script Generation)

```
Analysis results
    │
    ▼
Groq API (llama-3.3-70b)
    │
    ├── System: Script writing instructions
    │
    └── User: Product info + style + duration
    │
    ▼
Voiceover script text
```

## Performance Considerations

### Caching Strategy

```
┌─────────────────────────────────────────┐
│              Cache Layers               │
├─────────────────────────────────────────┤
│ L1: In-memory (current session)         │
│     - Page analyses                      │
│     - Element discoveries                │
│     - Navigation graph                   │
├─────────────────────────────────────────┤
│ L2: File-based (cross-session)          │
│     - Content fingerprints               │
│     - Deduplication hashes               │
└─────────────────────────────────────────┘
```

### API Call Optimization

```
┌─────────────────────────────────────────┐
│           API Call Strategy             │
├─────────────────────────────────────────┤
│ Vision (GPT-4o):                        │
│   - 1 call per page (expensive)         │
│   - Use 'low' detail when possible      │
│   - Compress images aggressively        │
├─────────────────────────────────────────┤
│ Decisions (GPT-4o-mini):                │
│   - Batch decisions when possible       │
│   - Use heuristics first, AI fallback   │
├─────────────────────────────────────────┤
│ Scripts (Groq):                         │
│   - 1 call per demo (free tier)         │
│   - Fall back to OpenAI if needed       │
└─────────────────────────────────────────┘
```

## File Structure

```
src/v2/
├── demo-orchestrator.js     # Main orchestrator
├── demo-plan.js             # Demo planning
├── pacing-controller.js     # Adaptive timing
├── error-recovery.js        # Error handling
├── transition-manager.js    # Page/section transitions
├── state-detector.js        # UI state detection
├── page-state-machine.js    # State machine
├── element-discovery.js     # Element discovery
├── navigation-graph.js      # Site graph
├── spa-detector.js          # SPA handling
├── exploration-strategy.js  # Navigation strategies
├── content-analyzer.js      # Content understanding
├── site-explorer.js         # (existing, enhanced)
├── demo-engine.js           # (existing, enhanced)
├── ai.js                    # (existing, enhanced)
└── interactions.js          # (existing, enhanced)

tests/
├── unit/
│   ├── state-detector.test.js
│   ├── element-discovery.test.js
│   ├── navigation-graph.test.js
│   ├── content-analyzer.test.js
│   └── demo-orchestrator.test.js
└── integration/
    └── full-demo.test.js
```

## Extension Points

### Custom Element Patterns

```javascript
// Add custom tab pattern
elementDiscovery.addPattern('tab', {
  container: '.my-tabs',
  tab: '.my-tab',
  panel: '.my-panel'
});
```

### Custom Exploration Strategy

```javascript
// Create custom strategy
class MyStrategy extends ExplorationStrategy {
  async selectNextAction(node, links) {
    // Custom logic
  }
}

orchestrator.setStrategy(new MyStrategy());
```

### Custom State Handlers

```javascript
// Add custom modal selector
stateDetector.addModalSelector('.my-custom-modal');

// Add custom dismiss method
stateDetector.addDismissMethod('my-modal', async (page, selector) => {
  await page.click(`${selector} .custom-close`);
});
```

### Custom Content Analyzers

```javascript
// Add custom section detector
contentAnalyzer.addSectionPattern('pricing-table', {
  selector: '.pricing-grid',
  type: 'pricing',
  demoScoreBonus: 20
});
```
