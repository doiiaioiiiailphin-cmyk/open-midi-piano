import * as THREE from 'three';
import { midiToNoteName } from './audio-engine.js';

const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_NOTES = [1, 3, 6, 8, 10];

const KEY_MAP_LOWER = {
  'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52,
  'v': 53, 'g': 54, 'b': 55, 'h': 56, 'n': 57, 'j': 58, 'm': 59
};

const KEY_MAP_UPPER = {
  'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64,
  'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71
};

const KEY_BIND_LABELS = {};
for (const [k, v] of Object.entries(KEY_MAP_LOWER)) KEY_BIND_LABELS[v] = k.toUpperCase();
for (const [k, v] of Object.entries(KEY_MAP_UPPER)) KEY_BIND_LABELS[v] = k.toUpperCase();

function _loadZoom() {
  const m = document.cookie.match(/pianoZoom=([^;]+)/);
  if (!m) return 1.0;
  const v = parseFloat(m[1]);
  return (v > 0.3 && v < 3.0) ? v : 1.0;
}

function _saveZoom(v) {
  document.cookie = `pianoZoom=${v};max-age=31536000;path=/`;
}

function _makeTopTexture(noteName, keyBind, isBlack, isCNote) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = isBlack ? '#1a1a1a' : '#f0efe8';
  ctx.fillRect(0, 0, 128, 512);

  if (isCNote) {
    ctx.fillStyle = isBlack ? '#333' : '#d0d0c8';
    ctx.fillRect(0, 0, 128, 512);
  }

  ctx.fillStyle = isBlack ? '#777' : '#555';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(noteName, 64, 440);

  if (keyBind) {
    ctx.fillStyle = isBlack ? '#8b8bce' : '#6366f1';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(keyBind, 64, 380);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function _makeEmissiveMap(noteName, keyBind, isBlack, isCNote) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 512);

  if (isCNote) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 512);
  }

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(noteName, 64, 440);

  if (keyBind) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(keyBind, 64, 380);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function _makeSideTexture(isBlack) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = isBlack ? '#111111' : '#dddcd5';
  ctx.fillRect(0, 0, 128, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export class PianoKeyboard {
  constructor(container) {
    this.container = container;
    this.startOctave = 2;
    this.octaveCount = 4;
    this.onNoteOn = null;
    this.onNoteOff = null;
    this.pressedKeys = new Set();
    this.mouseDown = false;
    this.currentMouseNote = null;
    this._touchNotes = new Map();
    this.keyMeshes = new Map();
    this.keyStates = new Map();
    this.octaveOffset = 0;
    this.zoom = _loadZoom();
    this.onAnimate = null;

    this.whiteKeyW = 2.2;
    this.whiteKeyH = 0.9;
    this.whiteKeyD = 12;
    this.blackKeyW = 1.3;
    this.blackKeyH = 0.7;
    this.blackKeyD = 7.5;

    this._initThree();
    this._buildKeyboard();
    this._bindEvents();
    this._animate();
  }

  _initThree() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(22, w / h, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    this.scene.add(new THREE.DirectionalLight(0x8888ff, 0.3).translateX(-5).translateY(10));

    this.keyGroup = new THREE.Group();
    this.keyGroup.rotation.x = 0.55;
    this.scene.add(this.keyGroup);

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  _updateCamera() {
    const startMidi = this.startOctave * 12 + 12;
    const endMidi = (this.startOctave + this.octaveCount) * 12 + 12;
    let whiteCount = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (WHITE_NOTES.includes(midi % 12)) whiteCount++;
    }
    const totalW = whiteCount * this.whiteKeyW;
    this.camera.position.set(0, 20.25, 45);
    this.camera.lookAt(0, 0, 3);

    const newH = Math.round(420 * this.zoom);
    this.container.style.height = newH + 'px';
    const w = this.container.clientWidth;
    this.camera.aspect = w / newH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, newH);
  }

  _createKeyMaterials(isBlack, noteName, keyBind, isCNote) {
    const topTex = _makeTopTexture(noteName, keyBind, isBlack, isCNote);
    const emissiveMap = _makeEmissiveMap(noteName, keyBind, isBlack, isCNote);
    const sideColor = isBlack ? 0x111111 : 0xe5e4dd;
    const sideTex = _makeSideTexture(isBlack);

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex, emissiveMap: emissiveMap,
      emissive: new THREE.Color(0x000000), emissiveIntensity: 0,
      roughness: isBlack ? 0.3 : 0.4, metalness: isBlack ? 0.1 : 0.0
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: sideTex, color: isBlack ? 0x0f0f0f : 0xdddcd5,
      roughness: isBlack ? 0.4 : 0.5, metalness: isBlack ? 0.1 : 0.0
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: isBlack ? 0x080808 : 0xc8c7c0, roughness: 0.6
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: sideColor, roughness: isBlack ? 0.4 : 0.5
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: isBlack ? 0x0a0a0a : 0xbfbfb8, roughness: 0.6
    });

    return [sideMat, sideMat, topMat, bottomMat, frontMat, backMat];
  }

  _buildKeyboard() {
    while (this.keyGroup.children.length) {
      const c = this.keyGroup.children[0];
      this.keyGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
        else c.material.dispose();
      }
    }
    this.keyMeshes.clear();
    this.keyStates.clear();

    const startMidi = this.startOctave * 12 + 12;
    const endMidi = (this.startOctave + this.octaveCount) * 12 + 12;

    let whiteCount = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (WHITE_NOTES.includes(midi % 12)) whiteCount++;
    }

    const totalW = whiteCount * this.whiteKeyW;
    const offsetX = -totalW / 2 + this.whiteKeyW / 2;
    const wGap = this.whiteKeyW;
    const whiteMeshes = [];

    let wIdx = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      const noteInOctave = midi % 12;
      if (!WHITE_NOTES.includes(noteInOctave)) continue;

      const name = midiToNoteName(midi);
      const isC = noteInOctave === 0;
      const geo = new THREE.BoxGeometry(this.whiteKeyW * 0.96, this.whiteKeyH, this.whiteKeyD);
      const mats = this._createKeyMaterials(false, name, KEY_BIND_LABELS[midi], isC);
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set(offsetX + wIdx * wGap, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { midi, isBlack: false, baseY: 0 };
      this.keyGroup.add(mesh);
      this.keyMeshes.set(midi, mesh);
      this.keyStates.set(midi, { active: false, highlight: false, targetY: 0 });
      whiteMeshes.push({ midi, x: offsetX + wIdx * wGap });
      wIdx++;
    }

    let wIdx2 = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      const noteInOctave = midi % 12;
      if (WHITE_NOTES.includes(noteInOctave)) { wIdx2++; continue; }
      if (!BLACK_NOTES.includes(noteInOctave)) continue;

      const leftWhiteIdx = wIdx2 - 1;
      const x = whiteMeshes[leftWhiteIdx].x + this.whiteKeyW / 2 + 0.02;
      const name = midiToNoteName(midi);
      const geo = new THREE.BoxGeometry(this.blackKeyW, this.blackKeyH, this.blackKeyD);
      const mats = this._createKeyMaterials(true, name, KEY_BIND_LABELS[midi], false);
      const mesh = new THREE.Mesh(geo, mats);
      const baseY = this.whiteKeyH / 2 + this.blackKeyH / 2;
      mesh.position.set(x, baseY, -(this.whiteKeyD - this.blackKeyD) / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { midi, isBlack: true, baseY };
      this.keyGroup.add(mesh);
      this.keyMeshes.set(midi, mesh);
      this.keyStates.set(midi, { active: false, highlight: false, targetY: baseY });
    }

    this._updateCamera();
    this._updateOctaveIndicator();
  }

  _restoreMeshMaterials(mesh) {
    const isBlack = mesh.userData.isBlack;
    const midi = mesh.userData.midi;
    const noteName = midiToNoteName(midi);
    const isC = midi % 12 === 0;
    const keyBind = KEY_BIND_LABELS[midi];
    const oldMats = mesh.material;
    oldMats.forEach(m => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); });
    mesh.material = this._createKeyMaterials(isBlack, noteName, keyBind, isC);
  }

  _updateKeyAppearance(midi) {
    const mesh = this.keyMeshes.get(midi);
    const state = this.keyStates.get(midi);
    if (!mesh || !state) return;

    const activeColor = '#6366f1';
    const highlightColor = '#5ad651';
    const intensity = 0.7;

    if (state.highlight) {
      mesh.material.forEach(m => { m.emissive.set(highlightColor); m.emissiveIntensity = intensity; });
      state.targetY = mesh.userData.baseY - 0.3;
    } else if (state.active) {
      mesh.material.forEach(m => { m.emissive.set(activeColor); m.emissiveIntensity = intensity; });
      state.targetY = mesh.userData.baseY - 0.25;
    } else {
      mesh.material.forEach(m => { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; });
      state.targetY = mesh.userData.baseY;
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const lerp = 0.25;
    for (const [midi, state] of this.keyStates) {
      if (state.targetY === undefined) state.targetY = 0;
      const mesh = this.keyMeshes.get(midi);
      if (!mesh) continue;
      const diff = state.targetY - mesh.position.y;
      if (Math.abs(diff) > 0.001) {
        mesh.position.y += diff * lerp;
      } else {
        mesh.position.y = state.targetY;
      }
    }
    if (this.onAnimate) this.onAnimate();
    this.renderer.render(this.scene, this.camera);
  }

  _bindEvents() {
    const canvas = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getMidiFromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const hits = raycaster.intersectObjects(this.keyGroup.children);
      if (hits.length > 0) return hits[0].object.userData.midi;
      return null;
    };

    canvas.addEventListener('mousedown', (e) => {
      const midi = getMidiFromEvent(e);
      if (midi === null) return;
      e.preventDefault();
      this.mouseDown = true;
      this.currentMouseNote = midi;
      this._triggerNoteOn(midi);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.mouseDown) return;
      const midi = getMidiFromEvent(e);
      if (midi !== null && midi !== this.currentMouseNote) {
        if (this.currentMouseNote !== null) this._triggerNoteOff(this.currentMouseNote);
        this.currentMouseNote = midi;
        this._triggerNoteOn(midi);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.mouseDown && this.currentMouseNote !== null) {
        this._triggerNoteOff(this.currentMouseNote);
        this.currentMouseNote = null;
      }
      this.mouseDown = false;
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, this.camera);
        const hits = raycaster.intersectObjects(this.keyGroup.children);
        if (hits.length > 0) {
          const midi = hits[0].object.userData.midi;
          this._touchNotes.set(touch.identifier, midi);
          this._triggerNoteOn(midi);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, this.camera);
        const hits = raycaster.intersectObjects(this.keyGroup.children);
        const prev = this._touchNotes.get(touch.identifier);
        const cur = hits.length > 0 ? hits[0].object.userData.midi : null;
        if (cur !== prev) {
          if (prev != null) this._triggerNoteOff(prev);
          if (cur != null) this._triggerNoteOn(cur);
          if (cur != null) this._touchNotes.set(touch.identifier, cur);
          else this._touchNotes.delete(touch.identifier);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const midi = this._touchNotes.get(touch.identifier);
        if (midi != null) {
          this._triggerNoteOff(midi);
          this._touchNotes.delete(touch.identifier);
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      for (const touch of e.changedTouches) {
        const midi = this._touchNotes.get(touch.identifier);
        if (midi != null) {
          this._triggerNoteOff(midi);
          this._touchNotes.delete(touch.identifier);
        }
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom *= e.deltaY > 0 ? 1.08 : 0.92;
      this.zoom = Math.max(0.5, Math.min(3.0, this.zoom));
      _saveZoom(this.zoom);
      this._updateCamera();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowleft') { e.preventDefault(); this.shiftOctave(-1); return; }
      if (key === 'arrowright') { e.preventDefault(); this.shiftOctave(1); return; }
      let midi = KEY_MAP_LOWER[key] || KEY_MAP_UPPER[key];
      if (midi !== undefined && !this.pressedKeys.has(key)) {
        midi += this.octaveOffset || 0;
        this.pressedKeys.add(key);
        this._triggerNoteOn(midi);
      }
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      let midi = KEY_MAP_LOWER[key] || KEY_MAP_UPPER[key];
      if (midi !== undefined) {
        midi += this.octaveOffset || 0;
        this.pressedKeys.delete(key);
        this._triggerNoteOff(midi);
      }
    });
  }

  _triggerNoteOn(midi) {
    const state = this.keyStates.get(midi);
    if (state) { state.active = true; this._updateKeyAppearance(midi); }
    if (this.onNoteOn) this.onNoteOn(midi);
  }

  _triggerNoteOff(midi) {
    const state = this.keyStates.get(midi);
    if (state) { state.active = false; this._updateKeyAppearance(midi); }
    if (this.onNoteOff) this.onNoteOff(midi);
  }

  highlightNote(midi) {
    const state = this.keyStates.get(midi);
    if (state) { state.highlight = true; this._updateKeyAppearance(midi); }
  }

  unhighlightNote(midi) {
    const state = this.keyStates.get(midi);
    if (state) { state.highlight = false; this._updateKeyAppearance(midi); }
  }

  clearAllHighlights() {
    for (const [midi, state] of this.keyStates) {
      state.active = false;
      state.highlight = false;
      this._updateKeyAppearance(midi);
    }
  }

  getKeyWorldPosition(midi) {
    const mesh = this.keyMeshes.get(midi);
    if (!mesh) return null;
    const b = mesh.userData.isBlack;
    const zBack = b ? -this.blackKeyD / 2 : -this.whiteKeyD / 2;
    const pos = new THREE.Vector3(0, mesh.userData.baseY - 0.1, zBack - 0.5);
    mesh.localToWorld(pos);
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  shiftOctave(delta) {
    const newStart = this.startOctave + delta;
    if (newStart < 0 || newStart + this.octaveCount > 8) return;
    this.startOctave = newStart;
    this._buildKeyboard();
  }

  getMidiRange() {
    return {
      start: this.startOctave * 12 + 12,
      end: (this.startOctave + this.octaveCount) * 12 + 12
    };
  }

  ensureNoteVisible(midi) {
    const range = this.getMidiRange();
    if (midi < range.start) this.shiftOctave(-1);
    else if (midi > range.end) this.shiftOctave(1);
  }

  _updateOctaveIndicator() {
    const startNote = midiToNoteName(this.startOctave * 12 + 12);
    const endNote = midiToNoteName((this.startOctave + this.octaveCount) * 12 + 12);
    const old = this._octaveSprite;
    if (old) {
      this.keyGroup.remove(old);
      if (old.material.map) old.material.map.dispose();
      old.material.dispose();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(30,30,46,0.85)';
    const rx = 12;
    ctx.beginPath();
    ctx.moveTo(rx, 0); ctx.lineTo(512-rx, 0);
    ctx.quadraticCurveTo(512, 0, 512, rx);
    ctx.lineTo(512, 64-rx);
    ctx.quadraticCurveTo(512, 64, 512-rx, 64);
    ctx.lineTo(rx, 64);
    ctx.quadraticCurveTo(0, 64, 0, 64-rx);
    ctx.lineTo(0, rx);
    ctx.quadraticCurveTo(0, 0, rx, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${startNote} — ${endNote}`, 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(12, 1.5, 1);
    sprite.position.set(0, 8, -1.9);
    this.keyGroup.add(sprite);
    this._octaveSprite = sprite;
  }
}
