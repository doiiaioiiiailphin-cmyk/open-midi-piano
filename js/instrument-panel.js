import { INSTRUMENT_CATEGORIES } from './midi-parser.js';

const SVG_ICONS = {
  piano: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="16" width="48" height="36" rx="3" fill="currentColor" opacity="0.2"/>
    <rect x="12" y="20" width="6" height="28" rx="1" fill="white" stroke="currentColor" stroke-width="1.5"/>
    <rect x="20" y="20" width="6" height="28" rx="1" fill="white" stroke="currentColor" stroke-width="1.5"/>
    <rect x="28" y="20" width="6" height="28" rx="1" fill="white" stroke="currentColor" stroke-width="1.5"/>
    <rect x="36" y="20" width="6" height="28" rx="1" fill="white" stroke="currentColor" stroke-width="1.5"/>
    <rect x="44" y="20" width="6" height="28" rx="1" fill="white" stroke="currentColor" stroke-width="1.5"/>
    <rect x="17" y="20" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="25" y="20" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="37" y="20" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="45" y="20" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="8" y="12" width="48" height="6" rx="2" fill="currentColor"/>
  </svg>`,

  guitar: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="44" rx="14" ry="16" fill="currentColor" opacity="0.25"/>
    <ellipse cx="30" cy="38" rx="10" ry="8" fill="currentColor" opacity="0.15"/>
    <circle cx="30" cy="44" r="4" fill="currentColor" opacity="0.4"/>
    <rect x="28" y="10" width="4" height="30" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="26" y="6" width="8" height="6" rx="2" fill="currentColor" opacity="0.8"/>
    <line x1="30" y1="12" x2="30" y2="58" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
    <line x1="29" y1="12" x2="29" y2="58" stroke="currentColor" stroke-width="0.3" opacity="0.3"/>
    <line x1="31" y1="12" x2="31" y2="58" stroke="currentColor" stroke-width="0.3" opacity="0.3"/>
  </svg>`,

  strings: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 8 C18 8, 14 12, 14 20 C14 28, 20 32, 22 36 C24 40, 22 56, 20 60" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.15"/>
    <path d="M36 8 C38 8, 42 12, 42 20 C42 28, 36 32, 34 36 C32 40, 34 56, 36 60" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.15"/>
    <path d="M20 8 C18 8, 14 12, 14 20 C14 28, 20 32, 22 36 C24 40, 22 56, 20 60 L36 60 C34 56, 32 40, 34 36 C36 32, 42 28, 42 20 C42 12, 38 8, 36 8 Z" fill="currentColor" opacity="0.15"/>
    <line x1="24" y1="10" x2="24" y2="58" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
    <line x1="28" y1="10" x2="28" y2="58" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
    <line x1="32" y1="10" x2="32" y2="58" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
    <rect x="20" y="20" width="16" height="3" rx="1" fill="currentColor" opacity="0.4"/>
    <rect x="20" y="40" width="16" height="3" rx="1" fill="currentColor" opacity="0.4"/>
    <path d="M23 26 C26 24, 30 24, 33 26" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
    <path d="M23 34 C26 32, 30 32, 33 34" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>
  </svg>`,

  pipe: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="26" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.6"/>
    <circle cx="20" cy="28.5" r="2.5" fill="currentColor" opacity="0.35"/>
    <circle cx="28" cy="28.5" r="2.5" fill="currentColor" opacity="0.35"/>
    <circle cx="36" cy="28.5" r="2.5" fill="currentColor" opacity="0.35"/>
    <circle cx="44" cy="28.5" r="2.5" fill="currentColor" opacity="0.35"/>
    <rect x="12" y="24" width="4" height="9" rx="1" fill="currentColor" opacity="0.8"/>
    <rect x="48" y="24" width="5" height="9" rx="2" fill="currentColor" opacity="0.5"/>
    <ellipse cx="10" cy="28.5" rx="3" ry="6" fill="currentColor" opacity="0.3"/>
    <circle cx="19" cy="22" r="1.5" fill="currentColor" opacity="0.3"/>
    <circle cx="23" cy="20" r="1.5" fill="currentColor" opacity="0.3"/>
    <circle cx="27" cy="22" r="1.5" fill="currentColor" opacity="0.3"/>
    <circle cx="31" cy="20" r="1.5" fill="currentColor" opacity="0.3"/>
    <circle cx="35" cy="22" r="1.5" fill="currentColor" opacity="0.3"/>
    <path d="M10 22 Q8 18, 12 16" stroke="currentColor" stroke-width="1" opacity="0.3" fill="none"/>
    <path d="M10 22 Q6 16, 10 14" stroke="currentColor" stroke-width="1" opacity="0.2" fill="none"/>
  </svg>`,

  drums: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="36" rx="18" ry="10" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2"/>
    <ellipse cx="32" cy="28" rx="18" ry="8" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2"/>
    <line x1="14" y1="28" x2="14" y2="36" stroke="currentColor" stroke-width="2"/>
    <line x1="50" y1="28" x2="50" y2="36" stroke="currentColor" stroke-width="2"/>
    <ellipse cx="32" cy="28" rx="18" ry="8" fill="currentColor" opacity="0.1"/>
    <line x1="22" y1="8" x2="38" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <line x1="42" y1="8" x2="26" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <circle cx="22" cy="8" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="42" cy="8" r="2" fill="currentColor" opacity="0.4"/>
  </svg>`,

  organ: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="8" width="6" height="48" rx="2" fill="currentColor" opacity="0.3"/>
    <rect x="22" y="4" width="6" height="52" rx="2" fill="currentColor" opacity="0.35"/>
    <rect x="30" y="8" width="6" height="48" rx="2" fill="currentColor" opacity="0.3"/>
    <rect x="38" y="12" width="6" height="44" rx="2" fill="currentColor" opacity="0.25"/>
    <rect x="46" y="8" width="6" height="48" rx="2" fill="currentColor" opacity="0.3"/>
    <rect x="12" y="48" width="42" height="10" rx="2" fill="currentColor" opacity="0.5"/>
    <rect x="14" y="50" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
    <rect x="22" y="50" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
    <rect x="30" y="50" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
    <rect x="38" y="50" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
    <rect x="46" y="50" width="4" height="4" rx="1" fill="white" opacity="0.3"/>
  </svg>`,

  brass: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 36 L44 36 L44 30 C44 26, 48 22, 54 22 C58 22, 60 26, 60 30 C60 34, 56 38, 52 38" stroke="currentColor" stroke-width="2.5" fill="currentColor" opacity="0.15"/>
    <circle cx="54" cy="30" r="8" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2"/>
    <rect x="6" y="32" width="6" height="8" rx="2" fill="currentColor" opacity="0.6"/>
    <ellipse cx="4" cy="36" rx="3" ry="5" fill="currentColor" opacity="0.4"/>
    <line x1="18" y1="34" x2="18" y2="38" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    <line x1="24" y1="34" x2="24" y2="38" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    <line x1="30" y1="34" x2="30" y2="38" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    <line x1="36" y1="34" x2="36" y2="38" stroke="currentColor" stroke-width="2" opacity="0.3"/>
  </svg>`,

  bass: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="34" cy="46" rx="12" ry="14" fill="currentColor" opacity="0.2"/>
    <ellipse cx="34" cy="40" rx="8" ry="7" fill="currentColor" opacity="0.12"/>
    <circle cx="34" cy="46" r="3" fill="currentColor" opacity="0.35"/>
    <rect x="32" y="6" width="4" height="36" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="30" y="2" width="8" height="6" rx="2" fill="currentColor" opacity="0.7"/>
    <line x1="31" y1="8" x2="31" y2="58" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
    <line x1="33" y1="8" x2="33" y2="58" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
    <line x1="35" y1="8" x2="35" y2="58" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
    <line x1="37" y1="8" x2="37" y2="58" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>
    <rect x="28" y="18" width="12" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    <rect x="28" y="24" width="12" height="2" rx="1" fill="currentColor" opacity="0.4"/>
  </svg>`,

  reed: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 12 L14 52 Q14 58, 20 58 L26 58 Q32 58, 32 52 L32 44 L36 44 L36 52 Q36 58, 42 58 L48 58 Q54 58, 54 52 L54 12" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.1"/>
    <rect x="18" y="16" width="8" height="24" rx="4" fill="currentColor" opacity="0.25"/>
    <rect x="38" y="16" width="8" height="24" rx="4" fill="currentColor" opacity="0.25"/>
    <rect x="20" y="22" width="4" height="6" rx="2" fill="currentColor" opacity="0.35"/>
    <rect x="20" y="30" width="4" height="6" rx="2" fill="currentColor" opacity="0.35"/>
    <rect x="40" y="22" width="4" height="6" rx="2" fill="currentColor" opacity="0.35"/>
    <rect x="40" y="30" width="4" height="6" rx="2" fill="currentColor" opacity="0.35"/>
    <rect x="14" y="6" width="40" height="8" rx="3" fill="currentColor" opacity="0.5"/>
  </svg>`,

  synth_lead: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="18" width="44" height="28" rx="4" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
    <rect x="14" y="22" width="36" height="8" rx="2" fill="currentColor" opacity="0.15"/>
    <rect x="16" y="24" width="8" height="4" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="26" y="24" width="8" height="4" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="36" y="24" width="8" height="4" rx="1" fill="currentColor" opacity="0.3"/>
    <circle cx="18" cy="38" r="3" fill="currentColor" opacity="0.3"/>
    <circle cx="28" cy="38" r="3" fill="currentColor" opacity="0.3"/>
    <circle cx="38" cy="38" r="3" fill="currentColor" opacity="0.3"/>
    <circle cx="48" cy="38" r="3" fill="currentColor" opacity="0.3"/>
    <path d="M16 14 L22 8 L28 12 L34 6 L40 10 L46 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  synth_pad: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="48" height="24" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="20" cy="32" r="5" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/>
    <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/>
    <circle cx="44" cy="32" r="5" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/>
    <circle cx="20" cy="32" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="32" cy="32" r="2" fill="currentColor" opacity="0.4"/>
    <circle cx="44" cy="32" r="2" fill="currentColor" opacity="0.4"/>
    <path d="M14 14 Q20 8, 32 10 Q44 12, 50 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35" fill="none"/>
    <path d="M14 12 Q20 6, 32 8 Q44 10, 50 4" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.2" fill="none"/>
  </svg>`,
};

export class InstrumentPanel {
  constructor(container) {
    this.container = container;
    this.activeInstruments = new Set();
    this.mutedInstruments = new Set();
    this.icons = {};
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    for (const cat of INSTRUMENT_CATEGORIES) {
      const icon = SVG_ICONS[cat.id];
      if (!icon) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'instrument-icon-wrapper';
      wrapper.dataset.instrument = cat.id;
      wrapper.style.setProperty('--inst-color', cat.color);
      wrapper.title = `${cat.name}\n点击静音/恢复`;

      wrapper.innerHTML = `
        <div class="instrument-icon-glow" style="background: ${cat.color}"></div>
        <div class="instrument-icon-svg">${icon}</div>
        <span class="instrument-icon-label">${cat.name}</span>
        <div class="instrument-mute-badge">M</div>
      `;

      wrapper.addEventListener('click', () => this._toggleMute(cat.id));
      this.container.appendChild(wrapper);
      this.icons[cat.id] = wrapper;
    }
  }

  _toggleMute(id) {
    const el = this.icons[id];
    if (!el) return;
    if (this.mutedInstruments.has(id)) {
      this.mutedInstruments.delete(id);
      el.classList.remove('muted');
    } else {
      this.mutedInstruments.add(id);
      el.classList.add('muted');
    }
  }

  isMuted(id) {
    return this.mutedInstruments.has(id);
  }

  setActive(instrumentIds) {
    const newActive = new Set(instrumentIds);

    for (const id of newActive) {
      if (!this.activeInstruments.has(id)) {
        const el = this.icons[id];
        if (el) el.classList.add('active');
      }
    }

    for (const id of this.activeInstruments) {
      if (!newActive.has(id)) {
        const el = this.icons[id];
        if (el) el.classList.remove('active');
      }
    }

    this.activeInstruments = newActive;
  }

  clearAll() {
    for (const id of this.activeInstruments) {
      const el = this.icons[id];
      if (el) el.classList.remove('active');
    }
    this.activeInstruments.clear();
  }
}
