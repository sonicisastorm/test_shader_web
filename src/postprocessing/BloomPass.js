import * as THREE from 'three';
import { BlurPass } from './BlurPass.js';

const VERT = `void main() { gl_Position = vec4(position, 1.0); }`;

const EXTRACT = `
  uniform sampler2D uTexture;
  uniform vec2      uResolution;
  uniform float     uThreshold;
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  void main() {
    vec4 col    = texture2D(uTexture, gl_FragCoord.xy / uResolution);
    vec3 bright = col.rgb * smoothstep(uThreshold - 0.05, uThreshold + 0.05, lum(col.rgb));
    gl_FragColor = vec4(bright, 1.0);
  }
`;

const COMPOSITE = `
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform vec2      uResolution;
  uniform float     uIntensity;
  void main() {
    vec2 uv     = gl_FragCoord.xy / uResolution;
    vec3 scene  = texture2D(uTexture, uv).rgb;
    vec3 bloom  = texture2D(uBloom,   uv).rgb * uIntensity;
    vec3 result = scene + bloom;
    result      = result / (result + vec3(1.0)); // Reinhard tone-map
    gl_FragColor = vec4(result, 1.0);
  }
`;

const COPY = `
  uniform sampler2D uTexture;
  uniform vec2      uResolution;
  void main() {
    gl_FragColor = texture2D(uTexture, gl_FragCoord.xy / uResolution);
  }
`;

function quad(uniforms, frag) {
  const s = new THREE.Scene();
  const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  s.add(new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERT,
      fragmentShader: frag,
      depthTest:  false,
      depthWrite: false,
    }),
  ));
  return { scene: s, cam: c };
}

/**
 * BloomPass — brightness extract → Gaussian blur → additive composite.
 *
 * FIX: All internal render steps now write to explicit RTs.
 * The previous version's internal BlurPass.render() always ended with
 * setRenderTarget(null) → wrote to screen mid-pipeline → the composite
 * step was reading a stale frame → bloom "froze" the animation visually.
 *
 * Key change: internal blur is run with a dedicated _blurOutputRT so
 * BlurPass never touches the screen target during bloom processing.
 *
 * Hot-toggle: bloomPass.enabled = false  (press B in-game)
 * Tune: bloomPass.threshold / bloomPass.intensity
 */
export class BloomPass {
  constructor(renderer, width, height, {
    threshold    = 0.6,   // slightly lower so the blue box actually glows
    intensity    = 1.2,
    blurPasses   = 3,
    blurStrength = 1.5,
  } = {}) {
    this.renderer = renderer;
    this.enabled  = true;
    this._res     = new THREE.Vector2(width, height);

    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.UnsignedByteType,
    };
    this._brightRT     = new THREE.WebGLRenderTarget(width, height, opts);
    // Dedicated RT to receive the blur output — never null, never screen
    this._blurOutputRT = new THREE.WebGLRenderTarget(width, height, opts);

    this._eu = {
      uTexture:    { value: null },
      uResolution: { value: this._res },
      uThreshold:  { value: threshold },
    };
    this._cu = {
      uTexture:    { value: null },
      uBloom:      { value: null },
      uResolution: { value: this._res },
      uIntensity:  { value: intensity },
    };
    this._pu = {
      uTexture:    { value: null },
      uResolution: { value: this._res },
    };

    this._extract   = quad(this._eu, EXTRACT);
    this._composite = quad(this._cu, COMPOSITE);
    this._passthru  = quad(this._pu, COPY);

    this._blur = new BlurPass(renderer, width, height,
      { passes: blurPasses, strength: blurStrength });
  }

  get threshold() { return this._eu.uThreshold.value; }
  set threshold(v){ this._eu.uThreshold.value = v; }
  get intensity()  { return this._cu.uIntensity.value; }
  set intensity(v) { this._cu.uIntensity.value = v; }

  /**
   * render(sceneRT, outputRT)
   *   outputRT = null → final output to screen
   *   outputRT = RT   → output to that RT (when more passes follow)
   *
   * FIX: internal blur writes to _blurOutputRT (never null/screen),
   * so the compositor always reads fresh bloom data, preserving animation.
   */
  render(sceneRT, outputRT = null) {
    if (!this.enabled) {
      this._pu.uTexture.value = sceneRT.texture;
      this.renderer.setRenderTarget(outputRT);
      this.renderer.render(this._passthru.scene, this._passthru.cam);
      return;
    }

    // Step 1: extract bright pixels into _brightRT
    this._eu.uTexture.value = sceneRT.texture;
    this.renderer.setRenderTarget(this._brightRT);
    this.renderer.render(this._extract.scene, this._extract.cam);

    // Step 2: blur bright pixels into _blurOutputRT (explicit RT, NOT null)
    this._blur.render(this._brightRT, this._blurOutputRT);

    // Step 3: composite original + blurred bloom → outputRT (or screen)
    this._cu.uTexture.value = sceneRT.texture;
    this._cu.uBloom.value   = this._blurOutputRT.texture;
    this.renderer.setRenderTarget(outputRT);
    this.renderer.render(this._composite.scene, this._composite.cam);
  }

  setSize(w, h) {
    this._res.set(w, h);
    this._brightRT.setSize(w, h);
    this._blurOutputRT.setSize(w, h);
    this._blur.setSize(w, h);
  }

  dispose() {
    this._brightRT.dispose();
    this._blurOutputRT.dispose();
    this._blur.dispose();
  }
}
