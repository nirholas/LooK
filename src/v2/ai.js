import OpenAI from 'openai';
import { createWriteStream } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';

let openai = null;
let groq = null;

/**
 * Get OpenAI client (lazy initialized)
 * Required for: Vision analysis, TTS voiceover
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
 * Get Groq client (lazy initialized)
 * Used for: Script generation (free tier available)
 * Falls back to OpenAI if GROQ_API_KEY not set
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
 * Check which AI providers are available
 */
export function getAvailableProviders() {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY
  };
}

/**
 * Compress and resize image for GPT-4V (max ~20MB, but smaller is faster)
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
 * Analyze website screenshot with GPT-4 Vision
 */
export async function analyzeWebsite(screenshotBase64, metadata = {}) {
  // Compress image to avoid 500 errors from oversized requests
  const { base64, mimeType } = await compressForVision(screenshotBase64);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing websites and creating engaging demo video scripts.
Analyze the screenshot and return JSON with:
{
  "name": "Product/site name",
  "tagline": "One-line value proposition",
  "description": "2-3 sentence description",
  "targetAudience": "Who this is for",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "focusPoints": [
    {"element": "description", "x": 0-100 (%), "y": 0-100 (%), "importance": "high|medium"}
  ],
  "suggestedActions": [
    {"type": "scroll|click|hover", "target": "description", "reason": "why"}
  ],
  "tone": "professional|casual|technical|friendly"
}`
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
              detail: 'low'  // Use low detail for faster processing
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
 * Generate voiceover script
 * Uses Groq (free) if available, falls back to OpenAI
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
 * Generate voiceover audio using OpenAI TTS
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
 * Suggest demo actions based on analysis
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

