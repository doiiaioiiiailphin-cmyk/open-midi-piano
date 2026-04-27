import * as THREE from 'three';

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._particles = [];
    this._getKeyPos = null;
    this._lookAhead = 2.5;
    this._seenNotes = new Set();
    this._currentSec = 0;

    this.clusterCount = 5;
    this.spreadXY = 0.6;
    this.size = 0.22;
    this.opacity = 1.0;
    this.offsetX = 0;
    this.offsetY = 7;
    this.offsetZ = 0;
    this.color = '#818cf8';
    this.scatterTimer = 0.15;
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

      const spawnDt = Math.max(dt, 0.05);
      const baseX = pos.x + this.offsetX;
      const baseY = pos.y + this.offsetY;
      const baseZ = pos.z + this.offsetZ;

      for (let i = 0; i < this.clusterCount; i++) {
        const mat = new THREE.SpriteMaterial({
          color: new THREE.Color(this.color),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: this.opacity,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(this.size, this.size, 1);

        const jitterX = (Math.random() - 0.5) * this.spreadXY;
        const jitterY = (Math.random() - 0.5) * this.spreadXY;
        const jitterZ = (Math.random() - 0.5) * this.spreadXY;
        const delay = i * this.scatterTimer / this.clusterCount;

        sprite.position.set(baseX + jitterX, baseY + jitterY, baseZ + jitterZ);
        this.scene.add(sprite);

        this._particles.push({
          sprite, midi: n.midi,
          targetY: pos.y,
          spawnSec: currentSec + delay,
          spawnDt: spawnDt - delay,
          done: false,
        });
      }
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
      p.sprite.position.y = p.targetY + this.offsetY * (1 - progress);

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
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        color: new THREE.Color(this.color),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.6,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = (i / 3) * Math.PI * 2;
      sprite.position.set(
        p.sprite.position.x + Math.cos(angle) * 0.3,
        p.sprite.position.y,
        p.sprite.position.z + Math.sin(angle) * 0.3
      );
      sprite.scale.set(0.08, 0.08, 1);
      this.scene.add(sprite);

      let frame = 0;
      const anim = () => {
        frame++;
        const s = 0.08 + frame * 0.1;
        sprite.scale.set(s, s, 1);
        sprite.material.opacity = Math.max(0, 0.6 - frame * 0.03);
        if (sprite.material.opacity <= 0) {
          this.scene.remove(sprite);
          sprite.material.dispose();
        } else {
          requestAnimationFrame(anim);
        }
      };
      anim();
    }

    if (this.onHit) this.onHit(p.midi);
  }

  dispose() {
    for (const p of this._particles) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this._particles = [];
  }
}
