/**
 * L👀K Live Preview - Real-time recording monitor
 * 
 * This module provides a live preview canvas that displays
 * real-time frames from a recording session, with controls
 * for pause, resume, and manual intervention.
 */

/**
 * @typedef {Object} LivePreviewOptions
 * @property {HTMLElement} container - Container element for the preview
 * @property {WebSocket} ws - WebSocket connection
 * @property {Function} [onStateChange] - Callback for state changes
 * @property {Function} [onClick] - Callback when a click is detected
 */

export class LivePreview {
  /**
   * Create a new LivePreview instance
   * @param {LivePreviewOptions} options
   */
  constructor(options) {
    this.container = options.container;
    this.ws = options.ws;
    this.onStateChange = options.onStateChange || (() => {});
    this.onClick = options.onClick || (() => {});
    
    this.sessionId = null;
    this.state = 'idle';
    this.elapsed = 0;
    this.manualMode = false;
    
    this.canvas = null;
    this.ctx = null;
    this.controlsEl = null;
    this.statusEl = null;
    
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    
    this.createUI();
    this.setupWebSocketHandlers();
  }
  
  /**
   * Create the live preview UI
   * @private
   */
  createUI() {
    this.container.innerHTML = `
      <div class="live-preview">
        <div class="live-preview-header">
          <div class="live-status">
            <span class="live-indicator"></span>
            <span class="live-state">Idle</span>
            <span class="live-time">00:00</span>
            <span class="live-fps">0 fps</span>
          </div>
          <div class="live-controls">
            <button class="live-btn live-btn-pause" disabled>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              Pause
            </button>
            <button class="live-btn live-btn-resume" disabled style="display: none;">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
              Resume
            </button>
            <button class="live-btn live-btn-stop" disabled>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M6 6h12v12H6z"/>
              </svg>
              Stop
            </button>
            <button class="live-btn live-btn-manual" disabled>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
              </svg>
              Take Control
            </button>
          </div>
        </div>
        <div class="live-preview-canvas-container">
          <canvas class="live-preview-canvas"></canvas>
          <div class="live-preview-overlay">
            <div class="live-preview-cursor"></div>
          </div>
          <div class="live-preview-click-hint" style="display: none;">
            Click anywhere to interact
          </div>
        </div>
      </div>
    `;
    
    // Get references to elements
    this.canvas = this.container.querySelector('.live-preview-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = this.container.querySelector('.live-status');
    this.controlsEl = this.container.querySelector('.live-controls');
    this.cursorEl = this.container.querySelector('.live-preview-cursor');
    this.clickHint = this.container.querySelector('.live-preview-click-hint');
    
    // Setup control buttons
    this.pauseBtn = this.container.querySelector('.live-btn-pause');
    this.resumeBtn = this.container.querySelector('.live-btn-resume');
    this.stopBtn = this.container.querySelector('.live-btn-stop');
    this.manualBtn = this.container.querySelector('.live-btn-manual');
    
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resumeBtn.addEventListener('click', () => this.resume());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.manualBtn.addEventListener('click', () => this.toggleManualMode());
    
    // Setup canvas click handling for manual mode
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    
    // Add styles
    this.addStyles();
  }
  
  /**
   * Add component styles
   * @private
   */
  addStyles() {
    if (document.getElementById('live-preview-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'live-preview-styles';
    style.textContent = `
      .live-preview {
        display: flex;
        flex-direction: column;
        background: var(--bg-secondary, #1e1e1e);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .live-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-tertiary, #252525);
        border-bottom: 1px solid var(--border-color, #333);
      }
      
      .live-status {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
      }
      
      .live-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #666;
      }
      
      .live-indicator.recording {
        background: #e53935;
        animation: pulse 1s ease-in-out infinite;
      }
      
      .live-indicator.paused {
        background: #ffc107;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .live-state {
        font-weight: 500;
        text-transform: capitalize;
      }
      
      .live-time {
        font-family: monospace;
        background: var(--bg-code, #2d2d2d);
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      .live-fps {
        color: var(--text-secondary, #888);
        font-size: 12px;
      }
      
      .live-controls {
        display: flex;
        gap: 8px;
      }
      
      .live-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: var(--bg-button, #333);
        color: var(--text-primary, #fff);
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }
      
      .live-btn:hover:not(:disabled) {
        background: var(--bg-button-hover, #444);
      }
      
      .live-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .live-btn-stop {
        background: #c62828;
      }
      
      .live-btn-stop:hover:not(:disabled) {
        background: #d32f2f;
      }
      
      .live-btn-manual.active {
        background: #1976d2;
      }
      
      .live-preview-canvas-container {
        position: relative;
        background: #000;
        aspect-ratio: 16 / 9;
      }
      
      .live-preview-canvas {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      
      .live-preview-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .live-preview-cursor {
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid #fff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        display: none;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      }
      
      .live-preview-click-hint {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: #fff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
      }
      
      .live-preview-canvas-container.manual-mode {
        cursor: crosshair;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Setup WebSocket message handlers
   * @private
   */
  setupWebSocketHandlers() {
    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        // Ignore parse errors
      }
    });
  }
  
  /**
   * Handle incoming WebSocket message
   * @param {Object} message
   * @private
   */
  handleMessage(message) {
    switch (message.type) {
      case 'live-frame':
        if (message.sessionId === this.sessionId) {
          this.renderFrame(message.data);
        }
        break;
        
      case 'live-state':
        if (message.sessionId === this.sessionId || message.data?.sessionId === this.sessionId) {
          this.updateState(message.data?.state || message.state);
        }
        break;
        
      case 'live-click':
        if (message.sessionId === this.sessionId) {
          this.showClickEffect(message.data?.x || message.x, message.data?.y || message.y);
        }
        break;
        
      case 'live-complete':
        if (message.sessionId === this.sessionId || message.data?.sessionId === this.sessionId) {
          this.handleComplete(message.data || message);
        }
        break;
        
      case 'live-subscribed':
        if (message.data?.sessionId === this.sessionId) {
          this.updateState(message.data.state);
          this.elapsed = message.data.elapsed || 0;
        }
        break;
    }
  }
  
  /**
   * Subscribe to a live recording session
   * @param {string} sessionId
   */
  subscribe(sessionId) {
    this.sessionId = sessionId;
    this.ws.send(JSON.stringify({
      action: 'subscribe-live',
      payload: { sessionId }
    }));
    
    // Enable controls
    this.pauseBtn.disabled = false;
    this.stopBtn.disabled = false;
    this.manualBtn.disabled = false;
    
    this.updateState('recording');
  }
  
  /**
   * Unsubscribe from current session
   */
  unsubscribe() {
    if (this.sessionId) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe-live',
        payload: { sessionId: this.sessionId }
      }));
    }
    
    this.sessionId = null;
    this.updateState('idle');
    
    // Disable controls
    this.pauseBtn.disabled = true;
    this.resumeBtn.disabled = true;
    this.stopBtn.disabled = true;
    this.manualBtn.disabled = true;
  }
  
  /**
   * Render a preview frame
   * @param {Object} frame
   * @private
   */
  renderFrame(frame) {
    if (!frame.image) return;
    
    // Calculate FPS
    const now = performance.now();
    if (now - this.lastFrameTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
      this.updateFpsDisplay();
    }
    this.frameCount++;
    
    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
      // Resize canvas if needed
      if (this.canvas.width !== frame.width || this.canvas.height !== frame.height) {
        this.canvas.width = frame.width;
        this.canvas.height = frame.height;
      }
      
      this.ctx.drawImage(img, 0, 0);
      
      // Update cursor overlay position
      if (frame.cursor && this.manualMode) {
        const scaleX = this.canvas.clientWidth / frame.width;
        const scaleY = this.canvas.clientHeight / frame.height;
        this.cursorEl.style.left = `${frame.cursor.x * scaleX}px`;
        this.cursorEl.style.top = `${frame.cursor.y * scaleY}px`;
        this.cursorEl.style.display = 'block';
      }
    };
    img.src = `data:image/jpeg;base64,${frame.image}`;
    
    // Update elapsed time
    this.elapsed = frame.timestamp;
    this.updateTimeDisplay();
  }
  
  /**
   * Update state display
   * @param {string} newState
   * @private
   */
  updateState(newState) {
    this.state = newState;
    
    // Update indicator
    const indicator = this.statusEl.querySelector('.live-indicator');
    indicator.className = 'live-indicator';
    if (newState === 'recording') {
      indicator.classList.add('recording');
    } else if (newState === 'paused') {
      indicator.classList.add('paused');
    }
    
    // Update state text
    this.statusEl.querySelector('.live-state').textContent = newState;
    
    // Update buttons
    if (newState === 'recording') {
      this.pauseBtn.style.display = '';
      this.resumeBtn.style.display = 'none';
      this.pauseBtn.disabled = false;
    } else if (newState === 'paused') {
      this.pauseBtn.style.display = 'none';
      this.resumeBtn.style.display = '';
      this.resumeBtn.disabled = false;
    } else if (newState === 'stopped' || newState === 'idle') {
      this.pauseBtn.disabled = true;
      this.resumeBtn.disabled = true;
      this.stopBtn.disabled = true;
    }
    
    this.onStateChange({ state: newState, elapsed: this.elapsed });
  }
  
  /**
   * Update time display
   * @private
   */
  updateTimeDisplay() {
    const seconds = Math.floor(this.elapsed / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.statusEl.querySelector('.live-time').textContent = 
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Update FPS display
   * @private
   */
  updateFpsDisplay() {
    this.statusEl.querySelector('.live-fps').textContent = `${this.fps} fps`;
  }
  
  /**
   * Pause recording
   */
  pause() {
    if (!this.sessionId) return;
    
    this.ws.send(JSON.stringify({
      action: 'live-pause',
      payload: { sessionId: this.sessionId }
    }));
  }
  
  /**
   * Resume recording
   */
  resume() {
    if (!this.sessionId) return;
    
    this.ws.send(JSON.stringify({
      action: 'live-resume',
      payload: { sessionId: this.sessionId }
    }));
  }
  
  /**
   * Stop recording
   */
  stop() {
    if (!this.sessionId) return;
    
    this.ws.send(JSON.stringify({
      action: 'live-stop',
      payload: { sessionId: this.sessionId }
    }));
  }
  
  /**
   * Toggle manual control mode
   */
  toggleManualMode() {
    this.manualMode = !this.manualMode;
    
    this.manualBtn.classList.toggle('active', this.manualMode);
    this.canvas.parentElement.classList.toggle('manual-mode', this.manualMode);
    this.clickHint.style.display = this.manualMode ? 'block' : 'none';
    this.cursorEl.style.display = this.manualMode ? 'block' : 'none';
    
    if (this.manualMode && this.sessionId) {
      // Tell server to enable manual mode
      fetch(`/api/live/${this.sessionId}/manual`, { method: 'POST' });
    }
  }
  
  /**
   * Handle canvas click in manual mode
   * @param {MouseEvent} e
   * @private
   */
  handleCanvasClick(e) {
    if (!this.manualMode || !this.sessionId) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    this.ws.send(JSON.stringify({
      action: 'live-action',
      payload: {
        sessionId: this.sessionId,
        type: 'click',
        x,
        y
      }
    }));
    
    this.showClickEffect(x, y);
    this.onClick({ x, y });
  }
  
  /**
   * Handle canvas mouse move in manual mode
   * @param {MouseEvent} e
   * @private
   */
  handleCanvasMouseMove(e) {
    if (!this.manualMode || !this.sessionId) return;
    
    // Throttle mouse move events
    if (this._lastMove && Date.now() - this._lastMove < 50) return;
    this._lastMove = Date.now();
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    this.ws.send(JSON.stringify({
      action: 'live-action',
      payload: {
        sessionId: this.sessionId,
        type: 'move',
        x,
        y,
        duration: 100
      }
    }));
  }
  
  /**
   * Show click effect animation
   * @param {number} x
   * @param {number} y
   * @private
   */
  showClickEffect(x, y) {
    const scaleX = this.canvas.clientWidth / this.canvas.width;
    const scaleY = this.canvas.clientHeight / this.canvas.height;
    
    const effect = document.createElement('div');
    effect.style.cssText = `
      position: absolute;
      left: ${x * scaleX}px;
      top: ${y * scaleY}px;
      width: 30px;
      height: 30px;
      border: 3px solid #4CAF50;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      animation: click-ripple 0.5s ease-out forwards;
      pointer-events: none;
    `;
    
    const overlay = this.container.querySelector('.live-preview-overlay');
    overlay.appendChild(effect);
    
    setTimeout(() => effect.remove(), 500);
    
    // Add ripple animation if not exists
    if (!document.getElementById('click-ripple-style')) {
      const style = document.createElement('style');
      style.id = 'click-ripple-style';
      style.textContent = `
        @keyframes click-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Handle recording complete
   * @param {Object} data
   * @private
   */
  handleComplete(data) {
    this.updateState('idle');
    this.onStateChange({ 
      state: 'complete', 
      projectId: data.projectId,
      duration: data.duration 
    });
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    this.unsubscribe();
    this.container.innerHTML = '';
  }
}

export default LivePreview;
