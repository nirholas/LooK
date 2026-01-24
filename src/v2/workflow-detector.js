/**
 * Workflow Detector - Intelligent detection of user workflows and journeys
 * 
 * Identifies common patterns in web applications:
 * - Authentication flows (login, signup, password reset)
 * - CRUD operations (create, read, update, delete)
 * - Onboarding sequences
 * - E-commerce flows (browse, add to cart, checkout)
 * - Search and filter patterns
 * - Multi-step wizards
 * 
 * @module workflow-detector
 */

import OpenAI from 'openai';
import { createLogger } from './logger.js';

const log = createLogger('workflow-detector');

// ============================================================================
// Client Management
// ============================================================================

let openai = null;
let groq = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
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
// Workflow Patterns
// ============================================================================

/**
 * Known workflow patterns with detection signatures
 */
export const WORKFLOW_PATTERNS = {
  AUTH_LOGIN: {
    name: 'Login Flow',
    type: 'authentication',
    indicators: ['login', 'sign in', 'email', 'password', 'forgot password'],
    elements: ['input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
    demoValue: 60,
    skipReason: 'Usually skip unless demoing auth feature'
  },
  AUTH_SIGNUP: {
    name: 'Signup Flow',
    type: 'authentication',
    indicators: ['sign up', 'register', 'create account', 'get started', 'join'],
    elements: ['input[name*="email"]', 'input[name*="password"]', 'input[name*="name"]'],
    demoValue: 75,
    skipReason: null // Good to demo for SaaS
  },
  ONBOARDING: {
    name: 'Onboarding Wizard',
    type: 'onboarding',
    indicators: ['welcome', 'step 1', 'get started', 'next', 'skip', 'progress'],
    elements: ['.stepper', '.progress', '[class*="wizard"]', '[class*="onboard"]'],
    demoValue: 90,
    skipReason: null // Highly demo-worthy
  },
  CRUD_CREATE: {
    name: 'Create/Add Flow',
    type: 'crud',
    indicators: ['create', 'add', 'new', 'compose', 'write', 'upload'],
    elements: ['button', 'form', 'textarea', 'input[type="file"]'],
    demoValue: 95,
    skipReason: null // Core demo action
  },
  CRUD_EDIT: {
    name: 'Edit Flow',
    type: 'crud',
    indicators: ['edit', 'update', 'modify', 'save', 'change'],
    elements: ['form', 'input', 'textarea', '[contenteditable]'],
    demoValue: 80,
    skipReason: null
  },
  SEARCH_FILTER: {
    name: 'Search & Filter',
    type: 'navigation',
    indicators: ['search', 'filter', 'sort', 'find', 'browse'],
    elements: ['input[type="search"]', '[class*="filter"]', '[class*="search"]', 'select'],
    demoValue: 85,
    skipReason: null // Shows product capabilities
  },
  ECOMMERCE_BROWSE: {
    name: 'Product Browsing',
    type: 'ecommerce',
    indicators: ['products', 'shop', 'catalog', 'collection', 'items'],
    elements: ['.product', '[class*="card"]', '[class*="grid"]', '[class*="listing"]'],
    demoValue: 80,
    skipReason: null
  },
  ECOMMERCE_CART: {
    name: 'Add to Cart',
    type: 'ecommerce',
    indicators: ['add to cart', 'buy', 'purchase', 'cart', 'bag'],
    elements: ['[class*="cart"]', 'button[class*="add"]', '[class*="buy"]'],
    demoValue: 90,
    skipReason: null // Key conversion moment
  },
  ECOMMERCE_CHECKOUT: {
    name: 'Checkout Flow',
    type: 'ecommerce',
    indicators: ['checkout', 'payment', 'shipping', 'order', 'billing'],
    elements: ['form', '[class*="checkout"]', '[class*="payment"]'],
    demoValue: 70,
    skipReason: 'May want to skip actual payment'
  },
  SETTINGS: {
    name: 'Settings/Preferences',
    type: 'configuration',
    indicators: ['settings', 'preferences', 'account', 'profile', 'configuration'],
    elements: ['form', 'input', 'select', 'toggle', '[class*="setting"]'],
    demoValue: 40,
    skipReason: 'Usually skip unless core feature'
  },
  DASHBOARD: {
    name: 'Dashboard View',
    type: 'analytics',
    indicators: ['dashboard', 'overview', 'analytics', 'metrics', 'stats'],
    elements: ['[class*="chart"]', '[class*="graph"]', '[class*="metric"]', 'canvas', 'svg'],
    demoValue: 85,
    skipReason: null // Shows value immediately
  },
  MESSAGING: {
    name: 'Messaging/Chat',
    type: 'communication',
    indicators: ['message', 'chat', 'conversation', 'inbox', 'send'],
    elements: ['[class*="chat"]', '[class*="message"]', 'textarea', '[contenteditable]'],
    demoValue: 75,
    skipReason: null
  },
  COLLABORATION: {
    name: 'Collaboration',
    type: 'teamwork',
    indicators: ['share', 'invite', 'team', 'collaborate', 'comment', 'mention'],
    elements: ['[class*="share"]', '[class*="invite"]', '[class*="collab"]'],
    demoValue: 85,
    skipReason: null // Key SaaS differentiator
  },
  EXPORT: {
    name: 'Export/Download',
    type: 'output',
    indicators: ['export', 'download', 'save as', 'generate', 'publish'],
    elements: ['button', 'a[download]', '[class*="export"]'],
    demoValue: 70,
    skipReason: null // Shows final output
  }
};

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * @typedef {Object} DetectedWorkflow
 * @property {string} id - Unique workflow ID
 * @property {string} name - Human-readable name
 * @property {string} type - Workflow category
 * @property {number} confidence - 0-100 detection confidence
 * @property {number} demoValue - 0-100 how good for demos
 * @property {Object[]} steps - Detected steps
 * @property {Object[]} triggers - Elements that trigger workflow
 * @property {string|null} skipReason - Why to skip (null if should demo)
 * @property {Object} metadata - Additional info
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {number} order - Step number
 * @property {string} action - What to do
 * @property {string} selector - Element selector
 * @property {string} description - What happens
 * @property {number} duration - Estimated duration in ms
 * @property {boolean} isOptional - Can skip
 */

// ============================================================================
// Workflow Detector Class
// ============================================================================

/**
 * Detects user workflows on a page
 */
export class WorkflowDetector {
  /**
   * @param {import('playwright').Page} page - Playwright page
   * @param {Object} options - Configuration
   */
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      minConfidence: options.minConfidence ?? 50,
      includeAuth: options.includeAuth ?? false,
      maxWorkflows: options.maxWorkflows ?? 10,
      ...options
    };
    
    /** @type {DetectedWorkflow[]} */
    this.workflows = [];
    
    /** @type {Object} */
    this.pageContext = null;
  }
  
  /**
   * Detect all workflows on the current page
   * @returns {Promise<DetectedWorkflow[]>}
   */
  async detectWorkflows() {
    // Extract page context
    this.pageContext = await this.extractPageContext();
    
    // Run pattern-based detection
    const patternWorkflows = await this.detectByPatterns();
    
    // Run AI-enhanced detection if available
    let aiWorkflows = [];
    if (getOpenAI() || getGroq()) {
      aiWorkflows = await this.detectWithAI();
    }
    
    // Merge and deduplicate
    this.workflows = this.mergeWorkflows(patternWorkflows, aiWorkflows);
    
    // Filter by options
    return this.filterWorkflows();
  }
  
  /**
   * Extract page context for workflow detection
   */
  async extractPageContext() {
    return this.page.evaluate(() => {
      // Get all text content
      const getText = () => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text.length > 2 && text.length < 100) {
            texts.push(text.toLowerCase());
          }
        }
        return texts;
      };
      
      // Get interactive elements
      const getInteractives = () => {
        const elements = [];
        const selectors = [
          'button', 'a[href]', 'input', 'select', 'textarea',
          '[role="button"]', '[onclick]', '[class*="btn"]'
        ];
        
        document.querySelectorAll(selectors.join(',')).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
          const classes = (el.className || '').toString().toLowerCase();
          const type = el.tagName.toLowerCase();
          const inputType = el.getAttribute('type');
          
          elements.push({
            text: text.slice(0, 100),
            classes,
            type,
            inputType,
            id: el.id,
            name: el.name,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute('aria-label'),
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          });
        });
        
        return elements;
      };
      
      // Get forms
      const getForms = () => {
        return Array.from(document.forms).map(form => ({
          id: form.id,
          action: form.action,
          method: form.method,
          fields: Array.from(form.elements).map(el => ({
            type: el.type,
            name: el.name,
            placeholder: el.placeholder
          })).filter(f => f.name)
        }));
      };
      
      // Get navigation context
      const getNavContext = () => ({
        url: window.location.href,
        pathname: window.location.pathname,
        hash: window.location.hash,
        title: document.title
      });
      
      return {
        texts: getText(),
        interactives: getInteractives(),
        forms: getForms(),
        nav: getNavContext(),
        bodyClasses: document.body.className?.toLowerCase() || ''
      };
    });
  }
  
  /**
   * Detect workflows using pattern matching
   */
  async detectByPatterns() {
    const detected = [];
    const context = this.pageContext;
    
    // Combine all text for matching
    const allText = [
      ...context.texts,
      ...context.interactives.map(i => i.text),
      ...context.interactives.map(i => i.classes),
      context.bodyClasses,
      context.nav.pathname
    ].join(' ');
    
    for (const [key, pattern] of Object.entries(WORKFLOW_PATTERNS)) {
      let score = 0;
      const matchedIndicators = [];
      const matchedElements = [];
      
      // Check text indicators
      for (const indicator of pattern.indicators) {
        if (allText.includes(indicator)) {
          score += 20;
          matchedIndicators.push(indicator);
        }
      }
      
      // Check element selectors (would need to query page)
      const elementScores = await this.checkElements(pattern.elements);
      score += elementScores.score;
      matchedElements.push(...elementScores.matched);
      
      // Add workflow if confidence threshold met
      const confidence = Math.min(100, score);
      if (confidence >= this.options.minConfidence) {
        detected.push({
          id: key,
          name: pattern.name,
          type: pattern.type,
          confidence,
          demoValue: pattern.demoValue,
          steps: this.inferSteps(pattern, matchedElements),
          triggers: matchedElements,
          skipReason: pattern.skipReason,
          metadata: {
            matchedIndicators,
            matchedElements,
            patternKey: key
          }
        });
      }
    }
    
    return detected;
  }
  
  /**
   * Check for pattern elements on page
   */
  async checkElements(selectors) {
    const results = await this.page.evaluate((sels) => {
      const matched = [];
      let score = 0;
      
      for (const sel of sels) {
        try {
          const elements = document.querySelectorAll(sel);
          if (elements.length > 0) {
            score += 15;
            matched.push({
              selector: sel,
              count: elements.length,
              firstText: elements[0].textContent?.trim().slice(0, 50)
            });
          }
        } catch {}
      }
      
      return { score, matched };
    }, selectors);
    
    return results;
  }
  
  /**
   * Infer workflow steps from pattern and elements
   */
  inferSteps(pattern, elements) {
    const steps = [];
    
    // Add trigger step
    if (elements.length > 0) {
      steps.push({
        order: 1,
        action: 'click',
        selector: elements[0].selector,
        description: `Start ${pattern.name}`,
        duration: 500,
        isOptional: false
      });
    }
    
    // Add type-specific steps
    if (pattern.type === 'authentication') {
      steps.push(
        { order: 2, action: 'type', selector: 'input[type="email"]', description: 'Enter email', duration: 1500, isOptional: false },
        { order: 3, action: 'type', selector: 'input[type="password"]', description: 'Enter password', duration: 1000, isOptional: false },
        { order: 4, action: 'click', selector: 'button[type="submit"]', description: 'Submit', duration: 500, isOptional: false }
      );
    } else if (pattern.type === 'crud') {
      steps.push(
        { order: 2, action: 'fill', selector: 'input, textarea', description: 'Fill in details', duration: 2000, isOptional: false },
        { order: 3, action: 'click', selector: 'button[type="submit"], [class*="save"]', description: 'Save', duration: 500, isOptional: false }
      );
    } else if (pattern.type === 'ecommerce') {
      steps.push(
        { order: 2, action: 'click', selector: '[class*="product"], [class*="item"]', description: 'Select item', duration: 500, isOptional: false },
        { order: 3, action: 'click', selector: '[class*="cart"], [class*="add"]', description: 'Add to cart', duration: 500, isOptional: false }
      );
    }
    
    return steps;
  }
  
  /**
   * Detect workflows using AI
   */
  async detectWithAI() {
    const client = getGroq() || getOpenAI();
    if (!client) return [];
    
    const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
    
    // Simplify context for AI
    const simplifiedContext = {
      url: this.pageContext.nav.pathname,
      title: this.pageContext.nav.title,
      buttons: this.pageContext.interactives
        .filter(i => i.type === 'button' || i.classes.includes('btn'))
        .slice(0, 15)
        .map(i => i.text),
      inputs: this.pageContext.interactives
        .filter(i => i.type === 'input')
        .slice(0, 10)
        .map(i => i.placeholder || i.name || i.inputType),
      forms: this.pageContext.forms.slice(0, 3),
      keyTexts: this.pageContext.texts.slice(0, 30)
    };
    
    try {
      const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You detect user workflows on web pages. Analyze the page context and identify what actions users can take.

Return JSON:
{
  "workflows": [
    {
      "name": "Human readable name",
      "type": "authentication|crud|navigation|ecommerce|communication|configuration|analytics",
      "confidence": 0-100,
      "demoValue": 0-100,
      "description": "What this workflow does",
      "steps": [
        { "action": "click|type|scroll|select", "target": "what to interact with", "description": "what happens" }
      ],
      "demoRecommendation": "How to showcase this in a demo"
    }
  ]
}

Focus on actions that demonstrate product value. Skip mundane tasks like cookie consent.`
          },
          {
            role: 'user',
            content: `Analyze this page for user workflows:

URL: ${simplifiedContext.url}
Title: ${simplifiedContext.title}

Buttons/CTAs: ${simplifiedContext.buttons.join(', ')}

Input fields: ${simplifiedContext.inputs.join(', ')}

Forms: ${JSON.stringify(simplifiedContext.forms)}

Page text includes: ${simplifiedContext.keyTexts.join(', ')}

What workflows can users perform here?`
          }
        ],
        max_tokens: 800,
        temperature: 0.5
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      return (result.workflows || []).map((w, i) => ({
        id: `ai_workflow_${i}`,
        name: w.name,
        type: w.type,
        confidence: w.confidence,
        demoValue: w.demoValue,
        steps: (w.steps || []).map((s, j) => ({
          order: j + 1,
          action: s.action,
          selector: s.target,
          description: s.description,
          duration: 1000,
          isOptional: false
        })),
        triggers: [],
        skipReason: null,
        metadata: {
          source: 'ai',
          recommendation: w.demoRecommendation
        }
      }));
    } catch (e) {
      log.warn('AI workflow detection failed', { error: e.message });
      return [];
    }
  }
  
  /**
   * Merge pattern and AI workflows
   */
  mergeWorkflows(patternWorkflows, aiWorkflows) {
    const merged = new Map();
    
    // Add pattern workflows
    for (const w of patternWorkflows) {
      merged.set(w.id, w);
    }
    
    // Merge or add AI workflows
    for (const w of aiWorkflows) {
      const existing = Array.from(merged.values()).find(
        e => e.type === w.type && e.name.toLowerCase().includes(w.name.toLowerCase().split(' ')[0])
      );
      
      if (existing) {
        // Merge: boost confidence, add AI recommendation
        existing.confidence = Math.min(100, existing.confidence + 10);
        existing.metadata.aiRecommendation = w.metadata?.recommendation;
      } else {
        merged.set(w.id, w);
      }
    }
    
    return Array.from(merged.values());
  }
  
  /**
   * Filter workflows by options
   */
  filterWorkflows() {
    let filtered = this.workflows;
    
    // Filter auth if not wanted
    if (!this.options.includeAuth) {
      filtered = filtered.filter(w => w.type !== 'authentication');
    }
    
    // Sort by demo value
    filtered.sort((a, b) => b.demoValue - a.demoValue);
    
    // Limit count
    return filtered.slice(0, this.options.maxWorkflows);
  }
  
  /**
   * Get workflows sorted for demo
   * @returns {DetectedWorkflow[]}
   */
  getDemoWorkflows() {
    return this.workflows
      .filter(w => !w.skipReason)
      .sort((a, b) => b.demoValue - a.demoValue);
  }
  
  /**
   * Get the best workflow to demonstrate
   * @returns {DetectedWorkflow|null}
   */
  getBestWorkflow() {
    const demos = this.getDemoWorkflows();
    return demos.length > 0 ? demos[0] : null;
  }
  
  /**
   * Generate demo actions from workflow
   * @param {DetectedWorkflow} workflow
   * @returns {Object[]}
   */
  generateDemoActions(workflow) {
    const actions = [];
    let time = 0;
    
    for (const step of workflow.steps) {
      actions.push({
        time,
        action: step.action,
        selector: step.selector,
        description: step.description,
        duration: step.duration,
        narration: step.description
      });
      time += step.duration + 500; // Add pause between steps
    }
    
    return actions;
  }
  
  /**
   * Get workflow summary for demo planning
   * @returns {Object}
   */
  getSummary() {
    const byType = {};
    for (const w of this.workflows) {
      if (!byType[w.type]) byType[w.type] = [];
      byType[w.type].push(w.name);
    }
    
    return {
      totalWorkflows: this.workflows.length,
      demoWorthy: this.workflows.filter(w => !w.skipReason).length,
      byType,
      bestWorkflow: this.getBestWorkflow()?.name || null,
      recommendations: this.workflows
        .filter(w => w.metadata?.aiRecommendation)
        .map(w => ({ name: w.name, recommendation: w.metadata.aiRecommendation }))
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick workflow detection
 * @param {import('playwright').Page} page
 * @returns {Promise<DetectedWorkflow[]>}
 */
export async function detectWorkflows(page, options = {}) {
  const detector = new WorkflowDetector(page, options);
  return detector.detectWorkflows();
}

/**
 * Get best demo workflow
 * @param {import('playwright').Page} page
 * @returns {Promise<DetectedWorkflow|null>}
 */
export async function getBestDemoWorkflow(page, options = {}) {
  const detector = new WorkflowDetector(page, options);
  await detector.detectWorkflows();
  return detector.getBestWorkflow();
}

export default WorkflowDetector;
