# AI Enhancement Guide

LooK v2.0.0 includes an enhanced AI module with advanced capabilities for smarter demo generation.

## What's New

### 1. Multi-Screenshot Full-Page Analysis
Instead of analyzing just the viewport, the enhanced AI captures multiple screenshots as it scrolls through the page, giving GPT-4o a complete picture of your website.

```javascript
import { analyzeWebsiteEnhanced, captureFullPage } from 'look-demo/v2';

// Capture screenshots at multiple scroll positions
const screenshots = await captureFullPage(page, {
  maxScreenshots: 4,
  overlap: 100  // pixels of overlap between screenshots
});

// Analyze with full page context
const analysis = await analyzeWebsiteEnhanced(page, {
  multiScreenshot: true,
  detail: 'high',
  includeDOM: true
});
```

### 2. DOM-Aware Element Extraction
The AI now understands your actual page structure with real CSS selectors, not just % coordinates from vision.

```javascript
import { extractPageElements } from 'look-demo/v2';

const pageInfo = await extractPageElements(page);

// Returns:
// - elements: Interactive buttons, links, headings with real selectors
// - meta: Page title, description, OG tags
// - navigation: All nav items
// - sections: Page sections for scroll targets
// - dimensions: Viewport and page sizes
```

Example output:
```javascript
{
  elements: [
    {
      type: 'interactive',
      tag: 'button',
      text: 'Get Started Free',
      selector: '[data-testid="hero-cta"]',
      rect: { centerX: 960, centerY: 450 },
      importance: 'high',
      isButton: true
    }
  ],
  meta: {
    title: 'Your Product - The Best Solution',
    h1: 'Transform Your Workflow'
  }
}
```

### 3. Chain-of-Thought Demo Planning
Multi-step reasoning for creating compelling demo journeys:

```javascript
import { analyzeWebsiteEnhanced, planDemoWithCoT } from 'look-demo/v2';

const analysis = await analyzeWebsiteEnhanced(page);
const demoPlan = await planDemoWithCoT(analysis, {
  duration: 25000,
  viewportWidth: 1920,
  viewportHeight: 1080
});

// Returns a three-stage plan:
// 1. journey: User experience flow with goals and emotions
// 2. actions: Mapped to real page elements with coordinates
// 3. script: Timed narration synced with actions
```

### 4. Structured JSON Output
All AI responses use `response_format: { type: 'json_object' }` for reliable parsing.

### 5. High Detail Vision Mode
Vision analysis now uses `detail: 'high'` (2048px) instead of `detail: 'low'` (512px) for better element detection.

### 6. Multi-Model Ensemble
Uses the best model for each task:

| Task | Primary Model | Fallback |
|------|--------------|----------|
| Vision Analysis | GPT-4o (high detail) | - |
| Creative Script | Claude 3.5 Sonnet | GPT-4o-mini |
| Fast Planning | Groq Llama 3.3 70B | GPT-4o-mini |
| Voiceover | OpenAI TTS-1-HD | - |

```javascript
import { generateScriptEnhanced, getAvailableProviders } from 'look-demo/v2';

// Check what's available
console.log(getAvailableProviders());
// { openai: true, groq: true, anthropic: false }

// Generate script with best available model
const script = await generateScriptEnhanced(analysis, {
  duration: 30,
  style: 'professional',
  preferClaude: true  // Will use Claude if ANTHROPIC_API_KEY is set
});
```

### 7. Smart Action Generation
Generate demo actions using real DOM selectors:

```javascript
import { generateSmartActions } from 'look-demo/v2';

const actions = generateSmartActions(analysis, {
  duration: 25000,
  viewportWidth: 1920,
  viewportHeight: 1080
});

// Actions include:
// - Real CSS selectors for each element
// - Pixel coordinates for cursor movement
// - Smart scroll targets based on page sections
// - Automatic CTA highlighting
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | GPT-4o vision, GPT-4o-mini, TTS |
| `GROQ_API_KEY` | No | Free tier for fast script generation |
| `ANTHROPIC_API_KEY` | No | Claude for creative script writing |

## Migration from v1 AI

The original `analyzeWebsite` and `generateScript` functions still work unchanged. The enhanced versions are additive:

```javascript
// v1 (still works)
import { analyzeWebsite, generateScript } from 'look-demo/v2';

// v2 enhanced (new)
import { 
  analyzeWebsiteEnhanced, 
  generateScriptEnhanced,
  planDemoWithCoT 
} from 'look-demo/v2';
```

## Performance Notes

- Multi-screenshot analysis takes ~3-5 seconds longer but produces better results
- High detail mode uses more tokens but catches smaller UI elements
- Chain-of-thought planning makes 3 API calls (journey → mapping → script)
- Groq is ~3x faster than OpenAI for text generation

## Future Improvements

- [ ] Intelligent element ranking based on user analytics
- [ ] A/B testing different demo journeys
- [ ] Learning from successful demos
- [ ] Real-time demo adjustment based on viewer engagement
