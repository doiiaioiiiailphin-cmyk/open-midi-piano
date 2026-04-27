import * as THREE from 'three';

const FALL_SPEED = 2.5;
const FALL_DURATION = 3.0;
const LOOK_AHEAD = 3.5;
const MAX_CLUSTERS_PER_FRAME = 12;
const DUR_SCALE = 0.8;

function _blockGeo(w, h, d) {
  return new THREE.BoxGeometry(w, Math.max(h, 0.2), d, 2, 2, 1);
}

function _blockMat() {
  return new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    emissive: 0x4f46e5,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
  });
}

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._blocks = [];
    this._getKeyPos = null;
    this._seenNotes = new Set();
    this._currentSec = 0;
    this._whiteKeyW = 2.11;
    this._blackKeyW = 1.3;
    this._whiteKeyD = 12;
    this._blackKeyD = 7.5;

    this._previewing = false;
    this._previewStart = 0;
    this._previewNotes = null;
    this._firstTime = 0;
    this.onPreviewDone = null;
  }

  toggle(state) {
    this.active = state;
    if (!state) this.clear();
  }

  clear() {
    for (const b of this._blocks) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    this._blocks = [];
    this._seenNotes.clear();
    this._previewing = false;
  }

  setKeyPosFn(fn) { this._getKeyPos = fn; }

  setKeyDims({ whiteW, blackW, whiteD, blackD }) {
    if (whiteW) this._whiteKeyW = whiteW;
    if (blackW) this._blackKeyW = blackW;
    if (whiteD) this._whiteKeyD = whiteD;
    if (blackD) this._blackKeyD = blackD;
  }

  startPreview(notes, firstTime) {
    if (!this.active || !this._getKeyPos) return;
    this.clear();
    this._previewing = true;
    this._previewStart = performance.now() / 1000;
    this._previewNotes = notes;
    this._firstTime = firstTime;

    const firstNotes = notes.filter(n => Math.abs(n.time - firstTime) < 0.001);
    for (const n of firstNotes) {
      this._spawnBlock(n.midi, n.time, n.duration, FALL_DURATION);
    }
  }

  _noteKey(midi, sec) { return `${midi}|${sec.toFixed(2)}`; }

  _spawnBlock(midi, noteTime, duration, fallSec) {
    const pos = this._getKeyPos(midi);
    if (!pos) return;

    const isBlack = [1,3,6,8,10].includes(midi % 12);
    const kw = isBlack ? this._blackKeyW : this._whiteKeyW;
    const kd = isBlack ? this._blackKeyD : this._whiteKeyD;
    const h = Math.max(duration * DUR_SCALE, 0.2);
    const fallDist = fallSec * FALL_SPEED;

    const geo = _blockGeo(kw, h, kd);
    const mat = _blockMat();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + h / 2 + fallDist, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this._blocks.push({
      mesh,
      startY: pos.y + h / 2 + fallDist,
      targetY: pos.y + h / 2,
      targetTime: noteTime,
      spawnTime: this._currentSec,
    });
  }

  setNotes(notes, currentSec) {
    this._currentSec = currentSec;
    if (!this.active || !this._getKeyPos || this._previewing) return;

    let spawned = 0;
    for (const n of notes) {
      if (spawned >= MAX_CLUSTERS_PER_FRAME) break;
      const dt = n.time - currentSec;
      if (dt <= 0 || dt > LOOK_AHEAD) continue;

      const key = this._noteKey(n.midi, n.time);
      if (this._seenNotes.has(key)) continue;
      this._seenNotes.add(key);

      this._spawnBlock(n.midi, n.time, n.duration, dt);
      spawned++;
    }
  }

  update() {
    if (!this.active) return;

    if (this._previewing) {
      const elapsed = performance.now() / 1000 - this._previewStart;
      const progress = Math.min(elapsed / FALL_DURATION, 1);
      for (const b of this._blocks) {
        b.mesh.position.y = b.startY - (b.startY - b.targetY) * progress;
      }
      if (progress >= 1) {
        this._previewing = false;
        this.clear();
        this._seenNotes.clear();
        if (this.onPreviewDone) this.onPreviewDone();
      }
      return;
    }

    const toRemove = [];
    for (let i = 0; i < this._blocks.length; i++) {
      const b = this._blocks[i];
      const dt = b.targetTime - this._currentSec;
      const total = b.targetTime - b.spawnTime;
      if (total <= 0) { toRemove.push(i); continue; }
      const progress = Math.min(1 - dt / total, 1);
      b.mesh.position.y = b.startY - (b.startY - b.targetY) * progress;

      if (progress >= 1) {
        b.mesh.position.y = b.targetY;
        this._popBlock(b.mesh);
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const b = this._blocks[idx];
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      this._blocks.splice(idx, 1);
    }

    const threshold = this._currentSec - LOOK_AHEAD;
    for (const key of this._seenNotes) {
      const sec = parseFloat(key.split('|')[1]);
      if (sec < threshold) this._seenNotes.delete(key);
    }
  }

  _popBlock(mesh) {
    const pos = mesh.position.clone();
    const s = mesh.geometry.parameters;
    const geo = new THREE.BoxGeometry(
      (s.width || 2) * 1.3, (s.height || 0.5) * 0.6, (s.depth || 2) * 1.3
    );
    const mat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x6366f1,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const frag = new THREE.Mesh(geo, mat);
    frag.position.copy(pos);
    frag.position.y -= (s.height || 0.5) * 0.3;
    this.scene.add(frag);

    let f = 0;
    const anim = () => {
      f++;
      frag.scale.setScalar(1 + f * 0.15);
      frag.material.opacity = Math.max(0, 0.7 - f * 0.04);
      if (frag.material.opacity <= 0) {
        this.scene.remove(frag);
        frag.geometry.dispose();
        frag.material.dispose();
      } else {
        requestAnimationFrame(anim);
      }
    };
    anim();
  }

  dispose() {
    this.clear();
  }
}
