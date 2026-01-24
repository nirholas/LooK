/**
 * Smart Actions - Context-aware page interactions for engaging demos
 * 
 * Unlike simple click/scroll, smart actions understand:
 * - What element they're interacting with
 * - Why it matters in the demo
 * - How to make it visually engaging
 * - When to pause for narration sync
 */

import { extractPageElements } from './ai-enhanced.js';
import { createLogger } from './logger.js';

const log = createLogger('smart-actions');

/**
 * @typedef {Object} SmartAction
 * @property {string} action - Action type
 * @property {Object} target - Target element info
 * @property {Object} context - Why this action matters
 * @property {Object} timing - Timing parameters
 */

/**
 * Smart action types
 */
export const ActionType = {
  SHOWCASE: 'showcase',     // Draw attention to element without clicking
  INTERACT: 'interact',     // Click/type/select
  EXPLORE: 'explore',       // Scan/hover multiple elements
  NAVIGATE: 'navigate',     // Scroll or page change
  REVEAL: 'reveal',         // Trigger dropdown/modal/expand
  COMPARE: 'compare',       // Show multiple related elements
  HIGHLIGHT: 'highlight',   // Focus with visual emphasis
  DEMO_FLOW: 'demo_flow'    // Complete a workflow (e.g., fill form, checkout)
};

/**
 * Timing presets for different demo styles
 */
export const TimingPresets = {
  fast: {
    moveDuration: 200,
    pauseAfterMove: 100,
    pauseAfterClick: 300,
    scrollDuration: 500,
    sectionDwell: 1500
  },
  normal: {
    moveDuration: 350,
    pauseAfterMove: 200,
    pauseAfterClick: 500,
    scrollDuration: 800,
    sectionDwell: 2500
  },
  slow: {
    moveDuration: 500,
    pauseAfterMove: 400,
    pauseAfterClick: 800,
    scrollDuration: 1200,
    sectionDwell: 4000
  },
  tutorial: {
    moveDuration: 400,
    pauseAfterMove: 600,
    pauseAfterClick: 1000,
    scrollDuration: 1000,
    sectionDwell: 5000
  }
};

/**
 * SmartActionExecutor - Executes context-aware actions
 */
export class SmartActionExecutor {
  constructor(page, cursor, tracker, options = {}) {
    this.page = page;
    this.cursor = cursor;
    this.tracker = tracker;
    this.timing = TimingPresets[options.timing || 'normal'];
    this.verbose = options.verbose || false;
    
    this.actionLog = [];
    this.visitedElements = new Set();
  }

  /**
   * Execute a smart action
   */
  async execute(action) {
    this.log(`Executing: ${action.action} - ${action.context?.reason || ''}`);
    
    const startTime = Date.now();
    let result = { success: true };

    switch (action.action) {
      case ActionType.SHOWCASE:
        result = await this.executeShowcase(action);
        break;
      case ActionType.INTERACT:
        result = await this.executeInteract(action);
        break;
      case ActionType.EXPLORE:
        result = await this.executeExplore(action);
        break;
      case ActionType.NAVIGATE:
        result = await this.executeNavigate(action);
        break;
      case ActionType.REVEAL:
        result = await this.executeReveal(action);
        break;
      case ActionType.COMPARE:
        result = await this.executeCompare(action);
        break;
      case ActionType.HIGHLIGHT:
        result = await this.executeHighlight(action);
        break;
      case ActionType.DEMO_FLOW:
        result = await this.executeDemoFlow(action);
        break;
      default:
        this.log(`Unknown action type: ${action.action}`);
        result = { success: false, reason: 'unknown_action' };
    }

    this.actionLog.push({
      action: action.action,
      target: action.target?.selector,
      duration: Date.now() - startTime,
      ...result
    });

    return result;
  }

  /**
   * Showcase - Draw attention without interaction
   */
  async executeShowcase(action) {
    const { target, timing = {} } = action;
    
    if (!target?.rect) {
      return { success: false, reason: 'no_target' };
    }

    // Move cursor to element with natural motion
    await this.cursor.moveTo(
      target.rect.centerX, 
      target.rect.centerY,
      { duration: timing.moveDuration || this.timing.moveDuration }
    );

    // Subtle exploration around the element
    const rect = target.rect;
    await this.cursor.moveTo(rect.centerX - rect.width * 0.3, rect.centerY, { duration: 200, overshoot: false });
    await this.sleep(100);
    await this.cursor.moveTo(rect.centerX + rect.width * 0.3, rect.centerY, { duration: 300, overshoot: false });
    await this.sleep(100);
    await this.cursor.moveTo(rect.centerX, rect.centerY, { duration: 200, overshoot: false });

    // Dwell
    await this.sleep(timing.dwell || this.timing.sectionDwell);

    this.visitedElements.add(target.selector);
    return { success: true };
  }

  /**
   * Interact - Click, type, or select
   */
  async executeInteract(action) {
    const { target, interaction = 'click', value, timing = {} } = action;
    
    if (!target?.rect) {
      return { success: false, reason: 'no_target' };
    }

    // Move to element
    await this.cursor.moveTo(
      target.rect.centerX,
      target.rect.centerY,
      { duration: timing.moveDuration || this.timing.moveDuration }
    );

    await this.sleep(timing.pauseBeforeInteract || 150);

    switch (interaction) {
      case 'click':
        this.tracker.recordClick(
          target.rect.centerX,
          target.rect.centerY,
          Date.now(),
          {
            text: target.text,
            type: target.tag,
            section: action.context?.section || 'content'
          }
        );
        await this.page.mouse.click(target.rect.centerX, target.rect.centerY);
        break;

      case 'type':
        await this.page.mouse.click(target.rect.centerX, target.rect.centerY);
        await this.sleep(200);
        await this.typeNaturally(value || 'demo@example.com');
        break;

      case 'select':
        await this.page.mouse.click(target.rect.centerX, target.rect.centerY);
        await this.sleep(300);
        // Select first option or specified value
        if (value) {
          await this.page.keyboard.type(value);
          await this.page.keyboard.press('Enter');
        }
        break;

      case 'hover':
        // Just hovering (already there)
        break;
    }

    await this.sleep(timing.pauseAfterInteract || this.timing.pauseAfterClick);
    this.visitedElements.add(target.selector);
    
    return { success: true, interaction };
  }

  /**
   * Explore - Scan/hover multiple elements in an area
   */
  async executeExplore(action) {
    const { targets = [], area, timing = {} } = action;
    
    const elementsToExplore = targets.length > 0 ? targets : 
      await this.findElementsInArea(area);

    const visited = [];
    for (const el of elementsToExplore.slice(0, action.maxElements || 5)) {
      if (!el.rect) continue;
      
      await this.cursor.moveTo(
        el.rect.centerX,
        el.rect.centerY,
        { duration: 250, overshoot: false }
      );
      
      await this.sleep(timing.dwellPerElement || 400);
      
      visited.push(el.selector);
      this.visitedElements.add(el.selector);
    }

    return { success: true, visited };
  }

  /**
   * Navigate - Scroll or change page section
   */
  async executeNavigate(action) {
    const { scrollTo, direction, distance, timing = {} } = action;

    if (scrollTo !== undefined) {
      // Scroll to specific Y position
      await this.page.evaluate(y => {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, scrollTo);
    } else if (direction) {
      // Scroll in direction
      const currentScroll = await this.page.evaluate(() => window.scrollY);
      const scrollAmount = distance || 500;
      const newScroll = direction === 'down' ? 
        currentScroll + scrollAmount : 
        Math.max(0, currentScroll - scrollAmount);
      
      await this.page.evaluate(y => {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, newScroll);
    }

    await this.sleep(timing.scrollDuration || this.timing.scrollDuration);
    return { success: true };
  }

  /**
   * Reveal - Trigger expandable content
   */
  async executeReveal(action) {
    const { target, revealType = 'click', timing = {} } = action;
    
    if (!target?.rect) {
      return { success: false, reason: 'no_target' };
    }

    // Move to trigger element
    await this.cursor.moveTo(
      target.rect.centerX,
      target.rect.centerY,
      { duration: this.timing.moveDuration }
    );

    await this.sleep(200);

    // Trigger reveal
    if (revealType === 'hover') {
      await this.page.hover(target.selector);
    } else {
      this.tracker.recordClick(target.rect.centerX, target.rect.centerY, Date.now());
      await this.page.mouse.click(target.rect.centerX, target.rect.centerY);
    }

    // Wait for animation
    await this.sleep(timing.animationDuration || 500);

    // If reveal creates new content, explore it
    if (action.exploreRevealed) {
      const newElements = await this.findNewElements();
      for (const el of newElements.slice(0, 3)) {
        await this.cursor.moveTo(el.rect.centerX, el.rect.centerY, { duration: 200 });
        await this.sleep(300);
      }
    }

    return { success: true, revealType };
  }

  /**
   * Compare - Show multiple related elements side by side
   */
  async executeCompare(action) {
    const { targets, timing = {} } = action;
    
    if (!targets || targets.length < 2) {
      return { success: false, reason: 'need_multiple_targets' };
    }

    // Move between targets to show comparison
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target.rect) continue;

      await this.cursor.moveTo(
        target.rect.centerX,
        target.rect.centerY,
        { duration: 350 }
      );

      await this.sleep(timing.compareDelay || 800);

      // Draw connection to next element visually through movement
      if (i < targets.length - 1) {
        const next = targets[i + 1];
        if (next.rect) {
          // Slow, deliberate movement to show comparison
          await this.cursor.moveTo(next.rect.centerX, next.rect.centerY, { 
            duration: 600,
            overshoot: false 
          });
        }
      }
    }

    return { success: true, compared: targets.length };
  }

  /**
   * Highlight - Emphasize element with cursor movement
   */
  async executeHighlight(action) {
    const { target, style = 'circle', timing = {} } = action;
    
    if (!target?.rect) {
      return { success: false, reason: 'no_target' };
    }

    const { centerX, centerY, width, height } = target.rect;

    // Move to element
    await this.cursor.moveTo(centerX, centerY, { duration: 300 });
    await this.sleep(200);

    if (style === 'circle') {
      // Trace a circle around the element
      const radius = Math.max(width, height) * 0.6;
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        this.tracker.record(x, y, Date.now());
        await this.page.mouse.move(x, y);
        await this.sleep(40);
      }
    } else if (style === 'underline') {
      // Underline movement
      await this.cursor.moveTo(centerX - width / 2, centerY + height / 2 + 5, { duration: 150 });
      await this.cursor.moveTo(centerX + width / 2, centerY + height / 2 + 5, { duration: 400 });
    } else if (style === 'point') {
      // Point and pause
      await this.cursor.moveTo(centerX, centerY - 20, { duration: 200 });
      await this.sleep(100);
      await this.cursor.moveTo(centerX, centerY, { duration: 150 });
    }

    // Return to center
    await this.cursor.moveTo(centerX, centerY, { duration: 200 });
    await this.sleep(timing.dwell || 500);

    return { success: true, style };
  }

  /**
   * Demo Flow - Execute a complete workflow
   */
  async executeDemoFlow(action) {
    const { steps = [], timing = {} } = action;
    
    const results = [];
    for (const step of steps) {
      const result = await this.execute({
        ...step,
        timing: { ...timing, ...step.timing }
      });
      results.push(result);
      
      if (!result.success && step.required) {
        return { success: false, reason: 'required_step_failed', step: step.name };
      }
    }

    return { success: true, completedSteps: results.length };
  }

  /**
   * Type text with realistic timing
   */
  async typeNaturally(text, options = {}) {
    const { speed = 80, mistakes = true } = options;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Occasional typo and correction
      if (mistakes && Math.random() < 0.05 && i < text.length - 1) {
        await this.page.keyboard.type('x');
        await this.sleep(speed * 2);
        await this.page.keyboard.press('Backspace');
        await this.sleep(speed);
      }
      
      await this.page.keyboard.type(char);
      
      // Variable delay
      let delay = speed;
      if (char === ' ') delay *= 0.5;
      if ('.!?'.includes(char)) delay *= 2;
      if (Math.random() < 0.1) delay *= 1.5; // Hesitation
      
      await this.sleep(delay);
    }
  }

  /**
   * Find elements in a viewport area
   */
  async findElementsInArea(area) {
    if (!area) return [];
    
    const elements = await extractPageElements(this.page);
    
    return elements.filter(el => {
      if (!el.rect) return false;
      const inX = el.rect.centerX >= area.x && el.rect.centerX <= area.x + area.width;
      const inY = el.rect.centerY >= area.y && el.rect.centerY <= area.y + area.height;
      return inX && inY;
    });
  }

  /**
   * Find newly appeared elements (after reveal)
   */
  async findNewElements() {
    const elements = await extractPageElements(this.page);
    return elements.filter(el => !this.visitedElements.has(el.selector));
  }

  log(msg) {
    if (this.verbose) {
      log.debug(msg);
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * Pre-built action sequences for common demo scenarios
 */
export const ActionTemplates = {
  /**
   * Feature tour - showcase main features
   */
  featureTour: (features) => features.map((feature, i) => ({
    action: ActionType.SHOWCASE,
    target: feature,
    timing: { dwell: 2000 },
    context: { reason: `Show feature ${i + 1}` }
  })),

  /**
   * Pricing comparison
   */
  pricingComparison: (pricingCards) => [{
    action: ActionType.COMPARE,
    targets: pricingCards,
    timing: { compareDelay: 1000 },
    context: { reason: 'Compare pricing tiers' }
  }],

  /**
   * Form fill demo
   */
  formDemo: (formFields, values) => formFields.map((field, i) => ({
    action: ActionType.INTERACT,
    target: field,
    interaction: 'type',
    value: values[i] || 'demo',
    context: { reason: `Fill ${field.placeholder || 'field'}` }
  })),

  /**
   * Navigation menu exploration
   */
  navExploration: (menuItems) => [
    {
      action: ActionType.EXPLORE,
      targets: menuItems,
      maxElements: 6,
      timing: { dwellPerElement: 500 },
      context: { reason: 'Show navigation options' }
    }
  ]
};

export default SmartActionExecutor;
