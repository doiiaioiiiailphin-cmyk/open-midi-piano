import { midiToNoteName } from './audio-engine.js';
import { programToCategory } from './midi-parser.js';

export class SongPlayer {
  constructor(audioEngine, keyboard, instrumentPanel) {
    this.engine = audioEngine;
    this.keyboard = keyboard;
    this.instrumentPanel = instrumentPanel;
    this.song = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.scheduledNotes = [];
    this.animFrame = null;
    this.tempo = 1.0;
    this.onPlayStateChange = null;
    this.onProgress = null;
    this.onInstrumentsActive = null;
    this._progressLoop = this._progressLoop.bind(this);
  }

  loadSong(song) {
    this.stop();
    this.song = song;
  }

  play() {
    if (!this.song || !this.song.data) return;
    if (this.isPaused) {
      this._resume();
    } else if (!this.isPlaying) {
      this._startFrom(0);
    }
  }

  startFrom(timeSeconds) {
    if (!this.song || !this.song.data) return;
    this.stop();
    this._startFrom(timeSeconds);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    this.isPlaying = false;
    this.pauseTime = this.engine.ctx.currentTime - this.startTime;
    this._clearSchedule();
    this.engine.allNotesOff(true);
    this.keyboard.clearAllHighlights();
    this._stopLoop();
    this._notifyState();
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
    this._clearSchedule();
    this.engine.allNotesOff(true);
    this.keyboard.clearAllHighlights();
    this._stopLoop();
    this._notifyState();
    if (this.onProgress) this.onProgress(0, 0);
    if (this.onInstrumentsActive) this.onInstrumentsActive([]);
  }

  seekTo(timeSeconds) {
    if (!this.song || !this.song.data) return;
    const total = this.song.data.duration * this.tempo;
    const clamped = Math.max(0, Math.min(timeSeconds, total));
    this._startFrom(clamped);
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setTempo(t) {
    this.tempo = t;
  }

  getProgress() {
    if (!this.song || !this.isPlaying) {
      if (this.isPaused) return { current: this.pauseTime, total: this.song ? this.song.data.duration * this.tempo : 0 };
      return { current: 0, total: this.song ? this.song.data.duration * this.tempo : 0 };
    }
    const current = this.engine.ctx.currentTime - this.startTime;
    const total = this.song.data.duration * this.tempo;
    return { current: Math.min(current, total), total };
  }

  _startFrom(offsetSeconds) {
    this._clearSchedule();
    this.engine.allNotesOff(true);
    this.keyboard.clearAllHighlights();

    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = this.engine.ctx.currentTime - offsetSeconds;

    const { notes } = this.song.data;

    for (const note of notes) {
      const noteStart = note.time * this.tempo;
      const noteEnd = noteStart + note.duration * this.tempo;

      if (noteEnd <= offsetSeconds) continue;

      const delay = Math.max(0, noteStart - offsetSeconds);
      const remainingDur = noteEnd - Math.max(offsetSeconds, noteStart);
      const muted = this._isNoteMuted(note);

      if (delay === 0 && noteStart <= offsetSeconds) {
        setTimeout(() => {
          this.keyboard.ensureNoteVisible(note.midi);
          this.keyboard.highlightNote(note.midi);
          if (!muted) this.engine.noteOn(note.midi, note.velocity || 90, note.program || 0);
          this._fireNoteDisplay(note);
          this._updateActiveInstruments();
        }, 10);
      }

      if (delay > 0) {
        const onT = setTimeout(() => {
          this.keyboard.ensureNoteVisible(note.midi);
          this.keyboard.highlightNote(note.midi);
          if (!this._isNoteMuted(note)) this.engine.noteOn(note.midi, note.velocity || 90, note.program || 0);
          this._fireNoteDisplay(note);
          this._updateActiveInstruments();
        }, delay * 1000);
        this.scheduledNotes.push(onT);
      }

      const offT = setTimeout(() => {
        this.keyboard.unhighlightNote(note.midi);
        this.engine.noteOff(note.midi, note.program || 0);
        this._updateActiveInstruments();
      }, (delay + remainingDur) * 1000);
      this.scheduledNotes.push(offT);
    }

    const totalDuration = this.song.data.duration * this.tempo;
    const remaining = totalDuration - offsetSeconds;
    const endT = setTimeout(() => this.stop(), remaining * 1000 + 300);
    this.scheduledNotes.push(endT);

    this._notifyState();
    this._startLoop();
  }

  _resume() {
    this._startFrom(this.pauseTime);
  }

  _clearSchedule() {
    for (const t of this.scheduledNotes) clearTimeout(t);
    this.scheduledNotes = [];
  }

  _startLoop() {
    this._stopLoop();
    this._progressLoop();
  }

  _stopLoop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  _progressLoop() {
    if (!this.isPlaying) return;
    const { current, total } = this.getProgress();
    if (this.onProgress) this.onProgress(current, total);
    this._updateActiveInstruments();
    this.animFrame = requestAnimationFrame(this._progressLoop);
  }

  _updateActiveInstruments() {
    if (!this.song || !this.song.data) return;
    const now = this.isPlaying
      ? (this.engine.ctx.currentTime - this.startTime) / this.tempo
      : this.pauseTime / this.tempo;
    const active = new Set();
    for (const note of this.song.data.notes) {
      if (now >= note.time && now <= note.time + note.duration) {
        active.add(note.instrument || 'piano');
      }
    }
    if (this.onInstrumentsActive) this.onInstrumentsActive([...active]);
  }

  _notifyState() {
    if (this.onPlayStateChange) {
      this.onPlayStateChange({ playing: this.isPlaying, paused: this.isPaused, song: this.song });
    }
  }

  _fireNoteDisplay(note) {
    const display = document.getElementById('note-display');
    if (display) {
      const instName = note.instrumentName || '钢琴';
      display.innerHTML = `<span class="note-name">${midiToNoteName(note.midi)}</span> <span style="color:var(--text-muted);font-size:12px">${instName}</span>`;
    }
  }

  _isNoteMuted(note) {
    if (!this.instrumentPanel) return false;
    const program = note.program || 0;
    const channel = note.channel;
    const cat = programToCategory(program, channel);
    return this.instrumentPanel.isMuted(cat.id);
  }
}
