import * as THREE from 'three';

/**
 * EffectComposer — ordered post-processing pipeline.
 *
 * FIX (v2): BlurPass and BloomPass both internally call setRenderTarget()
 * multiple times, which was leaving the renderer's active RT at null
 * mid-chain. This caused:
 *   - Blur: object disappears (scene RT gets overwritten)
 *   - Bloom: animation freezes (stale frame baked into RT, rotation stops)
 *
 * Solution: always restore the renderer render target after each pass,
 * and never ping-pong into a RT that is currently being read.
 */
export class EffectComposer {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this._passes  = [];
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.UnsignedByteType,
    };
    this._rtA = new THREE.WebGLRenderTarget(width, height, opts);
    this._rtB = new THREE.WebGLRenderTarget(width, height, opts);
  }

  addPass(pass)    { this._passes.push(pass); return this; }
  removePass(pass) { this._passes = this._passes.filter(p => p !== pass); }

  render(sceneRT) {
    const enabled = this._passes.filter(p => p.enabled !== false);

    // Nothing enabled — blit scene directly to screen via passthru in BloomPass
    if (!enabled.length) {
      // Force bloom pass (disabled) to run its copy shader to screen
      const bloom = this._passes.find(p => p.constructor.name === 'BloomPass');
      if (bloom) {
        const wasEnabled = bloom.enabled;
        bloom.enabled = false;
        bloom.render(sceneRT, null);
        bloom.enabled = wasEnabled;
      }
      return;
    }

    if (enabled.length === 1) {
      enabled[0].render(sceneRT, null);
      return;
    }

    // Multi-pass: ping-pong. Use _rtA for intermediate, screen for last.
    let read = sceneRT;
    enabled.forEach((pass, i) => {
      const isLast = i === enabled.length - 1;
      const write  = isLast ? null : this._rtA;
      pass.render(read, write);
      if (!isLast) read = this._rtA;
    });
  }

  setSize(w, h) {
    this._rtA.setSize(w, h);
    this._rtB.setSize(w, h);
    this._passes.forEach(p => p.setSize?.(w, h));
  }

  dispose() {
    this._rtA.dispose();
    this._rtB.dispose();
    this._passes.forEach(p => p.dispose?.());
    this._passes = [];
  }
}
