/**
 * Settings Manager - Enterprise-grade settings with API key validation
 */
import { API } from './api.js';
import { toast } from './toast.js';

export class SettingsManager {
  constructor(editor) {
    this.editor = editor;
    this.modal = document.getElementById('settings-modal');
    this.settingsBtn = document.getElementById('settings-btn');
    this.closeBtn = this.modal?.querySelector('.modal-close');
    this.saveBtn = document.getElementById('settings-save');
    this.cancelBtn = document.getElementById('settings-cancel');
    this.tabBtns = this.modal ? this.modal.querySelectorAll('.settings-tab') : [];

    // API inputs
    this.openaiInput = document.getElementById('openai-key');
    this.groqInput = document.getElementById('groq-key');
    this.toggleOpenai = document.getElementById('toggle-openai-key');
    this.toggleGroq = document.getElementById('toggle-groq-key');

    this.apiIndicator = document.getElementById('api-indicator');
    this.statusOpenai = document.getElementById('status-openai');
    this.statusGroq = document.getElementById('status-groq');
    this.statusPlaywright = document.getElementById('status-playwright');

    this._validating = false;
  }

  init() {
    this.settingsBtn?.addEventListener('click', () => this.open());
    document.getElementById('api-status')?.addEventListener('click', () => this.open());
    document.getElementById('api-status')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.open();
    });
    this.closeBtn?.addEventListener('click', () => this.close());
    this.saveBtn?.addEventListener('click', () => this.save());
    this.cancelBtn?.addEventListener('click', () => this.close());

    // Close modal on backdrop click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
        this.close();
      }
    });

    this.tabBtns.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab)));

    this.toggleOpenai?.addEventListener('click', () => this._toggleVisibility(this.openaiInput, this.toggleOpenai));
    this.toggleGroq?.addEventListener('click', () => this._toggleVisibility(this.groqInput, this.toggleGroq));

    // Theme toggle
    const themeSelect = document.getElementById('theme-select');
    themeSelect?.addEventListener('change', (e) => this.applyTheme(e.target.value));

    // Load settings from localStorage
    this.load();
    
    // Apply theme on load
    const savedTheme = localStorage.getItem('look-settings');
    if (savedTheme) {
      try {
        const { theme } = JSON.parse(savedTheme);
        if (theme) this.applyTheme(theme);
      } catch {}
    }
    
    // Validate API connections on load
    this.validateApiConnections();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('look-theme', theme);
  }

  open() {
    this.modal?.classList.remove('hidden');
    this.modal?.setAttribute('aria-hidden', 'false');
    setTimeout(() => this.openaiInput?.focus(), 50);
  }

  close() {
    this.modal?.classList.add('hidden');
    this.modal?.setAttribute('aria-hidden', 'true');
  }

  switchTab(tab) {
    this.tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    const active = [...this.tabBtns].find(b => b.dataset.tab === tab);
    if (active) {
      active.classList.add('active');
      active.setAttribute('aria-selected', 'true');
    }

    this.modal?.querySelectorAll('.settings-content').forEach(c => c.classList.add('hidden'));
    const panel = document.getElementById(`settings-${tab}`);
    panel?.classList.remove('hidden');
  }

  _toggleVisibility(input, button) {
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (button) button.textContent = '🙈';
    } else {
      input.type = 'password';
      if (button) button.textContent = '👁️';
    }
  }

  async save() {
    const settings = this.getFormValues();
    
    // Validate API keys before saving
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Validating...';

    try {
      // Save to localStorage
      localStorage.setItem('look-settings', JSON.stringify(settings));
      
      // Update API client with new keys
      API.setApiKeys({
        openai: settings.openaiKey,
        groq: settings.groqKey
      });

      // Validate connections
      await this.validateApiConnections();

      toast.success('Settings saved successfully');
      this.close();
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = 'Save Settings';
    }
  }

  getFormValues() {
    return {
      openaiKey: this.openaiInput?.value?.trim() || '',
      groqKey: this.groqInput?.value?.trim() || '',
      theme: document.getElementById('theme-select')?.value || 'dark',
      defaultVoice: document.getElementById('default-voice')?.value || 'nova',
      autoSave: document.getElementById('auto-save')?.checked ?? true
    };
  }

  load() {
    try {
      const raw = localStorage.getItem('look-settings');
      if (!raw) return;
      
      const s = JSON.parse(raw);
      if (this.openaiInput && s.openaiKey) this.openaiInput.value = s.openaiKey;
      if (this.groqInput && s.groqKey) this.groqInput.value = s.groqKey;
      
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect && s.theme) themeSelect.value = s.theme;
      
      const voiceSelect = document.getElementById('default-voice');
      if (voiceSelect && s.defaultVoice) voiceSelect.value = s.defaultVoice;
      
      const autoSaveCheckbox = document.getElementById('auto-save');
      if (autoSaveCheckbox && s.autoSave !== undefined) autoSaveCheckbox.checked = s.autoSave;

      // Set API keys in API client
      API.setApiKeys({
        openai: s.openaiKey || '',
        groq: s.groqKey || ''
      });
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  async validateApiConnections() {
    if (this._validating) return;
    this._validating = true;

    const settings = this.getFormValues();
    
    // Update visual indicators immediately based on presence of keys
    this._updateIndicatorVisual('openai', !!settings.openaiKey, 'checking');
    this._updateIndicatorVisual('groq', !!settings.groqKey, 'checking');

    try {
      // Check backend health and API status
      const health = await API.health();
      
      // Update status based on server response
      if (health.services) {
        this._updateIndicatorVisual('openai', health.services.openai === 'connected', health.services.openai);
        this._updateIndicatorVisual('groq', health.services.groq === 'connected', health.services.groq);
        this._updateIndicatorVisual('playwright', health.services.playwright === 'ready', health.services.playwright);
      }

      this.updateApiIndicator();
    } catch (error) {
      console.warn('Failed to validate API connections:', error);
      // Set disconnected state on error
      this._updateIndicatorVisual('openai', false, 'error');
      this._updateIndicatorVisual('groq', false, 'error');
      this._updateIndicatorVisual('playwright', false, 'error');
    } finally {
      this._validating = false;
    }
  }

  _updateIndicatorVisual(service, connected, status) {
    const dot = document.getElementById(`status-${service}`);
    if (!dot) return;

    dot.classList.remove('connected', 'error', 'checking');
    
    if (status === 'checking') {
      dot.classList.add('checking');
      dot.title = 'Checking connection...';
    } else if (connected) {
      dot.classList.add('connected');
      dot.title = 'Connected';
    } else if (status === 'error') {
      dot.classList.add('error');
      dot.title = 'Connection error';
    } else {
      dot.title = 'Not configured';
    }
  }

  updateApiIndicator() {
    const settings = this.getFormValues();
    const hasOpenai = !!settings.openaiKey;
    const hasGroq = !!settings.groqKey;

    if (this.apiIndicator) {
      this.apiIndicator.classList.remove('connected', 'partial');
      
      if (hasOpenai && hasGroq) {
        this.apiIndicator.classList.add('connected');
        this.apiIndicator.title = 'All APIs configured';
      } else if (hasOpenai || hasGroq) {
        this.apiIndicator.classList.add('partial');
        this.apiIndicator.title = 'Some APIs configured';
      } else {
        this.apiIndicator.title = 'No APIs configured';
      }
    }
  }

  /** Get current settings */
  getSettings() {
    return this.getFormValues();
  }

  /** Check if API keys are configured */
  hasApiKeys() {
    const settings = this.getFormValues();
    return !!(settings.openaiKey || settings.groqKey);
  }
}
