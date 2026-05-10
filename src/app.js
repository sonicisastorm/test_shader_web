import * as THREE from 'three';
import { Sizes }            from './core/Sizes.js';
import { Time }             from './core/Time.js';
import { Renderer }         from './core/Renderer.js';   // RESTORED: was removed by previous Claude
import { Camera }           from './camera/Camera.js';
import { CameraController } from './controls/CameraController.js';
import { PostProcessor }    from './postprocessing/PostProcessor.js';
import { SceneManager }     from './scene/SceneManager.js';

/**
 * App.js — top-level integration point.
 *
 * Wiring:
 *   Sizes → Renderer → Camera → CameraController
 *                    → SceneManager (Teammates A + B fill this in)
 *                    → PostProcessor → screen
 *
 * CHANGES vs previous version:
 *   - Renderer class restored (src/core/Renderer.js)
 *   - App now delegates renderer creation to Renderer instance
 *   - All other logic unchanged
 */
export class App {
  constructor(canvas) {
    // ── Core ────────────────────────────────────────────────────
    this.sizes = new Sizes();
    this.time  = new Time();

    // RESTORED: use the Renderer class instead of inline WebGLRenderer
    this.renderer = new Renderer({ canvas, sizes: this.sizes });

    // ── Camera (Teammate C) ──────────────────────────────────────
    this.camera     = new Camera({ position: new THREE.Vector3(0, 6, 16) });
    this.camControl = new CameraController(
      this.camera.instance,
      this.renderer.instance.domElement,
      { moveSpeed: 6 },
    );

    // ── Scene (Teammates A + B) ──────────────────────────────────
    this.scene = new SceneManager();

    // ── Post-processing (Teammate C) ─────────────────────────────
    this.post = new PostProcessor(
      this.renderer.instance,
      Math.floor(this.sizes.width),
      Math.floor(this.sizes.height),
      { bloom: true, blur: false },
    );

    // ── Resize ───────────────────────────────────────────────────
    this.sizes.addEventListener('resize', () => {
      const { width, height, pixelRatio } = this.sizes;
      this.renderer.setSize(width, height, pixelRatio);
      this.camera._onResize();
      this.post.setSize(Math.floor(width), Math.floor(height));
    });

    // ── Loop ─────────────────────────────────────────────────────
    this.time.addEventListener('tick', () => this._tick());
    this._loop();
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this.time.tick();
  }

  _tick() {
    // 1. Update camera
    this.camControl.update(this.time.delta);

    // 2. Update scene uniforms (teammates write inside SceneManager.update)
    this.scene.update(this.time.elapsed, this.camera.instance.position);

    // 3. Render scene → offscreen RT
    this.renderer.instance.setRenderTarget(this.post.sceneRT);
    this.renderer.instance.render(this.scene.instance, this.camera.instance);

    // 4. Post-processing → screen
    this.post.render();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this.camControl.destroy();
    this.camera.destroy();
    this.scene.destroy?.();
    this.post.dispose();
    this.renderer.dispose();
    this.sizes.destroy();
  }
}
