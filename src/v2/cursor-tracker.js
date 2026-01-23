/**
 * CursorTracker - 60fps cursor position tracking with smoothing
 * Records mouse position, clicks, and generates smooth interpolated paths
 */

export class CursorTracker {
  constructor(options = {}) {
    this.fps = options.fps || 60;
    this.smoothing = options.smoothing || 0.15; // Bezier smoothing factor
    this.positions = [];
    this.clicks = [];
    this.startTime = null;
  }

  /**
   * Record a cursor position
   */
  record(x, y, timestamp = Date.now()) {
    if (!this.startTime) this.startTime = timestamp;
    
    this.positions.push({
      x,
      y,
      t: timestamp - this.startTime
    });
  }

  /**
   * Record a click event
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate  
   * @param {number} timestamp - Event timestamp
   * @param {Object} [element] - Optional element metadata for smart markers
   */
  recordClick(x, y, timestamp = Date.now(), element = null) {
    if (!this.startTime) this.startTime = timestamp;
    
    this.clicks.push({
      x,
      y,
      t: timestamp - this.startTime,
      element: element || null
    });
  }

  /**
   * Get interpolated positions at exact frame times
   * Uses Catmull-Rom spline for smooth curves
   */
  getFrames(duration) {
    const frameCount = Math.ceil(duration / 1000 * this.fps);
    const frames = [];
    const frameInterval = duration / frameCount;

    for (let i = 0; i < frameCount; i++) {
      const t = i * frameInterval;
      const pos = this.interpolatePosition(t);
      frames.push({
        frame: i,
        time: t,
        x: pos.x,
        y: pos.y,
        isClick: this.isClickAtTime(t, 100) // 100ms tolerance
      });
    }

    return frames;
  }

  /**
   * Interpolate position at time t using Catmull-Rom spline
   */
  interpolatePosition(t) {
    if (this.positions.length === 0) return { x: 0, y: 0 };
    if (this.positions.length === 1) return { x: this.positions[0].x, y: this.positions[0].y };

    // Find surrounding points
    let i = 0;
    while (i < this.positions.length - 1 && this.positions[i + 1].t < t) i++;

    const p0 = this.positions[Math.max(0, i - 1)];
    const p1 = this.positions[i];
    const p2 = this.positions[Math.min(this.positions.length - 1, i + 1)];
    const p3 = this.positions[Math.min(this.positions.length - 1, i + 2)];

    // Normalize t between p1 and p2
    const segmentDuration = p2.t - p1.t || 1;
    const localT = Math.max(0, Math.min(1, (t - p1.t) / segmentDuration));

    // Catmull-Rom interpolation
    return {
      x: this.catmullRom(p0.x, p1.x, p2.x, p3.x, localT),
      y: this.catmullRom(p0.y, p1.y, p2.y, p3.y, localT)
    };
  }

  /**
   * Catmull-Rom spline interpolation
   */
  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * Check if there's a click near time t
   */
  isClickAtTime(t, tolerance = 100) {
    return this.clicks.some(click => Math.abs(click.t - t) < tolerance);
  }

  /**
   * Get click positions for zoom targets
   */
  getClicksForZoom() {
    return this.clicks.map(click => ({
      x: click.x,
      y: click.y,
      time: click.t,
      zoomLevel: 1.5 // Default zoom on click
    }));
  }

  /**
   * Export as JSON for FFmpeg drawtext/overlay
   */
  toJSON() {
    return {
      fps: this.fps,
      duration: this.positions.length > 0 
        ? this.positions[this.positions.length - 1].t 
        : 0,
      positions: this.positions,
      clicks: this.clicks
    };
  }
}

/**
 * Calculate velocity at each point (for motion blur intensity)
 */
export function calculateVelocities(positions) {
  return positions.map((pos, i) => {
    if (i === 0) return { ...pos, velocity: 0 };
    
    const prev = positions[i - 1];
    const dx = pos.x - prev.x;
    const dy = pos.y - prev.y;
    const dt = (pos.t - prev.t) || 1;
    
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000; // pixels per second
    
    return { ...pos, velocity };
  });
}

/**
 * Generate smooth bezier path between points
 */
export function generateBezierPath(points, tension = 0.3) {
  if (points.length < 2) return points;
  
  const path = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Generate intermediate points
    for (let t = 0; t < 1; t += 0.1) {
      const x = catmullRomPoint(p0.x, p1.x, p2.x, p3.x, t, tension);
      const y = catmullRomPoint(p0.y, p1.y, p2.y, p3.y, t, tension);
      path.push({ x, y, t: p1.t + (p2.t - p1.t) * t });
    }
  }
  
  return path;
}

function catmullRomPoint(p0, p1, p2, p3, t, tension) {
  const t2 = t * t;
  const t3 = t2 * t;
  
  const s = (1 - tension) / 2;
  
  return (
    p1 +
    s * t * (-p0 + p2) +
    s * t2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) +
    s * t3 * (-p0 + 3 * p1 - 3 * p2 + p3)
  );
}
