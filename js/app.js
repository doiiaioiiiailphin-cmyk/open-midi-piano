import { AudioEngine, midiToNoteName, GM_PROGRAMS } from './audio-engine.js';
import { PianoKeyboard } from './piano-keyboard.js';
import { SongPlayer } from './song-player.js';
import { SONGS as BUILTIN_SONGS } from './song-data.js';
import { parseMidi } from './midi-parser.js';
import { InstrumentPanel } from './instrument-panel.js';
import { ParticleFall } from './particle-fall.js';

const DB_NAME = 'OpenMidiPiano';
const DB_VERSION = 1;
const STORE_NAME = 'user-songs';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

class App {
  constructor() {
    this.engine = new AudioEngine();
    this.keyboard = null;
    this.player = null;
    this.instPanel = null;
    this.selectedSongIndex = -1;
    this.loadedPrograms = new Set([0]);
    this._draggingProgress = false;
    this.songs = [];
  }

  async init() {
    this._updateLoadingText('正在初始化音频引擎...');
    await this.engine.init();

    this.keyboard = new PianoKeyboard(document.getElementById('piano'));
    this.keyboard.onNoteOn = (midi) => this._handleNoteOn(midi);
    this.keyboard.onNoteOff = (midi) => this._handleNoteOff(midi);

    this.particles = new ParticleFall(this.keyboard.scene);
    this.keyboard.onAnimate = () => this.particles.update();

    this.instPanel = new InstrumentPanel(document.getElementById('instrument-icons'));

    this.player = new SongPlayer(this.engine, this.keyboard, this.instPanel);
    this.player.onPlayStateChange = (s) => this._handlePlayState(s);
    this.player.onProgress = (c, t) => this._handleProgress(c, t);
    this.player.onInstrumentsActive = (ids) => {
      if (this.instPanel) this.instPanel.setActive(ids);
    };

    this.songs = [...BUILTIN_SONGS];
    const userSongs = await dbGetAll();
    for (const us of userSongs) {
      this.songs.push({
        name: us.name,
        artist: '用户上传',
        type: 'midi-blob',
        blob: us.blob,
        data: null,
        userSongId: us.id
      });
    }

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
    this.songs.forEach((song, i) => {
      const li = document.createElement('li');
      li.className = 'song-item';
      li.dataset.index = i;
      const isUser = song.type === 'midi-blob';
      li.innerHTML = `
        <span class="song-icon">&#9836;</span>
        <div class="song-info">
          <div class="song-name">${song.name}</div>
          <div class="song-artist">${song.artist}</div>
        </div>
        ${isUser ? '<button class="btn-delete-song" data-song-index="' + i + '">&times;</button>' : ''}`;
      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-song')) return;
        this._selectSong(i);
      });
      list.appendChild(li);
    });

    list.querySelectorAll('.btn-delete-song').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.songIndex);
        this._deleteUserSong(idx);
      });
    });
  }

  async _deleteUserSong(index) {
    const song = this.songs[index];
    if (!song || song.type !== 'midi-blob') return;
    if (!confirm(`确定删除 "${song.name}" 吗？`)) return;

    this.player.stop();
    await dbDelete(song.userSongId);
    this.songs.splice(index, 1);
    if (this.selectedSongIndex === index) this.selectedSongIndex = -1;
    else if (this.selectedSongIndex > index) this.selectedSongIndex--;
    this._renderSongList();
  }

  async _selectSong(index) {
    if (index < 0 || index >= this.songs.length) return;
    this.player.stop();
    this.selectedSongIndex = index;
    const song = this.songs[index];
    document.querySelectorAll('.song-item').forEach((el, i) => el.classList.toggle('active', i === index));

    if (!song.data) {
      try {
        let arrayBuffer;
        if (song.type === 'midi-blob') {
          arrayBuffer = await song.blob.arrayBuffer();
        } else {
          const resp = await fetch(song.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          arrayBuffer = await resp.arrayBuffer();
        }
        song.data = parseMidi(arrayBuffer);
      } catch (e) {
        console.error('MIDI load failed:', e);
        return;
      }
    }

    this.player.loadSong(song);

    if (song.data && song.data.instruments) {
      this._preloadInstruments(song.data);
    }

    this.player.play();
  }

  async _preloadInstruments(songData) {
    const programs = new Set();
    for (const n of songData.notes) {
      if (n.program !== undefined) programs.add(n.program);
    }

    const needed = [...programs].filter(p => !this.loadedPrograms.has(p));
    if (needed.length === 0) return;

    for (const prog of needed) {
      try {
        await this.engine.loadInstrument(prog);
      } catch (_) {}
      this.loadedPrograms.add(prog);
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
      if (this.selectedSongIndex < this.songs.length - 1) this._selectSong(this.selectedSongIndex + 1);
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

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); this.player.togglePlayPause(); }
    });

    const particleToggle = document.getElementById('toggle-particles');
    const saved = localStorage.getItem('particles');
    if (saved === '1') { particleToggle.checked = true; this.particles.toggle(true); }
    particleToggle.addEventListener('change', () => {
      const on = particleToggle.checked;
      this.particles.toggle(on);
      localStorage.setItem('particles', on ? '1' : '0');
    });

    // Upload modal
    const modal = document.getElementById('upload-modal');
    const fileInput = document.getElementById('upload-file');
    const nameInput = document.getElementById('upload-name');
    const filePicker = document.getElementById('file-picker');
    const filePickerText = document.getElementById('file-picker-text');

    document.getElementById('btn-add-song').addEventListener('click', () => {
      nameInput.value = '';
      fileInput.value = '';
      filePickerText.textContent = '点击选择 .mid 文件';
      filePicker.classList.remove('has-file');
      modal.classList.remove('hidden');
    });

    document.getElementById('upload-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));

    filePicker.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        const f = fileInput.files[0];
        filePickerText.textContent = f.name;
        filePicker.classList.add('has-file');
        if (!nameInput.value) {
          nameInput.value = f.name.replace(/\.(mid|midi)$/i, '');
        }
      }
    });

    filePicker.addEventListener('dragover', (e) => {
      e.preventDefault();
      filePicker.classList.add('drag-over');
    });
    filePicker.addEventListener('dragleave', () => {
      filePicker.classList.remove('drag-over');
    });
    filePicker.addEventListener('drop', (e) => {
      e.preventDefault();
      filePicker.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && /\.(mid|midi)$/i.test(file.name)) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        filePickerText.textContent = file.name;
        filePicker.classList.add('has-file');
        if (!nameInput.value) {
          nameInput.value = file.name.replace(/\.(mid|midi)$/i, '');
        }
      }
    });

    document.getElementById('upload-confirm').addEventListener('click', async () => {
      const file = fileInput.files[0];
      const name = nameInput.value.trim();
      if (!file) { alert('请选择 MIDI 文件'); return; }
      if (!name) { alert('请输入曲目名称'); return; }

      const blob = new Blob([await file.arrayBuffer()], { type: 'audio/midi' });
      const id = await dbAdd({ name, blob });

      this.songs.push({
        name,
        artist: '用户上传',
        type: 'midi-blob',
        blob,
        data: null,
        userSongId: id
      });

      this._renderSongList();
      modal.classList.add('hidden');
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
    const btnStop = document.getElementById('btn-stop');
    const iconPlay = btnToggle.querySelector('.icon-play');
    const iconPause = btnToggle.querySelector('.icon-pause');

    btnToggle.disabled = !state.song;
    btnStop.disabled = !state.song || (!state.playing && !state.paused);

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
