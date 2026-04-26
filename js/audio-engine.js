const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const GM_PROGRAMS = [
  'acoustic_grand_piano','bright_acoustic_piano','electric_grand_piano','honkytonk_piano',
  'electric_piano_1','electric_piano_2','harpsichord','clavinet',
  'celesta','glockenspiel','music_box','vibraphone',
  'marimba','xylophone','tubular_bells','dulcimer',
  'drawbar_organ','percussive_organ','rock_organ','church_organ',
  'reed_organ','accordion','harmonica','tango_accordion',
  'acoustic_guitar_nylon','acoustic_guitar_steel','electric_guitar_jazz','electric_guitar_clean',
  'electric_guitar_muted','overdriven_guitar','distortion_guitar','guitar_harmonics',
  'acoustic_bass','electric_bass_finger','electric_bass_pick','fretless_bass',
  'slap_bass_1','slap_bass_2','synth_bass_1','synth_bass_2',
  'violin','viola','cello','contrabass',
  'tremolo_strings','pizzicato_strings','orchestral_harp','timpani',
  'string_ensemble_1','string_ensemble_2','synth_strings_1','synth_strings_2',
  'choir_aahs','voice_oohs','synth_choir','orchestra_hit',
  'trumpet','trombone','tuba','muted_trumpet',
  'french_horn','brass_section','synth_brass_1','synth_brass_2',
  'soprano_sax','alto_sax','tenor_sax','baritone_sax',
  'oboe','english_horn','bassoon','clarinet',
  'piccolo','flute','recorder','pan_flute',
  'blown_bottle','shakuhachi','whistle','ocarina',
  'lead_1_square','lead_2_sawtooth','lead_3_calliope','lead_4_chiff',
  'lead_5_charang','lead_6_voice','lead_7_fifths','lead_8_bass_lead',
  'pad_1_new_age','pad_2_warm','pad_3_polysynth','pad_4_choir',
  'pad_5_bowed','pad_6_metallic','pad_7_halo','pad_8_sweep',
  'fx_1_rain','fx_2_soundtrack','fx_3_crystal','fx_4_atmosphere',
  'fx_5_brightness','fx_6_goblins','fx_7_echoes','fx_8_scifi',
  'sitar','banjo','shamisen','koto',
  'kalimba','bagpipe','fiddle','shanai',
  'tinkle_bell','agogo','steel_drums','woodblock',
  'taiko_drum','melodic_tom','synth_drum','reverse_cymbal',
  'guitar_fret_noise','breath_noise','seashore','bird_tweet',
  'telephone_ring','helicopter','applause','gunshot'
];

export { GM_PROGRAMS };

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function programToName(program) {
  return GM_PROGRAMS[program] || 'acoustic_grand_piano';
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverb = null;
    this.pianoSamples = new Map();
    this.instrumentBanks = new Map();
    this.mode = 'sf';
    this.volume = 0.7;
    this.activeNotes = new Map();
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.reverb = this._createReverb();
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.15;
    this.compressor.connect(this.masterGain);
    this.reverb.connect(reverbGain);
    reverbGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  _createReverb() {
    const length = this.ctx.sampleRate * 1.5;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  async loadSoundFont(onProgress) {
    return this._loadInstrumentSamples('acoustic_grand_piano', this.pianoSamples, onProgress);
  }

  async loadInstrument(program, onProgress) {
    const name = GM_PROGRAMS[program];
    if (!name) return false;
    if (this.instrumentBanks.has(name)) return true;
    const samples = new Map();
    await this._loadInstrumentSamples(name, samples, onProgress);
    this.instrumentBanks.set(name, samples);
    return true;
  }

  async _loadInstrumentSamples(instrumentName, targetMap, onProgress) {
    try {
      window.MIDI = { Soundfont: {} };
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${instrumentName}-mp3.js`;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const sfData = window.MIDI.Soundfont[instrumentName];
      if (!sfData) throw new Error(`No data for ${instrumentName}`);
      const noteNames = Object.keys(sfData);
      let decoded = 0;
      for (const noteName of noteNames) {
        try {
          const midi = this._noteNameToMidi(noteName);
          if (midi === null) continue;
          const base64 = sfData[noteName].split(',')[1];
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
          targetMap.set(midi, audioBuffer);
          decoded++;
          if (onProgress) onProgress(decoded / noteNames.length);
        } catch (_) {}
      }
      return true;
    } catch (e) {
      console.warn(`Failed to load instrument ${instrumentName}:`, e);
      return false;
    }
  }

  _noteNameToMidi(name) {
    const noteMap = {
      'C': 0, 'C#': 1, 'Cs': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Ds': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Fs': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Gs': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'As': 10, 'Bb': 10,
      'B': 11
    };
    const match = name.match(/^([A-G][#sb]?)(\d+)$/);
    if (!match) return null;
    const note = noteMap[match[1]];
    if (note === undefined) return null;
    const octave = parseInt(match[2]);
    return (octave + 1) * 12 + note;
  }

  _getSamples(program) {
    if (program === undefined || program === 0) return this.pianoSamples;
    const name = GM_PROGRAMS[program];
    if (name && this.instrumentBanks.has(name)) return this.instrumentBanks.get(name);
    if (name && this.instrumentBanks.has(name)) return this.instrumentBanks.get(name);
    return this.pianoSamples;
  }

  noteOn(midiNote, velocity = 100, program = 0) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const key = `${program}_${midiNote}`;
    if (this.activeNotes.has(key)) this.noteOff(midiNote, program);
    if (this.mode === 'sf' && this.pianoSamples.size > 0) {
      return this._playSF(midiNote, velocity, program);
    }
    return this._playSynth(midiNote, velocity);
  }

  _playSF(midiNote, velocity, program) {
    const samples = this._getSamples(program);
    const sample = samples.get(midiNote);
    if (!sample) return this._playSynth(midiNote, velocity);

    const source = this.ctx.createBufferSource();
    source.buffer = sample;
    const gainNode = this.ctx.createGain();
    const vol = (velocity / 127) * 0.9;
    gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    source.connect(gainNode);
    gainNode.connect(this.compressor);
    gainNode.connect(this.reverb);
    source.start(0);
    const key = `${program}_${midiNote}`;
    const handle = { source, gainNode, type: 'sf', key };
    this.activeNotes.set(key, handle);
    return handle;
  }

  _playSynth(midiNote, velocity) {
    const freq = midiToFreq(midiNote);
    const now = this.ctx.currentTime;
    const vel = velocity / 127;
    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0, now);
    const oscillators = [];
    const harmonics = [
      { ratio: 1, amp: 1.0, type: 'triangle' },
      { ratio: 2, amp: 0.35, type: 'sine' },
      { ratio: 3, amp: 0.2, type: 'sine' },
      { ratio: 4, amp: 0.1, type: 'sine' },
      { ratio: 5, amp: 0.05, type: 'sine' },
      { ratio: 6, amp: 0.025, type: 'sine' },
    ];
    for (const h of harmonics) {
      const osc = this.ctx.createOscillator();
      osc.type = h.type;
      osc.frequency.value = freq * h.ratio;
      osc.detune.value = (Math.random() - 0.5) * 2;
      const hGain = this.ctx.createGain();
      hGain.gain.value = h.amp * vel * 0.35;
      osc.connect(hGain);
      hGain.connect(noteGain);
      oscillators.push(osc);
    }
    const attackTime = 0.005;
    const decayTime = 0.15;
    const sustainLevel = Math.max(0.6 * vel, 0.001);
    const peakLevel = vel * 0.9;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(peakLevel, now + attackTime);
    noteGain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    noteGain.connect(this.compressor);
    noteGain.connect(this.reverb);
    oscillators.forEach(o => o.start(now));
    const key = `synth_${midiNote}`;
    const handle = { oscillators, noteGain, type: 'synth', key };
    this.activeNotes.set(key, handle);
    return handle;
  }

  noteOff(midiNote, program = 0) {
    const key = `${program}_${midiNote}`;
    const handle = this.activeNotes.get(key);
    if (!handle) {
      const fallbackKey = `synth_${midiNote}`;
      const fallback = this.activeNotes.get(fallbackKey);
      if (fallback) this._releaseNote(fallback);
      return;
    }
    this._releaseNote(handle);
  }

  _releaseNote(handle, immediate = false) {
    const now = this.ctx.currentTime;
    const releaseTime = immediate ? 0.02 : 0.3;
    const stopTime = immediate ? 0.03 : 0.35;
    if (handle.type === 'sf') {
      handle.gainNode.gain.cancelScheduledValues(now);
      handle.gainNode.gain.setValueAtTime(handle.gainNode.gain.value, now);
      handle.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
      handle.source.stop(now + stopTime);
    } else {
      handle.noteGain.gain.cancelScheduledValues(now);
      handle.noteGain.gain.setValueAtTime(handle.noteGain.gain.value, now);
      handle.noteGain.gain.linearRampToValueAtTime(0, now + releaseTime);
      handle.oscillators.forEach(o => o.stop(now + stopTime));
    }
    this.activeNotes.delete(handle.key);
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setMode(mode) {
    this.mode = mode;
  }

  allNotesOff(immediate = false) {
    const handles = [...this.activeNotes.values()];
    this.activeNotes.clear();
    for (const handle of handles) {
      this._releaseNote(handle, immediate);
    }
  }
}
