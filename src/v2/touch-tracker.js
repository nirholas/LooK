/**
 * TouchTracker - Track touch events for mobile app demos
 * Records touch positions, gestures, and generates smooth interpolated paths
 * Supports multi-touch gestures like pinch and rotate
 */

export class TouchTracker {
  constructor(options = {}) {
    this.fps = options.fps || 60;
    this.smoothing = options.smoothing || 0.15;
    this.touches = [];      // All touch events
    this.gestures = [];     // Detected gestures
    this.activeTouches = new Map(); // Currently active touch points by ID
    this.multiTouchState = null; // For tracking pinch/rotate
    this.startTime = null;
  }

  // Gesture type constants
  static GESTURES = {
    TAP: 'tap',
    DOUBLE_TAP: 'double_tap',
    LONG_PRESS: 'long_press',
    SWIPE: 'swipe',
    SWIPE_UP: 'swipe_up',
    SWIPE_DOWN: 'swipe_down',
    SWIPE_LEFT: 'swipe_left',
    SWIPE_RIGHT: 'swipe_right',
    PINCH: 'pinch',
    PINCH_IN: 'pinch_in',
    PINCH_OUT: 'pinch_out',
    ROTATE: 'rotate'
  };

  /**
   * Record a touch event
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} phase - Touch phase: 'began', 'moved', 'ended', 'cancelled'
   * @param {number} timestamp - Event timestamp
   * @param {number} touchId - Unique touch identifier (for multi-touch)
   */
  recordTouch(x, y, phase, timestamp = Date.now(), touchId = 0) {
    if (!this.startTime) this.startTime = timestamp;

    const touch = {
      x,
      y,
      phase,
      t: timestamp - this.startTime,
      touchId
    };

    this.touches.push(touch);

    // Track active touches
    if (phase === 'began') {
      this.activeTouches.set(touchId, [touch]);
    } else if (phase === 'moved' && this.activeTouches.has(touchId)) {
      this.activeTouches.get(touchId).push(touch);
    } else if (phase === 'ended' || phase === 'cancelled') {
      if (this.activeTouches.has(touchId)) {
        this.activeTouches.get(touchId).push(touch);
        
        // Detect gesture when touch ends
        const touchSequence = this.activeTouches.get(touchId);
        const gesture = this.detectGesture(touchSequence);
        if (gesture) {
          this.gestures.push(gesture);
        }
        
        this.activeTouches.delete(touchId);
      }
    }
  }

  /**
   * Record a complete tap gesture (convenience method)
   */
  recordTap(x, y, timestamp = Date.now()) {
    this.recordTouch(x, y, 'began', timestamp);
    this.recordTouch(x, y, 'ended', timestamp + 50);
  }

  /**
   * Record a complete swipe gesture (convenience method)
   */
  recordSwipe(startX, startY, endX, endY, duration = 500, timestamp = Date.now()) {
    const steps = Math.ceil(duration / (1000 / this.fps));
    
    this.recordTouch(startX, startY, 'began', timestamp);
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      this.recordTouch(x, y, 'moved', timestamp + (duration * t));
    }
    
    this.recordTouch(endX, endY, 'ended', timestamp + duration);
  }

  /**
   * Record a pinch gesture (convenience method)
   * @param {number} centerX - Center X of pinch
   * @param {number} centerY - Center Y of pinch
   * @param {number} startDistance - Initial distance between fingers
   * @param {number} endDistance - Final distance between fingers
   * @param {number} duration - Gesture duration in ms
   * @param {number} timestamp - Start timestamp
   */
  recordPinch(centerX, centerY, startDistance, endDistance, duration = 500, timestamp = Date.now()) {
    const steps = Math.ceil(duration / (1000 / this.fps));
    
    // Two fingers moving symmetrically
    const halfStartDist = startDistance / 2;
    const halfEndDist = endDistance / 2;
    
    // Start both touches
    this.recordTouch(centerX - halfStartDist, centerY, 'began', timestamp, 0);
    this.recordTouch(centerX + halfStartDist, centerY, 'began', timestamp, 1);
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const currentHalfDist = halfStartDist + (halfEndDist - halfStartDist) * t;
      const stepTime = timestamp + (duration * t);
      
      this.recordTouch(centerX - currentHalfDist, centerY, 'moved', stepTime, 0);
      this.recordTouch(centerX + currentHalfDist, centerY, 'moved', stepTime, 1);
    }
    
    // End both touches
    this.recordTouch(centerX - halfEndDist, centerY, 'ended', timestamp + duration, 0);
    this.recordTouch(centerX + halfEndDist, centerY, 'ended', timestamp + duration, 1);
    
    // Manually record the pinch gesture
    const scale = endDistance / startDistance;
    this.gestures.push({
      type: scale > 1 ? TouchTracker.GESTURES.PINCH_OUT : TouchTracker.GESTURES.PINCH_IN,
      centerX,
      centerY,
      startDistance,
      endDistance,
      scale,
      t: timestamp - (this.startTime || timestamp),
      duration
    });
  }

  /**
   * Record a rotation gesture (convenience method)
   * @param {number} centerX - Center X of rotation
   * @param {number} centerY - Center Y of rotation
   * @param {number} radius - Distance from center to fingers
   * @param {number} startAngle - Initial angle in radians
   * @param {number} endAngle - Final angle in radians
   * @param {number} duration - Gesture duration in ms
   * @param {number} timestamp - Start timestamp
   */
  recordRotate(centerX, centerY, radius, startAngle, endAngle, duration = 500, timestamp = Date.now()) {
    const steps = Math.ceil(duration / (1000 / this.fps));
    
    // Calculate start positions
    const startX1 = centerX + radius * Math.cos(startAngle);
    const startY1 = centerY + radius * Math.sin(startAngle);
    const startX2 = centerX + radius * Math.cos(startAngle + Math.PI);
    const startY2 = centerY + radius * Math.sin(startAngle + Math.PI);
    
    // Start both touches
    this.recordTouch(startX1, startY1, 'began', timestamp, 0);
    this.recordTouch(startX2, startY2, 'began', timestamp, 1);
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const currentAngle = startAngle + (endAngle - startAngle) * t;
      const stepTime = timestamp + (duration * t);
      
      const x1 = centerX + radius * Math.cos(currentAngle);
      const y1 = centerY + radius * Math.sin(currentAngle);
      const x2 = centerX + radius * Math.cos(currentAngle + Math.PI);
      const y2 = centerY + radius * Math.sin(currentAngle + Math.PI);
      
      this.recordTouch(x1, y1, 'moved', stepTime, 0);
      this.recordTouch(x2, y2, 'moved', stepTime, 1);
    }
    
    // Calculate end positions
    const endX1 = centerX + radius * Math.cos(endAngle);
    const endY1 = centerY + radius * Math.sin(endAngle);
    const endX2 = centerX + radius * Math.cos(endAngle + Math.PI);
    const endY2 = centerY + radius * Math.sin(endAngle + Math.PI);
    
    // End both touches
    this.recordTouch(endX1, endY1, 'ended', timestamp + duration, 0);
    this.recordTouch(endX2, endY2, 'ended', timestamp + duration, 1);
    
    // Manually record the rotation gesture
    const rotation = endAngle - startAngle;
    this.gestures.push({
      type: TouchTracker.GESTURES.ROTATE,
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle,
      rotation,
      rotationDegrees: (rotation * 180) / Math.PI,
      t: timestamp - (this.startTime || timestamp),
      duration
    });
  }

  /**
   * Detect gesture type from a sequence of touch events
   */
  detectGesture(touchSequence) {
    if (!touchSequence || touchSequence.length < 2) return null;

    const start = touchSequence[0];
    const end = touchSequence[touchSequence.length - 1];
    const duration = end.t - start.t;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);

    // Tap: short duration, minimal movement
    if (distance < 15 && duration < 300) {
      // Check for double tap
      const lastTap = this.gestures.filter(g => g.type === 'tap').pop();
      if (lastTap && start.t - lastTap.t < 400 && 
          Math.hypot(start.x - lastTap.x, start.y - lastTap.y) < 30) {
        // Remove the previous tap and replace with double tap
        this.gestures.pop();
        return {
          type: TouchTracker.GESTURES.DOUBLE_TAP,
          x: end.x,
          y: end.y,
          t: start.t
        };
      }
      
      return {
        type: TouchTracker.GESTURES.TAP,
        x: end.x,
        y: end.y,
        t: end.t
      };
    }

    // Long press: minimal movement, long duration
    if (distance < 15 && duration >= 500) {
      return {
        type: TouchTracker.GESTURES.LONG_PRESS,
        x: end.x,
        y: end.y,
        t: start.t,
        duration
      };
    }

    // Swipe: significant movement
    if (distance > 50) {
      const direction = this.getSwipeDirection(dx, dy);
      return {
        type: TouchTracker.GESTURES.SWIPE,
        direction,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        t: start.t,
        duration,
        velocity: distance / duration * 1000 // pixels per second
      };
    }

    return null;
  }

  /**
   * Determine swipe direction from delta values
   */
  getSwipeDirection(dx, dy) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Get touch position at a specific time using interpolation
   */
  getTouchAt(t) {
    if (this.touches.length === 0) return null;
    
    // Find touches around time t
    const beforeTouches = this.touches.filter(touch => touch.t <= t);
    const afterTouches = this.touches.filter(touch => touch.t > t);

    if (beforeTouches.length === 0) {
      return { x: this.touches[0].x, y: this.touches[0].y, active: false };
    }

    const before = beforeTouches[beforeTouches.length - 1];
    
    // Check if touch is active at this time
    const isActive = before.phase !== 'ended' && before.phase !== 'cancelled';

    if (afterTouches.length === 0 || !isActive) {
      return { x: before.x, y: before.y, active: isActive };
    }

    const after = afterTouches[0];
    
    // Only interpolate during 'moved' phase
    if (before.phase === 'moved' || after.phase === 'moved') {
      const ratio = (t - before.t) / (after.t - before.t);
      return {
        x: before.x + (after.x - before.x) * ratio,
        y: before.y + (after.y - before.y) * ratio,
        active: true
      };
    }

    return { x: before.x, y: before.y, active: isActive };
  }

  /**
   * Get gesture active at a specific time
   */
  getGestureAt(t) {
    // Find gestures that are active at time t
    // For taps, show briefly; for swipes, show during duration
    for (const gesture of this.gestures) {
      if (gesture.type === TouchTracker.GESTURES.TAP || 
          gesture.type === TouchTracker.GESTURES.DOUBLE_TAP) {
        // Show tap for 300ms
        if (t >= gesture.t && t < gesture.t + 300) {
          return gesture;
        }
      } else if (gesture.type === TouchTracker.GESTURES.SWIPE) {
        // Show swipe during its duration + a little after
        if (t >= gesture.t && t < gesture.t + gesture.duration + 200) {
          return gesture;
        }
      } else if (gesture.type === TouchTracker.GESTURES.LONG_PRESS) {
        if (t >= gesture.t && t < gesture.t + gesture.duration) {
          return gesture;
        }
      }
    }
    return null;
  }

  /**
   * Generate frame-by-frame touch data for video rendering
   */
  getFrames(duration) {
    const frameCount = Math.ceil(duration / 1000 * this.fps);
    const frames = [];
    const frameInterval = 1000 / this.fps;

    for (let i = 0; i < frameCount; i++) {
      const t = i * frameInterval;
      const touch = this.getTouchAt(t);
      const gesture = this.getGestureAt(t);

      frames.push({
        frame: i,
        time: t,
        x: touch?.x ?? null,
        y: touch?.y ?? null,
        active: touch?.active ?? false,
        gesture
      });
    }

    return frames;
  }

  /**
   * Get all gestures for zoom targeting
   */
  getGesturesForZoom() {
    return this.gestures.map(gesture => {
      const x = gesture.type === TouchTracker.GESTURES.SWIPE 
        ? (gesture.startX + gesture.endX) / 2 
        : gesture.x;
      const y = gesture.type === TouchTracker.GESTURES.SWIPE 
        ? (gesture.startY + gesture.endY) / 2 
        : gesture.y;

      return {
        x,
        y,
        time: gesture.t,
        type: gesture.type,
        zoomLevel: gesture.type === TouchTracker.GESTURES.TAP ? 1.4 : 1.2
      };
    });
  }

  /**
   * Get tap events (for touch indicator effects)
   */
  getTaps() {
    return this.gestures
      .filter(g => g.type === TouchTracker.GESTURES.TAP || 
                   g.type === TouchTracker.GESTURES.DOUBLE_TAP)
      .map(g => ({
        x: g.x,
        y: g.y,
        t: g.t,
        isDouble: g.type === TouchTracker.GESTURES.DOUBLE_TAP
      }));
  }

  /**
   * Get swipes for trail rendering
   */
  getSwipes() {
    return this.gestures
      .filter(g => g.type === TouchTracker.GESTURES.SWIPE)
      .map(g => ({
        startX: g.startX,
        startY: g.startY,
        endX: g.endX,
        endY: g.endY,
        direction: g.direction,
        t: g.t,
        duration: g.duration
      }));
  }

  /**
   * Calculate velocities for motion blur
   */
  getVelocities() {
    return this.touches.map((touch, i) => {
      if (i === 0) return { ...touch, velocity: 0 };

      const prev = this.touches[i - 1];
      const dx = touch.x - prev.x;
      const dy = touch.y - prev.y;
      const dt = (touch.t - prev.t) || 1;
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000;

      return { ...touch, velocity };
    });
  }

  /**
   * Export as JSON
   */
  toJSON() {
    return {
      fps: this.fps,
      duration: this.touches.length > 0 
        ? this.touches[this.touches.length - 1].t 
        : 0,
      touches: this.touches,
      gestures: this.gestures
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON(json) {
    const tracker = new TouchTracker({ fps: json.fps });
    tracker.touches = json.touches || [];
    tracker.gestures = json.gestures || [];
    if (tracker.touches.length > 0) {
      tracker.startTime = 0; // Already normalized
    }
    return tracker;
  }
}

export default TouchTracker;
