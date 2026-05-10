import * as THREE from 'three';

const VERT = `void main() { gl_Position = vec4(position, 1.0); }`;

const FRAG = `
  uniform sampler2D uTexture;
  uniform vec2      uResolution;
  uniform bool      uHorizontal;
  uniform float     uStrength;
  void main() {
    vec2 uv  = gl_FragCoord.xy / uResolution;
    vec2 off = uStrength / uResolution;
    vec2 dir = uHorizontal ? vec2(off.x, 0.0) : vec2(0.0, off.y);
    float w[5]; w[0]=0.2270270; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.0540540; w[4]=0.0162162;
    vec3 col = texture2D(uTexture, uv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      col += texture2D(uTexture, uv + dir * float(i)).rgb * w[i]; 
      col += texture2D(uTexture, uv - dir * float(i)).rgb * w[i];
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

const COPY_FRAG = `
  uniform sampler2D uTexture;
  uniform vec2      uResolution;
  void main() {
    gl_FragColor = texture2D(uTexture, gl_FragCoord.xy / uResolution);
  }
`;

function makeQuad(uniforms, frag) {
  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERT,
      fragmentShader: frag,
      depthTest:  false,
      depthWrite: false,
    }),
  ));
  return { scene, camera };
}

/**
 * BlurPass — two-pass Gaussian blur.
 *
 * FIX: render(inputRT, outputRT) now respects outputRT instead of
 * always writing to screen (setRenderTarget(null)).
 *
 * The old version always ended with setRenderTarget(null) which:
 *   - Made the blurred result go to screen mid-pipeline
 *   - Caused the object to "disappear" because the scene color was
 *     replaced by just the blurred offscreen RT content
 *
 * Now: intermediate passes write to internal _rtA/_rtB.
 * The final step writes to whatever outputRT is passed in.
 */
export class BlurPass {
  constructor(renderer, width, height, { passes = 2, strength = 1.0 } = {}) {
    this.renderer = renderer;
    this.passes   = passes;
    this.enabled  = true;
    this._res     = new THREE.Vector2(width, height);

    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.UnsignedByteType,
    };
    this._rtA = new THREE.WebGLRenderTarget(width, height, opts);
    this._rtB = new THREE.WebGLRenderTarget(width, height, opts);

    this._uniforms = {
      uTexture:    { value: null },
      uResolution: { value: this._res },
      uHorizontal: { value: true },
      uStrength:   { value: strength },
    };
    this._copyUniforms = {
      uTexture:    { value: null },
      uResolution: { value: this._res },
    };

    this._blurQuad = makeQuad(this._uniforms,     FRAG);
    this._copyQuad = makeQuad(this._copyUniforms, COPY_FRAG);
  }

  /**
   * render(inputRT, outputRT)
   *   outputRT = null → write to screen (canvas)
   *   outputRT = RT   → write offscreen (used by BloomPass internally)
   *
   * @returns {THREE.WebGLRenderTarget} _rtB (for standalone/BloomPass usage)
   */
  render(inputRT, outputRT = null) {
    if (!this.enabled) {
      // Passthrough: input → outputRT
      this._copyUniforms.uTexture.value = inputRT.texture;
      this.renderer.setRenderTarget(outputRT);
      this.renderer.render(this._copyQuad.scene, this._copyQuad.camera);
      return this._rtB;
    }

    let src = inputRT;
    for (let i = 0; i < this.passes; i++) {
      // Horizontal → _rtA
      this._uniforms.uTexture.value    = src.texture;
      this._uniforms.uHorizontal.value = true;
      this.renderer.setRenderTarget(this._rtA);
      this.renderer.render(this._blurQuad.scene, this._blurQuad.camera);

      // Vertical → _rtB
      this._uniforms.uTexture.value    = this._rtA.texture;
      this._uniforms.uHorizontal.value = false;
      this.renderer.setRenderTarget(this._rtB);
      this.renderer.render(this._blurQuad.scene, this._blurQuad.camera);

      src = this._rtB;
    }

    // Copy final result to the requested output target
    this._copyUniforms.uTexture.value = this._rtB.texture;
    this.renderer.setRenderTarget(outputRT);
    this.renderer.render(this._copyQuad.scene, this._copyQuad.camera);

    return this._rtB;
  }

  setSize(w, h) {
    this._rtA.setSize(w, h);
    this._rtB.setSize(w, h);
    this._res.set(w, h);
  }

  dispose() {
    this._rtA.dispose();
    this._rtB.dispose();
  }
}
