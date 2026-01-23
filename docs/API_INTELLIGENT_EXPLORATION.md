# API Reference: Intelligent Site Exploration

Complete API reference for LooK's intelligent site exploration system.

## StateDetector

Detects and tracks UI state changes on a webpage.

### Constructor

```javascript
new StateDetector(page: Page)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `Page` | Playwright page instance |

### Methods

#### detectCurrentState()

Analyzes the current UI state.

```javascript
async detectCurrentState(): Promise<UIState>
```

**Returns:** `UIState`
```typescript
interface UIState {
  type: 'normal' | 'modal' | 'loading' | 'error' | 'blocked';
  elements: BlockingElement[];
  isBlocking: boolean;
  timestamp: number;
}

interface BlockingElement {
  type: 'modal' | 'cookie' | 'overlay' | 'popup';
  selector: string;
  dismissible: boolean;
  dismissMethod: 'click' | 'escape' | 'backdrop' | null;
}
```

#### waitForStateChange()

Waits for any UI state change.

```javascript
async waitForStateChange(timeout?: number): Promise<StateChange>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | `number` | `5000` | Maximum wait time (ms) |

**Returns:** `StateChange`
```typescript
interface StateChange {
  from: UIState;
  to: UIState;
  trigger: 'navigation' | 'modal' | 'content' | 'unknown';
}
```

#### isPageStable()

Checks if the page has settled (no pending requests, animations complete).

```javascript
async isPageStable(): Promise<boolean>
```

#### detectModals()

Finds all visible modals, dialogs, and overlays.

```javascript
async detectModals(): Promise<ModalInfo[]>
```

**Returns:** `ModalInfo[]`
```typescript
interface ModalInfo {
  selector: string;
  type: 'dialog' | 'alert' | 'overlay' | 'popup';
  hasCloseButton: boolean;
  closeButtonSelector: string | null;
  isBlocking: boolean;
}
```

#### detectCookieConsent()

Specifically identifies cookie consent banners.

```javascript
async detectCookieConsent(): Promise<CookieConsentInfo>
```

**Returns:** `CookieConsentInfo`
```typescript
interface CookieConsentInfo {
  found: boolean;
  selector: string | null;
  acceptButton: string | null;
  rejectButton: string | null;
}
```

#### dismissBlockingElements()

Attempts to close all blocking elements (modals, cookies, overlays).

```javascript
async dismissBlockingElements(): Promise<DismissResult>
```

**Returns:** `DismissResult`
```typescript
interface DismissResult {
  dismissed: number;
  failed: number;
  errors: Error[];
}
```

#### isLoading()

Checks for loading indicators (spinners, skeletons, progress bars).

```javascript
async isLoading(): Promise<boolean>
```

#### waitForContentReady()

Waits for dynamic content to finish loading.

```javascript
async waitForContentReady(timeout?: number): Promise<void>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | `number` | `10000` | Maximum wait time (ms) |

**Throws:** `TimeoutError` if content doesn't load within timeout.

---

## ElementDiscovery

Discovers and categorizes all interactive elements on a page.

### Constructor

```javascript
new ElementDiscovery(page: Page)
```

### Methods

#### discoverAll()

Discovers all interactive elements on the page.

```javascript
async discoverAll(): Promise<InteractiveElement[]>
```

**Returns:** `InteractiveElement[]`
```typescript
interface InteractiveElement {
  type: ElementType;
  selector: string;
  text: string;
  position: BoundingBox;
  isVisible: boolean;
  revealedBy: RevealTrigger | null;
  demoScore: number;
  category: ElementCategory;
  children: InteractiveElement[];
}

type ElementType = 'tab' | 'accordion' | 'dropdown' | 'carousel' | 
                   'button' | 'link' | 'form' | 'hover';

type ElementCategory = 'navigation' | 'action' | 'content' | 'feature';

interface RevealTrigger {
  type: 'click' | 'hover' | 'scroll';
  selector: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### discoverInViewport()

Discovers only currently visible elements.

```javascript
async discoverInViewport(): Promise<InteractiveElement[]>
```

#### findTabs()

Finds tab interfaces.

```javascript
async findTabs(): Promise<TabGroup[]>
```

**Returns:** `TabGroup[]`
```typescript
interface TabGroup {
  containerSelector: string;
  tabs: TabInfo[];
  activeTab: number;
}

interface TabInfo {
  selector: string;
  text: string;
  panelSelector: string;
  isActive: boolean;
}
```

#### findAccordions()

Finds collapsible sections.

```javascript
async findAccordions(): Promise<AccordionInfo[]>
```

**Returns:** `AccordionInfo[]`
```typescript
interface AccordionInfo {
  triggerSelector: string;
  contentSelector: string;
  text: string;
  isExpanded: boolean;
  demoScore: number;
}
```

#### findDropdowns()

Finds dropdown menus.

```javascript
async findDropdowns(): Promise<DropdownInfo[]>
```

**Returns:** `DropdownInfo[]`
```typescript
interface DropdownInfo {
  triggerSelector: string;
  menuSelector: string;
  text: string;
  isOpen: boolean;
  options: string[];
}
```

#### findCarousels()

Finds image sliders and carousels.

```javascript
async findCarousels(): Promise<CarouselInfo[]>
```

**Returns:** `CarouselInfo[]`
```typescript
interface CarouselInfo {
  containerSelector: string;
  slideCount: number;
  currentSlide: number;
  nextButton: string | null;
  prevButton: string | null;
  dots: string | null;
  autoPlay: boolean;
}
```

#### findHoverElements()

Finds elements with hover states or tooltips.

```javascript
async findHoverElements(): Promise<HoverElement[]>
```

**Returns:** `HoverElement[]`
```typescript
interface HoverElement {
  selector: string;
  text: string;
  hasTooltip: boolean;
  tooltipText: string | null;
  position: BoundingBox;
}
```

#### rankByDemoValue()

Scores and ranks elements by demo worthiness.

```javascript
async rankByDemoValue(elements: InteractiveElement[]): Promise<InteractiveElement[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `elements` | `InteractiveElement[]` | Elements to rank |

**Returns:** Elements sorted by `demoScore` descending.

#### filterDemoWorthy()

Filters to only demo-worthy elements.

```javascript
async filterDemoWorthy(elements: InteractiveElement[], minScore?: number): Promise<InteractiveElement[]>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `elements` | `InteractiveElement[]` | - | Elements to filter |
| `minScore` | `number` | `50` | Minimum demo score |

---

## NavigationGraph

Graph structure for site navigation.

### Constructor

```javascript
new NavigationGraph()
```

### Methods

#### addNode()

Adds a navigation node to the graph.

```javascript
addNode(node: NavigationNode): void
```

#### addEdge()

Adds a navigation edge between nodes.

```javascript
addEdge(fromId: string, toId: string, metadata?: EdgeMetadata): void
```

```typescript
interface EdgeMetadata {
  via: string;  // Link text or selector used
  type: 'click' | 'navigate' | 'back';
}
```

#### setRoot()

Sets the root node of the graph.

```javascript
setRoot(nodeId: string): void
```

#### getNode()

Gets a node by ID.

```javascript
getNode(id: string): NavigationNode | null
```

**Returns:** `NavigationNode`
```typescript
interface NavigationNode {
  id: string;
  url: string;
  stateHash: string;
  title: string;
  parent: string | null;
  children: string[];
  siblings: string[];
  depth: number;
  visitCount: number;
  exploredLinks: Link[];
  unexploredLinks: Link[];
  isLeaf: boolean;
  metadata: PageMetadata;
}
```

#### getParent()

Gets the parent node.

```javascript
getParent(nodeId: string): NavigationNode | null
```

#### getChildren()

Gets child nodes.

```javascript
getChildren(nodeId: string): NavigationNode[]
```

#### getPath()

Gets the path between two nodes.

```javascript
getPath(fromId: string, toId: string): NavigationNode[]
```

#### getDepth()

Gets depth from root.

```javascript
getDepth(nodeId: string): number
```

#### getUnexploredNodes()

Gets nodes with unexplored links.

```javascript
getUnexploredNodes(): NavigationNode[]
```

#### getUnexploredLinks()

Gets unexplored links for a node.

```javascript
getUnexploredLinks(nodeId: string): Link[]
```

#### markLinkExplored()

Marks a link as clicked.

```javascript
markLinkExplored(nodeId: string, linkSelector: string): void
```

#### bfs()

Breadth-first traversal.

```javascript
bfs(startId: string, visitor: (node: NavigationNode) => boolean): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `startId` | `string` | Starting node ID |
| `visitor` | `function` | Callback for each node. Return `false` to stop. |

#### dfs()

Depth-first traversal.

```javascript
dfs(startId: string, visitor: (node: NavigationNode) => boolean): void
```

#### findBestNextNode()

Uses AI to select the best next node.

```javascript
async findBestNextNode(): Promise<NavigationNode | null>
```

#### toJSON()

Exports graph as JSON.

```javascript
toJSON(): object
```

#### fromJSON()

Imports graph from JSON.

```javascript
fromJSON(data: object): void
```

#### toMermaid()

Exports as Mermaid diagram.

```javascript
toMermaid(): string
```

---

## SPADetector

Detects and handles Single Page Application navigation.

### Constructor

```javascript
new SPADetector(page: Page)
```

### Methods

#### isSPA()

Detects if site is a SPA.

```javascript
async isSPA(): Promise<boolean>
```

#### detectFramework()

Detects the frontend framework.

```javascript
async detectFramework(): Promise<Framework>
```

**Returns:** `'react' | 'vue' | 'angular' | 'svelte' | 'unknown'`

#### captureState()

Captures current app state.

```javascript
async captureState(): Promise<AppState>
```

```typescript
interface AppState {
  url: string;
  hash: string;
  title: string;
  activeNav: string | null;
  hasModal: boolean;
  scrollPosition: number;
}
```

#### getStateHash()

Gets hash of current state.

```javascript
async getStateHash(): Promise<string>
```

#### detectStateChange()

Checks if state changed from previous hash.

```javascript
async detectStateChange(previousHash: string): Promise<boolean>
```

#### waitForRouteChange()

Waits for SPA route change.

```javascript
async waitForRouteChange(timeout?: number): Promise<void>
```

#### canNavigateBack()

Checks if SPA history allows back navigation.

```javascript
async canNavigateBack(): Promise<boolean>
```

#### navigateBack()

Triggers SPA back navigation.

```javascript
async navigateBack(): Promise<void>
```

---

## ExplorationStrategy

Strategies for exploring a website.

### Constructor

```javascript
new ExplorationStrategy(graph: NavigationGraph, options?: StrategyOptions)
```

```typescript
interface StrategyOptions {
  maxDepth?: number;
  maxNodesPerLevel?: number;
  aiEnabled?: boolean;
}
```

### Methods

#### setStrategy()

Sets the exploration strategy.

```javascript
setStrategy(name: StrategyName): void
```

| Strategy | Description |
|----------|-------------|
| `'breadth-first'` | Explore all pages at current level before going deeper |
| `'depth-first'` | Go deep into one flow before exploring siblings |
| `'priority'` | Visit highest priority nodes first |
| `'ai-guided'` | Use AI to decide best path |

#### shouldExploreLink()

Decides if a link is worth clicking.

```javascript
async shouldExploreLink(link: Link, currentNode: NavigationNode): Promise<boolean>
```

#### shouldGoDeeper()

Decides if we should click into detail pages.

```javascript
async shouldGoDeeper(currentNode: NavigationNode): Promise<boolean>
```

#### shouldGoBack()

Decides if we should return to parent.

```javascript
async shouldGoBack(currentNode: NavigationNode): Promise<boolean>
```

#### selectNextAction()

Chooses the next action.

```javascript
async selectNextAction(currentNode: NavigationNode, availableLinks: Link[]): Promise<ExplorationAction>
```

**Returns:** `ExplorationAction`
```typescript
interface ExplorationAction {
  action: 'click' | 'back' | 'done';
  target: string | null;
  reason: string;
}
```

#### setMaxDepth()

Sets maximum exploration depth.

```javascript
setMaxDepth(depth: number): void
```

#### addLinkFilter()

Adds a filter for links to skip.

```javascript
addLinkFilter(fn: (link: Link) => boolean): void
```

### Static Methods

#### skipExternalLinks()

Filter to skip external URLs.

```javascript
static skipExternalLinks(link: Link): boolean
```

#### skipAuthPages()

Filter to skip login/signup pages.

```javascript
static skipAuthPages(link: Link): boolean
```

#### skipLegalPages()

Filter to skip terms/privacy pages.

```javascript
static skipLegalPages(link: Link): boolean
```

#### skipAssets()

Filter to skip asset files (.pdf, .jpg, etc).

```javascript
static skipAssets(link: Link): boolean
```

---

## ContentAnalyzer

Analyzes page content semantically using AI vision.

### Constructor

```javascript
new ContentAnalyzer(page: Page)
```

### Methods

#### analyzeStructure()

Identifies page sections and hierarchy.

```javascript
async analyzeStructure(): Promise<PageContent>
```

**Returns:** `PageContent`
```typescript
interface PageContent {
  sections: ContentSection[];
  productStory: ProductStory;
  usps: string[];
  demoMoments: DemoMoment[];
  skipRegions: SkipRegion[];
  narrativeFlow: string[];
}

interface ContentSection {
  id: string;
  type: SectionType;
  bounds: BoundingBox;
  headline: string;
  subheadline: string;
  visualElements: string[];
  interactives: InteractiveElement[];
  demoScore: number;
  suggestedDuration: number;
  skipReason: string | null;
}

type SectionType = 'hero' | 'features' | 'pricing' | 'testimonials' | 
                   'cta' | 'footer' | 'content';
```

#### extractProductStory()

Extracts the product narrative.

```javascript
async extractProductStory(): Promise<ProductStory>
```

**Returns:** `ProductStory`
```typescript
interface ProductStory {
  problem: string;
  solution: string;
  features: string[];
  proof: string[];
  cta: string;
}
```

#### identifyUSPs()

Finds unique selling points.

```javascript
async identifyUSPs(): Promise<string[]>
```

#### findDemoMoments()

Finds animations and interactions worth showing.

```javascript
async findDemoMoments(): Promise<DemoMoment[]>
```

**Returns:** `DemoMoment[]`
```typescript
interface DemoMoment {
  type: 'animation' | 'interaction' | 'visual';
  location: Position;
  description: string;
  trigger: string;
  duration: number;
}
```

#### scoreContentSections()

Ranks sections by demo value.

```javascript
async scoreContentSections(): Promise<ContentSection[]>
```

#### detectRepetitiveContent()

Detects repeated content (headers, footers).

```javascript
async detectRepetitiveContent(): Promise<SkipRegion[]>
```

---

## DemoOrchestrator

Master coordinator for intelligent demo generation.

### Constructor

```javascript
new DemoOrchestrator(options?: OrchestratorOptions)
```

```typescript
interface OrchestratorOptions {
  duration?: number;
  maxPages?: number;
  style?: 'professional' | 'casual' | 'energetic' | 'minimal';
  focus?: 'features' | 'pricing' | 'overview' | 'technical';
  adaptiveTiming?: boolean;
  errorRecovery?: boolean;
  narrativeMode?: 'auto' | 'scripted' | 'silent';
}
```

### Methods

#### generateDemo()

Generates a complete demo video.

```javascript
async generateDemo(url: string, options?: OrchestratorOptions): Promise<DemoResult>
```

**Returns:** `DemoResult`
```typescript
interface DemoResult {
  success: boolean;
  videoPath: string;
  plan: DemoPlan;
  graph: NavigationGraph;
  duration: number;
  errors: Error[];
}
```

#### explore()

Phase 1: Explores the site.

```javascript
async explore(url: string): Promise<NavigationGraph>
```

#### plan()

Phase 2: Creates demo plan.

```javascript
async plan(): Promise<DemoPlan>
```

#### execute()

Phase 3: Executes the demo.

```javascript
async execute(): Promise<void>
```

#### finalize()

Phase 4: Post-processes and finalizes.

```javascript
async finalize(): Promise<string>
```

---

## DemoPlan

Represents an optimized demo plan.

### Static Methods

#### create()

Factory method to create a plan.

```javascript
static async create(
  graph: NavigationGraph, 
  analyses: Map<string, PageContent>, 
  options: PlanOptions
): Promise<DemoPlan>
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `pages` | `PageEntry[]` | Ordered pages to visit |
| `timeline` | `TimelineEntry[]` | Detailed timeline |
| `narrative` | `string` | Voiceover script |
| `totalDuration` | `number` | Planned duration (seconds) |

### Methods

#### optimizeOrder()

Reorders pages for best flow.

```javascript
optimizeOrder(): void
```

#### allocateTime()

Distributes time across pages.

```javascript
allocateTime(): void
```

#### getTimelineForPage()

Gets actions for a specific page.

```javascript
getTimelineForPage(pageId: string): TimelineEntry[]
```

---

## ErrorRecovery

Handles errors during demo generation.

### Constructor

```javascript
new ErrorRecovery(orchestrator: DemoOrchestrator)
```

### Methods

#### recover()

Attempts to recover from an error.

```javascript
async recover(error: Error, context: RecoveryContext): Promise<RecoveryResult>
```

**Returns:** `RecoveryResult`
```typescript
interface RecoveryResult {
  action: 'retry' | 'skip' | 'fallback';
  message: string;
}
```

#### classifyError()

Classifies an error type.

```javascript
classifyError(error: Error): ErrorType
```

**Returns:** `'navigation-failed' | 'element-not-found' | 'modal-blocked' | 'timeout' | 'unknown'`

---

## TransitionManager

Manages smooth transitions between pages and sections.

### Constructor

```javascript
new TransitionManager(page: Page, cursorTracker?: CursorTracker)
```

### Methods

#### transitionToPage()

Transitions to a new page.

```javascript
async transitionToPage(
  fromUrl: string, 
  toUrl: string, 
  method: 'click' | 'navigate' | 'back'
): Promise<void>
```

#### transitionToSection()

Transitions to a page section.

```javascript
async transitionToSection(section: ContentSection, scrollDuration?: number): Promise<void>
```

#### fadeTransition()

Applies fade effect.

```javascript
async fadeTransition(duration?: number): Promise<void>
```

#### highlightArea()

Highlights an area of the page.

```javascript
async highlightArea(bounds: BoundingBox, duration?: number): Promise<void>
```

#### dramaticPause()

Pauses for emphasis.

```javascript
async dramaticPause(duration?: number): Promise<void>
```
