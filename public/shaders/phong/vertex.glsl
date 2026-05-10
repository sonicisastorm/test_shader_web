// ============================================================
// shaders/phong/vertex.glsl
// Phong vertex shader — Person B (Nazrin)
//
// Transforms vertex positions to clip space and passes
// world-space position + normal to the fragment shader
// for per-pixel lighting calculations.
//
// Uses THREE.ShaderMaterial, so built-in attributes (position,
// normal, uv) and uniforms (modelMatrix, viewMatrix,
// projectionMatrix, normalMatrix, cameraPosition) are
// auto-injected by Three.js — DO NOT redeclare them.
// ============================================================

// --- Shared project uniforms (from Day-1 contract) ---
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uLightPos;
uniform vec3  uCameraPos;

// --- Extra Phong uniforms ---
uniform vec3  uLightColor;
uniform vec3  uAmbientColor;
uniform float uShininess;

// --- Varyings: passed to fragment shader ---
varying vec3 vWorldPosition;   // fragment position in world space
varying vec3 vNormal;          // transformed normal (world space)
varying vec2 vUv;              // texture coordinates

void main() {
    // Transform position to world space for lighting calculations
    vec4 worldPos   = modelMatrix * vec4(position, 1.0);
    vWorldPosition  = worldPos.xyz;

    // Transform normal to world space so N/L/V all share the same space.
    // For this project geometry path (no non-uniform scaling), mat3(modelMatrix) is sufficient.
    vNormal = normalize(mat3(modelMatrix) * normal);

    // Pass through UVs for any texture sampling
    vUv = uv;

    // Final clip-space position
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
