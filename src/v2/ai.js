import OpenAI from 'openai';
import { createWriteStream } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';

const openai = new OpenAI();

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
  
  const response = await openai.chat.completions.create({
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
 */
export async function generateScript(analysis, options = {}) {
  const {
    duration = 30,
    style = 'professional', // professional, casual, energetic, minimal
    includeCallToAction = true
  } = options;

  const wordCount = Math.round(duration * 2.5); // ~2.5 words per second

  const styleGuides = {
    professional: 'Clear, confident, and authoritative. No filler words.',
    casual: 'Friendly and conversational, like talking to a colleague.',
    energetic: 'Excited and dynamic, but not over-the-top.',
    minimal: 'Short and punchy. Get to the point fast.'
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
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
    ],
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

  const response = await openai.audio.speech.create({
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
