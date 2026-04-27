import * as THREE from 'three';

export class ParticleFall {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.count = 120;
    this._speeds = new Array(this.count);
    this.particles = null;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 20 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;

      const hue = Math.random() * 0.15 + 0.55;
      const col = new THREE.Color().setHSL(hue, 0.7, 0.55 + Math.random() * 0.35);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      this._speeds[i] = 0.03 + Math.random() * 0.06;
      sizes[i] = 0.08 + Math.random() * 0.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.6,
    });

    this.particles = new THREE.Points(geo, mat);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  toggle(state) {
    this.active = state;
    this.particles.visible = state;
  }

  update() {
    if (!this.active) return;
    const pos = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      pos[i * 3 + 1] -= this._speeds[i];
      if (pos[i * 3 + 1] < -5) {
        pos[i * 3 + 1] = 14;
        pos[i * 3] = (Math.random() - 0.5) * 28;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
  }
}
