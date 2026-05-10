import * as THREE from 'three';

/**
 * Renderer.js — WebGLRenderer setup.
 *
 * Teammate C wires PostProcessor here.
 * Teammate B connects scene output here.
 */
export class Renderer {
  /**
   * @param {object} opts
   * @param {HTMLCanvasElement} [opts.canvas]
   * @param {import('./Sizes').Sizes} opts.sizes
   */
  constructor({ canvas, sizes }) {
    this.sizes = sizes;
    this.instance = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.instance.setSize(sizes.width, sizes.height);
    this.instance.setPixelRatio(1);
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping      = THREE.NoToneMapping; // PostProcessor handles it
  }

  /**
   * Render the scene directly (no post-processing).
   * PostProcessor.render() takes over when post is active.
   */
  renderDirect(scene, camera) {
    this.instance.setRenderTarget(null);
    this.instance.render(scene, camera);
  }

  setSize(width, height, pixelRatio) {
    this.instance.setSize(width, height);
    this.instance.setPixelRatio(pixelRatio);
  }

  dispose() {
    this.instance.dispose();
  }
}
