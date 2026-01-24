/**
 * TransitionEffects - Professional scene transitions for demos
 * 
 * Transitions:
 * - Fade (in/out/cross)
 * - Slide (directional)
 * - Zoom (in/out)
 * - Blur
 * - Morphing/wipe
 */

/**
 * Easing functions for smooth animations
 */
export const easings = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  // Bounce effect
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  // Elastic effect
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

/**
 * Generate fade transition
 * @param {Object} options - Fade options
 */
export function generateFadeTransition(options = {}) {
  const {
    type = 'out', // 'in', 'out', 'cross'
    duration = 500,
    color = '#000000',
    easing = 'easeInOutQuad'
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67); // ~60fps
  const keyframes = [];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    let opacity;
    if (type === 'in') {
      opacity = 1 - easedProgress;
    } else if (type === 'out') {
      opacity = easedProgress;
    } else { // cross
      opacity = Math.sin(easedProgress * Math.PI);
    }
    
    keyframes.push({
      time: Math.round(progress * duration),
      opacity,
      color
    });
  }
  
  return {
    type: 'fade',
    duration,
    keyframes
  };
}

/**
 * Generate slide transition
 * @param {Object} options - Slide options
 */
export function generateSlideTransition(options = {}) {
  const {
    direction = 'left', // 'left', 'right', 'up', 'down'
    duration = 600,
    easing = 'easeOutCubic',
    overlap = 0.3 // How much old/new scenes overlap
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67);
  const keyframes = [];
  
  const directionVectors = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 }
  };
  
  const vector = directionVectors[direction];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    // Old scene slides out
    const oldX = easedProgress * vector.x * 100;
    const oldY = easedProgress * vector.y * 100;
    
    // New scene slides in from opposite direction
    const newX = (1 - easedProgress) * -vector.x * 100;
    const newY = (1 - easedProgress) * -vector.y * 100;
    
    keyframes.push({
      time: Math.round(progress * duration),
      oldScene: {
        translateX: `${oldX}%`,
        translateY: `${oldY}%`,
        opacity: progress > (1 - overlap) ? 1 - (progress - (1 - overlap)) / overlap : 1
      },
      newScene: {
        translateX: `${newX}%`,
        translateY: `${newY}%`,
        opacity: progress < overlap ? progress / overlap : 1
      }
    });
  }
  
  return {
    type: 'slide',
    direction,
    duration,
    keyframes
  };
}

/**
 * Generate zoom transition
 * @param {Object} options - Zoom options
 */
export function generateZoomTransition(options = {}) {
  const {
    type = 'out', // 'in', 'out'
    duration = 500,
    easing = 'easeInOutQuad',
    focalPoint = { x: 0.5, y: 0.5 }, // Normalized 0-1
    maxScale = 3
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67);
  const keyframes = [];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    let scale, opacity;
    
    if (type === 'in') {
      // Start zoomed in, zoom out to normal
      scale = maxScale - (maxScale - 1) * easedProgress;
      opacity = easedProgress;
    } else {
      // Start normal, zoom in and fade
      scale = 1 + (maxScale - 1) * easedProgress;
      opacity = 1 - easedProgress;
    }
    
    keyframes.push({
      time: Math.round(progress * duration),
      scale,
      opacity,
      transformOrigin: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
    });
  }
  
  return {
    type: 'zoom',
    duration,
    keyframes
  };
}

/**
 * Generate blur transition
 * @param {Object} options - Blur options
 */
export function generateBlurTransition(options = {}) {
  const {
    type = 'out', // 'in', 'out'
    duration = 400,
    maxBlur = 20,
    easing = 'easeInOutQuad'
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67);
  const keyframes = [];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    let blur, opacity;
    
    if (type === 'in') {
      blur = maxBlur * (1 - easedProgress);
      opacity = easedProgress;
    } else {
      blur = maxBlur * easedProgress;
      opacity = 1 - easedProgress;
    }
    
    keyframes.push({
      time: Math.round(progress * duration),
      blur: `${blur}px`,
      opacity
    });
  }
  
  return {
    type: 'blur',
    duration,
    keyframes
  };
}

/**
 * Generate wipe transition
 * @param {Object} options - Wipe options
 */
export function generateWipeTransition(options = {}) {
  const {
    direction = 'left', // 'left', 'right', 'up', 'down', 'diagonal'
    duration = 700,
    easing = 'easeInOutQuad',
    feather = 50 // Soft edge in pixels
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67);
  const keyframes = [];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    // Generate clip path or gradient mask based on direction
    let clipPath, gradientAngle;
    
    switch (direction) {
      case 'left':
        clipPath = `inset(0 ${(1 - easedProgress) * 100}% 0 0)`;
        gradientAngle = 90;
        break;
      case 'right':
        clipPath = `inset(0 0 0 ${(1 - easedProgress) * 100}%)`;
        gradientAngle = 270;
        break;
      case 'up':
        clipPath = `inset(0 0 ${(1 - easedProgress) * 100}% 0)`;
        gradientAngle = 180;
        break;
      case 'down':
        clipPath = `inset(${(1 - easedProgress) * 100}% 0 0 0)`;
        gradientAngle = 0;
        break;
      case 'diagonal':
        const x = easedProgress * 150 - 50;
        clipPath = `polygon(${x}% 0, ${x + 100}% 0, ${x + 50}% 100%, ${x - 50}% 100%)`;
        gradientAngle = 45;
        break;
    }
    
    keyframes.push({
      time: Math.round(progress * duration),
      clipPath,
      gradientAngle,
      progress: easedProgress,
      feather
    });
  }
  
  return {
    type: 'wipe',
    direction,
    duration,
    keyframes
  };
}

/**
 * Generate morph/dissolve transition
 * @param {Object} options - Morph options
 */
export function generateMorphTransition(options = {}) {
  const {
    duration = 600,
    easing = 'easeInOutQuad',
    pixelSize = 8 // For pixelation dissolve effect
  } = options;
  
  const easeFn = easings[easing];
  const frames = Math.ceil(duration / 16.67);
  const keyframes = [];
  
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const easedProgress = easeFn(progress);
    
    // First half: old scene dissolves
    // Second half: new scene appears
    let oldOpacity, newOpacity, pixelation;
    
    if (easedProgress < 0.5) {
      oldOpacity = 1;
      newOpacity = 0;
      pixelation = Math.max(1, pixelSize * easedProgress * 2);
    } else {
      oldOpacity = 0;
      newOpacity = 1;
      pixelation = Math.max(1, pixelSize * (1 - (easedProgress - 0.5) * 2));
    }
    
    keyframes.push({
      time: Math.round(progress * duration),
      oldScene: { opacity: oldOpacity, pixelation },
      newScene: { opacity: newOpacity, pixelation },
      blendProgress: easedProgress
    });
  }
  
  return {
    type: 'morph',
    duration,
    keyframes
  };
}

/**
 * Apply transition effect to video frames using FFmpeg filter
 * @param {Object} transition - Transition definition
 */
export function getFFmpegFilter(transition) {
  switch (transition.type) {
    case 'fade':
      return `fade=t=${transition.keyframes[0].opacity === 0 ? 'in' : 'out'}:d=${transition.duration / 1000}`;
    
    case 'slide':
      // Would need xfade filter for scene transitions
      return `xfade=transition=slide${transition.direction}:duration=${transition.duration / 1000}`;
    
    case 'zoom':
      return `zoompan=z='if(lte(on,${transition.duration / 16.67}),1.5-0.5*on/${transition.duration / 16.67},1)':d=${transition.duration / 16.67}`;
    
    case 'blur':
      // Animate blur
      return `boxblur=luma_radius='20*(1-t/${transition.duration / 1000})':enable='between(t,0,${transition.duration / 1000})'`;
    
    case 'wipe':
      return `xfade=transition=wipe${transition.direction}:duration=${transition.duration / 1000}`;
    
    default:
      return null;
  }
}

/**
 * Create transition sequence for section changes
 * @param {Array} sections - Demo sections with timing
 */
export function createTransitionSequence(sections, options = {}) {
  const {
    defaultTransition = 'fade',
    transitionDuration = 400,
    betweenSections = true
  } = options;
  
  const sequence = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Intro transition
    if (i === 0) {
      sequence.push({
        time: 0,
        transition: generateFadeTransition({ type: 'in', duration: transitionDuration }),
        sectionIndex: 0
      });
    }
    
    // Between section transitions
    if (betweenSections && i < sections.length - 1) {
      const nextSection = sections[i + 1];
      
      // Choose transition based on section types
      let transitionType = defaultTransition;
      let transitionOptions = { duration: transitionDuration };
      
      // Smart transition selection
      if (section.type === 'overview' && nextSection.type === 'detail') {
        transitionType = 'zoom';
        transitionOptions.type = 'out';
      } else if (section.type === 'detail' && nextSection.type === 'overview') {
        transitionType = 'zoom';
        transitionOptions.type = 'in';
      } else if (section.page !== nextSection.page) {
        transitionType = 'slide';
        transitionOptions.direction = 'left';
      }
      
      const transitionGenerators = {
        fade: generateFadeTransition,
        slide: generateSlideTransition,
        zoom: generateZoomTransition,
        blur: generateBlurTransition,
        wipe: generateWipeTransition
      };
      
      sequence.push({
        time: section.endTime - transitionDuration / 2,
        transition: transitionGenerators[transitionType](transitionOptions),
        sectionIndex: i + 1
      });
    }
    
    // Outro transition
    if (i === sections.length - 1) {
      sequence.push({
        time: section.endTime - transitionDuration,
        transition: generateFadeTransition({ type: 'out', duration: transitionDuration }),
        sectionIndex: i
      });
    }
  }
  
  return sequence;
}

export default {
  easings,
  generateFadeTransition,
  generateSlideTransition,
  generateZoomTransition,
  generateBlurTransition,
  generateWipeTransition,
  generateMorphTransition,
  getFFmpegFilter,
  createTransitionSequence
};
