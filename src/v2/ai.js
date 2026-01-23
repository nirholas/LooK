import OpenAI from 'openai';
import { createWriteStream } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';

/**
 * @typedef {import('../types/ai.js').AIProviders} AIProviders
 * @typedef {import('../types/ai.js').WebsiteAnalysis} WebsiteAnalysis
 * @typedef {import('../types/ai.js').WebsiteMetadata} WebsiteMetadata
 * @typedef {import('../types/ai.js').ScriptOptions} ScriptOptions
 * @typedef {import('../types/ai.js').VoiceoverOptions} VoiceoverOptions
 * @typedef {import('../types/ai.js').DemoAction} DemoAction
 * @typedef {import('../types/ai.js').CompressedImage} CompressedImage
 */

/** @type {OpenAI|null} */
let openai = null;

/** @type {OpenAI|null} */
let groq = null;

/**
 * Get OpenAI client (lazy initialized).
 * Required for: Vision analysis, TTS voiceover.
 * 
 * @returns {OpenAI} OpenAI client instance
 * @throws {Error} If OPENAI_API_KEY environment variable is not set
 * @private
 */
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for vision/voiceover. Set it with: export OPENAI_API_KEY=sk-...');
    }
    openai = new OpenAI();
  }
  return openai;
}

/**
 * Get Groq client (lazy initialized).
 * Used for: Script generation (free tier available).
 * Falls back to OpenAI if GROQ_API_KEY not set.
 * 
 * @returns {OpenAI|null} Groq client (OpenAI-compatible) or null if not configured
 * @private
 */
function getGroq() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      return null; // Will fall back to OpenAI
    }
    // Groq uses OpenAI-compatible API
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
  return groq;
}

/**
 * Check which AI providers are available based on environment variables.
 * 
 * Useful for checking configuration before running AI-dependent operations.
 * 
 * @returns {AIProviders} Object indicating which providers are configured
 * @property {boolean} openai - True if OPENAI_API_KEY is set
 * @property {boolean} groq - True if GROQ_API_KEY is set
 * 
 * @example
 * const providers = getAvailableProviders();
 * if (!providers.openai) {
 *   console.log('Set OPENAI_API_KEY for vision and TTS features');
 * }
 */
export function getAvailableProviders() {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY
  };
}

/**
 * Compress and resize image for GPT-4V (max ~20MB, but smaller is faster).
 * 
 * Resizes to max 1024px width and converts to JPEG with 80% quality.
 * This reduces API costs and improves response time.
 * 
 * @param {string} base64Png - Base64-encoded PNG image data
 * @returns {Promise<CompressedImage>} Compressed image with base64 data and MIME type
 * @private
 */
async function compressForVision(base64Png) {
  try {
    const buffer = Buffer.from(base64Png, 'base64');
    
    // Resize to max 1024px width and convert to JPEG with 80% quality
    const compressed = await sharp(buffer)
      .resize(1024, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return {
      base64: compressed.toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch (e) {
    // If sharp fails, return original
    console.warn('Image compression failed, using original:', e.message);
    return {
      base64: base64Png,
      mimeType: 'image/png'
    };
  }
}

/**
 * Analyze website screenshot with GPT-4 Vision.
 * 
 * Uses GPT-4o to analyze a screenshot and extract structured information
 * about the product, including name, tagline, features, and suggested demo actions.
 * 
 * @param {string} screenshotBase64 - Base64-encoded screenshot image
 * @param {WebsiteMetadata} [metadata={}] - Additional context about the website
 * @param {string} [metadata.url] - The page URL
 * @param {string} [metadata.title] - The page title
 * @param {string} [metadata.description] - Meta description
 * @returns {Promise<WebsiteAnalysis>} Structured analysis of the website
 * @throws {Error} If OpenAI API key is not set or API call fails
 * 
 * @example
 * const screenshot = await page.screenshot({ encoding: 'base64' });
 * const analysis = await analyzeWebsite(screenshot, {
 *   url: 'https://example.com',
 *   title: 'Example Product'
 * });
 * console.log(analysis.keyFeatures);
 */
export async function analyzeWebsite(screenshotBase64, metadata = {}) {
  // Compress image to avoid 500 errors from oversized requests
  const { base64, mimeType } = await compressForVision(screenshotBase64);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing websites and creating engaging demo video scripts.
Analyze the screenshot and return a JSON object with this exact structure:
{
  "name": "Product/site name",
  "tagline": "One-line value proposition",
  "description": "2-3 sentence description",
  "targetAudience": "Who this is for",
  "painPoint": "The problem this product solves",
  "uniqueValue": "What makes this different from alternatives",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "focusPoints": [
    {"element": "description", "x": 0-100 (%), "y": 0-100 (%), "importance": "high|medium", "reason": "why to focus here"}
  ],
  "suggestedActions": [
    {"type": "scroll|click|hover", "target": "description", "reason": "why"}
  ],
  "demoJourney": [
    {"step": 1, "action": "type", "target": "what", "duration": ms, "narration": "what to say"}
  ],
  "suggestedHook": "Attention-grabbing opening line",
  "callToAction": "What viewers should do after watching",
  "tone": "professional|casual|technical|friendly",
  "visualStyle": "minimal|colorful|dark|light|corporate"
}

Focus on identifying:
1. The primary call-to-action buttons
2. Key feature sections
3. Hero content and value proposition
4. Navigation structure`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this website. URL: ${metadata.url || 'unknown'}. Title: "${metadata.title || 'Unknown'}".`
          },
          {
            type: 'image_url',
            image_url: { 
              url: `data:${mimeType};base64,${base64}`,
              detail: 'high'  // Use high detail for better element detection
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  const content = response.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Parse error, return raw
  }
  
  return {
    description: content,
    keyFeatures: [],
    focusPoints: [],
    suggestedActions: [],
    tone: 'professional'
  };
}

/**
 * Extract JSON from a string that may contain markdown code blocks or extra text.
 * 
 * @param {string} text - Text potentially containing JSON
 * @returns {string} Extracted JSON string
 * @private
 */
function extractJSON(text) {
  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1];
  }
  
  // Find JSON object or array
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
  return jsonMatch ? jsonMatch[0] : text;
}

/**
 * @typedef {Object} DeepContentAnalysis
 * @property {Array<{type: string, bounds: Object, headline: string, importance: string, demoValue: number, visualInterest: string, suggestedDuration: number}>} sections
 * @property {{problem: string, solution: string, keyBenefit: string, proofPoints: string[]}} productStory
 * @property {Array<{type: string, location: {x: number, y: number}, description: string, trigger: string}>} demoMoments
 * @property {Array<{reason: string, bounds: Object}>} skipRegions
 * @property {string} suggestedNarrative
 * @property {string} transitionHint
 */

/**
 * Deep semantic analysis of a page screenshot.
 * 
 * Performs comprehensive analysis including section identification,
 * product story extraction, demo moments, and skip regions.
 * Uses GPT-4o vision with high detail for accurate element detection.
 * 
 * @param {string} screenshot - Base64-encoded screenshot image
 * @param {Object} [options={}] - Analysis options
 * @param {number} [options.duration=30] - Target demo duration in seconds
 * @param {'features'|'pricing'|'overview'|'technical'} [options.focus='features'] - Analysis focus
 * @returns {Promise<DeepContentAnalysis>} Detailed content analysis
 * @throws {Error} If OpenAI API key is not set or API call fails
 * 
 * @example
 * const screenshot = await page.screenshot({ encoding: 'base64' });
 * const analysis = await deepAnalyzeContent(screenshot, {
 *   duration: 30,
 *   focus: 'features'
 * });
 * console.log(analysis.sections);
 */
export async function deepAnalyzeContent(screenshot, options = {}) {
  const { duration = 30, focus = 'features' } = options;
  
  // Compress image for API
  const { base64, mimeType } = await compressForVision(screenshot);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing product websites for demo videos.

Analyze this screenshot and return detailed JSON with this exact structure:
{
  "sections": [
    {
      "type": "hero|features|pricing|testimonials|cta|footer|header|nav|content",
      "bounds": {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100},
      "headline": "main text in section",
      "importance": "critical|high|medium|low|skip",
      "demoValue": 0-100,
      "visualInterest": "description of notable visual elements",
      "suggestedDuration": 2-8
    }
  ],
  "productStory": {
    "problem": "what problem is being solved (or empty if unclear)",
    "solution": "how it's solved",
    "keyBenefit": "main value proposition",
    "proofPoints": ["social proof elements like testimonials, stats"]
  },
  "demoMoments": [
    {
      "type": "animation|interaction|visual",
      "location": {"x": 0-100, "y": 0-100},
      "description": "what to show/highlight",
      "trigger": "how to trigger it (hover, click, scroll, etc)"
    }
  ],
  "skipRegions": [
    {"reason": "why skip (e.g., legal, social links, repetitive)", "bounds": {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100}}
  ],
  "suggestedNarrative": "brief story arc for presenting this page",
  "transitionHint": "suggestion for what page/section should come next"
}

Guidelines:
- Bounds are percentages of viewport (0-100)
- demoValue: hero=80-100, features=70-90, pricing=60-80, testimonials=50-70, footer=0-20
- suggestedDuration: hero 3-5s, features 2-4s per item, skip regions 0s
- Focus on elements that visually demonstrate the product's value
- Identify animations, hover effects, or interactive elements worth triggering`
      },
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Analyze this page for a ${duration}-second demo. Focus: ${focus}. Identify sections, product story, demo moments, and what to skip.`
          },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:${mimeType};base64,${base64}`,
              detail: 'high'
            } 
          }
        ]
      }
    ],
    max_tokens: 2000
  });

  const content = response.choices[0].message.content;
  
  try {
    return JSON.parse(extractJSON(content));
  } catch (e) {
    console.warn('Failed to parse deep analysis:', e.message);
    // Return minimal valid structure
    return {
      sections: [],
      productStory: { problem: '', solution: '', keyBenefit: '', proofPoints: [] },
      demoMoments: [],
      skipRegions: [],
      suggestedNarrative: '',
      transitionHint: null
    };
  }
}

/**
 * Generate voiceover script from website analysis.
 * Uses Groq (free) if available, falls back to OpenAI.
 * 
 * Creates a natural, engaging script based on the product analysis
 * with configurable style and duration.
 * 
 * @param {WebsiteAnalysis} analysis - Analysis result from analyzeWebsite
 * @param {ScriptOptions} [options={}] - Script generation options
 * @param {number} [options.duration=30] - Target duration in seconds (~2.5 words/sec)
 * @param {'professional'|'casual'|'energetic'|'minimal'} [options.style='professional'] - Script tone
 * @param {boolean} [options.includeCallToAction=true] - Include CTA at the end
 * @param {'groq'|'openai'|null} [options.forceProvider=null] - Force specific AI provider
 * @returns {Promise<string>} Generated voiceover script
 * @throws {Error} If no AI provider is available or API call fails
 * 
 * @example
 * const script = await generateScript(analysis, {
 *   duration: 25,
 *   style: 'casual',
 *   includeCallToAction: true
 * });
 */
export async function generateScript(analysis, options = {}) {
  const {
    duration = 30,
    style = 'professional', // professional, casual, energetic, minimal
    includeCallToAction = true,
    forceProvider = null // 'groq', 'openai', or null for auto
  } = options;

  const wordCount = Math.round(duration * 2.5); // ~2.5 words per second

  const styleGuides = {
    professional: 'Clear, confident, and authoritative. No filler words.',
    casual: 'Friendly and conversational, like talking to a colleague.',
    energetic: 'Excited and dynamic, but not over-the-top.',
    minimal: 'Short and punchy. Get to the point fast.'
  };

  const messages = [
    {
      role: 'system',
      content: `You write voiceover scripts for product demo videos.
Style: ${styleGuides[style] || styleGuides.professional}
Keep it under ${wordCount} words (${duration} seconds when read).
No emojis, stage directions, or timestamps.
Don't say "as you can see" - the viewer knows what they're seeing.`
    },
    {
      role: 'user',
      content: `Write a ${duration}-second voiceover script for:

Name: ${analysis.name || 'this product'}
Tagline: ${analysis.tagline || ''}
Description: ${analysis.description || 'A web application'}
Key Features: ${analysis.keyFeatures?.join(', ') || 'N/A'}
Target Audience: ${analysis.targetAudience || 'developers'}

Structure:
1. Hook (first 5 seconds) - grab attention with a problem or bold statement
2. Value proposition - what does it do and why does it matter
3. Key features (1-2 max)
${includeCallToAction ? '4. Call to action - try it, visit the site, star the repo' : ''}

Just the script, nothing else.`
    }
  ];

  // Try Groq first (free), fall back to OpenAI
  const groqClient = getGroq();
  
  if (groqClient && forceProvider !== 'openai') {
    try {
      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Fast and capable
        messages,
        temperature: 0.7,
        max_tokens: 500
      });
      console.log('  [Using Groq - free tier]');
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.warn('  [Groq failed, falling back to OpenAI]', error.message);
      // Fall through to OpenAI
    }
  }

  // OpenAI fallback
  if (forceProvider === 'groq') {
    throw new Error('Groq requested but GROQ_API_KEY not set or Groq failed');
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 500
  });

  return response.choices[0].message.content.trim();
}

/**
 * Generate voiceover audio using OpenAI TTS.
 * 
 * Converts text script to high-quality MP3 audio using OpenAI's TTS-1-HD model.
 * Supports multiple voices with adjustable speed.
 * 
 * @param {string} script - The text to convert to speech
 * @param {VoiceoverOptions} [options={}] - TTS options
 * @param {'alloy'|'echo'|'fable'|'onyx'|'nova'|'shimmer'} [options.voice='nova'] - Voice selection
 * @param {number} [options.speed=1.0] - Speech speed (0.25 to 4.0)
 * @param {string|null} [options.outputPath=null] - Output file path (temp file if not provided)
 * @returns {Promise<string>} Path to the generated MP3 audio file
 * @throws {Error} If OpenAI API key is not set or TTS fails
 * 
 * @example
 * const audioPath = await generateVoiceover(script, {
 *   voice: 'alloy',
 *   speed: 1.1,
 *   outputPath: './output/voiceover.mp3'
 * });
 */
export async function generateVoiceover(script, options = {}) {
  const {
    voice = 'nova', // alloy, echo, fable, onyx, nova, shimmer
    speed = 1.0,
    outputPath = null
  } = options;

  const tempDir = join(tmpdir(), `repovideo-tts-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  const output = outputPath || join(tempDir, 'voiceover.mp3');

  const response = await getOpenAI().audio.speech.create({
    model: 'tts-1-hd', // Higher quality
    voice,
    input: script,
    speed,
    response_format: 'mp3'
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const writeStream = createWriteStream(output);
  
  await new Promise((resolve, reject) => {
    writeStream.write(buffer, (error) => {
      if (error) reject(error);
      else resolve();
    });
    writeStream.end();
  });

  return output;
}

/**
 * Suggest demo actions based on website analysis.
 * 
 * Creates a sequence of scroll, hover, and wait actions to showcase
 * the key focus points identified by AI analysis.
 * 
 * @param {WebsiteAnalysis} analysis - Analysis result from analyzeWebsite
 * @param {number} viewportWidth - Browser viewport width in pixels
 * @param {number} viewportHeight - Browser viewport height in pixels
 * @returns {DemoAction[]} Array of demo actions to execute
 * 
 * @example
 * const actions = suggestDemoActions(analysis, 1920, 1080);
 * for (const action of actions) {
 *   await executeAction(page, action);
 * }
 */
export function suggestDemoActions(analysis, viewportWidth, viewportHeight) {
  const actions = [];

  // Start with overview
  actions.push({ type: 'wait', duration: 2000 });

  // Scroll through focus points
  for (const point of analysis.focusPoints || []) {
    const x = (point.x / 100) * viewportWidth;
    const y = (point.y / 100) * viewportHeight;

    actions.push({
      type: 'scroll',
      y: Math.max(0, y - viewportHeight / 3),
      wait: 800
    });

    if (point.importance === 'high') {
      actions.push({
        type: 'hover',
        selector: `[data-focus="${point.element}"]`, // Ideally matched to actual selectors
        wait: 1500
      });
    }

    actions.push({ type: 'wait', duration: 2000 });
  }

  // End with scroll to top
  actions.push({ type: 'scroll', y: 0, wait: 1000 });
  actions.push({ type: 'wait', duration: 1500 });

  return actions;
}

/**
 * Generate intelligent demo script based on page elements
 * This creates a sequence of actions that showcases the product naturally
 */
export async function generateDemoScript(analysis, pageInfo, options = {}) {
  const {
    duration = 25000,
    viewportWidth = 1920,
    viewportHeight = 1080,
    interactive = true
  } = options;

  const script = [];
  let currentTime = 0;
  const timePerSection = duration / 5; // Divide into 5 main sections

  // Section 1: Hero / First impression (0-20%)
  script.push({
    time: currentTime,
    action: 'wait',
    duration: 1500,
    description: 'Initial pause to show hero'
  });
  currentTime += 1500;

  // Move around hero area
  script.push({
    time: currentTime,
    action: 'moveTo',
    x: viewportWidth * 0.4,
    y: viewportHeight * 0.35,
    duration: 600,
    description: 'Explore hero section'
  });
  currentTime += 800;

  // Find and highlight primary CTA
  const primaryCta = (pageInfo?.interactiveElements || []).find(el =>
    el.visible &&
    (el.text?.toLowerCase().includes('start') ||
     el.text?.toLowerCase().includes('try') ||
     el.text?.toLowerCase().includes('get'))
  );

  if (primaryCta) {
    script.push({
      time: currentTime,
      action: 'moveTo',
      x: primaryCta.x,
      y: primaryCta.y,
      duration: 500,
      description: 'Highlight primary CTA'
    });
    currentTime += 700;

    script.push({
      time: currentTime,
      action: 'hover',
      x: primaryCta.x,
      y: primaryCta.y,
      duration: 1200,
      description: 'Pause on CTA'
    });
    currentTime += 1200;
  }

  // Section 2-4: Scroll through content
  const maxScroll = (pageInfo?.pageHeight || viewportHeight) - viewportHeight;
  const numScrollSections = Math.min(3, Math.ceil(maxScroll / viewportHeight));
  
  for (let i = 1; i <= numScrollSections; i++) {
    const scrollY = Math.min(maxScroll, (maxScroll / numScrollSections) * i);
    
    script.push({
      time: currentTime,
      action: 'scroll',
      y: scrollY,
      duration: 1000,
      description: `Scroll to section ${i + 1}`
    });
    currentTime += 1200;

    // Highlight interesting element in this section
    script.push({
      time: currentTime,
      action: 'moveTo',
      x: viewportWidth * (0.3 + Math.random() * 0.4),
      y: viewportHeight * 0.4,
      duration: 400,
      description: 'Explore content'
    });
    currentTime += 600;

    script.push({
      time: currentTime,
      action: 'wait',
      duration: Math.min(2000, (duration - currentTime) / 3),
      description: 'Pause to show content'
    });
    currentTime += 2000;
  }

  // Section 5: Return to top and end
  script.push({
    time: currentTime,
    action: 'scroll',
    y: 0,
    duration: 1000,
    description: 'Return to top'
  });
  currentTime += 1200;

  script.push({
    time: currentTime,
    action: 'moveTo',
    x: viewportWidth / 2,
    y: viewportHeight / 2,
    duration: 500,
    description: 'Center cursor for ending'
  });
  currentTime += 500;

  script.push({
    time: currentTime,
    action: 'wait',
    duration: 1000,
    description: 'Final pause'
  });

  return script;
}

/**
 * Calculate optimal demo duration based on page complexity
 */
export function calculateOptimalDuration(pageInfo) {
  const baseTime = 15; // seconds

  // Add time for page scroll
  const scrollSections = Math.ceil((pageInfo.pageHeight || 1080) / (pageInfo.viewportHeight || 1080));
  const scrollTime = Math.min(15, scrollSections * 3);

  // Add time for interactive elements
  const interactiveTime = Math.min(10, (pageInfo.interactiveElements?.length || 0) * 0.5);

  // Total, capped at 45 seconds
  return Math.min(45, baseTime + scrollTime + interactiveTime);
}

/**
 * Generate a compelling hook based on the analysis
 */
export function generateHook(analysis) {
  const templates = [
    `Tired of ${analysis.targetAudience ? `${analysis.targetAudience}` : 'users'} struggling with ${analysis.keyFeatures?.[0] || 'this problem'}? Here's the solution.`,
    `Meet ${analysis.name || 'this tool'} - ${analysis.tagline || 'the smarter way to work'}.`,
    `What if ${analysis.keyFeatures?.[0] || 'your workflow'} could be 10x easier?`,
    `Stop wasting time. Start using ${analysis.name || 'this'}.`,
    `${analysis.name || 'This tool'} does what others can't.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

