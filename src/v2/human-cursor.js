/**
 * HumanCursor - Generate realistic, human-like mouse movement
 * 
 * Features:
 * - Natural acceleration/deceleration curves
 * - Slight overshoot when reaching targets
 * - Micro-corrections and jitter
 * - Variable speed based on distance
 * - Hesitation before important clicks
 */

/**
 * Generate human-like cursor path between two points
 * @param {Object} start - Start position {x, y}
 * @param {Object} end - End position {x, y}
 * @param {Object} options - Movement options
 * @returns {Array} Array of positions with timing
 */
export function generateHumanPath(start, end, options = {}) {
  const {
    duration = null, // Auto-calculate if not provided
    fps = 60,
    overshoot = 0.15, // How much to overshoot (0-0.3)
    jitter = 2, // Pixel jitter amount
    hesitation = 0, // ms to pause before reaching target
    style = 'natural' // 'natural', 'fast', 'careful', 'lazy'
  } = options;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate duration based on Fitts's Law if not provided
  const calcDuration = duration || calculateMovementTime(distance, style);
  
  const points = [];
  const frameCount = Math.ceil(calcDuration / 1000 * fps);
  
  // Generate control points for bezier curve with slight randomness
  const controlPoints = generateControlPoints(start, end, overshoot, style);
  
  for (let i = 0; i <= frameCount; i++) {
    const t = i / frameCount;
    const easedT = humanEasing(t, style);
    
    // Get base position from bezier curve
    const pos = bezierPoint(controlPoints, easedT);
    
    // Add micro-jitter (decreases as we approach target)
    const jitterAmount = jitter * (1 - t * t);
    pos.x += (Math.random() - 0.5) * jitterAmount;
    pos.y += (Math.random() - 0.5) * jitterAmount;
    
    // Add hesitation pause near end
    let time = (calcDuration / frameCount) * i;
    if (hesitation > 0 && t > 0.85) {
      time += hesitation * (t - 0.85) / 0.15;
    }
    
    points.push({
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      t: Math.round(time)
    });
  }
  
  return points;
}

/**
 * Calculate movement time using Fitts's Law
 * Movement time = a + b * log2(distance/width + 1)
 */
function calculateMovementTime(distance, style) {
  const styleFactors = {
    fast: { a: 100, b: 80 },
    natural: { a: 200, b: 120 },
    careful: { a: 300, b: 150 },
    lazy: { a: 400, b: 180 }
  };
  
  const { a, b } = styleFactors[style] || styleFactors.natural;
  const targetWidth = 40; // Assumed target size
  
  return a + b * Math.log2(distance / targetWidth + 1);
}

/**
 * Human-like easing function
 * Not perfectly smooth - has subtle variations
 */
function humanEasing(t, style) {
  // Base easing with slight randomness
  const noise = (Math.random() - 0.5) * 0.02;
  
  switch (style) {
    case 'fast':
      // Quick start, quick end
      return easeOutQuart(t) + noise;
    case 'careful':
      // Slow approach to target
      return easeInOutQuint(t) + noise;
    case 'lazy':
      // Slow start, gradual acceleration
      return easeInQuad(t) + noise;
    default:
      // Natural: ease in-out with slight overshoot feel
      return easeInOutCubic(t) + noise * (1 - t);
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function easeInQuad(t) {
  return t * t;
}

/**
 * Generate bezier control points with human-like curvature
 */
function generateControlPoints(start, end, overshoot, style) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular offset for curve
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Random curve direction and magnitude
  const curveMagnitude = distance * (0.1 + Math.random() * 0.2);
  const curveDirection = Math.random() > 0.5 ? 1 : -1;
  
  // Control point 1: ~30% along path with curve
  const cp1 = {
    x: start.x + dx * 0.3 + perpX * curveMagnitude * curveDirection,
    y: start.y + dy * 0.3 + perpY * curveMagnitude * curveDirection
  };
  
  // Control point 2: ~70% along path, opposite curve
  const cp2 = {
    x: start.x + dx * 0.7 - perpX * curveMagnitude * curveDirection * 0.5,
    y: start.y + dy * 0.7 - perpY * curveMagnitude * curveDirection * 0.5
  };
  
  // Overshoot point
  const overshootAmount = overshoot * distance * (0.5 + Math.random() * 0.5);
  const overshootPoint = {
    x: end.x + (dx / distance) * overshootAmount,
    y: end.y + (dy / distance) * overshootAmount
  };
  
  return [start, cp1, cp2, overshootPoint, end];
}

/**
 * Calculate point on bezier curve
 */
function bezierPoint(points, t) {
  if (points.length === 1) return { ...points[0] };
  
  const newPoints = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t
    });
  }
  
  return bezierPoint(newPoints, t);
}

/**
 * Generate a sequence of movements for a demo script
 * @param {Array} targets - Array of {x, y, action, wait} targets
 * @param {Object} viewport - {width, height}
 * @param {Object} options - Movement options
 */
export function generateDemoSequence(targets, viewport, options = {}) {
  const {
    startPosition = { x: viewport.width / 2, y: viewport.height / 2 },
    style = 'natural'
  } = options;
  
  const sequence = {
    positions: [],
    clicks: [],
    totalDuration: 0
  };
  
  let currentPos = startPosition;
  let currentTime = 0;
  
  for (const target of targets) {
    // Generate path to target
    const pathOptions = {
      style,
      hesitation: target.action === 'click' ? 100 : 0,
      overshoot: target.action === 'hover' ? 0.05 : 0.12
    };
    
    const path = generateHumanPath(currentPos, target, pathOptions);
    
    // Adjust times and add to sequence
    for (const point of path) {
      sequence.positions.push({
        x: point.x,
        y: point.y,
        t: currentTime + point.t
      });
    }
    
    currentTime += path[path.length - 1].t;
    
    // Record click if action is click
    if (target.action === 'click') {
      sequence.clicks.push({
        x: target.x,
        y: target.y,
        t: currentTime,
        element: target.element || null
      });
      
      // Add post-click pause
      currentTime += target.clickDuration || 200;
    }
    
    // Add wait time
    if (target.wait) {
      currentTime += target.wait;
    }
    
    currentPos = { x: target.x, y: target.y };
  }
  
  sequence.totalDuration = currentTime;
  return sequence;
}

/**
 * Smooth existing cursor data to look more human
 * @param {Object} cursorData - Raw cursor data
 * @returns {Object} Smoothed cursor data
 */
export function humanizeCursorData(cursorData) {
  const { positions, clicks } = cursorData;
  
  if (positions.length < 3) return cursorData;
  
  const smoothed = [];
  
  // Apply moving average with velocity-aware smoothing
  for (let i = 0; i < positions.length; i++) {
    const windowSize = 5;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(positions.length - 1, i + windowSize);
    
    let sumX = 0, sumY = 0, count = 0;
    
    for (let j = start; j <= end; j++) {
      // Weight by distance from center
      const weight = 1 - Math.abs(j - i) / (windowSize + 1);
      sumX += positions[j].x * weight;
      sumY += positions[j].y * weight;
      count += weight;
    }
    
    smoothed.push({
      x: Math.round(sumX / count),
      y: Math.round(sumY / count),
      t: positions[i].t
    });
  }
  
  return {
    ...cursorData,
    positions: smoothed
  };
}

/**
 * Add realistic micro-movements during pauses
 * @param {Object} cursorData - Cursor data
 * @param {number} pauseThreshold - ms to consider a pause
 */
export function addIdleMovement(cursorData, pauseThreshold = 500) {
  const { positions } = cursorData;
  const enhanced = [];
  
  for (let i = 0; i < positions.length; i++) {
    enhanced.push(positions[i]);
    
    // Check if there's a long pause
    if (i < positions.length - 1) {
      const gap = positions[i + 1].t - positions[i].t;
      
      if (gap > pauseThreshold) {
        // Add subtle idle movement
        const idlePoints = Math.floor(gap / 100);
        const baseX = positions[i].x;
        const baseY = positions[i].y;
        
        for (let j = 1; j < idlePoints; j++) {
          const t = positions[i].t + j * 100;
          // Subtle breathing-like movement
          const drift = Math.sin(t / 500) * 2;
          
          enhanced.push({
            x: Math.round(baseX + drift + (Math.random() - 0.5) * 1),
            y: Math.round(baseY + drift * 0.5 + (Math.random() - 0.5) * 1),
            t
          });
        }
      }
    }
  }
  
  return {
    ...cursorData,
    positions: enhanced
  };
}

export default {
  generateHumanPath,
  generateDemoSequence,
  humanizeCursorData,
  addIdleMovement
};
