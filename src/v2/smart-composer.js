/**
 * Smart Composer - Story-driven demo composition
 * 
 * Creates compelling demo videos with:
 * - Emotional story arc (hook, problem, solution, proof, CTA)
 * - Intelligent pacing based on content importance
 * - Smooth visual transitions
 * - Coordinated narration timing
 * - Professional camera movements (zoom, pan)
 * 
 * @module smart-composer
 */

import OpenAI from 'openai';

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
// Story Arc Templates
// ============================================================================

/**
 * Story arc templates for different demo types
 */
export const STORY_ARCS = {
  PROBLEM_SOLUTION: {
    name: 'Problem → Solution',
    description: 'Classic approach: present problem, show solution',
    phases: [
      { name: 'hook', duration: 0.10, emotion: 'curiosity', action: 'grab attention' },
      { name: 'problem', duration: 0.15, emotion: 'frustration', action: 'state the pain' },
      { name: 'solution', duration: 0.20, emotion: 'relief', action: 'introduce product' },
      { name: 'demo', duration: 0.35, emotion: 'excitement', action: 'show key features' },
      { name: 'proof', duration: 0.10, emotion: 'trust', action: 'social proof' },
      { name: 'cta', duration: 0.10, emotion: 'motivation', action: 'call to action' }
    ],
    bestFor: ['B2B SaaS', 'Developer Tool', 'Productivity']
  },
  TRANSFORMATION: {
    name: 'Before → After',
    description: 'Show the transformation your product enables',
    phases: [
      { name: 'hook', duration: 0.10, emotion: 'intrigue', action: 'promise transformation' },
      { name: 'before', duration: 0.15, emotion: 'empathy', action: 'show old way' },
      { name: 'transition', duration: 0.10, emotion: 'anticipation', action: 'introduce change' },
      { name: 'after', duration: 0.35, emotion: 'delight', action: 'show new way' },
      { name: 'results', duration: 0.15, emotion: 'confidence', action: 'prove the difference' },
      { name: 'cta', duration: 0.15, emotion: 'urgency', action: 'get started' }
    ],
    bestFor: ['Creative Tool', 'E-commerce', 'B2C SaaS']
  },
  FEATURE_SHOWCASE: {
    name: 'Feature Tour',
    description: 'Walk through key features systematically',
    phases: [
      { name: 'intro', duration: 0.10, emotion: 'excitement', action: 'introduce product' },
      { name: 'feature1', duration: 0.20, emotion: 'interest', action: 'show best feature' },
      { name: 'feature2', duration: 0.20, emotion: 'appreciation', action: 'show second feature' },
      { name: 'feature3', duration: 0.20, emotion: 'impressed', action: 'show third feature' },
      { name: 'integration', duration: 0.15, emotion: 'confidence', action: 'show how it fits' },
      { name: 'cta', duration: 0.15, emotion: 'motivated', action: 'try it now' }
    ],
    bestFor: ['Dashboard', 'Complex SaaS', 'Developer Tool']
  },
  QUICK_DEMO: {
    name: 'Speed Demo',
    description: 'Fast-paced showcase for short attention spans',
    phases: [
      { name: 'hook', duration: 0.15, emotion: 'curiosity', action: 'bold claim' },
      { name: 'demo', duration: 0.55, emotion: 'amazement', action: 'rapid feature showcase' },
      { name: 'value', duration: 0.15, emotion: 'understanding', action: 'key benefit' },
      { name: 'cta', duration: 0.15, emotion: 'urgency', action: 'act now' }
    ],
    bestFor: ['Landing Page', 'Mobile App', 'B2C']
  },
  STORYTELLING: {
    name: 'User Story',
    description: 'Tell a story through a user persona',
    phases: [
      { name: 'meet', duration: 0.10, emotion: 'connection', action: 'introduce persona' },
      { name: 'challenge', duration: 0.15, emotion: 'sympathy', action: 'their problem' },
      { name: 'discovery', duration: 0.10, emotion: 'hope', action: 'find the product' },
      { name: 'journey', duration: 0.35, emotion: 'engagement', action: 'use the product' },
      { name: 'success', duration: 0.15, emotion: 'satisfaction', action: 'achieve goal' },
      { name: 'invite', duration: 0.15, emotion: 'aspiration', action: 'be like them' }
    ],
    bestFor: ['Marketplace', 'Consumer App', 'Service']
  }
};

// ============================================================================
// Pacing Templates
// ============================================================================

/**
 * Pacing templates for different demo tones
 */
export const PACING_STYLES = {
  PROFESSIONAL: {
    name: 'Professional',
    baseSpeed: 1.0,
    pauseMultiplier: 1.2,
    transitionDuration: 800,
    zoomSpeed: 1000,
    cursorSpeed: 'smooth',
    wordsPerSecond: 2.3
  },
  ENERGETIC: {
    name: 'Energetic',
    baseSpeed: 1.3,
    pauseMultiplier: 0.8,
    transitionDuration: 500,
    zoomSpeed: 600,
    cursorSpeed: 'fast',
    wordsPerSecond: 2.8
  },
  CALM: {
    name: 'Calm',
    baseSpeed: 0.8,
    pauseMultiplier: 1.5,
    transitionDuration: 1200,
    zoomSpeed: 1500,
    cursorSpeed: 'gentle',
    wordsPerSecond: 2.0
  },
  TUTORIAL: {
    name: 'Tutorial',
    baseSpeed: 0.9,
    pauseMultiplier: 1.4,
    transitionDuration: 1000,
    zoomSpeed: 1200,
    cursorSpeed: 'deliberate',
    wordsPerSecond: 2.2
  }
};

// ============================================================================
// Types
// ============================================================================

/**
 * @typedef {Object} ComposedDemo
 * @property {string} title - Demo title
 * @property {number} duration - Total duration in ms
 * @property {Object} storyArc - Selected story arc
 * @property {Object} pacing - Pacing style
 * @property {ComposedPhase[]} phases - Demo phases
 * @property {ComposedAction[]} timeline - Flat timeline of actions
 * @property {Object} narration - Full narration script
 * @property {Object} metadata - Additional info
 */

/**
 * @typedef {Object} ComposedPhase
 * @property {string} name - Phase name
 * @property {number} startTime - Start time in ms
 * @property {number} duration - Duration in ms
 * @property {string} emotion - Target emotion
 * @property {string} narration - Phase narration
 * @property {ComposedAction[]} actions - Actions in this phase
 */

/**
 * @typedef {Object} ComposedAction
 * @property {number} time - Start time in ms
 * @property {number} duration - Duration in ms
 * @property {string} type - Action type (moveTo, click, scroll, zoom, wait)
 * @property {Object} params - Action parameters
 * @property {string} [narration] - Narration for this action
 * @property {Object} [camera] - Camera settings (zoom, pan)
 */

// ============================================================================
// Smart Composer Class
// ============================================================================

/**
 * Creates story-driven demo compositions
 */
export class SmartComposer {
  /**
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.options = {
      duration: options.duration || 30000, // 30 seconds default
      style: options.style || 'PROFESSIONAL',
      storyArc: options.storyArc || null, // Auto-detect if null
      viewport: options.viewport || { width: 1920, height: 1080 },
      includeNarration: options.includeNarration !== false,
      includeZoom: options.includeZoom !== false,
      ...options
    };
    
    /** @type {ComposedDemo|null} */
    this.composition = null;
  }
  
  /**
   * Compose a demo from intelligence data
   * 
   * @param {Object} intelligence - Product intelligence data
   * @param {Object} intelligence.product - Product DNA
   * @param {Object[]} intelligence.workflows - Detected workflows
   * @param {Object[]} intelligence.visualMoments - Visual moments
   * @param {Object} intelligence.pageInfo - Page info
   * @returns {Promise<ComposedDemo>}
   */
  async compose(intelligence) {
    const { product, workflows, visualMoments, pageInfo } = intelligence;
    
    // 1. Select best story arc for this product
    const storyArc = this.selectStoryArc(product);
    
    // 2. Get pacing style
    const pacing = PACING_STYLES[this.options.style] || PACING_STYLES.PROFESSIONAL;
    
    // 3. Allocate time to phases
    const phases = this.allocatePhaseTime(storyArc, this.options.duration);
    
    // 4. Select best content for each phase
    const contentPlan = this.planContent(phases, { product, workflows, visualMoments, pageInfo });
    
    // 5. Generate narration
    let narration = null;
    if (this.options.includeNarration) {
      narration = await this.generateNarration(product, contentPlan, pacing);
    }
    
    // 6. Build timeline with smooth transitions
    const timeline = this.buildTimeline(contentPlan, pacing, narration);
    
    // 7. Add camera movements (zoom, pan)
    if (this.options.includeZoom) {
      this.addCameraMovements(timeline, visualMoments, pacing);
    }
    
    // 8. Compose final demo
    this.composition = {
      title: `${product.name} Demo`,
      duration: this.options.duration,
      storyArc: storyArc.name,
      pacing: pacing.name,
      phases: contentPlan,
      timeline,
      narration,
      metadata: {
        productCategory: product.category,
        workflowCount: workflows?.length || 0,
        visualMomentCount: visualMoments?.length || 0,
        composedAt: new Date().toISOString()
      }
    };
    
    return this.composition;
  }
  
  /**
   * Select the best story arc for a product
   */
  selectStoryArc(product) {
    // Use specified arc
    if (this.options.storyArc && STORY_ARCS[this.options.storyArc]) {
      return STORY_ARCS[this.options.storyArc];
    }
    
    // Auto-select based on product category
    const categoryMapping = {
      'B2B SaaS': 'PROBLEM_SOLUTION',
      'B2C SaaS': 'TRANSFORMATION',
      'Developer Tool': 'FEATURE_SHOWCASE',
      'Creative Tool': 'TRANSFORMATION',
      'E-commerce': 'STORYTELLING',
      'Marketplace': 'STORYTELLING',
      'Dashboard': 'FEATURE_SHOWCASE',
      'Landing Page': 'QUICK_DEMO',
      'Portfolio': 'QUICK_DEMO'
    };
    
    const arcKey = categoryMapping[product.category] || 'PROBLEM_SOLUTION';
    return STORY_ARCS[arcKey];
  }
  
  /**
   * Allocate time to each phase
   */
  allocatePhaseTime(storyArc, totalDuration) {
    let currentTime = 0;
    
    return storyArc.phases.map(phase => {
      const duration = Math.round(totalDuration * phase.duration);
      const result = {
        ...phase,
        startTime: currentTime,
        duration,
        actions: []
      };
      currentTime += duration;
      return result;
    });
  }
  
  /**
   * Plan content for each phase
   */
  planContent(phases, intelligence) {
    const { product, workflows, visualMoments, pageInfo } = intelligence;
    
    return phases.map(phase => {
      const content = { ...phase };
      
      switch (phase.name) {
        case 'hook':
        case 'intro':
          content.content = {
            type: 'hero',
            target: this.findHeroElement(pageInfo),
            text: product.oneLiner || product.elevatorPitch
          };
          content.actions = [
            { type: 'scroll', params: { y: 0 }, duration: 500 }
          ];
          break;
          
        case 'problem':
        case 'before':
        case 'challenge':
          content.content = {
            type: 'problem',
            text: product.story?.problem || product.audience?.painPoints?.[0] || ''
          };
          // Just narration, minimal movement
          content.actions = [
            { type: 'wait', params: {}, duration: phase.duration * 0.8 }
          ];
          break;
          
        case 'solution':
        case 'transition':
        case 'discovery':
          content.content = {
            type: 'solution',
            text: product.story?.solution || product.valueProposition?.primary || ''
          };
          // Pan to main CTA
          const ctaElement = this.findCTAElement(pageInfo);
          content.actions = [
            { type: 'moveTo', params: ctaElement, duration: 800 },
            { type: 'highlight', params: ctaElement, duration: 1000 }
          ];
          break;
          
        case 'demo':
        case 'journey':
        case 'after':
          // Main demo content - use workflows and visual moments
          const bestWorkflow = workflows?.find(w => !w.skipReason) || null;
          const topMoments = (visualMoments || []).slice(0, 3);
          
          content.content = {
            type: 'demo',
            workflow: bestWorkflow,
            moments: topMoments,
            features: product.features?.slice(0, 3) || []
          };
          
          // Build demo actions
          content.actions = this.buildDemoActions(bestWorkflow, topMoments, phase.duration);
          break;
          
        case 'feature1':
        case 'feature2':
        case 'feature3':
          const featureIndex = parseInt(phase.name.replace('feature', '')) - 1;
          const feature = product.features?.[featureIndex];
          const moment = visualMoments?.[featureIndex];
          
          content.content = {
            type: 'feature',
            name: feature,
            moment
          };
          
          if (moment) {
            content.actions = [
              { type: 'moveTo', params: { x: moment.position.x, y: moment.position.y }, duration: 600 },
              { type: moment.trigger, params: { selector: moment.selector }, duration: moment.duration }
            ];
          } else {
            content.actions = [
              { type: 'wait', params: {}, duration: phase.duration * 0.8 }
            ];
          }
          break;
          
        case 'proof':
        case 'results':
        case 'success':
          content.content = {
            type: 'proof',
            text: product.messaging?.socialProof || 'Trusted by thousands of users'
          };
          // Find testimonials or stats section
          content.actions = [
            { type: 'scroll', params: { direction: 'down', amount: 300 }, duration: 800 },
            { type: 'wait', params: {}, duration: phase.duration * 0.6 }
          ];
          break;
          
        case 'cta':
        case 'invite':
          content.content = {
            type: 'cta',
            text: product.messaging?.ctas?.[0] || 'Try it free today'
          };
          const cta = this.findCTAElement(pageInfo);
          content.actions = [
            { type: 'moveTo', params: cta, duration: 600 },
            { type: 'highlight', params: cta, duration: 500 },
            { type: 'click', params: cta, duration: 300 }
          ];
          break;
          
        case 'integration':
        case 'value':
          content.content = {
            type: 'value',
            text: product.valueProposition?.primary || ''
          };
          content.actions = [
            { type: 'wait', params: {}, duration: phase.duration * 0.8 }
          ];
          break;
          
        case 'meet':
          content.content = {
            type: 'intro',
            text: `Meet someone just like you who needed ${product.name}`
          };
          content.actions = [
            { type: 'scroll', params: { y: 0 }, duration: 500 }
          ];
          break;
          
        default:
          content.actions = [
            { type: 'wait', params: {}, duration: phase.duration * 0.8 }
          ];
      }
      
      return content;
    });
  }
  
  /**
   * Find hero element on page
   */
  findHeroElement(pageInfo) {
    if (!pageInfo?.elements) return { x: 960, y: 400 };
    
    // Look for hero heading
    const h1 = pageInfo.elements.find(e => e.type === 'heading' && e.level === 1);
    if (h1) {
      return {
        x: h1.rect.x + h1.rect.width / 2,
        y: h1.rect.y + h1.rect.height / 2,
        selector: 'h1'
      };
    }
    
    return { x: 960, y: 400 };
  }
  
  /**
   * Find CTA element on page
   */
  findCTAElement(pageInfo) {
    if (!pageInfo?.elements) return { x: 960, y: 500 };
    
    // Look for primary CTA
    const cta = pageInfo.elements.find(e => 
      e.type === 'interactive' && e.importance === 'high'
    );
    
    if (cta) {
      return {
        x: cta.rect.x + cta.rect.width / 2,
        y: cta.rect.y + cta.rect.height / 2,
        selector: cta.selector,
        text: cta.text
      };
    }
    
    return { x: 960, y: 500 };
  }
  
  /**
   * Build demo actions from workflow and moments
   */
  buildDemoActions(workflow, moments, availableDuration) {
    const actions = [];
    let remainingTime = availableDuration;
    
    // If we have a workflow, use it
    if (workflow?.steps) {
      const stepTime = Math.min(2000, remainingTime / (workflow.steps.length + 1));
      
      for (const step of workflow.steps.slice(0, 5)) {
        actions.push({
          type: step.action,
          params: { selector: step.selector },
          duration: stepTime,
          description: step.description
        });
        remainingTime -= stepTime;
      }
    }
    
    // Add visual moments
    for (const moment of moments.slice(0, 3)) {
      if (remainingTime < 1000) break;
      
      const momentTime = Math.min(moment.duration + 500, remainingTime / 2);
      
      actions.push({
        type: 'moveTo',
        params: { x: moment.position.x, y: moment.position.y },
        duration: 500
      });
      
      actions.push({
        type: moment.trigger,
        params: { selector: moment.selector, x: moment.position.x, y: moment.position.y },
        duration: moment.duration,
        description: moment.description
      });
      
      remainingTime -= momentTime + 500;
    }
    
    return actions;
  }
  
  /**
   * Generate narration for the demo
   */
  async generateNarration(product, contentPlan, pacing) {
    const client = getGroq() || getOpenAI();
    if (!client) {
      return this.generateFallbackNarration(product, contentPlan);
    }
    
    const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
    
    // Calculate word budget per phase
    const totalWords = Math.round((this.options.duration / 1000) * pacing.wordsPerSecond);
    
    const phasePrompts = contentPlan.map(phase => ({
      name: phase.name,
      emotion: phase.emotion,
      duration: phase.duration / 1000,
      wordBudget: Math.round((phase.duration / this.options.duration) * totalWords),
      content: phase.content
    }));
    
    try {
      const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You write compelling demo video narration that converts viewers.

Return JSON:
{
  "title": "Video title",
  "phases": [
    {
      "name": "phase name",
      "narration": "what to say",
      "emphasis": ["key", "words", "to", "emphasize"]
    }
  ],
  "fullScript": "Complete script for TTS"
}

Guidelines:
- Match the target emotion for each phase
- Stay within word budget (~${pacing.wordsPerSecond} words/second)
- Don't say "as you can see" - viewers can see
- Make it conversational, not robotic
- Include one clear CTA at the end
- No stage directions or timestamps`
          },
          {
            role: 'user',
            content: `Write narration for a ${this.options.duration / 1000}-second demo of:

Product: ${product.name}
Category: ${product.category}
Value: ${product.valueProposition?.primary || product.oneLiner}
Problem: ${product.story?.problem || 'Unknown'}
Solution: ${product.story?.solution || 'Unknown'}
Features: ${product.features?.join(', ') || 'Unknown'}
Tone: ${product.tone?.voice || 'professional'}

Phases to narrate:
${JSON.stringify(phasePrompts, null, 2)}

Create engaging narration that guides viewers through the demo.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        title: result.title || `${product.name} Demo`,
        phases: result.phases || [],
        fullScript: result.fullScript || '',
        wordCount: result.fullScript?.split(/\s+/).length || 0,
        estimatedDuration: Math.round((result.fullScript?.split(/\s+/).length || 0) / pacing.wordsPerSecond * 1000)
      };
    } catch (e) {
      console.warn('Narration generation failed:', e.message);
      return this.generateFallbackNarration(product, contentPlan);
    }
  }
  
  /**
   * Generate fallback narration without AI
   */
  generateFallbackNarration(product, contentPlan) {
    const phases = contentPlan.map(phase => ({
      name: phase.name,
      narration: phase.content?.text || '',
      emphasis: []
    }));
    
    const fullScript = phases.map(p => p.narration).filter(Boolean).join(' ');
    
    return {
      title: `${product.name} Demo`,
      phases,
      fullScript,
      wordCount: fullScript.split(/\s+/).length,
      estimatedDuration: Math.round(fullScript.split(/\s+/).length / 2.5 * 1000)
    };
  }
  
  /**
   * Build flat timeline with smooth transitions
   */
  buildTimeline(contentPlan, pacing, narration) {
    const timeline = [];
    let currentTime = 0;
    
    for (let i = 0; i < contentPlan.length; i++) {
      const phase = contentPlan[i];
      const phaseNarration = narration?.phases?.[i];
      
      // Add phase start marker
      timeline.push({
        time: currentTime,
        duration: 0,
        type: 'phase',
        params: { name: phase.name, emotion: phase.emotion },
        narration: phaseNarration?.narration || phase.content?.text
      });
      
      // Add actions with adjusted timing
      let actionTime = currentTime;
      const actionCount = phase.actions?.length || 0;
      const timePerAction = actionCount > 0 ? (phase.duration * 0.9) / actionCount : phase.duration;
      
      for (const action of (phase.actions || [])) {
        const adjustedDuration = Math.min(
          action.duration || timePerAction,
          timePerAction
        );
        
        timeline.push({
          time: actionTime,
          duration: adjustedDuration,
          type: action.type,
          params: action.params,
          description: action.description
        });
        
        actionTime += adjustedDuration;
      }
      
      // Add transition to next phase
      if (i < contentPlan.length - 1) {
        timeline.push({
          time: currentTime + phase.duration - pacing.transitionDuration,
          duration: pacing.transitionDuration,
          type: 'transition',
          params: { to: contentPlan[i + 1].name }
        });
      }
      
      currentTime += phase.duration;
    }
    
    return timeline;
  }
  
  /**
   * Add intelligent camera movements
   */
  addCameraMovements(timeline, visualMoments, pacing) {
    // Find key moments to zoom
    const zoomTargets = [];
    
    // Zoom on visual moments
    for (const moment of (visualMoments || []).slice(0, 5)) {
      if (moment.demoScore >= 75) {
        zoomTargets.push({
          time: moment.position.y, // Use y position as rough timeline position
          target: moment.position,
          level: moment.demoScore >= 90 ? 1.3 : 1.15,
          duration: pacing.zoomSpeed
        });
      }
    }
    
    // Add zoom actions to timeline
    for (const zoom of zoomTargets) {
      // Find appropriate time in timeline
      const nearbyAction = timeline.find(a => 
        a.type === 'moveTo' && 
        Math.abs(a.params.y - zoom.target.y) < 100
      );
      
      if (nearbyAction) {
        // Add zoom after movement
        const zoomTime = nearbyAction.time + nearbyAction.duration;
        timeline.push({
          time: zoomTime,
          duration: zoom.duration,
          type: 'zoom',
          params: {
            level: zoom.level,
            target: zoom.target
          },
          camera: {
            zoomLevel: zoom.level,
            focusPoint: zoom.target
          }
        });
        
        // Add zoom out after
        timeline.push({
          time: zoomTime + zoom.duration + 2000,
          duration: zoom.duration,
          type: 'zoom',
          params: {
            level: 1.0,
            target: { x: 960, y: 540 }
          },
          camera: {
            zoomLevel: 1.0
          }
        });
      }
    }
    
    // Sort timeline by time
    timeline.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Get the composed demo
   * @returns {ComposedDemo|null}
   */
  getComposition() {
    return this.composition;
  }
  
  /**
   * Export composition as JSON
   */
  toJSON() {
    return JSON.stringify(this.composition, null, 2);
  }
  
  /**
   * Get summary of composition
   */
  getSummary() {
    if (!this.composition) return null;
    
    return {
      title: this.composition.title,
      duration: `${Math.round(this.composition.duration / 1000)}s`,
      storyArc: this.composition.storyArc,
      pacing: this.composition.pacing,
      phaseCount: this.composition.phases.length,
      actionCount: this.composition.timeline.length,
      narrationWords: this.composition.narration?.wordCount || 0,
      phases: this.composition.phases.map(p => ({
        name: p.name,
        duration: `${Math.round(p.duration / 1000)}s`,
        emotion: p.emotion
      }))
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick compose from intelligence
 * @param {Object} intelligence
 * @param {Object} options
 * @returns {Promise<ComposedDemo>}
 */
export async function composeDemo(intelligence, options = {}) {
  const composer = new SmartComposer(options);
  return composer.compose(intelligence);
}

/**
 * Get recommended story arc for product
 * @param {Object} product - Product DNA
 * @returns {Object} Recommended story arc
 */
export function getRecommendedArc(product) {
  const categoryMapping = {
    'B2B SaaS': 'PROBLEM_SOLUTION',
    'B2C SaaS': 'TRANSFORMATION',
    'Developer Tool': 'FEATURE_SHOWCASE',
    'Creative Tool': 'TRANSFORMATION',
    'E-commerce': 'STORYTELLING',
    'Marketplace': 'STORYTELLING',
    'Dashboard': 'FEATURE_SHOWCASE',
    'Landing Page': 'QUICK_DEMO',
    'Portfolio': 'QUICK_DEMO'
  };
  
  const arcKey = categoryMapping[product?.category] || 'PROBLEM_SOLUTION';
  return {
    key: arcKey,
    arc: STORY_ARCS[arcKey],
    reason: `Best for ${product?.category || 'this type of'} products`
  };
}

export default SmartComposer;
