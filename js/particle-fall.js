import * as THREE from 'three';

const FALL_SPEED = 2.8;
const FALL_DURATION = 3.0;
const LOOK_AHEAD = 3.5;
const MAX_CLUSTERS_PER_FRAME = 15;

function _bubbleTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.12, 'rgba(190,215,255,0.9)');
  g.addColorStop(0.35, 'rgba(96,155,240,0.6)');
  g.addColorStop(0.65, 'rgba(50,110,220,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._particles = [];
    this._getKeyPos = null;
    this._seenNotes = new Set();
    this._currentSec = 0;
    this._tex = _bubbleTexture();
    this._clusterCount = 8;
    this._spreadXY = 0.6;
    this._size = 0.45;

    this._previewing = false;
    this._previewStart = 0;
    this.onPreviewDone = null;
  }

  toggle(state) {
    this.active = state;
    if (!state) this.clear();
  }

  clear() {
    for (const p of this._particles) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this._particles = [];
    this._seenNotes.clear();
    this._previewing = false;
  }

  setKeyPosFn(fn) { this._getKeyPos = fn; }

  startPreview(notes, firstNoteTime) {
    if (!this.active || !this._getKeyPos) return;
    this.clear();
    this._previewing = true;
    this._previewStart = performance.now() / 1000;

    const firstNotes = notes.filter(n => Math.abs(n.time - firstNoteTime) < 0.001);
    for (const n of firstNotes) {
      this._spawnClusterAt(n.midi, n.time, FALL_DURATION);
    }
  }

  _noteKey(midi, sec) { return `${midi}|${sec.toFixed(2)}`; }

  _spawnClusterAt(midi, noteTime, fallSec) {
    const pos = this._getKeyPos(midi);
    if (!pos) return;

    const height = fallSec * FALL_SPEED;
    for (let i = 0; i < this._clusterCount; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this._tex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(this._size, this._size, 1);

      const jx = (Math.random() - 0.5) * this._spreadXY;
      const jz = (Math.random() - 0.5) * this._spreadXY;

      sprite.position.set(pos.x + jx, pos.y + height, pos.z + jz);
      this.scene.add(sprite);

      this._particles.push({
        sprite,
        startY: pos.y + height,
        targetY: pos.y,
        targetX: pos.x + jx,
        targetZ: pos.z + jz,
        spawnTime: this._currentSec,
        targetTime: noteTime,
      });
    }
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

      this._spawnClusterAt(n.midi, n.time, dt);
      spawned++;
    }
  }

  update() {
    if (!this.active) return;

    if (this._previewing) {
      const elapsed = performance.now() / 1000 - this._previewStart;
      const progress = Math.min(elapsed / FALL_DURATION, 1);
      for (const p of this._particles) {
        p.sprite.position.y = p.startY - (p.startY - p.targetY) * progress;
      }
      if (progress >= 1) {
        this._previewing = false;
        this.clear();
        if (this.onPreviewDone) this.onPreviewDone();
      }
      return;
    }

    const toRemove = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      const dt = p.targetTime - this._currentSec;
      const total = p.targetTime - p.spawnTime;
      if (total <= 0) { toRemove.push(i); continue; }
      const progress = Math.min(1 - dt / total, 1);
      p.sprite.position.y = p.startY - (p.startY - p.targetY) * progress;

      if (progress >= 1) {
        p.sprite.position.y = p.targetY;
        this._burstAt(p.sprite.position.x, p.targetY, p.sprite.position.z);
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this._particles[idx];
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
      this._particles.splice(idx, 1);
    }

    const threshold = this._currentSec - LOOK_AHEAD;
    for (const key of this._seenNotes) {
      const sec = parseFloat(key.split('|')[1]);
      if (sec < threshold) this._seenNotes.delete(key);
    }
  }

  _burstAt(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this._tex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = (i / 3) * Math.PI * 2;
      const r = 0.25;
      sprite.position.set(x + Math.cos(angle) * r, y, z + Math.sin(angle) * r);
      sprite.scale.set(0.08, 0.08, 1);
      this.scene.add(sprite);

      let f = 0;
      const anim = () => {
        f++;
        const s = 0.08 + f * 0.13;
        sprite.scale.set(s, s, 1);
        sprite.material.opacity = Math.max(0, 0.5 - f * 0.025);
        if (sprite.material.opacity <= 0) {
          this.scene.remove(sprite);
          sprite.material.dispose();
        } else {
          requestAnimationFrame(anim);
        }
      };
      anim();
    }
  }

  dispose() {
    this.clear();
    if (this._tex) this._tex.dispose();
  }
}
