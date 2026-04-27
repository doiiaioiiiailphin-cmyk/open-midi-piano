import * as THREE from 'three';

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._particles = [];
    this._getKeyPos = null;
    this._fallDist = 7;
    this._lookAhead = 2.5;
    this._seenNotes = new Set();
    this._currentSec = 0;
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
  }

  setKeyPosFn(fn) { this._getKeyPos = fn; }

  _noteKey(midi, sec) { return `${midi}|${sec.toFixed(2)}`; }

  setNotes(notes, currentSec) {
    this._currentSec = currentSec;
    if (!this.active || !this._getKeyPos) return;

    let spawned = 0;
    for (const n of notes) {
      if (spawned >= 20) break;
      const t = n.time;
      const dt = t - currentSec;
      if (dt <= 0 || dt > this._lookAhead) continue;

      const key = this._noteKey(n.midi, t);
      if (this._seenNotes.has(key)) continue;
      this._seenNotes.add(key);

      const pos = this._getKeyPos(n.midi);
      if (!pos) continue;

      const mat = new THREE.SpriteMaterial({
        color: 0x818cf8, blending: THREE.AdditiveBlending,
        depthWrite: false, transparent: true, opacity: 0.85,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.22, 0.22, 1);
      sprite.position.set(pos.x, pos.y + this._fallDist, pos.z);
      this.scene.add(sprite);

      const spawnDt = Math.max(t - currentSec, 0.1);
      this._particles.push({
        sprite, midi: n.midi, targetY: pos.y,
        spawnSec: currentSec, spawnDt, done: false
      });
      spawned++;
    }
  }

  update() {
    if (!this.active) return;

    const toRemove = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      if (p.done) { toRemove.push(i); continue; }

      const progress = Math.min((this._currentSec - p.spawnSec) / p.spawnDt, 1);
      p.sprite.position.y = p.targetY + this._fallDist * (1 - progress);

      if (progress >= 1) {
        p.sprite.position.y = p.targetY;
        this._flashBurst(p);
        p.done = true;
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

    const threshold = this._currentSec - this._lookAhead;
    for (const key of this._seenNotes) {
      const sec = parseFloat(key.split('|')[1]);
      if (sec < threshold) this._seenNotes.delete(key);
    }
  }

  _flashBurst(p) {
    this._burst(p.sprite.position);

    if (this.onHit) this.onHit(p.midi);
  }

  _burst(pos) {
    const mat = new THREE.SpriteMaterial({
      color: 0x818cf8, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.5,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(0.1, 0.1, 1);
    this.scene.add(sprite);

    let frame = 0;
    const anim = () => {
      frame++;
      const s = 0.1 + frame * 0.12;
      sprite.scale.set(s, s, 1);
      sprite.material.opacity = Math.max(0, 0.5 - frame * 0.025);
      if (sprite.material.opacity <= 0) {
        this.scene.remove(sprite);
        sprite.material.dispose();
      } else {
        requestAnimationFrame(anim);
      }
    };
    anim();
  }

  dispose() {
    for (const p of this._particles) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this._particles = [];
  }
}
