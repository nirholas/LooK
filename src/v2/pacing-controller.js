/**
 * PacingController - Real-time adaptive pacing for demo generation
 * 
 * Monitors demo progress and adjusts timing in real-time to ensure
 * the demo fits within the target duration while highlighting
 * the most important content.
 * 
 * @module pacing-controller
 */

/**
 * @typedef {Object} PacingOptions
 * @property {number} [targetDuration=60000] - Target total duration in ms
 * @property {number} [minActionDuration=500] - Minimum duration for any action in ms
 * @property {number} [maxActionDuration=10000] - Maximum duration for any action in ms
 * @property {number} [bufferTime=2000] - Buffer time at end for transitions
 * @property {number} [speedUpThreshold=1.1] - Speed up if behind by this factor
 * @property {number} [slowDownThreshold=0.9] - Slow down if ahead by this factor
 */

/**
 * @typedef {Object} ActionTiming
 * @property {number} originalDuration - Originally planned duration
 * @property {number} adjustedDuration - Adjusted duration based on pacing
 * @property {number} startTime - When action started
 * @property {number} priority - Action priority (higher = more important)
 * @property {boolean} skippable - Whether action can be skipped
 */

/**
 * @typedef {Object} PacingStatus
 * @property {number} progress - Progress from 0 to 1
 * @property {number} elapsedTime - Time elapsed so far
 * @property {number} remainingTime - Time remaining
 * @property {number} estimatedCompletion - Estimated total duration
 * @property {'on-track' | 'behind' | 'ahead'} status - Current pacing status
 * @property {number} speedFactor - Current speed multiplier
 */

/**
 * Controls pacing during demo execution
 */
export class PacingController {
  /**
   * Create a PacingController
   * @param {Object} plan - The demo plan
   * @param {PacingOptions} [options={}] - Pacing options
   */
  constructor(plan, options = {}) {
    /** @type {Object} */
    this.plan = plan;
    
    /** @type {number} */
    this.targetDuration = options.targetDuration || plan.totalDuration || 60000;
    
    /** @type {number} */
    this.minActionDuration = options.minActionDuration || 500;
    
    /** @type {number} */
    this.maxActionDuration = options.maxActionDuration || 10000;
    
    /** @type {number} */
    this.bufferTime = options.bufferTime || 2000;
    
    /** @type {number} */
    this.speedUpThreshold = options.speedUpThreshold || 1.1;
    
    /** @type {number} */
    this.slowDownThreshold = options.slowDownThreshold || 0.9;
    
    // Current state
    /** @type {number} */
    this.currentTime = 0;
    
    /** @type {number} */
    this.startTime = 0;
    
    /** @type {number} */
    this.completedActions = 0;
    
    /** @type {number} */
    this.totalActions = this.countActions(plan);
    
    /** @type {number} */
    this.skippedActions = 0;
    
    /** @type {number} */
    this.plannedTimeRemaining = this.targetDuration;
    
    /** @type {number} */
    this.speedFactor = 1.0;
    
    // History for adaptive adjustments
    /** @type {ActionTiming[]} */
    this.actionHistory = [];
  }
  
  /**
   * Count total actions in plan
   * @param {Object} plan - The demo plan
   * @returns {number} Total action count
   * @private
   */
  countActions(plan) {
    if (!plan || !plan.pages) return 0;
    
    let count = 0;
    for (const page of plan.pages) {
      if (page.timeline) {
        count += page.timeline.length;
      }
    }
    return count || 1; // Avoid division by zero
  }
  
  /**
   * Start timing
   */
  start() {
    this.startTime = Date.now();
    this.currentTime = 0;
  }
  
  /**
   * Update state after an action completes
   * @param {Object} action - The completed action
   * @param {number} [actualDuration] - Actual duration taken (optional)
   */
  update(action, actualDuration) {
    this.completedActions++;
    
    const now = Date.now();
    if (this.startTime > 0) {
      this.currentTime = now - this.startTime;
    }
    
    // Track action timing
    if (action && actualDuration !== undefined) {
      this.actionHistory.push({
        originalDuration: action.duration || 1000,
        adjustedDuration: actualDuration,
        startTime: this.currentTime - actualDuration,
        priority: action.priority || 50,
        skippable: action.skippable !== false
      });
    }
    
    // Update planned remaining time
    this.updatePlannedRemaining();
    
    // Recalculate speed factor
    this.recalculateSpeedFactor();
  }
  
  /**
   * Record a skipped action
   * @param {Object} action - The skipped action
   */
  recordSkip(action) {
    this.skippedActions++;
    this.completedActions++;
    
    // Reclaim the time from skipped action
    if (action && action.duration) {
      this.plannedTimeRemaining -= action.duration;
    }
    
    this.updatePlannedRemaining();
  }
  
  /**
   * Update the planned remaining time based on progress
   * @private
   */
  updatePlannedRemaining() {
    const remainingActions = this.totalActions - this.completedActions;
    
    if (remainingActions <= 0) {
      this.plannedTimeRemaining = 0;
      return;
    }
    
    // Calculate average time per action so far
    if (this.completedActions > 0 && this.currentTime > 0) {
      const avgTimePerAction = this.currentTime / this.completedActions;
      this.plannedTimeRemaining = avgTimePerAction * remainingActions;
    }
  }
  
  /**
   * Recalculate the speed factor based on progress
   * @private
   */
  recalculateSpeedFactor() {
    const progress = this.getProgress();
    const timeProgress = this.currentTime / this.targetDuration;
    
    if (progress === 0 || this.currentTime === 0) {
      this.speedFactor = 1.0;
      return;
    }
    
    // Compare action progress to time progress
    const ratio = timeProgress / progress;
    
    if (ratio > this.speedUpThreshold) {
      // Behind schedule - speed up
      this.speedFactor = Math.min(2.0, ratio);
    } else if (ratio < this.slowDownThreshold) {
      // Ahead of schedule - slow down
      this.speedFactor = Math.max(0.5, ratio);
    } else {
      // On track
      this.speedFactor = 1.0;
    }
  }
  
  /**
   * Check if we should speed up
   * @returns {boolean} True if we're behind schedule
   */
  shouldSpeedUp() {
    return this.speedFactor > 1.1;
  }
  
  /**
   * Check if we should slow down
   * @returns {boolean} True if we're ahead of schedule
   */
  shouldSlowDown() {
    return this.speedFactor < 0.9;
  }
  
  /**
   * Get adjusted duration for an action
   * @param {Object} action - The action to adjust timing for
   * @returns {number} Adjusted duration in ms
   */
  getAdjustedDuration(action) {
    const originalDuration = action.duration || 1000;
    const priority = action.priority || 50;
    
    // Apply speed factor
    let adjusted = originalDuration / this.speedFactor;
    
    // High priority actions get more time, low priority less
    const priorityFactor = 0.5 + (priority / 100);
    adjusted *= priorityFactor;
    
    // Clamp to min/max
    adjusted = Math.max(this.minActionDuration, Math.min(this.maxActionDuration, adjusted));
    
    return Math.round(adjusted);
  }
  
  /**
   * Decide if an action should be skipped
   * @param {Object} action - The action to evaluate
   * @returns {boolean} True if action should be skipped
   */
  shouldSkipAction(action) {
    // Never skip high priority actions
    if (action.priority && action.priority >= 80) {
      return false;
    }
    
    // Never skip non-skippable actions
    if (action.skippable === false) {
      return false;
    }
    
    // Skip if we're way behind schedule and this is low priority
    if (this.speedFactor > 1.5 && action.priority && action.priority < 30) {
      return true;
    }
    
    // Skip if we're nearly out of time
    const remainingTime = this.getRemainingTime();
    const remainingActions = this.totalActions - this.completedActions;
    
    if (remainingTime < remainingActions * this.minActionDuration) {
      // Not enough time for all actions, skip low priority
      return action.priority < 50;
    }
    
    return false;
  }
  
  /**
   * Get current progress (0 to 1)
   * @returns {number} Progress value
   */
  getProgress() {
    if (this.totalActions === 0) return 1;
    return this.completedActions / this.totalActions;
  }
  
  /**
   * Get elapsed time
   * @returns {number} Elapsed time in ms
   */
  getElapsedTime() {
    if (this.startTime === 0) return 0;
    return Date.now() - this.startTime;
  }
  
  /**
   * Get remaining time
   * @returns {number} Remaining time in ms
   */
  getRemainingTime() {
    return Math.max(0, this.targetDuration - this.getElapsedTime());
  }
  
  /**
   * Get estimated completion time
   * @returns {number} Estimated total duration in ms
   */
  getEstimatedCompletion() {
    const progress = this.getProgress();
    if (progress === 0) return this.targetDuration;
    
    return Math.round(this.getElapsedTime() / progress);
  }
  
  /**
   * Get current pacing status
   * @returns {PacingStatus} Current status
   */
  getStatus() {
    const elapsedTime = this.getElapsedTime();
    const remainingTime = this.getRemainingTime();
    const estimatedCompletion = this.getEstimatedCompletion();
    
    /** @type {'on-track' | 'behind' | 'ahead'} */
    let status = 'on-track';
    if (this.speedFactor > 1.1) {
      status = 'behind';
    } else if (this.speedFactor < 0.9) {
      status = 'ahead';
    }
    
    return {
      progress: this.getProgress(),
      elapsedTime,
      remainingTime,
      estimatedCompletion,
      status,
      speedFactor: this.speedFactor,
      completedActions: this.completedActions,
      totalActions: this.totalActions,
      skippedActions: this.skippedActions
    };
  }
  
  /**
   * Get time budget for remaining content
   * @param {number} numSections - Number of remaining sections
   * @returns {number[]} Time allocation per section
   */
  allocateRemainingTime(numSections) {
    if (numSections <= 0) return [];
    
    const remaining = this.getRemainingTime() - this.bufferTime;
    const perSection = Math.max(this.minActionDuration, remaining / numSections);
    
    return Array(numSections).fill(Math.round(perSection));
  }
  
  /**
   * Check if we have enough time for an action
   * @param {number} duration - Proposed action duration
   * @returns {boolean} True if we have time
   */
  hasTimeFor(duration) {
    return this.getRemainingTime() > duration + this.bufferTime;
  }
}

/**
 * Calculate adaptive timing for content sections
 * @param {Object} contentAnalysis - Content analysis results
 * @param {Object} options - Timing options
 * @returns {Object[]} Time allocations per section
 */
export function calculateAdaptiveTiming(contentAnalysis, options = {}) {
  const { 
    totalDuration = 60000, 
    minSectionTime = 3000, 
    maxSectionTime = 15000 
  } = options;
  
  // Get sections with demo scores
  const sections = (contentAnalysis.sections || [])
    .filter(s => (s.demoScore || 0) > 40)
    .map(s => ({
      ...s,
      demoScore: s.demoScore || 50
    }));
  
  if (sections.length === 0) {
    // No scored sections, return default timing
    return [{
      sectionId: 'default',
      duration: totalDuration,
      actions: [{ type: 'scroll', duration: totalDuration }]
    }];
  }
  
  // Calculate total score
  const totalScore = sections.reduce((sum, s) => sum + s.demoScore, 0);
  
  if (totalScore === 0) {
    // Even distribution if no scores
    const perSection = Math.round(totalDuration / sections.length);
    return sections.map(section => ({
      sectionId: section.id,
      duration: perSection,
      actions: planActionsForSection(section, perSection)
    }));
  }
  
  // Allocate time proportionally to score
  let remainingTime = totalDuration;
  const allocations = sections.map(section => {
    const proportion = section.demoScore / totalScore;
    let time = Math.round(totalDuration * proportion);
    
    // Clamp to min/max
    time = Math.max(minSectionTime, Math.min(maxSectionTime, time));
    remainingTime -= time;
    
    return {
      sectionId: section.id,
      section,
      duration: time,
      score: section.demoScore,
      actions: []
    };
  });
  
  // Distribute remaining time to high-value sections
  if (remainingTime > 0) {
    const highValue = allocations.filter(a => a.score > 70);
    if (highValue.length > 0) {
      const extra = remainingTime / highValue.length;
      highValue.forEach(a => a.duration += extra);
    } else {
      // Distribute evenly
      const extra = remainingTime / allocations.length;
      allocations.forEach(a => a.duration += extra);
    }
  }
  
  // Handle negative remaining (over-allocated)
  if (remainingTime < 0) {
    // Remove time from low-value sections first
    const lowValue = allocations
      .filter(a => a.score < 50)
      .sort((a, b) => a.score - b.score);
    
    let deficit = -remainingTime;
    for (const alloc of lowValue) {
      const reduction = Math.min(deficit, alloc.duration - minSectionTime);
      alloc.duration -= reduction;
      deficit -= reduction;
      if (deficit <= 0) break;
    }
  }
  
  // Plan actions for each section
  for (const alloc of allocations) {
    alloc.actions = planActionsForSection(alloc.section, alloc.duration);
  }
  
  return allocations;
}

/**
 * Plan actions for a section based on its content
 * @param {Object} section - The section
 * @param {number} duration - Available time in ms
 * @returns {Object[]} Array of actions
 */
function planActionsForSection(section, duration) {
  const actions = [];
  let remainingTime = duration;
  
  // Start with scroll to section
  if (section.bounds && section.bounds.y > 100) {
    actions.push({
      type: 'scroll-to',
      target: section.id,
      y: section.bounds.y - 100,
      duration: Math.min(800, remainingTime * 0.1),
      priority: 90
    });
    remainingTime -= 800;
  }
  
  // Look at key elements in section
  const keyElements = section.keyElements || [];
  const elementsToShow = keyElements.slice(0, 5);
  
  if (elementsToShow.length > 0) {
    const timePerElement = remainingTime / (elementsToShow.length + 1);
    
    for (const element of elementsToShow) {
      actions.push({
        type: 'hover',
        target: element.selector || element.id,
        x: element.x,
        y: element.y,
        duration: Math.round(timePerElement * 0.6),
        priority: element.priority || 50
      });
      
      // Maybe click on CTAs
      if (element.type === 'cta' || element.type === 'button') {
        actions.push({
          type: 'click',
          target: element.selector || element.id,
          x: element.x,
          y: element.y,
          duration: Math.round(timePerElement * 0.3),
          priority: 70,
          skippable: true
        });
      }
    }
  } else {
    // No key elements, just pan across section
    actions.push({
      type: 'pan',
      bounds: section.bounds,
      duration: remainingTime * 0.8,
      priority: 40
    });
  }
  
  // Final dwell
  actions.push({
    type: 'wait',
    duration: Math.max(300, remainingTime * 0.1),
    priority: 30
  });
  
  return actions;
}

export default PacingController;
