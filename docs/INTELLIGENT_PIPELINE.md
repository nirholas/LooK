# Intelligent Demo Pipeline

L👀K's enterprise-grade AI pipeline automatically creates broadcast-quality demo videos by analyzing your product, detecting key workflows, identifying visual moments, composing narratives, and scoring quality.

## Table of Contents

- [Overview](#overview)
- [5-Phase Pipeline](#5-phase-pipeline)
- [Product Intelligence](#product-intelligence)
- [Workflow Detection](#workflow-detection)
- [Visual Moment Detection](#visual-moment-detection)
- [Smart Composition](#smart-composition)
- [Quality Scoring](#quality-scoring)
- [Voice Enhancement](#voice-enhancement)
- [Smart Pacing](#smart-pacing)
- [Additional Enhancements](#additional-enhancements)

---

## Overview

The Intelligent Orchestrator coordinates five AI phases to create optimal demos:

```
Product Intelligence → Workflow Detection → Visual Moments → 
    → Smart Composition → Quality Scoring → Auto-Retry (if needed)
```

### Quick Start

```javascript
import { IntelligentOrchestrator } from 'look/v2';

const orchestrator = new IntelligentOrchestrator({
  style: 'professional',  // professional, casual, energetic, minimal
  autoOptimize: true,     // Re-optimize if quality < threshold
  qualityThreshold: 70,   // Minimum acceptable score (0-100)
  storyArc: 'auto'        // auto, problem-solution, feature-showcase, journey, before-after, quick-demo
});

const demo = await orchestrator.createDemo('https://myapp.com', {
  duration: 30,
  voice: 'nova'
});

console.log(`Quality Score: ${demo.qualityScore.overall}`);
```

---

## 5-Phase Pipeline

### Phase 1: Product Intelligence

Extracts your product's "DNA" from the page:

- **Name & Category** - Auto-detects product type
- **One-liner & Pitch** - Creates compelling descriptions
- **Value Propositions** - Identifies key benefits
- **Target Audience** - Determines ideal user personas
- **Pain Points** - Understands problems being solved
- **Differentiators** - Finds unique selling points

### Phase 2: Workflow Detection

Identifies demonstrable user workflows:

- Login/signup flows
- Onboarding sequences
- Core feature usage
- Settings configuration
- Data visualization
- CRUD operations
- Search & filtering
- Sharing capabilities

### Phase 3: Visual Moment Detection

Finds compelling visual elements:

- Animations & micro-interactions
- Charts & data visualizations
- Form interactions
- Image galleries
- Video players
- Loading transitions
- Hover effects

### Phase 4: Smart Composition

Assembles the demo narrative:

- Selects optimal story arc
- Choreographs camera movements
- Times narration to visuals
- Adds dramatic pauses
- Coordinates zoom/pan

### Phase 5: Quality Scoring

Evaluates the result across 6 dimensions:

- Story arc coherence
- Visual engagement
- Pacing quality
- Narration effectiveness
- Technical quality
- Conversion potential

If score falls below threshold, automatically re-optimizes.

---

## Product Intelligence

The Product Intelligence module analyzes your site to extract comprehensive product information.

### Product Categories

| Category | Description | Example Sites |
|----------|-------------|---------------|
| `SAAS_B2B` | B2B software | Salesforce, Slack |
| `SAAS_B2C` | Consumer SaaS | Spotify, Notion |
| `ECOMMERCE` | Online stores | Shopify stores |
| `MARKETPLACE` | Two-sided markets | Airbnb, Uber |
| `DEVELOPER_TOOL` | Dev-focused | GitHub, Vercel |
| `CREATIVE_TOOL` | Design/creative | Figma, Canva |
| `PORTFOLIO` | Personal sites | Designer portfolios |
| `LANDING_PAGE` | Marketing pages | Product launches |
| `DOCUMENTATION` | Docs sites | ReadTheDocs |
| `DASHBOARD` | Analytics/admin | Grafana, Metabase |

### Extracted Information

```javascript
const intelligence = await productIntelligence.analyze('https://myapp.com');

console.log(intelligence);
// {
//   name: 'MyApp',
//   category: 'SAAS_B2B',
//   oneLiner: 'Project management for distributed teams',
//   elevatorPitch: 'MyApp helps remote teams...',
//   valuePropositions: [
//     'Real-time collaboration',
//     'Automated workflows',
//     'Enterprise security'
//   ],
//   targetAudience: ['Project managers', 'Remote teams', 'Enterprises'],
//   painPoints: ['Scattered communication', 'Missed deadlines'],
//   differentiators: ['AI-powered insights', 'Unlimited integrations'],
//   competitors: ['Asana', 'Monday.com'],
//   keyFeatures: ['Kanban boards', 'Time tracking', 'Reports']
// }
```

### Groq Integration

For faster/cheaper inference, configure Groq as an alternative provider:

```bash
export GROQ_API_KEY=gsk_...
```

```javascript
const intelligence = new ProductIntelligence({
  provider: 'groq',  // Uses Groq instead of OpenAI
  model: 'llama-3.1-70b-versatile'
});
```

---

## Workflow Detection

Identifies user workflows worth demonstrating with demo value scores.

### Workflow Patterns

| Pattern | Demo Value | Description |
|---------|------------|-------------|
| `SIGNUP_FLOW` | 85 | Registration process |
| `LOGIN_FLOW` | 70 | Authentication |
| `ONBOARDING` | 95 | First-time user experience |
| `FEATURE_TOUR` | 90 | Core functionality showcase |
| `CRUD_OPERATIONS` | 75 | Create/read/update/delete |
| `SEARCH_FILTER` | 80 | Search and filtering |
| `DATA_VIZ` | 90 | Charts and dashboards |
| `SETTINGS` | 60 | Configuration screens |
| `CHECKOUT` | 85 | Purchase flow (demo only) |
| `COLLABORATION` | 85 | Multi-user features |
| `EXPORT_SHARE` | 75 | Sharing capabilities |
| `INTEGRATION` | 80 | Third-party connections |
| `SUPPORT_HELP` | 65 | Help and documentation |

### Usage

```javascript
import { WorkflowDetector } from 'look/v2';

const detector = new WorkflowDetector();
const workflows = await detector.detectWorkflows(page);

// Returns workflows sorted by demo value
workflows.forEach(w => {
  console.log(`${w.pattern}: ${w.demoValue} - ${w.description}`);
  if (w.skipReason) {
    console.log(`  Skip: ${w.skipReason}`);
  }
});
```

### Skip Reasons

Some workflows have conditions that make them unsuitable for demos:

- **Payment flows** - Skip actual transactions
- **Account deletion** - Destructive actions
- **Password reset** - Requires email access
- **Private data** - Contains sensitive info

---

## Visual Moment Detection

Identifies compelling visual elements to capture during recording.

### Moment Types

| Type | Demo Score | Trigger |
|------|------------|---------|
| `HERO_ANIMATION` | 95 | auto/scroll |
| `CHART_RENDER` | 90 | auto |
| `FORM_INTERACTION` | 85 | click |
| `IMAGE_GALLERY` | 80 | click |
| `VIDEO_PLAYER` | 85 | click |
| `MICRO_INTERACTION` | 75 | hover |
| `LOADING_TRANSITION` | 70 | auto |
| `SCROLL_ANIMATION` | 80 | scroll |

### Framework Detection

Automatically detects animation libraries:

- **AOS** - Animate On Scroll
- **GSAP** - GreenSock Animation Platform
- **Swiper** - Touch slider
- **Slick** - Carousel
- **Highcharts** - Data visualization
- **Recharts** - React charts
- **Chart.js** - Canvas charts
- **Lottie** - After Effects animations

### Usage

```javascript
import { VisualMomentDetector } from 'look/v2';

const detector = new VisualMomentDetector();
const moments = await detector.detectMoments(page);

moments.forEach(m => {
  console.log(`${m.type} at ${m.selector}`);
  console.log(`  Score: ${m.demoScore}, Trigger: ${m.trigger}`);
});
```

---

## Smart Composition

Creates narrative structure for the demo.

### Story Arc Templates

| Arc | Best For | Structure |
|-----|----------|-----------|
| `problem-solution` | B2B SaaS | Pain → Discovery → Solution → Results |
| `feature-showcase` | Feature launches | Context → Feature 1 → Feature 2 → Feature 3 → CTA |
| `journey` | Consumer apps | Start → Explore → Achieve → Delight |
| `before-after` | Transformations | Before state → Process → After state → Impact |
| `quick-demo` | Social media | Hook → Core value → Quick wins → CTA |

### Emotional Phases

Each arc has phases with target emotions:

```javascript
const problemSolution = {
  phases: [
    { name: 'hook', emotion: 'curiosity', duration: '10%' },
    { name: 'pain', emotion: 'frustration', duration: '15%' },
    { name: 'discovery', emotion: 'hope', duration: '15%' },
    { name: 'solution', emotion: 'relief', duration: '35%' },
    { name: 'results', emotion: 'excitement', duration: '15%' },
    { name: 'cta', emotion: 'urgency', duration: '10%' }
  ]
};
```

### Pacing Styles

| Style | Speed | Use Case |
|-------|-------|----------|
| `relaxed` | 0.7x | Documentation, tutorials |
| `standard` | 1.0x | General demos |
| `dynamic` | 1.3x | Feature showcases |
| `energetic` | 1.5x | Social media, trailers |

### Usage

```javascript
import { SmartComposer } from 'look/v2';

const composer = new SmartComposer({
  storyArc: 'problem-solution',
  pacingStyle: 'dynamic'
});

const composition = await composer.compose({
  productIntelligence,
  workflows,
  visualMoments
});

// Returns timeline with narration, camera moves, and actions
```

---

## Quality Scoring

Evaluates demo quality across 6 weighted categories.

### Scoring Categories

| Category | Weight | Criteria |
|----------|--------|----------|
| **Story Arc** | 20% | Clear beginning/middle/end, emotional progression, hook strength, CTA clarity |
| **Visual Engagement** | 20% | Motion variety, zoom usage, click effects, visual interest |
| **Pacing** | 15% | Scene duration, transition smoothness, rhythm consistency |
| **Narration** | 20% | Script quality, voice clarity, timing sync |
| **Technical** | 15% | Resolution, framerate, audio quality, encoding |
| **Conversion** | 10% | CTA visibility, value communication, urgency |

### Grade Scale

| Score | Grade | Description |
|-------|-------|-------------|
| 95-100 | A+ | Exceptional, broadcast ready |
| 90-94 | A | Excellent quality |
| 85-89 | A- | Very good |
| 80-84 | B+ | Good with minor issues |
| 75-79 | B | Solid, room for improvement |
| 70-74 | B- | Acceptable |
| 65-69 | C+ | Needs work |
| 60-64 | C | Below average |
| 55-59 | C- | Poor quality |
| 50-54 | D | Major issues |
| <50 | F | Unacceptable |

### Usage

```javascript
import { QualityScorer } from 'look/v2';

const scorer = new QualityScorer();
const score = await scorer.scoreDemo(demoPath);

console.log(`Overall: ${score.overall} (${score.grade})`);
console.log(`Story: ${score.categories.storyArc}`);
console.log(`Visual: ${score.categories.visualEngagement}`);
console.log(`Suggestions:`, score.suggestions);
```

### Auto-Optimization

When `autoOptimize` is enabled, the orchestrator will:

1. Score the initial demo
2. If below threshold, analyze weak categories
3. Re-compose with adjustments
4. Re-record problem sections
5. Re-score until threshold met or max retries

```javascript
const orchestrator = new IntelligentOrchestrator({
  autoOptimize: true,
  qualityThreshold: 75,
  maxRetries: 3
});
```

---

## Voice Enhancement

Advanced voice processing for natural narration.

### Features

- **Abbreviation Expansion** - `API` → "A P I", `JSON` → "Jason"
- **SSML Generation** - Pauses, emphasis, rate/pitch control
- **Multi-Voice Support** - Different voices for narrator vs. callouts
- **Emotion Markers** - Curious, enthusiastic, neutral tones
- **Word-Level Timing** - Precise sync for animated captions

### SSML Output

```xml
<speak>
  <prosody rate="medium" pitch="medium">
    Welcome to <emphasis level="moderate">MyApp</emphasis>.
    <break time="500ms"/>
    Let me show you how it works.
  </prosody>
</speak>
```

### Usage

```javascript
import { VoiceEnhancer } from 'look/v2';

const enhancer = new VoiceEnhancer({
  expandAbbreviations: true,
  generateSSML: true,
  wordTimings: true
});

const enhanced = await enhancer.enhance(script, {
  voice: 'nova',
  emotion: 'enthusiastic'
});

console.log(enhanced.ssml);
console.log(enhanced.wordTimings); // [{word: 'Welcome', start: 0, end: 0.5}, ...]
```

---

## Smart Pacing

Content-aware timing that adapts to complexity.

### Timing Factors

- **Text density** - More text = more time
- **Visual complexity** - Complex UIs get longer pauses
- **Interactive elements** - Forms/buttons need demonstration time
- **Voiceover sync** - Actions align with narration

### Automatic Pauses

Dramatic pauses are inserted at:

- Key feature reveals
- Before/after comparisons
- Important data displays
- Call-to-action moments

### Usage

```javascript
import { SmartPacing } from 'look/v2';

const pacing = new SmartPacing({
  style: 'dynamic',           // relaxed, standard, dynamic, energetic
  syncWithVoiceover: true,
  dramaticPauses: true
});

const timeline = await pacing.calculateTimeline(composition, voiceover);

timeline.forEach(segment => {
  console.log(`${segment.action}: ${segment.duration}ms`);
});
```

---

## Additional Enhancements

### Watermarks

Add text or logo watermarks:

```javascript
import { WatermarkGenerator } from 'look/v2';

const watermark = new WatermarkGenerator({
  type: 'text',           // text, image
  text: 'MyCompany',
  position: 'bottom-right', // top-left, top-right, bottom-left, bottom-right, center
  opacity: 0.7,
  fontSize: 24,
  fontFamily: 'Inter',
  color: '#FFFFFF',
  background: 'rgba(0,0,0,0.5)',
  padding: 10
});

await watermark.apply('input.mp4', 'output.mp4');
```

### Progress Bars

Visual timeline indicators:

```javascript
import { ProgressBarGenerator } from 'look/v2';

const progress = new ProgressBarGenerator({
  style: 'bar',          // bar, line, dots, circular, segments
  position: 'bottom',    // top, bottom
  color: '#3B82F6',
  backgroundColor: 'rgba(0,0,0,0.3)',
  height: 4,
  chapters: ['Intro', 'Features', 'Demo', 'CTA']  // Optional chapter markers
});

await progress.apply('input.mp4', 'output.mp4');
```

### Focus Effects

Draw attention to elements:

```javascript
import { FocusEffects } from 'look/v2';

const focus = new FocusEffects();

// Spotlight effect
await focus.spotlight(page, '#signup-button', {
  overlayOpacity: 0.7,
  featherRadius: 50
});

// Glow outline
await focus.glow(page, '.feature-card', {
  color: '#3B82F6',
  width: 3,
  animated: true  // Pulsing glow
});

// Arrow pointer
await focus.arrow(page, '#cta-button', {
  label: 'Click here!',
  color: '#EF4444',
  bounce: true
});
```

### Intro/Outro Cards

Branded intro and outro screens:

```javascript
import { IntroOutroGenerator } from 'look/v2';

const generator = new IntroOutroGenerator({
  theme: 'gradient',     // dark, light, gradient, minimal
  brandColor: '#3B82F6',
  accentColor: '#10B981'
});

// Generate intro
await generator.createIntro('intro.mp4', {
  title: 'MyApp',
  tagline: 'Work smarter, not harder',
  duration: 3
});

// Generate outro with CTA
await generator.createOutro('outro.mp4', {
  title: 'Get Started Today',
  cta: 'Try Free for 14 Days',
  url: 'myapp.com',
  duration: 4
});

// Combine with main video
await generator.wrapVideo('demo.mp4', 'final.mp4', {
  introPath: 'intro.mp4',
  outroPath: 'outro.mp4'
});
```

---

## CLI Integration

All intelligent features are accessible via CLI:

```bash
# Full intelligent demo with auto-optimization
look demo https://myapp.com --intelligent --quality-threshold 75

# Specific story arc
look demo https://myapp.com --story-arc problem-solution

# Custom pacing
look demo https://myapp.com --pacing energetic

# Add watermark
look demo https://myapp.com --watermark "MyCompany" --watermark-position bottom-right

# Add progress bar
look demo https://myapp.com --progress-bar --progress-style segments

# Generate intro/outro
look demo https://myapp.com --intro --outro --brand-color "#3B82F6"
```

---

## Best Practices

1. **Let AI choose** - `--story-arc auto` usually picks the best narrative
2. **Match pacing to platform** - Use `energetic` for TikTok, `standard` for YouTube
3. **Set quality threshold** - 70+ for drafts, 80+ for production
4. **Review suggestions** - Quality scorer provides actionable improvements
5. **Test product detection** - Run `--dry-run` first to verify product analysis
