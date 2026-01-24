/**
 * SmartPacing - Intelligent demo pacing based on content complexity
 * 
 * Automatically adjusts timing based on:
 * - Visual complexity of each section
 * - Amount of text to read
 * - Number of interactive elements
 * - Voiceover sync requirements
 */

/**
 * Calculate optimal viewing time for a page section
 * @param {Object} section - Section analysis
 * @returns {number} Recommended viewing time in ms
 */
export function calculateSectionDuration(section) {
  const {
    textLength = 0,
    visualComplexity = 'medium', // low, medium, high
    interactiveElements = 0,
    isImportant = false,
    hasAnimation = false
  } = section;
  
  // Base reading speed: ~200 words per minute = ~3.3 words/sec
  const wordsPerSecond = 3.3;
  const wordCount = textLength / 5; // Rough word estimate
  const readingTime = (wordCount / wordsPerSecond) * 1000;
  
  // Visual complexity multiplier
  const complexityMultipliers = {
    low: 1.0,
    medium: 1.3,
    high: 1.6
  };
  const complexityFactor = complexityMultipliers[visualComplexity] || 1.3;
  
  // Interactive element time (300ms per element to acknowledge)
  const interactiveTime = interactiveElements * 300;
  
  // Base minimum viewing time
  const baseTime = 1500;
  
  // Animation wait time
  const animationTime = hasAnimation ? 1000 : 0;
  
  // Important section bonus
  const importanceBonus = isImportant ? 1500 : 0;
  
  const total = Math.max(
    baseTime,
    (readingTime * complexityFactor) + interactiveTime + animationTime + importanceBonus
  );
  
  // Cap at reasonable maximum
  return Math.min(total, 15000);
}

/**
 * Generate pacing timeline for a demo
 * @param {Array} sections - Array of page sections
 * @param {Object} options - Pacing options
 */
export function generatePacingTimeline(sections, options = {}) {
  const {
    targetDuration = 60000, // ms
    style = 'natural', // natural, fast, slow, dramatic
    voiceoverSync = true,
    minSectionTime = 2000,
    maxSectionTime = 12000,
    transitionTime = 800
  } = options;
  
  // Calculate raw durations
  const rawDurations = sections.map(s => calculateSectionDuration(s));
  const rawTotal = rawDurations.reduce((a, b) => a + b, 0);
  
  // Apply style factor
  const styleFactors = {
    fast: 0.7,
    natural: 1.0,
    slow: 1.3,
    dramatic: 1.5
  };
  const styleFactor = styleFactors[style] || 1.0;
  
  // Scale to fit target duration
  const scaleFactor = (targetDuration - (sections.length * transitionTime)) / rawTotal * styleFactor;
  
  const timeline = [];
  let currentTime = 0;
  
  for (let i = 0; i < sections.length; i++) {
    const scaledDuration = Math.min(
      maxSectionTime,
      Math.max(minSectionTime, rawDurations[i] * scaleFactor)
    );
    
    timeline.push({
      section: i,
      name: sections[i].name || `Section ${i + 1}`,
      startTime: currentTime,
      duration: scaledDuration,
      endTime: currentTime + scaledDuration,
      emphasis: sections[i].isImportant ? 'high' : 'normal'
    });
    
    currentTime += scaledDuration + transitionTime;
  }
  
  return {
    timeline,
    totalDuration: currentTime - transitionTime,
    sections: sections.length
  };
}

/**
 * Sync pacing with voiceover script
 * @param {Array} timeline - Pacing timeline
 * @param {Array} voiceoverSegments - Voiceover timing data
 */
export function syncWithVoiceover(timeline, voiceoverSegments) {
  const synced = [];
  
  for (const section of timeline) {
    // Find matching voiceover segment
    const matchingVoiceover = voiceoverSegments.find(v => 
      v.sectionIndex === section.section || 
      v.name === section.name
    );
    
    if (matchingVoiceover) {
      // Adjust section timing to match voiceover
      const voiceDuration = matchingVoiceover.duration;
      const bufferTime = 500; // Extra time after voice ends
      
      synced.push({
        ...section,
        duration: Math.max(section.duration, voiceDuration + bufferTime),
        voiceStart: section.startTime,
        voiceEnd: section.startTime + voiceDuration,
        hasVoiceover: true
      });
    } else {
      synced.push({
        ...section,
        hasVoiceover: false
      });
    }
  }
  
  // Recalculate start times
  let currentTime = 0;
  for (const section of synced) {
    section.startTime = currentTime;
    section.endTime = currentTime + section.duration;
    currentTime = section.endTime + 800; // transition time
  }
  
  return synced;
}

/**
 * Add dramatic pauses at key moments
 * @param {Array} timeline - Pacing timeline
 * @param {Array} keyMoments - Array of {time, type, duration}
 */
export function addDramaticPauses(timeline, keyMoments = []) {
  // Auto-detect key moments if not provided
  if (keyMoments.length === 0) {
    keyMoments = detectKeyMoments(timeline);
  }
  
  const enhanced = [...timeline];
  
  for (const moment of keyMoments) {
    // Find the section containing this moment
    const sectionIndex = enhanced.findIndex(s => 
      s.startTime <= moment.time && s.endTime >= moment.time
    );
    
    if (sectionIndex >= 0) {
      enhanced[sectionIndex] = {
        ...enhanced[sectionIndex],
        pauses: [
          ...(enhanced[sectionIndex].pauses || []),
          {
            at: moment.time - enhanced[sectionIndex].startTime,
            duration: moment.duration || 500,
            type: moment.type
          }
        ]
      };
    }
  }
  
  return enhanced;
}

/**
 * Detect key moments for dramatic pauses
 */
function detectKeyMoments(timeline) {
  const moments = [];
  
  for (const section of timeline) {
    // Pause at section start if important
    if (section.emphasis === 'high') {
      moments.push({
        time: section.startTime + 200,
        type: 'reveal',
        duration: 600
      });
    }
    
    // Pause at midpoint for longer sections
    if (section.duration > 5000) {
      moments.push({
        time: section.startTime + section.duration / 2,
        type: 'emphasis',
        duration: 400
      });
    }
  }
  
  return moments;
}

/**
 * Calculate scroll timing for smooth reveal
 * @param {number} scrollDistance - Pixels to scroll
 * @param {Object} options - Scroll options
 */
export function calculateScrollTiming(scrollDistance, options = {}) {
  const {
    style = 'smooth', // smooth, fast, cinematic
    viewportHeight = 1080
  } = options;
  
  // Base scroll speed in pixels per second
  const speedMap = {
    fast: 800,
    smooth: 400,
    cinematic: 200
  };
  const baseSpeed = speedMap[style] || 400;
  
  // Slower for longer scrolls (logarithmic)
  const adjustedSpeed = baseSpeed * (1 - Math.log10(scrollDistance / viewportHeight + 1) * 0.2);
  
  const duration = (scrollDistance / adjustedSpeed) * 1000;
  
  // Generate scroll keyframes
  const keyframes = [];
  const steps = Math.ceil(duration / 16); // ~60fps
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const eased = style === 'cinematic' 
      ? easeInOutQuint(t)
      : easeOutCubic(t);
    
    keyframes.push({
      time: t * duration,
      scrollY: scrollDistance * eased,
      progress: t
    });
  }
  
  return {
    duration,
    keyframes,
    style
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

export default {
  calculateSectionDuration,
  generatePacingTimeline,
  syncWithVoiceover,
  addDramaticPauses,
  calculateScrollTiming
};
