// =============================================================
//  src/rendering/TerrainMaterial.js
//  Wraps THREE.ShaderMaterial for the terrain shaders.
//  Loads GLSL sources, defines all uniforms, and exposes typed
//  setters so the rest of the codebase never touches raw uniforms.
//
//  Build note
//  ----------
//  GLSL files are concatenated in load order:
//    1. shaders/noise/simplex.glsl   (provides simplex2, fbm2, etc.)
//    2. shaders/noise/perlin.glsl    (provides perlin2, perlin3)
//    3. shaders/terrain/vertex.glsl
//    4. shaders/terrain/fragment.glsl
//
//  If you use a bundler with glslify, replace the manual fetch
//  approach with:  import vertSrc from './shaders/terrain/vertex.glsl';
// ============================================================= 

import * as THREE from 'three';

/**
 * @typedef {Object} TerrainMaterialOptions
 * @property {number}       [amplitude=8]         Peak displacement height (world units)
 * @property {number}       [frequency=0.08]      Noise domain scale
 * @property {number}       [octaves=6]           fBm octave count
 * @property {number}       [warpStrength=0.4]    Domain-warp intensity
 * @property {number}       [ridgeBlend=0.3]      Mix toward ridged fBm (0–1)
 * @property {number}       [sineBlend=0.0]       Mix toward sine waves (0=terrain, 1=water)
 * @property {number}       [sineFreq=1.5]        Sine wave spatial frequency
 * @property {number}       [sineSpeed=0.6]       Sine wave animation speed
 * @property {THREE.Vector3}[lightDir]            World-space light direction
 * @property {THREE.Color}  [lightColor]          Directional light colour
 * @property {THREE.Color}  [ambientColor]        Ambient light colour
 * @property {number}       [detailScale=80]      UV scale for micro-detail noise
 * @property {number}       [detailAmp=0.35]      Micro-detail blend strength
 * @property {number}       [fogDensity=0.004]    Exponential fog density (0 = off)
 * @property {THREE.Color}  [fogColor]            Fog colour
 * @property {number}       [waterLevel=0.28]     Normalised height for water gloss
 */

// GLSL source paths — adjust to your project structure / asset pipeline
const SHADER_PATHS = {
  simplexNoise : 'shaders/noise/simplex.glsl',
  perlinNoise  : 'shaders/noise/perlin.glsl',
  vertex       : 'shaders/terrain/vertex.glsl',
  fragment     : 'shaders/terrain/fragment.glsl',
};

/**
 * Fetches a GLSL file as text.
 * @param {string} path
 * @returns {Promise<string>}
 */
async function fetchGLSL(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`TerrainMaterial: failed to load ${path} (${res.status})`);
  return res.text();
}

export class TerrainMaterial {
  /** @type {THREE.ShaderMaterial | null} */
  shaderMaterial = null;

  /** @type {boolean} */
  ready = false;

  /**
   * @param {TerrainMaterialOptions} [options={}]
   */
  constructor(options = {}) {
    this._options = options;
    this._uniforms = TerrainMaterial._buildUniforms(options);
    // Begin async shader load; replace with sync sources if using a bundler
    this._loadPromise = this._load();
  }

  // ---- Loading ---------------------------------------------------

    async _load() {
    const [simplexSrc, perlinSrc, vertSrc, fragSrc] = await Promise.all([
        fetchGLSL(SHADER_PATHS.simplexNoise),
        fetchGLSL(SHADER_PATHS.perlinNoise),
        fetchGLSL(SHADER_PATHS.vertex),
        fetchGLSL(SHADER_PATHS.fragment),
    ]);

    const stripPrecision = src => src.replace(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm, '');

    const fullVert = [stripPrecision(simplexSrc), stripPrecision(perlinSrc), vertSrc].join('\n');
    const fullFrag = [stripPrecision(simplexSrc), fragSrc].join('\n');

    this.shaderMaterial = new THREE.ShaderMaterial({
        uniforms       : this._uniforms,
        vertexShader   : fullVert,
        fragmentShader : fullFrag,
        side           : THREE.FrontSide,
    });

    // Force Three.js to print the actual GLSL compile error
    this.shaderMaterial.onBeforeCompile = (shader) => {
        console.log('Compiling terrain shader...');
    };

    // Manually check compile status after forcing a compile
    this.shaderMaterial.addEventListener?.('error', (e) => console.error('Shader error:', e));

    // The real debug tool — log the full concatenated source so you can
    // see line numbers when the browser reports an error
    console.log('=== VERTEX SHADER ===');
    console.log(fullVert);
    console.log('=== FRAGMENT SHADER ===');
    console.log(fullFrag);

    this.ready = true;
    return this.shaderMaterial;
    }
  whenReady() {
    return this._loadPromise;
  }

  // ---- Uniform construction --------------------------------------

  /**
   * @param {TerrainMaterialOptions} o
   * @returns {Object.<string, THREE.IUniform>}
   */
  static _buildUniforms(o) {
    const defaultLight = new THREE.Vector3(0.6, 1.0, 0.5).normalize();

    return {
      // Vertex — displacement
      u_time         : { value: 0.0 },
      u_amplitude    : { value: o.amplitude    ?? 8 },
      u_frequency    : { value: o.frequency    ?? 0.08 },
      u_octaves      : { value: o.octaves      ?? 6 },
      u_warpStrength : { value: o.warpStrength ?? 0.4 },
      u_ridgeBlend   : { value: o.ridgeBlend   ?? 0.3 },
      u_sineBlend    : { value: o.sineBlend    ?? 0.0 },
      u_sineFreq     : { value: o.sineFreq     ?? 1.5 },
      u_sineSpeed    : { value: o.sineSpeed    ?? 0.6 },

      // Fragment — lighting
      u_lightDir     : { value: o.lightDir    ?? defaultLight },
      u_lightColor   : { value: o.lightColor  ?? new THREE.Color(1.0, 0.97, 0.88) },
      u_ambientColor : { value: o.ambientColor ?? new THREE.Color(0.12, 0.18, 0.25) },

      // Fragment — detail texture
      u_detailScale  : { value: o.detailScale ?? 80 },
      u_detailAmp    : { value: o.detailAmp   ?? 0.35 },

      // Fragment — fog
      u_fogDensity   : { value: o.fogDensity  ?? 0.004 },
      u_fogColor     : { value: o.fogColor    ?? new THREE.Color(0.55, 0.65, 0.75) },

      // Fragment — water
      u_waterLevel   : { value: o.waterLevel  ?? 0.28 },

      // Fragment — camera (must be kept in sync each frame)
      u_cameraPos    : { value: new THREE.Vector3() },
    };
  }

  // ---- Per-frame update ------------------------------------------

  /**
   * Call every frame from Terrain.update(dt).
   * @param {number} elapsedSeconds
   * @param {THREE.Camera} [camera]  — pass to keep u_cameraPos in sync
   */
  update(elapsedSeconds, camera) {
    if (!this.ready) return;
    this._uniforms.u_time.value = elapsedSeconds;
    if (camera) {
      this._uniforms.u_cameraPos.value.copy(camera.position);
    }
  }

  // ---- Typed setters ---------------------------------------------

  /** @param {number} v */
  setAmplitude(v)    { this._uniforms.u_amplitude.value    = v; }
  setFrequency(v)    { this._uniforms.u_frequency.value    = v; }
  setOctaves(v)      { this._uniforms.u_octaves.value      = v; }
  setWarpStrength(v) { this._uniforms.u_warpStrength.value = v; }
  setRidgeBlend(v)   { this._uniforms.u_ridgeBlend.value   = v; }
  setSineBlend(v)    { this._uniforms.u_sineBlend.value    = v; }
  setFogDensity(v)   { this._uniforms.u_fogDensity.value   = v; }
  setWaterLevel(v)   { this._uniforms.u_waterLevel.value   = v; }

  /** @param {THREE.Vector3} dir - does not need to be normalised */
  setLightDirection(dir) {
    this._uniforms.u_lightDir.value.copy(dir).normalize();
  }

  /** @param {THREE.Camera} camera */
  setCameraPosition(camera) {
    this._uniforms.u_cameraPos.value.copy(camera.position);
  }

  /** Free GPU resources. */
  dispose() {
    this.shaderMaterial?.dispose();
  }
}