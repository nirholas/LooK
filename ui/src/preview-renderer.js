/**
 * Preview Renderer - Renders cursor and zoom effects on canvas overlay
 * No video re-encode needed for preview - effects are drawn on canvas
 */

export class PreviewRenderer {
  constructor(videoElement, canvasElement, data = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.cursorData = data.cursorData || { frames: [], clicks: [] };
    this.zoomKeyframes = data.zoomKeyframes || [];
    this.settings = data.settings || {};
    
    // Cursor image (default arrow)
    this.cursorImage = null;
    this.loadCursorImage();
    
    // Click effect animation state
    this.activeClicks = [];
    
    // Setup canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  loadCursorImage() {
    const style = this.settings.cursor?.style || 'default';
    const size = this.settings.cursor?.size || 24;
    const color = this.settings.cursor?.color || '#000000';
    
    // Create cursor as SVG data URL
    const svg = this.getCursorSVG(style, size, color);
    
    this.cursorImage = new Image();
    this.cursorImage.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  
  getCursorSVG(style, size, color) {
    switch (style) {
      case 'pointer':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
          <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.5 1-3.2-7-4.8 4z"/>
        </svg>`;
      
      case 'dot':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="6" fill="${color}"/>
        </svg>`;
      
      case 'circle':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" fill="${color}"/>
        </svg>`;
      
      case 'none':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`;
      
      default: // 'default' - arrow cursor
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
          <path d="M4 1l15.5 13.4-6.1.5 3.5 6.4-2.4 1.3-3.5-6.4L4 22z"/>
        </svg>`;
    }
  }
  
  resizeCanvas() {
    if (!this.video) return;
    
    const rect = this.video.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Calculate scale from original video to canvas
    this.videoWidth = this.video.videoWidth || 1920;
    this.videoHeight = this.video.videoHeight || 1080;
    this.scaleX = rect.width / this.videoWidth;
    this.scaleY = rect.height / this.videoHeight;
  }
  
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.loadCursorImage();
  }
  
  /**
   * Get cursor position at a specific time
   */
  getCursorAt(timeSeconds) {
    const frames = this.cursorData.frames || [];
    if (frames.length === 0) return null;
    
    const timeMs = timeSeconds * 1000;
    
    // Find the frame closest to this time
    let closest = frames[0];
    let closestDiff = Math.abs(frames[0].t - timeMs);
    
    for (const frame of frames) {
      const diff = Math.abs(frame.t - timeMs);
      if (diff < closestDiff) {
        closest = frame;
        closestDiff = diff;
      }
      // Early exit if we've passed the time
      if (frame.t > timeMs && diff > closestDiff) break;
    }
    
    return closest;
  }
  
  /**
   * Get zoom transform at a specific time
   */
  getZoomAt(timeSeconds) {
    const keyframes = this.zoomKeyframes || [];
    if (keyframes.length === 0) {
      return { scale: 1, x: 0, y: 0 };
    }
    
    const timeMs = timeSeconds * 1000;
    
    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= timeMs && keyframes[i + 1].time >= timeMs) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }
    
    // Interpolate between keyframes
    const duration = next.time - prev.time;
    const progress = duration > 0 ? (timeMs - prev.time) / duration : 0;
    
    // Ease function (ease-in-out)
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    return {
      scale: prev.zoom + (next.zoom - prev.zoom) * eased,
      x: prev.x + (next.x - prev.x) * eased,
      y: prev.y + (next.y - prev.y) * eased
    };
  }
  
  /**
   * Check if there's an active click at this time
   */
  getClickAt(timeSeconds) {
    const clicks = this.cursorData.clicks || [];
    const timeMs = timeSeconds * 1000;
    const effectDuration = this.settings.clickEffect?.duration || 400;
    
    for (const click of clicks) {
      const elapsed = timeMs - click.t;
      if (elapsed >= 0 && elapsed < effectDuration) {
        return {
          x: click.x,
          y: click.y,
          progress: elapsed / effectDuration
        };
      }
    }
    
    return null;
  }
  
  /**
   * Render a single frame
   */
  render(timeSeconds) {
    if (!this.video || this.video.readyState < 2) return;
    
    // Update canvas size if needed
    if (this.canvas.width !== this.video.clientWidth) {
      this.resizeCanvas();
    }
    
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Get current state
    const cursor = this.getCursorAt(timeSeconds);
    const zoom = this.getZoomAt(timeSeconds);
    const click = this.getClickAt(timeSeconds);
    
    // Apply zoom transform (CSS-based for preview, no canvas transform)
    // The actual zoom is applied via video element transform for preview
    this.applyZoomPreview(zoom);
    
    // Draw click effect
    if (click && this.settings.clickEffect?.type !== 'none') {
      this.drawClickEffect(click);
    }
    
    // Draw cursor
    if (cursor && this.cursorImage && this.settings.cursor?.style !== 'none') {
      const x = cursor.x * this.scaleX;
      const y = cursor.y * this.scaleY;
      
      ctx.drawImage(
        this.cursorImage,
        x - (this.settings.cursor?.size || 24) / 2,
        y - 2, // Offset for arrow tip
        this.settings.cursor?.size || 24,
        this.settings.cursor?.size || 24
      );
    }
  }
  
  applyZoomPreview(zoom) {
    if (!this.video) return;
    
    const container = this.video.parentElement;
    if (!container) return;
    
    // Apply zoom via CSS transform for instant preview
    // This doesn't affect the final render, just the preview
    if (zoom.scale > 1.01) {
      const offsetX = (zoom.x || 0) * this.scaleX;
      const offsetY = (zoom.y || 0) * this.scaleY;
      
      this.video.style.transform = `scale(${zoom.scale}) translate(${-offsetX}px, ${-offsetY}px)`;
      this.video.style.transformOrigin = 'center center';
    } else {
      this.video.style.transform = '';
    }
  }
  
  drawClickEffect(click) {
    const ctx = this.ctx;
    const x = click.x * this.scaleX;
    const y = click.y * this.scaleY;
    const progress = click.progress;
    const maxSize = this.settings.clickEffect?.size || 60;
    const color = this.settings.clickEffect?.color || '#3B82F6';
    const type = this.settings.clickEffect?.type || 'ripple';
    
    // Parse color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    switch (type) {
      case 'ripple':
        this.drawRipple(ctx, x, y, progress, maxSize, r, g, b);
        break;
      case 'pulse':
        this.drawPulse(ctx, x, y, progress, maxSize, r, g, b);
        break;
      case 'ring':
        this.drawRing(ctx, x, y, progress, maxSize, r, g, b);
        break;
      case 'spotlight':
        this.drawSpotlight(ctx, x, y, progress, maxSize, r, g, b);
        break;
    }
  }
  
  drawRipple(ctx, x, y, progress, maxSize, r, g, b) {
    const size = progress * maxSize;
    const opacity = (1 - progress) * 0.6;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.fill();
    
    // Inner ring
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 1.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  drawPulse(ctx, x, y, progress, maxSize, r, g, b) {
    const size = 10 + progress * (maxSize - 10);
    const opacity = Math.sin(progress * Math.PI) * 0.6;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.fill();
  }
  
  drawRing(ctx, x, y, progress, maxSize, r, g, b) {
    const size = progress * maxSize;
    const opacity = (1 - progress) * 0.8;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  drawSpotlight(ctx, x, y, progress, maxSize, r, g, b) {
    const size = maxSize * (1 - progress * 0.5);
    const opacity = (1 - progress) * 0.4;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

export default PreviewRenderer;
