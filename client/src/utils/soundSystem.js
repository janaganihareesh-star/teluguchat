class SoundSystem {
  constructor() {
    this.ctx = null;
    
    // Load from local storage or default to all true
    const saved = localStorage.getItem('soundSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch (e) {
        this.settings = { chat: true, private: true, notifications: true, username: true, call: true };
      }
    } else {
      this.settings = { chat: true, private: true, notifications: true, username: true, call: true };
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('soundSettings', JSON.stringify(this.settings));
  }

  init() {
    if (!this.ctx && window.AudioContext) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type, duration, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 1. Chat sounds
  messagePing() {
    if (!this.settings.chat) return;
    this.init();
    this.playTone(880, 'sine', 0.15, 0.3);
  }

  // 2. Private sounds
  privateMessagePing() {
    if (!this.settings.private) return;
    this.init();
    this.playTone(660, 'sine', 0.1, 0.25);
  }

  // 3. Notification sounds
  notificationAlert() {
    if (!this.settings.notifications) return;
    this.init();
    this.playTone(700, 'triangle', 0.1, 0.3);
    setTimeout(() => this.playTone(900, 'triangle', 0.15, 0.3), 100);
  }

  // 4. Username sounds
  mentionAlert() {
    if (!this.settings.username) return;
    this.init();
    this.playTone(880, 'sine', 0.1, 0.5);
    setTimeout(() => this.playTone(1100, 'sine', 0.1, 0.5), 80);
  }

  // 5. Call sounds
  callRing() {
    if (!this.settings.call) return;
    this.init();
    this.playTone(440, 'square', 0.2, 0.2);
    setTimeout(() => this.playTone(550, 'square', 0.4, 0.2), 200);
  }

  // Extras
  levelUpSound() {
    if (!this.settings.notifications) return;
    this.init();
    [440, 550, 660, 880].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.12, 0.3), idx * 120);
    });
  }

  errorBuzz() {
    this.init();
    this.playTone(150, 'sawtooth', 0.2, 0.2);
  }
}

export const soundSystem = new SoundSystem();
