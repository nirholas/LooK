/**
 * Enhanced AI Module for LooK
 * 
 * Advanced AI capabilities including:
 * - Multi-screenshot full-page analysis
 * - DOM-aware element extraction
 * - Chain-of-thought demo planning
 * - Context enrichment from page metadata
 * - Multi-model ensemble routing
 * - Structured JSON output
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { createLogger } from './logger.js';

const log = createLogger('ai-enhanced');

// ============================================================================
// Client Management
// ============================================================================

/** @type {OpenAI|null} */
let openai = null;

/** @type {OpenAI|null} */
let groq = null;

/** @type {Anthropic|null} */
let anthropic = null;

/**
 * Get OpenAI client
 */
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required. Set with: export OPENAI_API_KEY=sk-...');
    }
    openai = new OpenAI();
  }
  return openai;
}

/**
 * Get Groq client (free, fast)
 */
function getGroq() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
  return groq;
}

/**
 * Get Anthropic client (for Claude)
 */
function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

/**
 * Check available AI providers
 */
export function getAvailableProviders() {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY
  };
}

// ============================================================================
// Image Processing
// ============================================================================

/**
 * Compress image for vision API
 * @param {string} base64Png - Base64 PNG data
 * @param {'low'|'high'} detail - Detail level
 */
async function compressForVision(base64Png, detail = 'high') {
  try {
    const buffer = Buffer.from(base64Png, 'base64');
    
    // High detail = 2048px, Low = 512px
    const maxSize = detail === 'high' ? 2048 : 512;
    
    const compressed = await sharp(buffer)
      .resize(maxSize, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: detail === 'high' ? 90 : 70 })
      .toBuffer();
    
    return {
      base64: compressed.toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch (e) {
    log.warn('Image compression failed', { error: e.message });
    return { base64: base64Png, mimeType: 'image/png' };
  }
}

// ============================================================================
// DOM-Aware Element Extraction
// ============================================================================

/**
 * Extract interactive elements from page with precise selectors
 * Run this in the browser context via page.evaluate()
 * 
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<Object>} Page info with elements
 */
export async function extractPageElements(page) {
  return page.evaluate(() => {
    /**
     * Generate a unique CSS selector for an element
     */
    function getUniqueSelector(el) {
      if (el.id) return `#${el.id}`;
      
      // Try data attributes
      for (const attr of ['data-testid', 'data-cy', 'data-qa', 'aria-label']) {
        if (el.hasAttribute(attr)) {
          return `[${attr}="${el.getAttribute(attr)}"]`;
        }
      }
      
      // Try class combination
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          const selector = '.' + classes.slice(0, 2).join('.');
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }
      }
      
      // Fallback to nth-child path
      const path = [];
      let current = el;
      while (current && current.nodeType === 1) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector = `#${current.id}`;
          path.unshift(selector);
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
          if (siblings.length > 1) {
            selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        path.unshift(selector);
        current = parent;
      }
      return path.join(' > ');
    }
    
    /**
     * Check if element is visible
     */
    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    }
    
    /**
     * Get element importance based on various signals
     */
    function getImportance(el) {
      const text = (el.textContent || '').toLowerCase();
      const classes = (el.className || '').toLowerCase();
      
      // High importance indicators
      const highKeywords = ['cta', 'primary', 'hero', 'main', 'featured', 'start', 'try', 'get started', 'sign up', 'buy', 'subscribe'];
      if (highKeywords.some(k => text.includes(k) || classes.includes(k))) {
        return 'high';
      }
      
      // Medium importance
      const medKeywords = ['button', 'action', 'learn', 'explore', 'view', 'see'];
      if (medKeywords.some(k => text.includes(k) || classes.includes(k))) {
        return 'medium';
      }
      
      return 'low';
    }
    
    const elements = [];
    
    // Interactive elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[onclick]',
      '[class*="btn"]',
      '[class*="button"]',
      '[class*="cta"]'
    ];
    
    document.querySelectorAll(interactiveSelectors.join(', ')).forEach(el => {
      if (!isVisible(el)) return;
      
      const rect = el.getBoundingClientRect();
      elements.push({
        type: 'interactive',
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 100),
        selector: getUniqueSelector(el),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          centerX: Math.round(rect.x + rect.width / 2),
          centerY: Math.round(rect.y + rect.height / 2)
        },
        importance: getImportance(el),
        isButton: el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
        isLink: el.tagName === 'A',
        href: el.getAttribute('href') || null
      });
    });
    
    // Headings for content structure
    document.querySelectorAll('h1, h2, h3').forEach(el => {
      if (!isVisible(el)) return;
      
      const rect = el.getBoundingClientRect();
      elements.push({
        type: 'heading',
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 200),
        selector: getUniqueSelector(el),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          centerX: Math.round(rect.x + rect.width / 2),
          centerY: Math.round(rect.y + rect.height / 2)
        },
        level: parseInt(el.tagName[1])
      });
    });
    
    // Images and media
    document.querySelectorAll('img[src], video, [class*="hero"], [class*="feature"]').forEach(el => {
      if (!isVisible(el)) return;
      
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return; // Skip small images
      
      elements.push({
        type: 'media',
        tag: el.tagName.toLowerCase(),
        alt: el.getAttribute('alt') || '',
        selector: getUniqueSelector(el),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          centerX: Math.round(rect.x + rect.width / 2),
          centerY: Math.round(rect.y + rect.height / 2)
        }
      });
    });
    
    // Page metadata
    const meta = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      favicon: document.querySelector('link[rel="icon"]')?.href || ''
    };
    
    // Navigation structure
    const navigation = [];
    document.querySelectorAll('nav a, header a, [role="navigation"] a').forEach(el => {
      if (!isVisible(el)) return;
      navigation.push({
        text: el.textContent.trim().slice(0, 50),
        href: el.getAttribute('href') || ''
      });
    });
    
    // Page dimensions
    const dimensions = {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    
    // Section boundaries (for scroll targets)
    const sections = [];
    document.querySelectorAll('section, [class*="section"], [id]').forEach(el => {
      if (!isVisible(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 100) return;
      
      sections.push({
        id: el.id || null,
        className: el.className?.split?.(' ')?.[0] || null,
        y: Math.round(rect.y + window.scrollY),
        height: Math.round(rect.height)
      });
    });
    
    return {
      elements,
      meta,
      navigation,
      dimensions,
      sections,
      url: window.location.href
    };
  });
}

// ============================================================================
// Multi-Screenshot Analysis
// ============================================================================

/**
 * Capture multiple screenshots of the full page
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} options - Capture options
 */
export async function captureFullPage(page, options = {}) {
  const { maxScreenshots = 4, overlap = 100 } = options;
  
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  
  const screenshots = [];
  const scrollStep = viewportHeight - overlap;
  const numCaptures = Math.min(maxScreenshots, Math.ceil(pageHeight / scrollStep));
  
  for (let i = 0; i < numCaptures; i++) {
    const scrollY = Math.min(i * scrollStep, pageHeight - viewportHeight);
    
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
    await page.waitForTimeout(200); // Let content settle
    
    const screenshot = await page.screenshot({ encoding: 'base64' });
    screenshots.push({
      base64: screenshot,
      scrollY,
      index: i
    });
  }
  
  // Return to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  
  return screenshots;
}

/**
 * Analyze website with multi-screenshot full-page understanding
 * Uses GPT-4o with high detail mode
 */
export async function analyzeWebsiteEnhanced(page, options = {}) {
  const {
    detail = 'high',
    includeDOM = true,
    multiScreenshot = true
  } = options;
  
  // Extract DOM info first
  let pageInfo = null;
  if (includeDOM) {
    pageInfo = await extractPageElements(page);
  }
  
  // Capture screenshots
  let screenshots;
  if (multiScreenshot) {
    screenshots = await captureFullPage(page, { maxScreenshots: 3 });
  } else {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    screenshots = [{ base64: screenshot, scrollY: 0, index: 0 }];
  }
  
  // Compress screenshots
  const compressedScreenshots = await Promise.all(
    screenshots.map(async (s, i) => {
      const compressed = await compressForVision(s.base64, detail);
      return { ...compressed, scrollY: s.scrollY, index: i };
    })
  );
  
  // Build enhanced prompt with DOM context
  const domContext = pageInfo ? `
Page Structure:
- Title: "${pageInfo.meta.title}"
- H1: "${pageInfo.meta.h1}"
- Description: "${pageInfo.meta.description}"
- Page size: ${pageInfo.dimensions.pageWidth}x${pageInfo.dimensions.pageHeight}px
- Viewport: ${pageInfo.dimensions.viewportWidth}x${pageInfo.dimensions.viewportHeight}px
- Navigation items: ${pageInfo.navigation.map(n => n.text).join(', ')}

Interactive Elements (${pageInfo.elements.filter(e => e.type === 'interactive').length} total):
${pageInfo.elements
  .filter(e => e.type === 'interactive' && e.importance !== 'low')
  .slice(0, 10)
  .map(e => `- ${e.tag}: "${e.text}" at (${e.rect.centerX}, ${e.rect.centerY}) [${e.importance}]`)
  .join('\n')}

Content Structure:
${pageInfo.elements
  .filter(e => e.type === 'heading')
  .map(e => `- ${e.tag}: "${e.text}" at y=${e.rect.y}`)
  .join('\n')}
` : '';

  // Build image content array
  const imageContent = compressedScreenshots.map((s, i) => ({
    type: 'image_url',
    image_url: {
      url: `data:${s.mimeType};base64,${s.base64}`,
      detail: detail
    }
  }));
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert UX analyst and product marketer. Analyze these screenshots of a website and the provided DOM structure.

Return a JSON object with this exact structure:
{
  "name": "Product or company name",
  "tagline": "Main value proposition (one line)",
  "description": "2-3 sentence summary of what this product does",
  "targetAudience": "Who this product is for",
  "painPoint": "The problem this product solves",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "uniqueValue": "What makes this different from alternatives",
  "tone": "professional|casual|technical|playful|enterprise",
  "visualStyle": "minimal|colorful|dark|light|corporate",
  "focusPoints": [
    {
      "element": "Description of what to focus on",
      "selector": "CSS selector if available",
      "x": 0-100,
      "y": 0-100,
      "importance": "high|medium",
      "reason": "Why this is important to show"
    }
  ],
  "demoJourney": [
    {
      "step": 1,
      "action": "scroll|click|hover|wait",
      "target": "Description or selector",
      "x": pixel_x,
      "y": pixel_y,
      "duration": milliseconds,
      "narration": "What to say during this step"
    }
  ],
  "suggestedHook": "Attention-grabbing opening line for the demo",
  "callToAction": "What viewers should do after watching"
}`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this website: ${pageInfo?.url || 'Unknown URL'}

${domContext}

${compressedScreenshots.length > 1 
  ? `I'm providing ${compressedScreenshots.length} screenshots showing the full page from top to bottom.` 
  : 'Here is a screenshot of the page.'}

Create a compelling demo journey that:
1. Starts with an attention-grabbing moment
2. Shows the key value proposition
3. Highlights 2-3 main features
4. Ends with a clear call to action

For demoJourney, use actual pixel coordinates based on the viewport (${pageInfo?.dimensions?.viewportWidth || 1920}x${pageInfo?.dimensions?.viewportHeight || 1080}).`
          },
          ...imageContent
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });
  
  const content = response.choices[0].message.content;
  
  try {
    const analysis = JSON.parse(content);
    // Attach page info for later use
    analysis._pageInfo = pageInfo;
    return analysis;
  } catch (e) {
    log.warn('Failed to parse analysis JSON', { error: e.message });
    return {
      description: content,
      keyFeatures: [],
      focusPoints: [],
      demoJourney: [],
      _pageInfo: pageInfo
    };
  }
}

// ============================================================================
// Chain-of-Thought Demo Planning
// ============================================================================

/**
 * Generate demo script using chain-of-thought reasoning
 * Step 1: Identify user journey
 * Step 2: Map to page elements
 * Step 3: Generate timed script
 */
export async function planDemoWithCoT(analysis, options = {}) {
  const {
    duration = 25000,
    viewportWidth = 1920,
    viewportHeight = 1080
  } = options;
  
  const pageInfo = analysis._pageInfo;
  const client = getGroq() || getOpenAI();
  const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
  
  // Step 1: Identify the ideal user journey
  const journeyResponse = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You're a UX expert. Create a user journey for a product demo.
Return JSON: { "steps": [{ "goal": "what to achieve", "element": "what to interact with", "emotion": "what viewer should feel" }] }
Keep it to 4-6 steps. Focus on the "aha moment" that shows product value.`
      },
      {
        role: 'user',
        content: `Product: ${analysis.name || 'Unknown'}
Value: ${analysis.tagline || analysis.description || 'Unknown'}
Features: ${(analysis.keyFeatures || []).join(', ')}
Audience: ${analysis.targetAudience || 'Unknown'}
Pain point: ${analysis.painPoint || 'Unknown'}

Total demo time: ${duration / 1000} seconds`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });
  
  let journey;
  try {
    journey = JSON.parse(journeyResponse.choices[0].message.content);
  } catch {
    journey = { steps: [{ goal: 'Show product', element: 'hero', emotion: 'interest' }] };
  }
  
  // Step 2: Map journey to actual elements
  const elementsContext = pageInfo?.elements
    ?.filter(e => e.type === 'interactive' || e.type === 'heading')
    ?.slice(0, 30)
    ?.map(e => ({
      type: e.type,
      text: e.text?.slice(0, 50),
      selector: e.selector,
      x: e.rect.centerX,
      y: e.rect.centerY,
      importance: e.importance
    })) || [];
  
  const mappingResponse = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Map a user journey to specific page elements.
Return JSON: { "actions": [{ "step": 1, "action": "scroll|moveTo|click|hover|wait", "selector": "css selector", "x": pixels, "y": pixels, "scrollY": pixels_if_scroll, "duration": ms, "description": "what happens" }] }
Use real coordinates from the elements list.`
      },
      {
        role: 'user',
        content: `Journey steps: ${JSON.stringify(journey.steps)}

Available elements:
${JSON.stringify(elementsContext, null, 2)}

Viewport: ${viewportWidth}x${viewportHeight}
Page height: ${pageInfo?.dimensions?.pageHeight || viewportHeight}
Total duration: ${duration}ms

Map each journey step to 2-3 specific actions with real coordinates.`
      }
    ],
    temperature: 0.5,
    max_tokens: 1000
  });
  
  let actionPlan;
  try {
    actionPlan = JSON.parse(mappingResponse.choices[0].message.content);
  } catch {
    actionPlan = { actions: [] };
  }
  
  // Step 3: Generate timed demo script with narration
  const scriptResponse = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Create a timed demo script with voiceover narration.
Return JSON: { "script": [{ "time": start_ms, "endTime": end_ms, "action": "type", "params": {}, "narration": "what to say" }] }
Make narration natural, conversational, and synced with actions.`
      },
      {
        role: 'user',
        content: `Product: ${analysis.name}
Hook: ${analysis.suggestedHook || `Introducing ${analysis.name}`}
Actions: ${JSON.stringify(actionPlan.actions)}
Duration: ${duration}ms
CTA: ${analysis.callToAction || 'Try it today'}

Create smooth transitions between actions. Don't narrate obvious things like "I'm scrolling down".`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });
  
  let timedScript;
  try {
    timedScript = JSON.parse(scriptResponse.choices[0].message.content);
  } catch {
    timedScript = { script: [] };
  }
  
  return {
    journey: journey.steps,
    actions: actionPlan.actions,
    script: timedScript.script,
    analysis
  };
}

// ============================================================================
// Multi-Model Script Generation
// ============================================================================

/**
 * Generate voiceover script using best available model
 * Prefers Claude for creative writing, falls back to GPT/Groq
 */
export async function generateScriptEnhanced(analysis, options = {}) {
  const {
    duration = 30,
    style = 'professional',
    includeCallToAction = true,
    preferClaude = true
  } = options;
  
  const wordCount = Math.round(duration * 2.5);
  
  const styleGuides = {
    professional: 'Clear, confident, authoritative. No filler words or clichés.',
    casual: 'Friendly and warm, like explaining to a smart friend.',
    energetic: 'Dynamic and exciting, but authentic—not salesy.',
    minimal: 'Zen-like brevity. Every word earns its place.',
    storytelling: 'Narrative arc with problem, journey, solution.'
  };
  
  const prompt = `Write a ${duration}-second voiceover script for a product demo video.

PRODUCT INTEL:
- Name: ${analysis.name || 'this product'}
- One-liner: ${analysis.tagline || analysis.description || 'A powerful tool'}
- Key value: ${analysis.uniqueValue || analysis.keyFeatures?.[0] || 'saves time'}
- For: ${analysis.targetAudience || 'professionals'}
- Pain point: ${analysis.painPoint || 'inefficiency'}
- Features: ${(analysis.keyFeatures || []).slice(0, 3).join(', ')}

VOICE & STYLE:
${styleGuides[style] || styleGuides.professional}

STRUCTURE:
1. HOOK (0-5s): ${analysis.suggestedHook || 'Start with a bold statement or question'}
2. PROBLEM (5-10s): Acknowledge the pain point
3. SOLUTION (10-20s): Show how the product solves it
4. FEATURES (20-${duration - 5}s): 1-2 key capabilities
${includeCallToAction ? `5. CTA (last 5s): ${analysis.callToAction || 'Try it today'}` : ''}

RULES:
- Exactly ${wordCount} words (±10%)
- No "as you can see" or "here we have"
- No emojis or stage directions
- Write for SPEAKING, not reading
- End on a memorable note

Just the script, nothing else.`;

  // Try Claude first if available and preferred
  const anthropicClient = preferClaude ? getAnthropic() : null;
  if (anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      log.debug('Using Claude for script generation');
      return response.content[0].text.trim();
    } catch (e) {
      log.warn('Claude failed, falling back', { error: e.message });
    }
  }
  
  // Try Groq (free tier)
  const groqClient = getGroq();
  if (groqClient) {
    try {
      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500
      });
      log.debug('Using Groq for script generation');
      return response.choices[0].message.content.trim();
    } catch (e) {
      log.warn('Groq failed, falling back to OpenAI', { error: e.message });
    }
  }
  
  // OpenAI fallback
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 500
  });
  
  return response.choices[0].message.content.trim();
}

// ============================================================================
// Intelligent Action Generation
// ============================================================================

/**
 * Generate demo actions from analysis with real element selectors
 */
export function generateSmartActions(analysis, options = {}) {
  const {
    duration = 25000,
    viewportWidth = 1920,
    viewportHeight = 1080
  } = options;
  
  const pageInfo = analysis._pageInfo;
  const actions = [];
  let currentTime = 0;
  
  // Use AI-suggested journey if available
  if (analysis.demoJourney?.length > 0) {
    for (const step of analysis.demoJourney) {
      actions.push({
        time: currentTime,
        action: step.action || 'moveTo',
        x: step.x || viewportWidth / 2,
        y: step.y || viewportHeight / 2,
        scrollY: step.scrollY,
        duration: step.duration || 800,
        selector: step.target,
        description: step.narration || step.target
      });
      currentTime += (step.duration || 800) + 200;
    }
    return actions;
  }
  
  // Otherwise, generate from page elements
  const elements = pageInfo?.elements || [];
  
  // 1. Initial pause
  actions.push({
    time: 0,
    action: 'wait',
    duration: 1500,
    description: 'Initial pause - show hero'
  });
  currentTime = 1500;
  
  // 2. Find and highlight primary CTA
  const primaryCTA = elements.find(e => 
    e.type === 'interactive' && 
    e.importance === 'high' &&
    e.rect.y < viewportHeight
  );
  
  if (primaryCTA) {
    actions.push({
      time: currentTime,
      action: 'moveTo',
      x: primaryCTA.rect.centerX,
      y: primaryCTA.rect.centerY,
      selector: primaryCTA.selector,
      duration: 600,
      description: `Highlight CTA: ${primaryCTA.text}`
    });
    currentTime += 800;
    
    actions.push({
      time: currentTime,
      action: 'hover',
      x: primaryCTA.rect.centerX,
      y: primaryCTA.rect.centerY,
      duration: 1000,
      description: 'Pause on CTA'
    });
    currentTime += 1000;
  }
  
  // 3. Scroll through sections
  const sections = pageInfo?.sections || [];
  const pageHeight = pageInfo?.dimensions?.pageHeight || viewportHeight;
  const scrollTargets = sections.length > 0 
    ? sections.slice(1, 4).map(s => s.y)
    : [pageHeight * 0.3, pageHeight * 0.6, pageHeight * 0.9].filter(y => y < pageHeight - viewportHeight);
  
  for (const scrollY of scrollTargets) {
    actions.push({
      time: currentTime,
      action: 'scroll',
      scrollY: Math.min(scrollY, pageHeight - viewportHeight),
      duration: 1000,
      description: 'Scroll to next section'
    });
    currentTime += 1200;
    
    // Find interesting element in this section
    const sectionElement = elements.find(e => 
      e.type === 'interactive' &&
      e.rect.y >= scrollY &&
      e.rect.y < scrollY + viewportHeight
    );
    
    if (sectionElement) {
      actions.push({
        time: currentTime,
        action: 'moveTo',
        x: sectionElement.rect.centerX,
        y: sectionElement.rect.centerY - scrollY,
        selector: sectionElement.selector,
        duration: 500,
        description: `Focus: ${sectionElement.text?.slice(0, 30)}`
      });
      currentTime += 700;
    }
    
    actions.push({
      time: currentTime,
      action: 'wait',
      duration: 2000,
      description: 'Pause to show content'
    });
    currentTime += 2000;
  }
  
  // 4. Return to top
  actions.push({
    time: currentTime,
    action: 'scroll',
    scrollY: 0,
    duration: 800,
    description: 'Return to top'
  });
  currentTime += 1000;
  
  // 5. Final CTA focus
  if (primaryCTA) {
    actions.push({
      time: currentTime,
      action: 'moveTo',
      x: primaryCTA.rect.centerX,
      y: primaryCTA.rect.centerY,
      selector: primaryCTA.selector,
      duration: 500,
      description: 'Final CTA highlight'
    });
    currentTime += 700;
  }
  
  actions.push({
    time: currentTime,
    action: 'wait',
    duration: 1500,
    description: 'End pause'
  });
  
  return actions;
}

// ============================================================================
// Exports
// ============================================================================

export {
  compressForVision,
  getOpenAI,
  getGroq,
  getAnthropic
};

// Re-export original functions for backwards compatibility
export { generateVoiceover } from './ai.js';
