/**
 * Quality Scorer - Rate and improve demo quality
 * 
 * Evaluates demos across multiple dimensions:
 * - Story completeness (hook, problem, solution, CTA)
 * - Visual engagement (variety, smooth transitions, highlights)
 * - Pacing (not too fast, not too slow)
 * - Narration quality (natural, informative, persuasive)
 * - Technical quality (no dead time, proper zoom, cursor flow)
 * 
 * @module quality-scorer
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
// Quality Criteria
// ============================================================================

/**
 * Quality criteria and weights
 */
export const QUALITY_CRITERIA = {
  STORY: {
    name: 'Story Arc',
    weight: 0.20,
    description: 'Does the demo tell a compelling story?',
    checklist: [
      { id: 'hook', label: 'Has attention-grabbing hook', points: 25 },
      { id: 'problem', label: 'Clearly states the problem', points: 20 },
      { id: 'solution', label: 'Shows the solution', points: 25 },
      { id: 'proof', label: 'Includes social proof', points: 15 },
      { id: 'cta', label: 'Ends with clear CTA', points: 15 }
    ]
  },
  VISUAL: {
    name: 'Visual Engagement',
    weight: 0.20,
    description: 'Is the demo visually engaging?',
    checklist: [
      { id: 'variety', label: 'Shows variety of elements', points: 20 },
      { id: 'highlights', label: 'Highlights key features', points: 25 },
      { id: 'transitions', label: 'Smooth transitions', points: 20 },
      { id: 'zoom', label: 'Appropriate zoom usage', points: 20 },
      { id: 'cursor', label: 'Natural cursor movement', points: 15 }
    ]
  },
  PACING: {
    name: 'Pacing',
    weight: 0.15,
    description: 'Is the pacing appropriate?',
    checklist: [
      { id: 'not_rushed', label: 'Not too fast', points: 30 },
      { id: 'not_slow', label: 'Not too slow', points: 30 },
      { id: 'pauses', label: 'Appropriate pauses', points: 20 },
      { id: 'flow', label: 'Smooth flow between sections', points: 20 }
    ]
  },
  NARRATION: {
    name: 'Narration',
    weight: 0.20,
    description: 'Is the narration effective?',
    checklist: [
      { id: 'natural', label: 'Sounds natural', points: 25 },
      { id: 'informative', label: 'Informative content', points: 25 },
      { id: 'persuasive', label: 'Persuasive messaging', points: 25 },
      { id: 'synced', label: 'Synced with visuals', points: 25 }
    ]
  },
  TECHNICAL: {
    name: 'Technical Quality',
    weight: 0.15,
    description: 'Is it technically well-produced?',
    checklist: [
      { id: 'no_dead_time', label: 'No dead time', points: 25 },
      { id: 'proper_focus', label: 'Proper element focus', points: 25 },
      { id: 'responsive', label: 'Elements respond correctly', points: 25 },
      { id: 'completion', label: 'Actions complete properly', points: 25 }
    ]
  },
  CONVERSION: {
    name: 'Conversion Potential',
    weight: 0.10,
    description: 'Will this convert viewers?',
    checklist: [
      { id: 'value_clear', label: 'Value proposition is clear', points: 30 },
      { id: 'differentiator', label: 'Shows differentiators', points: 25 },
      { id: 'audience_fit', label: 'Matches target audience', points: 25 },
      { id: 'memorable', label: 'Creates memorable impression', points: 20 }
    ]
  }
};

/**
 * Quality grades
 */
export const QUALITY_GRADES = {
  A_PLUS: { min: 95, label: 'A+', description: 'Exceptional - Ready for launch' },
  A: { min: 90, label: 'A', description: 'Excellent - Minor tweaks possible' },
  B_PLUS: { min: 85, label: 'B+', description: 'Very Good - Small improvements suggested' },
  B: { min: 80, label: 'B', description: 'Good - Some improvements needed' },
  C_PLUS: { min: 75, label: 'C+', description: 'Above Average - Notable improvements needed' },
  C: { min: 70, label: 'C', description: 'Average - Significant improvements needed' },
  D: { min: 60, label: 'D', description: 'Below Average - Major rework suggested' },
  F: { min: 0, label: 'F', description: 'Poor - Needs complete redesign' }
};

// ============================================================================
// Types
// ============================================================================

/**
 * @typedef {Object} QualityScore
 * @property {number} overall - Overall score 0-100
 * @property {string} grade - Letter grade
 * @property {string} gradeDescription - Grade description
 * @property {Object<string, CategoryScore>} categories - Score by category
 * @property {QualityIssue[]} issues - Detected issues
 * @property {QualitySuggestion[]} suggestions - Improvement suggestions
 * @property {string} summary - AI-generated summary
 */

/**
 * @typedef {Object} CategoryScore
 * @property {number} score - Category score 0-100
 * @property {number} weight - Category weight
 * @property {Object<string, boolean>} checklist - Checklist results
 * @property {string[]} issues - Category-specific issues
 */

/**
 * @typedef {Object} QualityIssue
 * @property {string} severity - critical, warning, info
 * @property {string} category - Which category
 * @property {string} issue - Issue description
 * @property {number} impact - Score impact
 */

/**
 * @typedef {Object} QualitySuggestion
 * @property {string} priority - high, medium, low
 * @property {string} category - Which category
 * @property {string} suggestion - What to improve
 * @property {number} potentialGain - Potential score improvement
 */

// ============================================================================
// Quality Scorer Class
// ============================================================================

/**
 * Scores and evaluates demo quality
 */
export class QualityScorer {
  /**
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.options = {
      minAcceptableScore: options.minAcceptableScore ?? 70,
      strictMode: options.strictMode ?? false,
      includeAISummary: options.includeAISummary !== false,
      ...options
    };
    
    /** @type {QualityScore|null} */
    this.score = null;
  }
  
  /**
   * Score a composed demo
   * 
   * @param {Object} composition - Composed demo from SmartComposer
   * @param {Object} intelligence - Product intelligence data
   * @returns {Promise<QualityScore>}
   */
  async scoreDemo(composition, intelligence = {}) {
    const categories = {};
    const allIssues = [];
    const allSuggestions = [];
    
    // Score each category
    for (const [key, criteria] of Object.entries(QUALITY_CRITERIA)) {
      const result = await this.scoreCategory(key, criteria, composition, intelligence);
      categories[key] = result;
      allIssues.push(...result.issues.map(i => ({ ...i, category: criteria.name })));
      allSuggestions.push(...(result.suggestions || []).map(s => ({ ...s, category: criteria.name })));
    }
    
    // Calculate overall score
    const overall = Object.entries(categories).reduce((sum, [key, cat]) => {
      return sum + (cat.score * QUALITY_CRITERIA[key].weight);
    }, 0);
    
    // Determine grade
    const grade = this.getGrade(overall);
    
    // Generate AI summary if enabled
    let summary = '';
    if (this.options.includeAISummary) {
      summary = await this.generateSummary(overall, categories, allIssues, intelligence);
    }
    
    // Sort issues and suggestions
    allIssues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    allSuggestions.sort((a, b) => b.potentialGain - a.potentialGain);
    
    this.score = {
      overall: Math.round(overall),
      grade: grade.label,
      gradeDescription: grade.description,
      categories,
      issues: allIssues,
      suggestions: allSuggestions.slice(0, 10), // Top 10 suggestions
      summary
    };
    
    return this.score;
  }
  
  /**
   * Score a single category
   */
  async scoreCategory(key, criteria, composition, intelligence) {
    const checklist = {};
    const issues = [];
    let totalPoints = 0;
    let earnedPoints = 0;
    
    for (const item of criteria.checklist) {
      totalPoints += item.points;
      const passed = this.checkItem(key, item.id, composition, intelligence);
      checklist[item.id] = passed;
      
      if (passed) {
        earnedPoints += item.points;
      } else {
        issues.push({
          severity: item.points >= 25 ? 'warning' : 'info',
          issue: `Missing: ${item.label}`,
          impact: item.points
        });
      }
    }
    
    const score = Math.round((earnedPoints / totalPoints) * 100);
    
    // Generate suggestions for this category
    const suggestions = this.generateCategorySuggestions(key, checklist, score);
    
    return {
      score,
      weight: criteria.weight,
      checklist,
      issues,
      suggestions
    };
  }
  
  /**
   * Check a specific item
   */
  checkItem(category, itemId, composition, intelligence) {
    switch (category) {
      case 'STORY':
        return this.checkStoryItem(itemId, composition, intelligence);
      case 'VISUAL':
        return this.checkVisualItem(itemId, composition);
      case 'PACING':
        return this.checkPacingItem(itemId, composition);
      case 'NARRATION':
        return this.checkNarrationItem(itemId, composition);
      case 'TECHNICAL':
        return this.checkTechnicalItem(itemId, composition);
      case 'CONVERSION':
        return this.checkConversionItem(itemId, composition, intelligence);
      default:
        return false;
    }
  }
  
  /**
   * Check story-related items
   */
  checkStoryItem(itemId, composition, intelligence) {
    const phases = composition?.phases || [];
    const narration = composition?.narration;
    
    switch (itemId) {
      case 'hook':
        // Check if first phase is hook/intro and has content
        const firstPhase = phases[0];
        return firstPhase?.name?.match(/hook|intro/i) && 
               (firstPhase?.content?.text || narration?.phases?.[0]?.narration);
      
      case 'problem':
        // Check for problem phase or problem in narration
        return phases.some(p => p.name?.match(/problem|before|challenge/i)) ||
               narration?.fullScript?.toLowerCase().includes('problem') ||
               intelligence?.product?.story?.problem;
      
      case 'solution':
        // Check for solution demonstration
        return phases.some(p => p.name?.match(/solution|demo|after/i)) ||
               phases.some(p => p.content?.type === 'demo');
      
      case 'proof':
        // Check for social proof phase
        return phases.some(p => p.name?.match(/proof|results|success/i)) ||
               narration?.fullScript?.toLowerCase().match(/customer|user|trusted|thousand/i);
      
      case 'cta':
        // Check for call to action
        const lastPhase = phases[phases.length - 1];
        return lastPhase?.name?.match(/cta|invite/i) ||
               narration?.fullScript?.toLowerCase().match(/try|sign up|get started|visit/i);
      
      default:
        return false;
    }
  }
  
  /**
   * Check visual engagement items
   */
  checkVisualItem(itemId, composition) {
    const timeline = composition?.timeline || [];
    
    switch (itemId) {
      case 'variety':
        // Check for variety of action types
        const actionTypes = new Set(timeline.map(a => a.type));
        return actionTypes.size >= 4;
      
      case 'highlights':
        // Check for highlight/focus actions
        return timeline.some(a => a.type === 'highlight' || a.type === 'zoom');
      
      case 'transitions':
        // Check for transition actions between phases
        return timeline.some(a => a.type === 'transition');
      
      case 'zoom':
        // Check for zoom usage
        const zoomActions = timeline.filter(a => a.type === 'zoom');
        return zoomActions.length >= 1 && zoomActions.length <= 5;
      
      case 'cursor':
        // Check for moveTo actions (natural cursor movement)
        const moveActions = timeline.filter(a => a.type === 'moveTo');
        return moveActions.length >= 3;
      
      default:
        return false;
    }
  }
  
  /**
   * Check pacing items
   */
  checkPacingItem(itemId, composition) {
    const duration = composition?.duration || 0;
    const phases = composition?.phases || [];
    const timeline = composition?.timeline || [];
    
    switch (itemId) {
      case 'not_rushed':
        // Average phase duration should be at least 3 seconds
        const avgPhaseDuration = duration / phases.length;
        return avgPhaseDuration >= 3000;
      
      case 'not_slow':
        // Should have at least some action every 5 seconds
        const actionsPerSecond = timeline.length / (duration / 1000);
        return actionsPerSecond >= 0.2;
      
      case 'pauses':
        // Should have some wait actions
        return timeline.some(a => a.type === 'wait');
      
      case 'flow':
        // Transitions should exist between phases
        return timeline.filter(a => a.type === 'transition').length >= phases.length - 2;
      
      default:
        return false;
    }
  }
  
  /**
   * Check narration items
   */
  checkNarrationItem(itemId, composition) {
    const narration = composition?.narration;
    if (!narration?.fullScript) return false;
    
    const script = narration.fullScript;
    const duration = composition?.duration || 30000;
    
    switch (itemId) {
      case 'natural':
        // Check for natural language (no robotic phrases)
        const roboticPhrases = ['as you can see', 'click here', 'now I will', 'let me show'];
        return !roboticPhrases.some(p => script.toLowerCase().includes(p));
      
      case 'informative':
        // Check word count is sufficient
        const wordCount = script.split(/\s+/).length;
        const minWords = (duration / 1000) * 2; // At least 2 words per second
        return wordCount >= minWords;
      
      case 'persuasive':
        // Check for persuasive elements
        const persuasivePatterns = /save|fast|easy|simple|powerful|free|try|get started/i;
        return persuasivePatterns.test(script);
      
      case 'synced':
        // Check that narration phases exist for each composition phase
        return narration.phases?.length >= composition.phases?.length - 1;
      
      default:
        return false;
    }
  }
  
  /**
   * Check technical quality items
   */
  checkTechnicalItem(itemId, composition) {
    const timeline = composition?.timeline || [];
    const duration = composition?.duration || 0;
    
    switch (itemId) {
      case 'no_dead_time':
        // Calculate gaps between actions
        let totalDeadTime = 0;
        for (let i = 0; i < timeline.length - 1; i++) {
          const gap = timeline[i + 1].time - (timeline[i].time + timeline[i].duration);
          if (gap > 2000) totalDeadTime += gap;
        }
        return totalDeadTime < duration * 0.1; // Less than 10% dead time
      
      case 'proper_focus':
        // Check that demo phase has actions
        const demoPhase = composition?.phases?.find(p => p.name?.match(/demo|feature/i));
        return demoPhase?.actions?.length >= 2;
      
      case 'responsive':
        // Check for click/hover actions (assumes elements will respond)
        return timeline.some(a => a.type === 'click' || a.type === 'hover');
      
      case 'completion':
        // Check that timeline duration roughly matches composition duration
        const lastAction = timeline[timeline.length - 1];
        const timelineEnd = lastAction ? lastAction.time + lastAction.duration : 0;
        return timelineEnd >= duration * 0.8;
      
      default:
        return false;
    }
  }
  
  /**
   * Check conversion potential items
   */
  checkConversionItem(itemId, composition, intelligence) {
    const product = intelligence?.product;
    const narration = composition?.narration;
    
    switch (itemId) {
      case 'value_clear':
        // Check if value proposition is communicated
        return product?.valueProposition?.primary && 
               (narration?.fullScript?.includes(product.valueProposition.primary.split(' ').slice(0, 3).join(' ')) ||
                composition?.phases?.some(p => p.content?.text?.includes('value')));
      
      case 'differentiator':
        // Check if differentiators are mentioned
        return product?.positioning?.differentiators?.length > 0 &&
               composition?.phases?.some(p => p.content?.type === 'feature');
      
      case 'audience_fit':
        // Check if demo addresses target audience
        return product?.audience?.primary && narration?.fullScript;
      
      case 'memorable':
        // Check for memorable hook
        return composition?.phases?.[0]?.emotion === 'curiosity' ||
               composition?.phases?.[0]?.emotion === 'excitement';
      
      default:
        return false;
    }
  }
  
  /**
   * Get grade from score
   */
  getGrade(score) {
    for (const grade of Object.values(QUALITY_GRADES)) {
      if (score >= grade.min) {
        return grade;
      }
    }
    return QUALITY_GRADES.F;
  }
  
  /**
   * Generate suggestions for a category
   */
  generateCategorySuggestions(category, checklist, score) {
    const suggestions = [];
    
    for (const [itemId, passed] of Object.entries(checklist)) {
      if (!passed) {
        const item = QUALITY_CRITERIA[category].checklist.find(i => i.id === itemId);
        suggestions.push({
          priority: item.points >= 25 ? 'high' : 'medium',
          suggestion: this.getSuggestionForItem(category, itemId),
          potentialGain: item.points * QUALITY_CRITERIA[category].weight
        });
      }
    }
    
    return suggestions;
  }
  
  /**
   * Get specific suggestion for an item
   */
  getSuggestionForItem(category, itemId) {
    const suggestions = {
      STORY: {
        hook: 'Add an attention-grabbing opening that creates curiosity in the first 3 seconds',
        problem: 'Clearly state the problem your product solves before showing the solution',
        solution: 'Show how your product solves the problem, not just features',
        proof: 'Add social proof like customer quotes, stats, or testimonials',
        cta: 'End with a clear call-to-action telling viewers what to do next'
      },
      VISUAL: {
        variety: 'Add more variety in visual elements - try scroll, click, hover, and zoom actions',
        highlights: 'Highlight key features with zoom or visual emphasis',
        transitions: 'Add smooth transitions between sections',
        zoom: 'Use zoom to draw attention to important elements',
        cursor: 'Make cursor movements more natural with smooth transitions'
      },
      PACING: {
        not_rushed: 'Slow down - give viewers time to absorb each section',
        not_slow: 'Add more actions to keep viewers engaged',
        pauses: 'Add strategic pauses to let key points sink in',
        flow: 'Improve flow between sections with transitions'
      },
      NARRATION: {
        natural: 'Remove robotic phrases like "as you can see" - be conversational',
        informative: 'Add more detail to help viewers understand the value',
        persuasive: 'Include more persuasive language about benefits',
        synced: 'Ensure narration is timed with visual actions'
      },
      TECHNICAL: {
        no_dead_time: 'Reduce gaps between actions - keep something happening',
        proper_focus: 'Ensure demo section shows actual product usage',
        responsive: 'Add more interactive moments (clicks, hovers) to show responsiveness',
        completion: 'Extend demo to fill the target duration'
      },
      CONVERSION: {
        value_clear: 'Make the value proposition more prominent and clear',
        differentiator: 'Highlight what makes this product unique',
        audience_fit: 'Tailor the demo more specifically to your target audience',
        memorable: 'Create a more memorable opening that viewers will remember'
      }
    };
    
    return suggestions[category]?.[itemId] || `Improve ${itemId} in ${category}`;
  }
  
  /**
   * Generate AI summary of quality
   */
  async generateSummary(score, categories, issues, intelligence) {
    const client = getGroq() || getOpenAI();
    if (!client) {
      return this.generateFallbackSummary(score, categories, issues);
    }
    
    const model = getGroq() ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
    
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You provide brief, actionable feedback on demo video quality. Be constructive and specific. 2-3 sentences max.'
          },
          {
            role: 'user',
            content: `Demo quality score: ${Math.round(score)}/100

Category scores:
${Object.entries(categories).map(([k, v]) => `- ${QUALITY_CRITERIA[k].name}: ${v.score}/100`).join('\n')}

Top issues:
${issues.slice(0, 3).map(i => `- ${i.issue}`).join('\n')}

Product: ${intelligence?.product?.name || 'Unknown'}

Provide brief, actionable feedback on this demo.`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      return response.choices[0].message.content.trim();
    } catch (e) {
      return this.generateFallbackSummary(score, categories, issues);
    }
  }
  
  /**
   * Generate fallback summary without AI
   */
  generateFallbackSummary(score, categories, issues) {
    const grade = this.getGrade(score);
    const topIssue = issues[0];
    
    let summary = `This demo scores ${Math.round(score)}/100 (${grade.label}). `;
    
    if (score >= 85) {
      summary += 'Great job! The demo is well-structured and engaging.';
    } else if (score >= 70) {
      summary += `Good foundation, but ${topIssue?.issue?.toLowerCase() || 'some areas need improvement'}.`;
    } else {
      summary += `Needs significant improvement. Focus on ${topIssue?.category?.toLowerCase() || 'key areas'}.`;
    }
    
    return summary;
  }
  
  /**
   * Check if demo passes quality threshold
   * @returns {boolean}
   */
  passes() {
    return this.score && this.score.overall >= this.options.minAcceptableScore;
  }
  
  /**
   * Get top improvements needed
   * @param {number} count - Number of suggestions
   * @returns {QualitySuggestion[]}
   */
  getTopImprovements(count = 5) {
    return this.score?.suggestions?.slice(0, count) || [];
  }
  
  /**
   * Get critical issues
   * @returns {QualityIssue[]}
   */
  getCriticalIssues() {
    return this.score?.issues?.filter(i => i.severity === 'critical') || [];
  }
  
  /**
   * Get score report as text
   * @returns {string}
   */
  getReport() {
    if (!this.score) return 'No score available. Run scoreDemo() first.';
    
    const lines = [
      `# Demo Quality Report`,
      ``,
      `**Overall Score:** ${this.score.overall}/100 (${this.score.grade})`,
      `**Status:** ${this.score.gradeDescription}`,
      ``,
      `## Category Scores`,
      ...Object.entries(this.score.categories).map(([key, cat]) => 
        `- **${QUALITY_CRITERIA[key].name}:** ${cat.score}/100`
      ),
      ``,
      `## Summary`,
      this.score.summary,
      ``,
      `## Top Improvements`,
      ...this.score.suggestions.slice(0, 5).map((s, i) => 
        `${i + 1}. [${s.priority.toUpperCase()}] ${s.suggestion}`
      ),
      ``,
      `## Issues (${this.score.issues.length} total)`,
      ...this.score.issues.slice(0, 10).map(i => 
        `- [${i.severity.toUpperCase()}] ${i.category}: ${i.issue}`
      )
    ];
    
    return lines.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick score a demo
 * @param {Object} composition
 * @param {Object} intelligence
 * @returns {Promise<QualityScore>}
 */
export async function scoreDemo(composition, intelligence = {}, options = {}) {
  const scorer = new QualityScorer(options);
  return scorer.scoreDemo(composition, intelligence);
}

/**
 * Check if demo meets quality threshold
 * @param {Object} composition
 * @param {number} threshold - Minimum acceptable score
 * @returns {Promise<boolean>}
 */
export async function meetsQualityThreshold(composition, threshold = 70, intelligence = {}) {
  const scorer = new QualityScorer({ minAcceptableScore: threshold });
  await scorer.scoreDemo(composition, intelligence);
  return scorer.passes();
}

/**
 * Get quick quality assessment
 * @param {Object} composition
 * @returns {Promise<{score: number, grade: string, topIssue: string}>}
 */
export async function quickAssess(composition, intelligence = {}) {
  const scorer = new QualityScorer({ includeAISummary: false });
  const score = await scorer.scoreDemo(composition, intelligence);
  return {
    score: score.overall,
    grade: score.grade,
    topIssue: score.issues[0]?.issue || 'None'
  };
}

export default QualityScorer;
