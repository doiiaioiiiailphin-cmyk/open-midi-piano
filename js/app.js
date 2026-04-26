import { AudioEngine, midiToNoteName, GM_PROGRAMS } from './audio-engine.js';
import { PianoKeyboard } from './piano-keyboard.js';
import { SongPlayer } from './song-player.js';
import { SONGS } from './song-data.js';
import { parseMidi } from './midi-parser.js';
import { InstrumentPanel } from './instrument-panel.js';

class App {
  constructor() {
    this.engine = new AudioEngine();
    this.keyboard = null;
    this.player = null;
    this.instPanel = null;
    this.selectedSongIndex = -1;
    this.loadedPrograms = new Set([0]);
    this._draggingProgress = false;
  }

  async init() {
    this._updateLoadingText('正在初始化音频引擎...');
    await this.engine.init();

    this.keyboard = new PianoKeyboard(document.getElementById('piano'));
    this.keyboard.onNoteOn = (midi) => this._handleNoteOn(midi);
    this.keyboard.onNoteOff = (midi) => this._handleNoteOff(midi);

    this.instPanel = new InstrumentPanel(document.getElementById('instrument-icons'));

    this.player = new SongPlayer(this.engine, this.keyboard, this.instPanel);
    this.player.onPlayStateChange = (s) => this._handlePlayState(s);
    this.player.onProgress = (c, t) => this._handleProgress(c, t);
    this.player.onInstrumentsActive = (ids) => {
      if (this.instPanel) this.instPanel.setActive(ids);
    };

    this._renderSongList();
    this._bindUIEvents();
    this._loadSoundFont();
  }

  async _loadSoundFont() {
    try {
      this._updateLoadingText('正在加载钢琴音色库...');
      this._updateLoadingProgress(0.1);
      await this.engine.loadSoundFont((p) => {
        this._updateLoadingProgress(0.1 + p * 0.85);
        this._updateLoadingText(`正在解码音色... ${Math.round(p * 100)}%`);
      });
      this._updateLoadingProgress(1);
      this._updateSfStatus('ready', '音色库已就绪');
      this.engine.setMode('sf');
    } catch (e) {
      console.warn('SoundFont fallback:', e);
      this._updateSfStatus('error', '音色库加载失败，已切换合成器');
      this.engine.setMode('synth');
      document.getElementById('sound-mode').value = 'synth';
    }
    this._updateLoadingText('准备就绪!');
    setTimeout(() => document.getElementById('loading-overlay').classList.add('hidden'), 300);
  }

  _updateLoadingText(t) { const e = document.getElementById('loading-text'); if (e) e.textContent = t; }
  _updateLoadingProgress(p) { const e = document.getElementById('loading-progress-bar'); if (e) e.style.width = `${p * 100}%`; }
  _updateSfStatus(s, t) {
    document.querySelector('#sf-status .status-dot').className = `status-dot ${s}`;
    document.getElementById('sf-status-text').textContent = t;
  }

  _renderSongList() {
    const list = document.getElementById('song-list');
    list.innerHTML = '';
    SONGS.forEach((song, i) => {
      const li = document.createElement('li');
      li.className = 'song-item';
      li.dataset.index = i;
      const isMidi = song.type === 'midi';
      li.innerHTML = `
        <div class="song-name">${song.name}</div>
        <div class="song-artist">${song.artist}${isMidi ? ' · MIDI' : ''}</div>
      `;
      li.addEventListener('click', () => {
        this._selectSong(i);
        this._closeAllDrawers(); // Optional: close drawer on select
      });
      list.appendChild(li);
    });
  }

  async _selectSong(index) {
    if (index < 0 || index >= SONGS.length) return;
    this.player.stop();
    this.selectedSongIndex = index;
    const song = SONGS[index];
    document.querySelectorAll('.song-item').forEach((el, i) => el.classList.toggle('active', i === index));

    const titleEl = document.getElementById('current-song-title');
    const artistEl = document.getElementById('current-song-artist');

    titleEl.textContent = song.name;
    artistEl.textContent = song.artist || '未知艺术家';

    if (song.type === 'midi' && !song.data) {
      artistEl.textContent = '加载 MIDI 数据中...';
      try {
        const resp = await fetch(song.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        song.data = parseMidi(await resp.arrayBuffer());
        artistEl.textContent = song.artist || '未知艺术家';
      } catch (e) {
        console.error('MIDI load failed:', e);
        artistEl.textContent = 'MIDI 加载失败';
        return;
      }
    }

    this.player.loadSong(song);
    this._handlePlayState({ playing: false, paused: false, song });

    if (song.data && song.data.instruments) {
      this._preloadInstruments(song.data);
    }
  }

  async _preloadInstruments(songData) {
    const programs = new Set();
    for (const n of songData.notes) {
      if (n.program !== undefined) programs.add(n.program);
    }

    const needed = [...programs].filter(p => !this.loadedPrograms.has(p));
    if (needed.length === 0) return;

    const artistEl = document.getElementById('current-song-artist');
    const origArtist = artistEl.textContent;
    let loaded = 0;
    for (const prog of needed) {
      const name = GM_PROGRAMS[prog] || `Program ${prog}`;
      artistEl.textContent = `正在加载乐器: ${name}...`;
      try {
        await this.engine.loadInstrument(prog);
      } catch (_) {}
      this.loadedPrograms.add(prog);
      loaded++;
    }
    artistEl.textContent = origArtist;
  }

  _closeAllDrawers() {
    document.querySelectorAll('.drawer').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
  }

  _toggleDrawer(btnId, drawerId) {
    const drawer = document.getElementById(drawerId);
    const btn = document.getElementById(btnId);
    const isHidden = drawer.classList.contains('hidden');
    
    this._closeAllDrawers();
    
    if (isHidden) {
      drawer.classList.remove('hidden');
      btn.classList.add('active');
    }
  }

  _bindUIEvents() {
    const btnToggle = document.getElementById('btn-toggle');
    const btnStop = document.getElementById('btn-stop');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    btnToggle.addEventListener('click', () => this.player.togglePlayPause());
    btnStop.addEventListener('click', () => this.player.stop());
    
    btnPrev.addEventListener('click', () => {
      if (this.selectedSongIndex > 0) this._selectSong(this.selectedSongIndex - 1);
    });
    
    btnNext.addEventListener('click', () => {
      if (this.selectedSongIndex < SONGS.length - 1) this._selectSong(this.selectedSongIndex + 1);
    });

    document.getElementById('volume').addEventListener('input', (e) => {
      this.engine.setVolume(e.target.value / 100);
      const icon = document.querySelector('.icon-volume');
      if (e.target.value == 0) {
        icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
      } else {
        icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
      }
    });

    document.getElementById('sound-mode').addEventListener('change', (e) => this.engine.setMode(e.target.value));

    const tempoSlider = document.getElementById('tempo');
    tempoSlider.addEventListener('input', (e) => {
      document.getElementById('tempo-value').textContent = e.target.value;
      this.player.setTempo(e.target.value / 100);
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') { 
        e.preventDefault(); 
        this.player.togglePlayPause(); 
      }
    });

    // Drawer toggles
    document.getElementById('toggle-playlist').addEventListener('click', () => this._toggleDrawer('toggle-playlist', 'playlist-drawer'));
    document.getElementById('toggle-instruments').addEventListener('click', () => this._toggleDrawer('toggle-instruments', 'instrument-drawer'));
    document.getElementById('toggle-settings').addEventListener('click', () => this._toggleDrawer('toggle-settings', 'settings-drawer'));
    
    document.querySelectorAll('.close-drawer').forEach(btn => {
      btn.addEventListener('click', () => this._closeAllDrawers());
    });

    // Progress bar
    const progressBar = document.querySelector('.progress-bar-container');
    const fill = document.getElementById('progress-fill');
    const textCur = document.getElementById('time-current');
    const textTot = document.getElementById('time-total');

    const fmtTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const updateFillVisual = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      fill.style.width = `${pct * 100}%`;
      if (this.player.song && this.player.song.data) {
        const total = this.player.song.data.duration * this.player.tempo;
        textCur.textContent = fmtTime(pct * total);
        textTot.textContent = fmtTime(total);
      }
    };

    const doSeek = (e) => {
      if (!this.player.song || !this.player.song.data) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const total = this.player.song.data.duration * this.player.tempo;
      this.player.seekTo(pct * total);
    };

    progressBar.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._draggingProgress = true;
      updateFillVisual(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (this._draggingProgress) updateFillVisual(e);
    });
    document.addEventListener('mouseup', (e) => {
      if (this._draggingProgress) {
        this._draggingProgress = false;
        doSeek(e);
      }
    });
  }

  _handleNoteOn(midi) {
    this.engine.noteOn(midi, 90);
    this.instPanel.setActive(['piano']);
  }

  _handleNoteOff(midi) {
    this.engine.noteOff(midi);
    this.instPanel.clearAll();
  }

  _handlePlayState(state) {
    const btnToggle = document.getElementById('btn-toggle');
    const iconPlay = btnToggle.querySelector('.icon-play');
    const iconPause = btnToggle.querySelector('.icon-pause');
    
    btnToggle.disabled = !state.song;

    if (state.playing) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    }
  }

  _handleProgress(current, total) {
    if (this._draggingProgress) return;
    const fill = document.getElementById('progress-fill');
    const textCur = document.getElementById('time-current');
    const textTot = document.getElementById('time-total');
    
    const pct = total > 0 ? (current / total) * 100 : 0;
    fill.style.width = `${pct}%`;
    
    const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    textCur.textContent = fmt(current);
    textTot.textContent = fmt(total);
  }
}

new App().init().catch(console.error);
