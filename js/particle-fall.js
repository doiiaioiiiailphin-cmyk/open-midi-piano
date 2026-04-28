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

  ctx.shadowColor = 'rgba(129,140,248,0.6)';
  ctx.shadowBlur = 12;

  const r = 14;
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

  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#67e8f9');
  g.addColorStop(0.25, '#818cf8');
  g.addColorStop(0.6, '#6366f1');
  g.addColorStop(1, '#3730a3');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(165,243,252,0.7)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  _tex = new THREE.CanvasTexture(c);
  _tex.minFilter = THREE.LinearFilter;
  _tex.magFilter = THREE.LinearFilter;
  return _tex;
}

let _mat = null;
function _getMat() {
  if (_mat) return _mat;
  _mat = new THREE.MeshStandardMaterial({
    map: _getTexture(),
    color: 0xa5b4fc,
    emissive: 0x818cf8,
    emissiveIntensity: 0.6,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
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
    this._keyRotation = null;
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
  setKeyRotation(q) { this._keyRotation = q; }

  startPreview(notes, firstTime) {
    if (!this.active || !this._getKeyPos) return;
    this.clear();
    this._previewing = true;
    this._previewStart = performance.now() / 1000;
    this._firstTime = firstTime;

    const firstNotes = notes.filter(n => Math.abs(n.time - firstTime) < 0.001);
    for (const n of firstNotes) {
      const key = `${n.midi}|${n.time.toFixed(3)}`;
      this._seenNotes.add(key);
      const pos = this._getKeyPos(n.midi);
      if (!pos) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n.midi % 12);
      this._addBlock(n.midi, n.time, n.duration, pos, isBlack);
    }
  }

  _addBlock(midi, noteTime, duration, pos, isBlack) {
    const kw = isBlack ? 1.3 : 2.2;
    const h = Math.max(duration * FALL_SPEED, 0.3);
    const geo = new THREE.PlaneGeometry(kw, h);
    const mesh = new THREE.Mesh(geo, _getMat());
    mesh.renderOrder = 1;
    mesh.position.set(pos.x, pos.y, pos.z);
    if (this._keyRotation) mesh.quaternion.copy(this._keyRotation);
    this.scene.add(mesh);
    this._blocks.push({ mesh, midi, noteTime, duration, keyY: pos.y, keyX: pos.x, keyZ: pos.z, isBlack, kw, h, pressed: false });
  }

  setNotes(notes, currentSec) {
    this._currentSec = currentSec;
    if (!this.active || !this._getKeyPos || this._previewing) return;

    let spawned = 0;
    for (const n of notes) {
      if (spawned >= 20) break;
      const dt = n.time - currentSec;
      if (dt <= 0 || dt > LOOK_AHEAD) continue;
      const key = `${n.midi}|${n.time.toFixed(3)}`;
      if (this._seenNotes.has(key)) continue;
      this._seenNotes.add(key);

      const pos = this._getKeyPos(n.midi);
      if (!pos) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n.midi % 12);
      this._addBlock(n.midi, n.time, n.duration, pos, isBlack);
      spawned++;
    }
  }

  _emitBurst(b) {
    const count = 60;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        color: i % 3 === 0 ? 0x67e8f9 : i % 3 === 1 ? 0xa5b4fc : 0x6366f1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(mat);
      const ringR = 0.15 + Math.random() * 0.15;
      const angle = (i / count) * Math.PI * 2;
      sprite.position.set(
        b.keyX + Math.cos(angle) * ringR,
        b.keyY + (Math.random() - 0.5) * 0.2,
        b.keyZ + Math.sin(angle) * ringR
      );
      sprite.scale.set(0.06, 0.06, 1);
      this.scene.add(sprite);

      const speed = 0.03 + Math.random() * 0.06;
      const vx = Math.cos(angle) * speed;
      const vy = (Math.random() - 0.4) * speed * 0.6;
      const vz = Math.sin(angle) * speed;

      let f = 0;
      const life = 25 + Math.floor(Math.random() * 20);
      const anim = () => {
        f++;
        sprite.position.x += vx;
        sprite.position.y += vy;
        sprite.position.z += vz;
        const s = 0.06 + (f / life) * 0.35;
        sprite.scale.set(s, s, 1);
        sprite.material.opacity = Math.max(0, 0.9 * (1 - f / life));
        if (f >= life) {
          this.scene.remove(sprite);
          sprite.material.dispose();
        } else {
          requestAnimationFrame(anim);
        }
      };
      anim();
    }
  }

  _updateBlockGeo(b, visibleH) {
    const newH = Math.max(visibleH, 0.05);
    b.mesh.geometry.dispose();
    b.mesh.geometry = new THREE.PlaneGeometry(b.kw, newH);
    b.mesh.position.y = b.keyY + newH / 2;
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
        if (this.onPreviewDone) this.onPreviewDone();
      }
    } else {
      const toRemove = [];
      for (let i = 0; i < this._blocks.length; i++) {
        const b = this._blocks[i];
        const dt = this._currentSec - b.noteTime;
        const bottomY = b.keyY - dt * FALL_SPEED;

        if (bottomY >= b.keyY) {
          b.mesh.position.y = bottomY + b.h / 2;
        } else {
          if (!b.pressed) {
            b.pressed = true;
            this._emitBurst(b);
          }
          const penetration = b.keyY - bottomY;
          const remainingH = Math.max(0, b.h - penetration);
          if (remainingH <= 0.05) {
            toRemove.push(i);
          } else {
            this._updateBlockGeo(b, remainingH);
          }
        }
      }
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        const b = this._blocks[idx];
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this._blocks.splice(idx, 1);
      }
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
