/**
 * Product Intelligence - Deep understanding of user products
 * 
 * Extracts the "DNA" of a product to create compelling, accurate demos:
 * - Product category and type detection
 * - Core value proposition extraction
 * - Competitive positioning analysis
 * - Target audience profiling
 * - Key differentiator identification
 * - Pain point and solution mapping
 * 
 * @module product-intelligence
 */

import OpenAI from 'openai';
import sharp from 'sharp';

// ============================================================================
// Client Management
// ============================================================================

/** @type {OpenAI|null} */
let openai = null;

/** @type {OpenAI|null} */
let groq = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for product intelligence');
    }
    openai = new OpenAI();
  }
  return openai;
}

function getGroq() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
  return groq;
}

// ============================================================================
// Product Categories
// ============================================================================

/**
 * Known product categories with their characteristics
 */
export const PRODUCT_CATEGORIES = {
  SAAS_B2B: {
    name: 'B2B SaaS',
    characteristics: ['dashboard', 'team features', 'integrations', 'pricing tiers'],
    demoFocus: ['workflow efficiency', 'team collaboration', 'ROI'],
    typicalJourney: ['landing → features → pricing → signup']
  },
  SAAS_B2C: {
    name: 'B2C SaaS',
    characteristics: ['simple onboarding', 'free tier', 'mobile app'],
    demoFocus: ['ease of use', 'instant value', 'social proof'],
    typicalJourney: ['landing → try it → features → download']
  },
  ECOMMERCE: {
    name: 'E-commerce',
    characteristics: ['product catalog', 'cart', 'checkout', 'reviews'],
    demoFocus: ['product discovery', 'trust signals', 'checkout ease'],
    typicalJourney: ['homepage → category → product → add to cart']
  },
  MARKETPLACE: {
    name: 'Marketplace',
    characteristics: ['search', 'listings', 'filters', 'seller profiles'],
    demoFocus: ['variety', 'trust', 'ease of finding'],
    typicalJourney: ['search → browse → filter → select']
  },
  DEVELOPER_TOOL: {
    name: 'Developer Tool',
    characteristics: ['code examples', 'API docs', 'CLI', 'SDK'],
    demoFocus: ['developer experience', 'integration ease', 'documentation'],
    typicalJourney: ['landing → docs → quickstart → pricing']
  },
  CREATIVE_TOOL: {
    name: 'Creative Tool',
    characteristics: ['canvas', 'export', 'templates', 'collaboration'],
    demoFocus: ['creation flow', 'output quality', 'ease of use'],
    typicalJourney: ['landing → create → edit → export']
  },
  PORTFOLIO: {
    name: 'Portfolio/Personal',
    characteristics: ['about', 'work samples', 'contact', 'resume'],
    demoFocus: ['personality', 'work quality', 'credibility'],
    typicalJourney: ['landing → work → about → contact']
  },
  LANDING_PAGE: {
    name: 'Landing Page',
    characteristics: ['single page', 'CTA focused', 'email capture'],
    demoFocus: ['value prop', 'social proof', 'conversion'],
    typicalJourney: ['scroll through sections → CTA']
  },
  DOCUMENTATION: {
    name: 'Documentation',
    characteristics: ['sidebar nav', 'code blocks', 'search'],
    demoFocus: ['navigation', 'searchability', 'clarity'],
    typicalJourney: ['landing → topic → subtopic → example']
  },
  DASHBOARD: {
    name: 'Dashboard/Analytics',
    characteristics: ['charts', 'metrics', 'filters', 'date range'],
    demoFocus: ['insights', 'customization', 'data visualization'],
    typicalJourney: ['overview → drill down → filter → export']
  }
};

// ============================================================================
// Product DNA
// ============================================================================

/**
 * @typedef {Object} ProductDNA
 * @property {string} name - Product name
 * @property {string} category - Product category
 * @property {string} subcategory - More specific category
 * @property {string} oneLiner - One-line description
 * @property {string} elevatorPitch - 30-second pitch
 * @property {Object} valueProposition
 * @property {string} valueProposition.primary - Main value
 * @property {string[]} valueProposition.secondary - Supporting values
 * @property {Object} audience
 * @property {string} audience.primary - Main target
 * @property {string[]} audience.secondary - Other targets
 * @property {string[]} audience.painPoints - Problems they have
 * @property {Object} positioning
 * @property {string[]} positioning.differentiators - What makes it unique
 * @property {string[]} positioning.alternatives - Competitors/alternatives
 * @property {string} positioning.whyChoose - Why pick this over alternatives
 * @property {Object} story
 * @property {string} story.problem - The problem
 * @property {string} story.solution - How it solves it
 * @property {string} story.transformation - Before → After
 * @property {string[]} features - Key features
 * @property {Object} tone
 * @property {string} tone.voice - Brand voice
 * @property {string} tone.personality - Brand personality
 * @property {string[]} tone.keywords - Key messaging words
 * @property {number} confidence - 0-100 confidence score
 */

/**
 * Extract the complete "DNA" of a product from screenshots and metadata
 * 
 * @param {Object} options - Extraction options
 * @param {string[]} options.screenshots - Base64 screenshots
 * @param {Object} options.pageInfo - Extracted page info
 * @param {string} [options.url] - Product URL
 * @returns {Promise<ProductDNA>} Complete product understanding
 */
export async function extractProductDNA(options) {
  const { screenshots, pageInfo, url } = options;
  
  // Compress screenshots for vision
  const compressedImages = await Promise.all(
    screenshots.slice(0, 3).map(async (base64) => {
      try {
        const buffer = Buffer.from(base64, 'base64');
        const compressed = await sharp(buffer)
          .resize(1536, null, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        return {
          base64: compressed.toString('base64'),
          mimeType: 'image/jpeg'
        };
      } catch {
        return { base64, mimeType: 'image/png' };
      }
    })
  );
  
  // Build context from page info
  const pageContext = pageInfo ? `
URL: ${url || pageInfo.url || 'Unknown'}
Title: ${pageInfo.meta?.title || 'Unknown'}
Description: ${pageInfo.meta?.description || ''}
H1: ${pageInfo.meta?.h1 || ''}
Navigation: ${pageInfo.navigation?.map(n => n.text).join(', ') || ''}
Key text from page:
${pageInfo.elements
  ?.filter(e => e.type === 'heading' || (e.type === 'interactive' && e.importance === 'high'))
  ?.slice(0, 15)
  ?.map(e => `- ${e.text}`)
  ?.join('\n') || ''}
` : '';

  const imageContent = compressedImages.map(img => ({
    type: 'image_url',
    image_url: {
      url: `data:${img.mimeType};base64,${img.base64}`,
      detail: 'high'
    }
  }));

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a world-class product strategist and marketing expert. Your job is to deeply understand products by analyzing their websites.

Analyze the provided screenshots and metadata to extract the complete "DNA" of this product.

Return a JSON object with this EXACT structure:
{
  "name": "Product name (extract from logo/title)",
  "category": "One of: B2B SaaS, B2C SaaS, E-commerce, Marketplace, Developer Tool, Creative Tool, Portfolio, Landing Page, Documentation, Dashboard, Other",
  "subcategory": "More specific (e.g., 'Project Management', 'Design Tool', 'Analytics')",
  "oneLiner": "One sentence that captures what this does (max 15 words)",
  "elevatorPitch": "A compelling 2-3 sentence pitch (max 50 words)",
  "valueProposition": {
    "primary": "The #1 reason to use this (one sentence)",
    "secondary": ["2nd benefit", "3rd benefit", "4th benefit"]
  },
  "audience": {
    "primary": "Main target user (e.g., 'Marketing teams at mid-size companies')",
    "secondary": ["Other target 1", "Other target 2"],
    "painPoints": ["Problem they face 1", "Problem they face 2", "Problem they face 3"]
  },
  "positioning": {
    "differentiators": ["What makes this unique 1", "What makes this unique 2"],
    "alternatives": ["Competitor/alternative 1", "Competitor/alternative 2"],
    "whyChoose": "One sentence on why pick this over alternatives"
  },
  "story": {
    "problem": "The problem in one sentence",
    "solution": "How it solves it in one sentence",
    "transformation": "Before: [old way] → After: [new way with product]"
  },
  "features": ["Key feature 1", "Key feature 2", "Key feature 3", "Key feature 4", "Key feature 5"],
  "tone": {
    "voice": "professional|casual|technical|playful|enterprise|friendly",
    "personality": "One word (e.g., 'innovative', 'trustworthy', 'fun')",
    "keywords": ["word1", "word2", "word3"]
  },
  "confidence": 85
}

IMPORTANT:
- Be specific, not generic. "Helps teams collaborate" is too vague.
- Extract real product name from the logo or title
- Infer the category from visual design and content
- Identify real competitors if you can
- Confidence should be lower if content is unclear`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this product in detail:

${pageContext}

${compressedImages.length > 1 
  ? `I'm providing ${compressedImages.length} screenshots showing different parts of the page.` 
  : 'Here is a screenshot of the page.'}

Extract the complete DNA of this product. Be specific and insightful.`
          },
          ...imageContent
        ]
      }
    ],
    max_tokens: 1500,
    temperature: 0.5
  });

  try {
    const dna = JSON.parse(response.choices[0].message.content);
    return validateProductDNA(dna);
  } catch (e) {
    console.warn('Failed to parse product DNA:', e.message);
    return getDefaultDNA(pageInfo);
  }
}

/**
 * Validate and normalize product DNA
 */
function validateProductDNA(dna) {
  return {
    name: dna.name || 'Unknown Product',
    category: dna.category || 'Other',
    subcategory: dna.subcategory || '',
    oneLiner: dna.oneLiner || dna.elevatorPitch?.split('.')[0] || '',
    elevatorPitch: dna.elevatorPitch || '',
    valueProposition: {
      primary: dna.valueProposition?.primary || '',
      secondary: dna.valueProposition?.secondary || []
    },
    audience: {
      primary: dna.audience?.primary || 'General users',
      secondary: dna.audience?.secondary || [],
      painPoints: dna.audience?.painPoints || []
    },
    positioning: {
      differentiators: dna.positioning?.differentiators || [],
      alternatives: dna.positioning?.alternatives || [],
      whyChoose: dna.positioning?.whyChoose || ''
    },
    story: {
      problem: dna.story?.problem || '',
      solution: dna.story?.solution || '',
      transformation: dna.story?.transformation || ''
    },
    features: dna.features || [],
    tone: {
      voice: dna.tone?.voice || 'professional',
      personality: dna.tone?.personality || 'capable',
      keywords: dna.tone?.keywords || []
    },
    confidence: Math.min(100, Math.max(0, dna.confidence || 50))
  };
}

/**
 * Get default DNA when extraction fails
 */
function getDefaultDNA(pageInfo) {
  return {
    name: pageInfo?.meta?.title?.split(/[|\-–]/)[0]?.trim() || 'Website',
    category: 'Other',
    subcategory: '',
    oneLiner: pageInfo?.meta?.description || '',
    elevatorPitch: '',
    valueProposition: { primary: '', secondary: [] },
    audience: { primary: 'General users', secondary: [], painPoints: [] },
    positioning: { differentiators: [], alternatives: [], whyChoose: '' },
    story: { problem: '', solution: '', transformation: '' },
    features: [],
    tone: { voice: 'professional', personality: 'capable', keywords: [] },
    confidence: 20
  };
}

// ============================================================================
// Product Understanding Enhancement
// ============================================================================

/**
 * Enrich product DNA with additional context
 * Uses multiple AI calls to deepen understanding
 * 
 * @param {ProductDNA} dna - Initial product DNA
 * @param {Object} options - Enrichment options
 * @returns {Promise<ProductDNA>} Enriched DNA
 */
export async function enrichProductDNA(dna, options = {}) {
  const { includeCompetitorAnalysis = false, includeToneAnalysis = true } = options;
  
  const client = getGroq() || getOpenAI();
  const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
  
  const tasks = [];
  
  // Deepen audience understanding
  tasks.push(
    client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You're a user research expert. Given a product, provide deeper audience insights.
Return JSON: { "personas": [{ "name": "string", "role": "string", "goals": ["string"], "frustrations": ["string"] }], "useCases": ["string"] }`
        },
        {
          role: 'user',
          content: `Product: ${dna.name}
Category: ${dna.category}
Value: ${dna.valueProposition.primary}
Audience: ${dna.audience.primary}
Pain points: ${dna.audience.painPoints.join(', ')}

Provide 2-3 detailed personas and 3-5 specific use cases.`
        }
      ],
      max_tokens: 500
    })
  );
  
  // Deepen messaging
  tasks.push(
    client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You're a copywriter. Create compelling messaging for a product.
Return JSON: { "headlines": ["string"], "hooks": ["string"], "ctas": ["string"], "socialProof": "string" }`
        },
        {
          role: 'user',
          content: `Product: ${dna.name}
One-liner: ${dna.oneLiner}
Value: ${dna.valueProposition.primary}
Differentiators: ${dna.positioning.differentiators.join(', ')}
Tone: ${dna.tone.voice}

Create 3 headlines, 3 hooks for demos, and 3 CTAs.`
        }
      ],
      max_tokens: 400
    })
  );
  
  const results = await Promise.all(tasks);
  
  // Merge results into DNA
  const enriched = { ...dna };
  
  try {
    const audienceData = JSON.parse(results[0].choices[0].message.content);
    enriched.audience = {
      ...enriched.audience,
      personas: audienceData.personas || [],
      useCases: audienceData.useCases || []
    };
  } catch {}
  
  try {
    const messagingData = JSON.parse(results[1].choices[0].message.content);
    enriched.messaging = {
      headlines: messagingData.headlines || [],
      hooks: messagingData.hooks || [],
      ctas: messagingData.ctas || [],
      socialProof: messagingData.socialProof || ''
    };
  } catch {}
  
  return enriched;
}

// ============================================================================
// Smart Product Comparison
// ============================================================================

/**
 * Compare this product to known categories to inform demo strategy
 * 
 * @param {ProductDNA} dna - Product DNA
 * @returns {Object} Category match and demo recommendations
 */
export function analyzeProductCategory(dna) {
  const category = PRODUCT_CATEGORIES[dna.category.toUpperCase().replace(/[\s-]/g, '_')] 
    || PRODUCT_CATEGORIES.SAAS_B2B;
  
  // Calculate match scores
  const scores = Object.entries(PRODUCT_CATEGORIES).map(([key, cat]) => {
    let score = 0;
    
    // Check if name matches
    if (dna.category.toLowerCase().includes(cat.name.toLowerCase())) {
      score += 50;
    }
    
    // Check characteristics match
    const lowerFeatures = dna.features.map(f => f.toLowerCase()).join(' ');
    cat.characteristics.forEach(char => {
      if (lowerFeatures.includes(char)) score += 10;
    });
    
    return { key, name: cat.name, score, category: cat };
  });
  
  scores.sort((a, b) => b.score - a.score);
  const bestMatch = scores[0];
  
  return {
    matchedCategory: bestMatch.name,
    confidence: Math.min(100, bestMatch.score),
    demoFocus: bestMatch.category.demoFocus,
    typicalJourney: bestMatch.category.typicalJourney,
    characteristics: bestMatch.category.characteristics,
    recommendations: generateDemoRecommendations(dna, bestMatch.category)
  };
}

/**
 * Generate demo recommendations based on product and category
 */
function generateDemoRecommendations(dna, category) {
  const recommendations = [];
  
  // Story arc recommendation
  if (dna.story.problem && dna.story.solution) {
    recommendations.push({
      type: 'story',
      priority: 'high',
      suggestion: `Start with the problem: "${dna.story.problem}" then show the solution.`
    });
  }
  
  // Feature highlight recommendation
  if (dna.features.length >= 3) {
    recommendations.push({
      type: 'features',
      priority: 'high',
      suggestion: `Highlight top 3 features: ${dna.features.slice(0, 3).join(', ')}`
    });
  }
  
  // Differentiator recommendation
  if (dna.positioning.differentiators.length > 0) {
    recommendations.push({
      type: 'positioning',
      priority: 'medium',
      suggestion: `Emphasize what's unique: ${dna.positioning.differentiators[0]}`
    });
  }
  
  // Category-specific recommendations
  category.demoFocus.forEach(focus => {
    recommendations.push({
      type: 'category',
      priority: 'medium',
      suggestion: `For ${category.name}, focus on: ${focus}`
    });
  });
  
  // Tone recommendation
  recommendations.push({
    type: 'tone',
    priority: 'low',
    suggestion: `Match brand tone: ${dna.tone.voice}, ${dna.tone.personality}`
  });
  
  return recommendations;
}

// ============================================================================
// Product Intelligence Class
// ============================================================================

/**
 * Main class for product intelligence
 */
export class ProductIntelligence {
  /**
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.options = options;
    this.dna = null;
    this.categoryAnalysis = null;
  }
  
  /**
   * Analyze a product from page
   * @param {import('playwright').Page} page - Playwright page
   * @returns {Promise<ProductDNA>}
   */
  async analyze(page) {
    // Capture screenshots
    const screenshots = await this.captureScreenshots(page);
    
    // Extract page info
    const pageInfo = await this.extractPageInfo(page);
    
    // Extract DNA
    this.dna = await extractProductDNA({
      screenshots: screenshots.map(s => s.base64),
      pageInfo,
      url: page.url()
    });
    
    // Analyze category
    this.categoryAnalysis = analyzeProductCategory(this.dna);
    
    return this.dna;
  }
  
  /**
   * Capture screenshots for analysis
   */
  async captureScreenshots(page, maxScreenshots = 3) {
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    
    const screenshots = [];
    const scrollStep = viewportHeight - 100;
    const numCaptures = Math.min(maxScreenshots, Math.ceil(pageHeight / scrollStep));
    
    for (let i = 0; i < numCaptures; i++) {
      const scrollY = Math.min(i * scrollStep, pageHeight - viewportHeight);
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
      await page.waitForTimeout(200);
      
      const screenshot = await page.screenshot({ encoding: 'base64' });
      screenshots.push({ base64: screenshot, scrollY, index: i });
    }
    
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    return screenshots;
  }
  
  /**
   * Extract structured page info
   */
  async extractPageInfo(page) {
    return page.evaluate(() => {
      const getSelector = (el) => {
        if (el.id) return `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length) return '.' + classes.join('.');
        }
        return el.tagName.toLowerCase();
      };
      
      const elements = [];
      
      // Get interactive elements
      document.querySelectorAll('button, a[href], [role="button"], input[type="submit"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (!text) return;
        
        elements.push({
          type: 'interactive',
          text: text.slice(0, 100),
          importance: text.toLowerCase().match(/start|try|sign|get|buy|demo/) ? 'high' : 'medium',
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      });
      
      // Get headings
      document.querySelectorAll('h1, h2, h3').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        
        elements.push({
          type: 'heading',
          text: el.textContent.trim().slice(0, 200),
          level: parseInt(el.tagName[1]),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      });
      
      return {
        url: window.location.href,
        meta: {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          h1: document.querySelector('h1')?.textContent?.trim() || ''
        },
        navigation: Array.from(document.querySelectorAll('nav a, header a')).slice(0, 10).map(el => ({
          text: el.textContent.trim().slice(0, 50),
          href: el.getAttribute('href')
        })),
        elements,
        dimensions: {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight
        }
      };
    });
  }
  
  /**
   * Get demo strategy based on product intelligence
   * @returns {Object} Demo strategy
   */
  getDemoStrategy() {
    if (!this.dna || !this.categoryAnalysis) {
      throw new Error('Call analyze() first');
    }
    
    return {
      product: this.dna,
      category: this.categoryAnalysis.matchedCategory,
      focus: this.categoryAnalysis.demoFocus,
      journey: this.categoryAnalysis.typicalJourney,
      recommendations: this.categoryAnalysis.recommendations,
      narrative: {
        hook: this.dna.messaging?.hooks?.[0] || this.dna.oneLiner,
        story: this.dna.story,
        cta: this.dna.messaging?.ctas?.[0] || 'Try it today'
      }
    };
  }
  
  /**
   * Generate optimized demo script based on intelligence
   * @param {number} durationSeconds - Target duration
   * @returns {Promise<Object>} Demo script
   */
  async generateDemoScript(durationSeconds = 30) {
    if (!this.dna) {
      throw new Error('Call analyze() first');
    }
    
    const client = getGroq() || getOpenAI();
    const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
    
    const response = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You create demo video scripts that convert viewers into users.
          
Return JSON:
{
  "hook": "Opening line that grabs attention (first 3 seconds)",
  "problem": "State the problem they have (5 seconds)",
  "solution": "Introduce your solution (5 seconds)",
  "features": [
    { "name": "feature", "benefit": "why it matters", "duration": seconds }
  ],
  "socialProof": "Quick trust signal (3 seconds)",
  "cta": "Clear call to action (5 seconds)",
  "totalDuration": seconds
}

Guidelines:
- Hook must be attention-grabbing
- Problem should resonate emotionally
- Features show benefit, not just function
- CTA should be specific and actionable`
        },
        {
          role: 'user',
          content: `Create a ${durationSeconds}-second demo script for:

Product: ${this.dna.name}
Category: ${this.dna.category}
Value: ${this.dna.valueProposition.primary}
Problem: ${this.dna.story.problem}
Solution: ${this.dna.story.solution}
Features: ${this.dna.features.join(', ')}
Differentiators: ${this.dna.positioning.differentiators.join(', ')}
Audience: ${this.dna.audience.primary}
Tone: ${this.dna.tone.voice}

Create a compelling script that converts.`
        }
      ],
      max_tokens: 800
    });
    
    try {
      return JSON.parse(response.choices[0].message.content);
    } catch {
      return {
        hook: this.dna.oneLiner,
        problem: this.dna.story.problem,
        solution: this.dna.story.solution,
        features: this.dna.features.slice(0, 3).map(f => ({ name: f, benefit: '', duration: 5 })),
        cta: 'Try it today',
        totalDuration: durationSeconds
      };
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ProductIntelligence;
