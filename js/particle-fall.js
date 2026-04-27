import * as THREE from 'three';

const FALL_SPEED = 1.8;
const FALL_DURATION = 3.0;
const LOOK_AHEAD = 4.0;
const MAX_BLOCKS = 120;

let _tex = null;
function _getTexture() {
  if (_tex) return _tex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  const r = 18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(128 - r, 0);
  ctx.quadraticCurveTo(128, 0, 128, r);
  ctx.lineTo(128, 256 - r);
  ctx.quadraticCurveTo(128, 256, 128 - r, 256);
  ctx.lineTo(r, 256);
  ctx.quadraticCurveTo(0, 256, 0, 256 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, '#312e81');
  g.addColorStop(0.5, '#6366f1');
  g.addColorStop(1, '#a5b4fc');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(165,180,252,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
  _tex = new THREE.CanvasTexture(c);
  return _tex;
}

let _mat = null;
function _getMat() {
  if (_mat) return _mat;
  _mat = new THREE.MeshStandardMaterial({
    map: _getTexture(),
    color: 0x818cf8,
    emissive: 0x6366f1,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return _mat;
}

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._blocks = [];
    this._getKeyPos = null;
    this._seenNotes = new Set();
    this._currentSec = 0;
    this._camera = null;
    this._previewing = false;
    this._previewStart = 0;
    this._firstTime = 0;
    this.onPreviewDone = null;
  }

  toggle(state) { this.active = state; if (!state) this.clear(); }

  clear() {
    for (const b of this._blocks) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
    }
    this._blocks = [];
    this._seenNotes.clear();
    this._previewing = false;
  }

  setKeyPosFn(fn) { this._getKeyPos = fn; }
  setCamera(cam) { this._camera = cam; }

  startPreview(notes, firstTime) {
    if (!this.active || !this._getKeyPos) return;
    this.clear();
    this._previewing = true;
    this._previewStart = performance.now() / 1000;
    this._firstTime = firstTime;

    const firstNotes = notes.filter(n => Math.abs(n.time - firstTime) < 0.001);
    for (const n of firstNotes) {
      const pos = this._getKeyPos(n.midi);
      if (!pos) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n.midi % 12);
      this._makeBlock(n.midi, n.time, n.duration, pos, isBlack);
    }
  }

  _noteKey(midi, sec) { return `${midi}|${sec.toFixed(2)}`; }

  _makeBlock(midi, noteTime, duration, pos, isBlack) {
    const kw = isBlack ? 1.3 : 2.2;
    const h = Math.max(duration * FALL_SPEED, 0.3);
    const geo = new THREE.PlaneGeometry(kw, h);
    const mesh = new THREE.Mesh(geo, _getMat());
    mesh.renderOrder = 1;
    mesh.position.set(pos.x, pos.y, pos.z);
    this.scene.add(mesh);
    this._blocks.push({ mesh, midi, noteTime, duration, keyY: pos.y, isBlack, kw, h });
  }

  setNotes(notes, currentSec) {
    this._currentSec = currentSec;
    if (!this.active || !this._getKeyPos || this._previewing) return;

    let spawned = 0;
    const uniq = new Set();
    for (const n of notes) {
      if (spawned >= 20) break;
      const dt = n.time - currentSec;
      if (dt <= 0 || dt > LOOK_AHEAD) continue;
      const key = this._noteKey(n.midi, n.time);
      if (uniq.has(key)) continue;
      uniq.add(key);
      if (this._seenNotes.has(key)) continue;
      this._seenNotes.add(key);

      const pos = this._getKeyPos(n.midi);
      if (!pos) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n.midi % 12);
      this._makeBlock(n.midi, n.time, n.duration, pos, isBlack);
      spawned++;
    }
  }

  _blockBottomY(b) {
    return b.mesh.position.y - b.h / 2;
  }

  update() {
    if (!this.active) return;

    if (this._previewing) {
      const elapsed = performance.now() / 1000 - this._previewStart;
      const progress = Math.min(elapsed / FALL_DURATION, 1);
      for (const b of this._blocks) {
        const startBottom = b.keyY + FALL_DURATION * FALL_SPEED;
        b.mesh.position.y = startBottom + b.h / 2 - progress * FALL_DURATION * FALL_SPEED;
      }
      if (progress >= 1) {
        this._previewing = false;
        const ft = this._firstTime;
        this.clear();
        this._seenNotes.clear();
        if (this.onPreviewDone) this.onPreviewDone();
      }
    } else {
      const toRemove = [];
      for (let i = 0; i < this._blocks.length; i++) {
        const b = this._blocks[i];
        const dt = this._currentSec - b.noteTime;
        const bottomY = b.keyY - dt * FALL_SPEED;
        b.mesh.position.y = bottomY + b.h / 2;
        if (bottomY < b.keyY - 6) toRemove.push(i);
      }
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        const b = this._blocks[idx];
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this._blocks.splice(idx, 1);
      }
    }

    if (this._camera) {
      const q = this._camera.quaternion;
      for (const b of this._blocks) b.mesh.quaternion.copy(q);
    }

    const threshold = this._currentSec - LOOK_AHEAD;
    for (const key of this._seenNotes) {
      const sec = parseFloat(key.split('|')[1]);
      if (sec < threshold) this._seenNotes.delete(key);
    }
  }

  dispose() {
    this.clear();
  }
}
