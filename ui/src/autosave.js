/**
 * Auto-save Manager - Periodically saves project changes
 */

export class AutoSave {
  constructor(options = {}) {
    this.interval = options.interval || 30000; // 30 seconds
    this.onSave = options.onSave || (() => {});
    this.onError = options.onError || (() => {});
    
    this.dirty = false;
    this.lastSave = null;
    this.timer = null;
    this.enabled = true;
  }

  start() {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      if (this.dirty && this.enabled) {
        this.save();
      }
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  markDirty() {
    this.dirty = true;
  }

  markClean() {
    this.dirty = false;
    this.lastSave = Date.now();
  }

  async save() {
    if (!this.dirty) return;

    try {
      await this.onSave();
      this.markClean();
    } catch (error) {
      this.onError(error);
    }
  }

  async forceSave() {
    this.markDirty();
    await this.save();
  }

  getLastSaveTime() {
    return this.lastSave;
  }

  isDirty() {
    return this.dirty;
  }
}

export default AutoSave;
