// =============================================================
//  shaders/terrain/vertex.glsl
//  Terrain vertex displacement shader.
//
//  Three.js ShaderMaterial automatically injects:
//    attribute vec3 position, normal; attribute vec2 uv;
//    uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
//    uniform mat3 normalMatrix;
//  DO NOT redeclare any of the above.
//
//  Concatenate simplex.glsl + perlin.glsl before this file so
//  simplex2(), fbm2(), ridgeFbm(), fbmWarp() are in scope.
// =============================================================

// Custom uniforms only
uniform float u_time;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_octaves;
uniform float u_warpStrength;
uniform float u_ridgeBlend;
uniform float u_sineBlend;
uniform float u_sineFreq;
uniform float u_sineSpeed;

// Varyings
varying vec2  v_uv;
varying float v_height;
varying vec3  v_worldNormal;
varying vec3  v_worldPos;

// ---- Sine-wave displacement (water / ocean) --------------------

float sineWaves(vec2 p, float t) {
    float h = 0.0;
    h += sin(dot(p, vec2(1.0,  0.3)) * u_sineFreq + t * u_sineSpeed);
    h += sin(dot(p, vec2(0.5, -0.8)) * u_sineFreq * 1.37 + t * u_sineSpeed * 0.9) * 0.6;
    h += sin(dot(p, vec2(-0.7, 0.6)) * u_sineFreq * 2.1  + t * u_sineSpeed * 1.2) * 0.3;
    return h / 1.9;
}

// ---- Height sample (used by normal finite-differences) ---------

float heightAt(vec2 p, float t) {
    int oct = int(u_octaves);
    vec2 wp     = fbmWarp(p * u_frequency, oct) * u_warpStrength;
    float fbmH  = mix(fbm2(p * u_frequency + wp, oct),
                      ridgeFbm(p * u_frequency + wp, oct),
                      u_ridgeBlend);
    float sineH = sineWaves(p, t);
    return mix(fbmH, sineH, u_sineBlend);
}

// ---- Approximate normal via finite differences -----------------

vec3 computeNormal(vec2 p, float eps, float t) {
    float hL = heightAt(p - vec2(eps, 0.0), t);
    float hR = heightAt(p + vec2(eps, 0.0), t);
    float hD = heightAt(p - vec2(0.0, eps), t);
    float hU = heightAt(p + vec2(0.0, eps), t);
    return normalize(vec3(hL - hR, 2.0 * eps / u_amplitude, hD - hU));
}

// ---- Main ------------------------------------------------------

void main() {
    vec2 p   = position.xz;
    int  oct = int(u_octaves);

    // 1. Domain warp
    vec2 warpOffset = fbmWarp(p * u_frequency, oct) * u_warpStrength;
    vec2 warpedP    = p * u_frequency + warpOffset;

    // 2. fBm + ridge blend
    float fbmH   = fbm2(warpedP, oct);
    float ridgeH = ridgeFbm(warpedP, oct);
    float noiseH = mix(fbmH, ridgeH, u_ridgeBlend);

    // 3. Sine blend
    float sineH = sineWaves(p, u_time);

    // 4. Final height
    float h = mix(noiseH, sineH, u_sineBlend);

    // 5. Displace along Y
    vec3 displaced = position + vec3(0.0, h * u_amplitude, 0.0);

    // 6. Approximate normal
    vec3 approxNormal = computeNormal(p, 0.01, u_time);

    // 7. Varyings
    v_uv          = uv;
    v_height      = h * 0.5 + 0.5;
    // Keep terrain normal in world space for world-space lighting in fragment.
    v_worldNormal = normalize(mat3(modelMatrix) * approxNormal);
    v_worldPos    = (modelMatrix * vec4(displaced, 1.0)).xyz;

    gl_Position   = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);
}
