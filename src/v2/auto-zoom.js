/**
 * AutoZoom - Intelligent zoom based on cursor activity
 * Detects important moments and generates smooth zoom keyframes
 * Supports multiple zoom modes: basic, smart, and follow-cam
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
    
    // Follow-cam settings
    this.followIntensity = options.followIntensity || 0.5;
    this.deadzone = options.deadzone || 0.2;
    this.maxPanSpeed = options.maxPanSpeed || 200; // px/sec
    this.anticipation = options.anticipation || 200; // ms lookahead
    
    // Zoom mode: 'none', 'basic', 'smart', 'follow'
    this.zoomMode = options.zoomMode || 'smart';
    
    // Focus detection settings
    this.hoverPauseThreshold = options.hoverPauseThreshold || 500; // ms
    this.hoverRadiusThreshold = options.hoverRadiusThreshold || 50; // px
    this.slowMovementThreshold = options.slowMovementThreshold || 100; // px/sec
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
   * Generate zoom that smoothly follows cursor movement (follow-cam mode)
   */
  generateFollowZoom(cursorData, viewportWidth, viewportHeight, options = {}) {
    const {
      followIntensity = this.followIntensity,
      deadzone = this.deadzone,
      maxPanSpeed = this.maxPanSpeed,
      anticipation = this.anticipation,
    } = options;

    this.keyframes = [];
    
    // Get frames from cursor data
    const duration = cursorData.positions.length > 0 
      ? cursorData.positions[cursorData.positions.length - 1].t 
      : 0;
    
    const frames = cursorData.getFrames 
      ? cursorData.getFrames(duration) 
      : this.interpolatePositions(cursorData.positions, duration);
    
    if (frames.length === 0) {
      return this.keyframes;
    }

    // Define attention area (deadzone where cursor can move without camera pan)
    const deadzoneX = viewportWidth * deadzone / 2;
    const deadzoneY = viewportHeight * deadzone / 2;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    let currentPanX = 0;
    let currentPanY = 0;
    let lastTime = 0;
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const deltaTime = (frame.time - lastTime) / 1000; // Convert to seconds
      lastTime = frame.time;
      
      // Look ahead for anticipation
      const lookAheadIndex = Math.min(
        frames.length - 1, 
        i + Math.ceil(anticipation / (1000 / 60)) // frames to look ahead
      );
      const targetFrame = frames[lookAheadIndex];
      
      // Calculate offset from center
      const offsetX = targetFrame.x - centerX;
      const offsetY = targetFrame.y - centerY;
      
      // Only pan if cursor is outside deadzone
      let targetPanX = currentPanX;
      let targetPanY = currentPanY;
      
      if (Math.abs(offsetX) > deadzoneX) {
        targetPanX = (offsetX - Math.sign(offsetX) * deadzoneX) * followIntensity;
      } else {
        targetPanX = 0; // Return to center when in deadzone
      }
      
      if (Math.abs(offsetY) > deadzoneY) {
        targetPanY = (offsetY - Math.sign(offsetY) * deadzoneY) * followIntensity;
      } else {
        targetPanY = 0;
      }
      
      // Apply smooth damping with speed limit
      if (deltaTime > 0) {
        currentPanX = this.smoothDamp(currentPanX, targetPanX, maxPanSpeed, deltaTime);
        currentPanY = this.smoothDamp(currentPanY, targetPanY, maxPanSpeed, deltaTime);
      }
      
      // Clamp pan to prevent going outside viewport
      const maxPan = viewportWidth / 4; // Don't pan more than 25% of viewport
      currentPanX = Math.max(-maxPan, Math.min(maxPan, currentPanX));
      currentPanY = Math.max(-maxPan, Math.min(maxPan, currentPanY));
      
      this.keyframes.push({
        time: frame.time,
        zoom: this.minZoom,
        x: centerX + currentPanX,
        y: centerY + currentPanY,
        easing: 'linear'
      });
    }

    // Optimize by removing redundant keyframes
    return this.optimizeKeyframes(this.keyframes);
  }

  /**
   * Smooth damp function for camera movement
   */
  smoothDamp(current, target, maxSpeed, deltaTime) {
    const diff = target - current;
    const maxDelta = maxSpeed * deltaTime;
    const clampedDiff = Math.max(-maxDelta, Math.min(maxDelta, diff));
    return current + clampedDiff * 0.3; // Smoothing factor
  }

  /**
   * Interpolate sparse positions to regular frame intervals
   */
  interpolatePositions(positions, duration, fps = 60) {
    if (positions.length === 0) return [];
    
    const frameCount = Math.ceil(duration / 1000 * fps);
    const frames = [];
    
    for (let i = 0; i < frameCount; i++) {
      const t = (i / fps) * 1000;
      const pos = this.interpolateAt(positions, t);
      frames.push({
        frame: i,
        time: t,
        x: pos.x,
        y: pos.y
      });
    }
    
    return frames;
  }

  /**
   * Get interpolated position at a specific time
   */
  interpolateAt(positions, t) {
    if (positions.length === 0) return { x: 0, y: 0 };
    if (positions.length === 1) return { x: positions[0].x, y: positions[0].y };
    
    // Find surrounding positions
    let before = positions[0];
    let after = positions[positions.length - 1];
    
    for (let i = 0; i < positions.length - 1; i++) {
      if (positions[i].t <= t && positions[i + 1].t >= t) {
        before = positions[i];
        after = positions[i + 1];
        break;
      }
    }
    
    const duration = after.t - before.t || 1;
    const progress = Math.max(0, Math.min(1, (t - before.t) / duration));
    
    return {
      x: before.x + (after.x - before.x) * progress,
      y: before.y + (after.y - before.y) * progress
    };
  }

  /**
   * Detect "interesting moments" from cursor behavior
   */
  detectFocusPoints(cursorData) {
    const points = [];
    const positions = cursorData.positions || [];
    
    if (positions.length < 2) {
      return points;
    }
    
    // 1. Detect hover pauses (cursor stays in area for threshold+ ms)
    const hoverPauses = this.detectHoverPauses(positions, {
      minDuration: this.hoverPauseThreshold,
      maxRadius: this.hoverRadiusThreshold
    });
    points.push(...hoverPauses);
    
    // 2. Include clicks (already tracked)
    const clicks = (cursorData.clicks || []).map(c => ({
      time: c.t,
      x: c.x,
      y: c.y,
      importance: 'high',
      reason: 'click',
      duration: this.holdDuration
    }));
    points.push(...clicks);
    
    // 3. Detect slow deliberate movements (user examining something)
    const slowMovements = this.detectSlowMovements(positions, {
      maxSpeed: this.slowMovementThreshold,
      minDuration: 1000
    });
    points.push(...slowMovements);
    
    // Merge and deduplicate overlapping focus points
    return this.mergeAndPrioritize(points);
  }

  /**
   * Detect hover pauses where cursor stays in small area
   */
  detectHoverPauses(positions, options = {}) {
    const { minDuration = 500, maxRadius = 50 } = options;
    const pauses = [];
    
    let pauseStart = null;
    let pauseCenter = null;
    
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      
      if (!pauseStart) {
        pauseStart = pos;
        pauseCenter = { x: pos.x, y: pos.y };
        continue;
      }
      
      // Check if still within radius
      const dist = Math.sqrt(
        Math.pow(pos.x - pauseCenter.x, 2) + 
        Math.pow(pos.y - pauseCenter.y, 2)
      );
      
      if (dist <= maxRadius) {
        // Still in pause area, update center (running average)
        pauseCenter.x = (pauseCenter.x + pos.x) / 2;
        pauseCenter.y = (pauseCenter.y + pos.y) / 2;
      } else {
        // Moved out of pause area
        const pauseDuration = pos.t - pauseStart.t;
        
        if (pauseDuration >= minDuration) {
          pauses.push({
            time: pauseStart.t + pauseDuration / 2,
            x: pauseCenter.x,
            y: pauseCenter.y,
            importance: pauseDuration > 1500 ? 'high' : 'medium',
            reason: 'hover',
            duration: Math.min(pauseDuration, this.holdDuration)
          });
        }
        
        // Start new potential pause
        pauseStart = pos;
        pauseCenter = { x: pos.x, y: pos.y };
      }
    }
    
    // Check final pause
    if (pauseStart && positions.length > 0) {
      const lastPos = positions[positions.length - 1];
      const pauseDuration = lastPos.t - pauseStart.t;
      
      if (pauseDuration >= minDuration) {
        pauses.push({
          time: pauseStart.t + pauseDuration / 2,
          x: pauseCenter.x,
          y: pauseCenter.y,
          importance: pauseDuration > 1500 ? 'high' : 'medium',
          reason: 'hover',
          duration: Math.min(pauseDuration, this.holdDuration)
        });
      }
    }
    
    return pauses;
  }

  /**
   * Detect slow deliberate cursor movements
   */
  detectSlowMovements(positions, options = {}) {
    const { maxSpeed = 100, minDuration = 1000 } = options;
    const movements = [];
    
    // Calculate velocities
    const withVelocity = positions.map((pos, i) => {
      if (i === 0) return { ...pos, velocity: 0 };
      const prev = positions[i - 1];
      const dt = (pos.t - prev.t) / 1000 || 0.001;
      const dist = Math.sqrt(Math.pow(pos.x - prev.x, 2) + Math.pow(pos.y - prev.y, 2));
      return { ...pos, velocity: dist / dt };
    });
    
    let slowStart = null;
    let slowPositions = [];
    
    for (const pos of withVelocity) {
      if (pos.velocity <= maxSpeed && pos.velocity > 0) {
        if (!slowStart) {
          slowStart = pos;
        }
        slowPositions.push(pos);
      } else if (slowStart) {
        const duration = pos.t - slowStart.t;
        
        if (duration >= minDuration && slowPositions.length > 0) {
          // Calculate center of slow movement region
          const avgX = slowPositions.reduce((s, p) => s + p.x, 0) / slowPositions.length;
          const avgY = slowPositions.reduce((s, p) => s + p.y, 0) / slowPositions.length;
          
          movements.push({
            time: slowStart.t + duration / 2,
            x: avgX,
            y: avgY,
            importance: 'medium',
            reason: 'slow_movement',
            duration: Math.min(duration, this.holdDuration)
          });
        }
        
        slowStart = null;
        slowPositions = [];
      }
    }
    
    return movements;
  }

  /**
   * Merge overlapping focus points and prioritize
   */
  mergeAndPrioritize(points) {
    if (points.length === 0) return [];
    
    // Sort by time
    const sorted = [...points].sort((a, b) => a.time - b.time);
    const merged = [];
    
    const importancePriority = { high: 3, medium: 2, low: 1 };
    const reasonPriority = { click: 3, hover: 2, slow_movement: 1 };
    
    for (const point of sorted) {
      // Check if overlaps with previous
      const last = merged[merged.length - 1];
      
      if (last) {
        const lastEnd = last.time + (last.duration || this.holdDuration);
        const overlap = lastEnd > point.time;
        
        if (overlap) {
          // Keep higher priority one
          const lastPriority = (importancePriority[last.importance] || 1) + (reasonPriority[last.reason] || 0);
          const pointPriority = (importancePriority[point.importance] || 1) + (reasonPriority[point.reason] || 0);
          
          if (pointPriority > lastPriority) {
            merged[merged.length - 1] = point;
          }
          // Otherwise keep the existing one
          continue;
        }
      }
      
      merged.push(point);
    }
    
    return merged;
  }

  /**
   * Generate hybrid zoom: smooth follow + zoom on focus points
   */
  generateHybridZoom(cursorData, viewportWidth, viewportHeight, options = {}) {
    const {
      zoomOnClicks = true,
      zoomOnHover = true,
    } = options;
    
    // First, detect focus points
    let focusPoints = this.detectFocusPoints(cursorData);
    
    // Filter based on options
    if (!zoomOnClicks) {
      focusPoints = focusPoints.filter(p => p.reason !== 'click');
    }
    if (!zoomOnHover) {
      focusPoints = focusPoints.filter(p => p.reason !== 'hover' && p.reason !== 'slow_movement');
    }
    
    // Generate base follow-cam keyframes
    const followKeyframes = this.generateFollowZoom(cursorData, viewportWidth, viewportHeight, options);
    
    if (focusPoints.length === 0) {
      return followKeyframes;
    }
    
    // Overlay zoom-in events at focus points
    const hybridKeyframes = [...followKeyframes];
    
    for (const point of focusPoints) {
      const zoomLevel = point.importance === 'high' ? this.maxZoom : this.defaultZoom;
      const duration = point.duration || this.holdDuration;
      
      // Find keyframes around this focus point and modify them
      const startTime = point.time - this.zoomDuration;
      const endTime = point.time + duration + this.zoomDuration;
      
      for (const kf of hybridKeyframes) {
        if (kf.time >= startTime && kf.time <= point.time) {
          // Zoom in phase
          const progress = (kf.time - startTime) / this.zoomDuration;
          kf.zoom = this.minZoom + (zoomLevel - this.minZoom) * this.applyEasing(Math.min(1, progress), 'easeOutCubic');
          kf.x = kf.x + (point.x - kf.x) * this.applyEasing(Math.min(1, progress), 'easeOutCubic');
          kf.y = kf.y + (point.y - kf.y) * this.applyEasing(Math.min(1, progress), 'easeOutCubic');
        } else if (kf.time > point.time && kf.time <= point.time + duration) {
          // Hold phase
          kf.zoom = zoomLevel;
          kf.x = point.x;
          kf.y = point.y;
        } else if (kf.time > point.time + duration && kf.time <= endTime) {
          // Zoom out phase
          const progress = (kf.time - (point.time + duration)) / this.zoomDuration;
          kf.zoom = zoomLevel + (this.minZoom - zoomLevel) * this.applyEasing(Math.min(1, progress), 'easeInOutCubic');
          // Let the follow-cam take over x, y during zoom out
        }
      }
    }
    
    return this.optimizeKeyframes(hybridKeyframes);
  }

  /**
   * Remove redundant keyframes to optimize FFmpeg expression
   */
  optimizeKeyframes(keyframes, options = {}) {
    const {
      maxKeyframes = 50,
      minDistance = 5,      // Min pixel difference to keep keyframe
      minZoomDiff = 0.05    // Min zoom difference to keep keyframe
    } = options;
    
    if (keyframes.length <= maxKeyframes) {
      return this.reduceKeyframesByDiff(keyframes, minDistance, minZoomDiff);
    }
    
    // Use Douglas-Peucker-like algorithm to reduce keyframes
    return this.douglasPeuckerReduce(keyframes, maxKeyframes);
  }

  /**
   * Remove keyframes with minimal difference from neighbors
   */
  reduceKeyframesByDiff(keyframes, minDistance, minZoomDiff) {
    if (keyframes.length <= 2) return keyframes;
    
    const result = [keyframes[0]];
    
    for (let i = 1; i < keyframes.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = keyframes[i];
      
      const distDiff = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const zoomDiff = Math.abs(curr.zoom - prev.zoom);
      
      if (distDiff >= minDistance || zoomDiff >= minZoomDiff) {
        result.push(curr);
      }
    }
    
    // Always keep last keyframe
    result.push(keyframes[keyframes.length - 1]);
    
    return result;
  }

  /**
   * Douglas-Peucker-style keyframe reduction
   */
  douglasPeuckerReduce(keyframes, maxKeyframes) {
    if (keyframes.length <= maxKeyframes) return keyframes;
    
    // Calculate importance of each keyframe
    const importance = keyframes.map((kf, i) => {
      if (i === 0 || i === keyframes.length - 1) return Infinity;
      
      const prev = keyframes[i - 1];
      const next = keyframes[i + 1];
      
      // Linear interpolation from prev to next
      const t = (kf.time - prev.time) / (next.time - prev.time || 1);
      const expectedX = prev.x + (next.x - prev.x) * t;
      const expectedY = prev.y + (next.y - prev.y) * t;
      const expectedZoom = prev.zoom + (next.zoom - prev.zoom) * t;
      
      // Distance from expected
      return Math.sqrt(
        Math.pow(kf.x - expectedX, 2) + 
        Math.pow(kf.y - expectedY, 2) +
        Math.pow((kf.zoom - expectedZoom) * 100, 2) // Weight zoom more
      );
    });
    
    // Keep keyframes with highest importance
    const indexed = keyframes.map((kf, i) => ({ kf, importance: importance[i], index: i }));
    indexed.sort((a, b) => b.importance - a.importance);
    
    const keepIndices = new Set(indexed.slice(0, maxKeyframes).map(item => item.index));
    
    return keyframes.filter((_, i) => keepIndices.has(i)).sort((a, b) => a.time - b.time);
  }

  /**
   * Main method: generate zoom based on mode
   */
  generateZoom(cursorData, viewportWidth, viewportHeight, options = {}) {
    const mode = options.zoomMode || this.zoomMode;
    
    switch (mode) {
      case 'none':
        return [];
        
      case 'basic':
        return this.generateFromCursor(cursorData, viewportWidth, viewportHeight);
        
      case 'follow':
        return this.generateFollowZoom(cursorData, viewportWidth, viewportHeight, options);
        
      case 'smart':
      default:
        return this.generateHybridZoom(cursorData, viewportWidth, viewportHeight, options);
    }
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
