class SoundSystem {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.lastPlayTime = 0;
    this.cooldownMs = 800;
    
    const saved = localStorage.getItem('soundSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch {
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

  unlock() {
    if (this.unlocked) return;
    this.init();
    
    // iOS/Safari REQUIRES playing a sound during the interaction event to unlock
    if (this.ctx) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0; // Silent
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.01);

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.unlocked = true;
          console.log("Audio unlocked successfully.");
        });
      } else {
        this.unlocked = true;
      }
    }
  }

  isQuietHours() {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 7;
  }

  // A helper to play beautifully shaped "plucks" or "pops" like modern apps
  playPremiumTone({ freqs, type = 'sine', duration, vol, envelope = 'pop' }, forcePlay = false) {
    if (!this.ctx) return;
    if (!this.unlocked && this.ctx.state !== 'running') return;

    const now = Date.now();
    if (!forcePlay && now - this.lastPlayTime < this.cooldownMs) return;
    if (!forcePlay) this.lastPlayTime = now;

    let finalVol = vol;
    if (document.visibilityState === 'hidden') finalVol = Math.min(vol * 1.5, 1.0);
    else finalVol = vol * 0.7;

    if (this.isQuietHours()) finalVol *= 0.4;

    const t = this.ctx.currentTime;
    
    // Play multiple frequencies simultaneously for richer sound
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      
      if (envelope === 'pop') {
        // Very fast attack, fast decay (like WhatsApp pop)
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(finalVol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        // Slight pitch drop for organic pop feel
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + duration);
      } else if (envelope === 'chime') {
        // Smooth attack, long decay (like iOS notification)
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(finalVol, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      } else {
        gain.gain.setValueAtTime(finalVol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
      }
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    });
  }

  // 1. Chat sounds - A soft, satisfying "pop"
  messagePing() {
    if (!this.settings.chat) return;
    this.init();
    if (document.visibilityState === 'hidden') {
      this.playPremiumTone({ freqs: [600, 800], type: 'sine', duration: 0.15, vol: 0.4, envelope: 'pop' });
      setTimeout(() => this.playPremiumTone({ freqs: [600, 800], type: 'sine', duration: 0.15, vol: 0.4, envelope: 'pop' }, true), 150);
    } else {
      this.playPremiumTone({ freqs: [600], type: 'sine', duration: 0.1, vol: 0.3, envelope: 'pop' });
    }
  }

  // 2. Private sounds - A distinctive two-tone pop
  privateMessagePing() {
    if (!this.settings.private) return;
    this.init();
    this.playPremiumTone({ freqs: [500], type: 'sine', duration: 0.1, vol: 0.4, envelope: 'pop' });
    setTimeout(() => this.playPremiumTone({ freqs: [700], type: 'sine', duration: 0.15, vol: 0.4, envelope: 'pop' }, true), 100);
  }

  // 3. Notification sounds - A clean chime
  notificationAlert() {
    if (!this.settings.notifications) return;
    this.init();
    this.playPremiumTone({ freqs: [523.25, 659.25, 783.99], type: 'sine', duration: 0.4, vol: 0.3, envelope: 'chime' }); // C Major chord chime
  }

  // 4. Mention sounds - An attention-grabbing dual chime
  mentionAlert() {
    if (!this.settings.username) return;
    this.init();
    this.playPremiumTone({ freqs: [880], type: 'sine', duration: 0.2, vol: 0.5, envelope: 'chime' }, true);
    setTimeout(() => this.playPremiumTone({ freqs: [1320], type: 'sine', duration: 0.3, vol: 0.6, envelope: 'chime' }, true), 150);
  }

  // 5. Call sounds - A traditional ring
  callRing() {
    if (!this.settings.call) return;
    this.init();
    this.playPremiumTone({ freqs: [440, 480], type: 'triangle', duration: 0.4, vol: 0.3, envelope: 'chime' }, true);
  }

  levelUpSound() {
    if (!this.settings.notifications) return;
    this.init();
    [440, 554.37, 659.25, 880].forEach((f, i) => { // A Major Arpeggio
      setTimeout(() => this.playPremiumTone({ freqs: [f], type: 'sine', duration: 0.3, vol: 0.4, envelope: 'chime' }, true), i * 100);
    });
  }

  errorBuzz() {
    this.init();
    this.playPremiumTone({ freqs: [150, 155], type: 'sawtooth', duration: 0.2, vol: 0.3, envelope: 'pop' }, true);
  }
}

export const soundSystem = new SoundSystem();

