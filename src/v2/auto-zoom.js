/**
 * AutoZoom - Intelligent zoom based on cursor activity
 * Detects important moments and generates smooth zoom keyframes
 */

export class AutoZoom {
  constructor(options = {}) {
    this.minZoom = options.minZoom || 1.0;
    this.maxZoom = options.maxZoom || 2.0;
    this.defaultZoom = options.defaultZoom || 1.3;
    this.zoomDuration = options.zoomDuration || 800; // ms for zoom transition
    this.holdDuration = options.holdDuration || 1500; // ms to hold zoom
    this.easing = options.easing || 'easeInOutCubic';
    this.keyframes = [];
  }

  /**
   * Generate zoom keyframes from cursor data
   */
  generateFromCursor(cursorData, viewportWidth, viewportHeight) {
    const { clicks, positions } = cursorData;
    this.keyframes = [];

    // Start at default zoom, centered
    this.keyframes.push({
      time: 0,
      zoom: this.minZoom,
      x: viewportWidth / 2,
      y: viewportHeight / 2,
      easing: this.easing
    });

    // Add zoom keyframes for each click
    for (const click of clicks) {
      // Zoom in to click position
      this.keyframes.push({
        time: click.t - this.zoomDuration,
        zoom: this.minZoom,
        x: click.x,
        y: click.y,
        easing: this.easing
      });

      this.keyframes.push({
        time: click.t,
        zoom: this.defaultZoom,
        x: click.x,
        y: click.y,
        easing: this.easing
      });

      // Hold zoom
      this.keyframes.push({
        time: click.t + this.holdDuration,
        zoom: this.defaultZoom,
        x: click.x,
        y: click.y,
        easing: this.easing
      });

      // Zoom back out
      this.keyframes.push({
        time: click.t + this.holdDuration + this.zoomDuration,
        zoom: this.minZoom,
        x: viewportWidth / 2,
        y: viewportHeight / 2,
        easing: this.easing
      });
    }

    // Sort by time
    this.keyframes.sort((a, b) => a.time - b.time);

    return this.keyframes;
  }

  /**
   * Generate zoom keyframes from AI-detected focus points
   */
  generateFromFocusPoints(focusPoints, viewportWidth, viewportHeight) {
    this.keyframes = [];

    // Start zoomed out
    this.keyframes.push({
      time: 0,
      zoom: this.minZoom,
      x: viewportWidth / 2,
      y: viewportHeight / 2,
      easing: this.easing
    });

    for (const point of focusPoints) {
      const zoomLevel = point.importance === 'high' ? this.maxZoom : this.defaultZoom;

      // Transition to focus point
      this.keyframes.push({
        time: point.time - this.zoomDuration,
        zoom: this.minZoom,
        x: point.x,
        y: point.y,
        easing: this.easing
      });

      this.keyframes.push({
        time: point.time,
        zoom: zoomLevel,
        x: point.x,
        y: point.y,
        easing: this.easing
      });

      // Hold
      this.keyframes.push({
        time: point.time + (point.duration || this.holdDuration),
        zoom: zoomLevel,
        x: point.x,
        y: point.y,
        easing: this.easing
      });
    }

    // End zoomed out
    const lastPoint = focusPoints[focusPoints.length - 1];
    if (lastPoint) {
      this.keyframes.push({
        time: lastPoint.time + (lastPoint.duration || this.holdDuration) + this.zoomDuration,
        zoom: this.minZoom,
        x: viewportWidth / 2,
        y: viewportHeight / 2,
        easing: this.easing
      });
    }

    this.keyframes.sort((a, b) => a.time - b.time);
    return this.keyframes;
  }

  /**
   * Get zoom parameters at a specific time
   */
  getZoomAt(time) {
    if (this.keyframes.length === 0) {
      return { zoom: this.minZoom, x: 0, y: 0 };
    }

    // Find surrounding keyframes
    let before = this.keyframes[0];
    let after = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (this.keyframes[i].time <= time && this.keyframes[i + 1].time >= time) {
        before = this.keyframes[i];
        after = this.keyframes[i + 1];
        break;
      }
    }

    // Interpolate
    const duration = after.time - before.time || 1;
    const progress = Math.max(0, Math.min(1, (time - before.time) / duration));
    const easedProgress = this.applyEasing(progress, before.easing);

    return {
      zoom: before.zoom + (after.zoom - before.zoom) * easedProgress,
      x: before.x + (after.x - before.x) * easedProgress,
      y: before.y + (after.y - before.y) * easedProgress
    };
  }

  /**
   * Apply easing function
   */
  applyEasing(t, easing) {
    switch (easing) {
      case 'easeInOutCubic':
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInCubic':
        return t * t * t;
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * Generate FFmpeg zoompan filter string
   */
  toFFmpegFilter(width, height, fps = 60) {
    if (this.keyframes.length === 0) {
      return `zoompan=z=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
    }

    // For complex zoom, we need to generate frame-by-frame expressions
    // This is a simplified version - real implementation would be more complex
    const duration = this.keyframes[this.keyframes.length - 1].time;
    const totalFrames = Math.ceil(duration / 1000 * fps);

    // Generate zoom expression
    // FFmpeg zoompan doesn't support keyframes directly, so we use expressions
    let zoomExpr = `'if(between(n,0,${totalFrames}),`;
    
    // Simplified: just use first and last zoom
    const startZoom = this.keyframes[0].zoom;
    const endZoom = this.keyframes[this.keyframes.length - 1].zoom;
    
    zoomExpr += `${startZoom}+(${endZoom}-${startZoom})*n/${totalFrames}`;
    zoomExpr += `,1)'`;

    return `zoompan=z=${zoomExpr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`;
  }

  /**
   * Export keyframes as JSON
   */
  toJSON() {
    return {
      keyframes: this.keyframes,
      settings: {
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        defaultZoom: this.defaultZoom,
        zoomDuration: this.zoomDuration,
        holdDuration: this.holdDuration,
        easing: this.easing
      }
    };
  }
}

/**
 * Detect important areas in a screenshot using simple heuristics
 * (For real AI detection, use GPT-4V)
 */
export function detectFocusAreas(elements) {
  return elements
    .filter(el => {
      // Prioritize buttons, inputs, headings
      const importantTags = ['BUTTON', 'INPUT', 'H1', 'H2', 'A'];
      return importantTags.includes(el.tag) || el.isInteractive;
    })
    .map((el, i) => ({
      x: el.x + el.width / 2,
      y: el.y + el.height / 2,
      time: i * 3000, // 3 seconds apart
      duration: 2000,
      importance: el.tag === 'BUTTON' || el.tag === 'H1' ? 'high' : 'medium',
      label: el.text
    }));
}
