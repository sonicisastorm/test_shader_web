import * as THREE from 'three';
import { EffectComposer } from './EffectComposer.js';
import { BloomPass }      from './BloomPass.js';
import { BlurPass }       from './BlurPass.js';

/**
 * PostProcessor — wires the full post-processing pipeline.
 *
 * Pipeline: sceneRT → [BlurPass?] → [BloomPass?] → screen
 *
 * Keyboard shortcuts (active automatically):
 *   B — toggle bloom
 *   L — toggle blur
 *
 * Usage in App.js:
 *   const pp = new PostProcessor(renderer, width, height);
 *   // each frame — render scene into pp.sceneRT first, then:
 *   renderer.setRenderTarget(pp.sceneRT);
 *   renderer.render(scene, camera);
 *   pp.render(); // outputs to screen
 *
 * Teammates use pp.sceneRT as the render target for their scene.
 */
export class PostProcessor {
  constructor(renderer, width, height, {
    bloom        = true,
    blur         = false,
    bloomOpts    = {},
    blurOpts     = {},
  } = {}) {
    this.renderer = renderer;

    // Scene render target — render your scene INTO this each frame
    this.sceneRT = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.UnsignedByteType,
    });

    this.blurPass         = new BlurPass(renderer, width, height, { passes: 1, strength: 1.0, ...blurOpts });
    this.blurPass.enabled = blur;

    this.bloomPass         = new BloomPass(renderer, width, height, bloomOpts);
    this.bloomPass.enabled = bloom;

    this._composer = new EffectComposer(renderer, width, height);
    this._composer.addPass(this.blurPass);
    this._composer.addPass(this.bloomPass);

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._onKey);
  }

  _onKey(e) {
    if (e.code === 'KeyB') {
      this.bloomEnabled = !this.bloomEnabled;
      console.log(`[PostProcessor] Bloom: ${this.bloomEnabled ? 'ON' : 'OFF'}`);
    }
    if (e.code === 'KeyL') {
      this.blurEnabled = !this.blurEnabled;
      console.log(`[PostProcessor] Blur: ${this.blurEnabled ? 'ON' : 'OFF'}`);
    }
  }

  get bloomEnabled() { return this.bloomPass.enabled; }
  set bloomEnabled(v){ this.bloomPass.enabled = v; }
  get blurEnabled()  { return this.blurPass.enabled; }
  set blurEnabled(v) { this.blurPass.enabled = v; }

  /** Run after rendering your scene into sceneRT. Outputs to screen. */
  render() { this._composer.render(this.sceneRT); }

  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    this._composer.setSize(w, h);
  }
  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.sceneRT.dispose();
    this._composer.dispose();
  }
}
