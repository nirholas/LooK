/**
 * Keyboard Shortcuts Manager
 */

export class KeyboardShortcuts {
  constructor(app) {
    this.app = app;
    this.shortcuts = new Map();
    this.enabled = true;
    this.helpVisible = false;
    
    this.registerDefaults();
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  registerDefaults() {
    // Playback
    this.register('Space', 'Play / Pause', () => this.app.togglePlayback());
    this.register('KeyK', 'Play / Pause (alt)', () => this.app.togglePlayback());
    
    // Seeking
    this.register('ArrowLeft', 'Seek backward 5s', () => this.app.seekRelative(-5));
    this.register('ArrowRight', 'Seek forward 5s', () => this.app.seekRelative(5));
    this.register('KeyJ', 'Seek backward 10s', () => this.app.seekRelative(-10));
    this.register('KeyL', 'Seek forward 10s', () => this.app.seekRelative(10));
    this.register('Home', 'Go to start', () => this.app.seekToPercent(0));
    this.register('End', 'Go to end', () => this.app.seekToPercent(1));
    
    // Frame stepping (when paused)
    this.register('Comma', 'Previous frame', () => this.app.stepFrame(-1));
    this.register('Period', 'Next frame', () => this.app.stepFrame(1));
    
    // Zoom
    this.register('KeyF', 'Toggle fullscreen', () => this.app.toggleFullscreen());
    this.register('Escape', 'Exit fullscreen / Close modal', () => this.app.handleEscape());
    
    // Tabs
    this.register('Digit1', 'Script tab', () => this.app.switchTab('script'));
    this.register('Digit2', 'Settings tab', () => this.app.switchTab('settings'));
    
    // Actions
    this.register('KeyS', 'Save project', () => this.app.saveProject(), true); // Ctrl+S
    this.register('KeyE', 'Export video', () => this.app.showExportModal(), true); // Ctrl+E
    this.register('KeyN', 'New project', () => this.app.newProject(), true); // Ctrl+N
    
    // Help
    this.register('Slash', 'Show keyboard shortcuts', () => this.toggleHelp(), false, true); // Shift+?
  }

  register(code, description, callback, ctrlKey = false, shiftKey = false) {
    const key = this.makeKey(code, ctrlKey, shiftKey);
    this.shortcuts.set(key, { code, description, callback, ctrlKey, shiftKey });
  }

  makeKey(code, ctrlKey, shiftKey) {
    return `${ctrlKey ? 'ctrl+' : ''}${shiftKey ? 'shift+' : ''}${code}`;
  }

  handleKeydown(e) {
    if (!this.enabled) return;
    
    // Ignore if typing in input/textarea
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      // Allow Escape to blur
      if (e.code === 'Escape') {
        e.target.blur();
      }
      return;
    }

    const key = this.makeKey(e.code, e.ctrlKey || e.metaKey, e.shiftKey);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      e.preventDefault();
      shortcut.callback();
    }
  }

  toggleHelp() {
    if (this.helpVisible) {
      this.hideHelp();
    } else {
      this.showHelp();
    }
  }

  showHelp() {
    if (this.helpModal) return;

    this.helpVisible = true;
    this.helpModal = document.createElement('div');
    this.helpModal.className = 'modal keyboard-help-modal';
    
    const groups = {
      'Playback': [],
      'Navigation': [],
      'View': [],
      'Actions': []
    };

    this.shortcuts.forEach((shortcut) => {
      const keyDisplay = this.formatKey(shortcut);
      
      if (['Space', 'KeyK'].includes(shortcut.code)) {
        groups['Playback'].push({ key: keyDisplay, desc: shortcut.description });
      } else if (['ArrowLeft', 'ArrowRight', 'KeyJ', 'KeyL', 'Home', 'End', 'Comma', 'Period'].includes(shortcut.code)) {
        groups['Navigation'].push({ key: keyDisplay, desc: shortcut.description });
      } else if (['KeyF', 'Escape', 'Digit1', 'Digit2', 'Slash'].includes(shortcut.code)) {
        groups['View'].push({ key: keyDisplay, desc: shortcut.description });
      } else {
        groups['Actions'].push({ key: keyDisplay, desc: shortcut.description });
      }
    });

    let html = `
      <div class="modal-content keyboard-help-content">
        <div class="modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button class="modal-close-btn">×</button>
        </div>
        <div class="shortcuts-grid">
    `;

    for (const [group, shortcuts] of Object.entries(groups)) {
      if (shortcuts.length === 0) continue;
      html += `<div class="shortcut-group">
        <h3>${group}</h3>
        <div class="shortcut-list">
      `;
      for (const s of shortcuts) {
        html += `<div class="shortcut-item">
          <kbd>${s.key}</kbd>
          <span>${s.desc}</span>
        </div>`;
      }
      html += `</div></div>`;
    }

    html += `</div></div>`;
    this.helpModal.innerHTML = html;

    // Event listeners
    this.helpModal.querySelector('.modal-close-btn').addEventListener('click', () => this.hideHelp());
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.hideHelp();
    });

    document.body.appendChild(this.helpModal);
  }

  hideHelp() {
    if (this.helpModal) {
      this.helpModal.remove();
      this.helpModal = null;
      this.helpVisible = false;
    }
  }

  formatKey(shortcut) {
    let key = '';
    if (shortcut.ctrlKey) key += '⌘/Ctrl + ';
    if (shortcut.shiftKey) key += 'Shift + ';
    
    const keyNames = {
      'Space': '␣',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'Comma': ',',
      'Period': '.',
      'Slash': '/',
      'Escape': 'Esc',
      'Home': 'Home',
      'End': 'End'
    };

    if (shortcut.code.startsWith('Key')) {
      key += shortcut.code.replace('Key', '');
    } else if (shortcut.code.startsWith('Digit')) {
      key += shortcut.code.replace('Digit', '');
    } else {
      key += keyNames[shortcut.code] || shortcut.code;
    }

    return key;
  }
}

export default KeyboardShortcuts;
