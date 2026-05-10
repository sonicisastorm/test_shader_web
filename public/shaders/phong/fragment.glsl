// ============================================================
// shaders/phong/fragment.glsl
// Phong fragment shader — Person B (Nazrin)
//
// Receives interpolated world-space position and normal from
// the vertex shader, then computes Blinn-Phong lighting
// (ambient + diffuse + specular) per pixel.
//
// This shader serves as a standalone reference / test. 
// In production, Teammate A's terrain fragment shader will
// use its own height-based colors with inline lighting.
// ============================================================

precision highp float;

// --- Shared project uniforms (from Day-1 contract) ---
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uLightPos;
uniform vec3  uCameraPos;

// --- Extra Phong uniforms ---
uniform vec3  uLightColor;
uniform vec3  uAmbientColor;
uniform float uShininess;
uniform int   uViewMode;

// --- Varyings from vertex shader ---
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
    // Re-normalize after interpolation (GPU interpolates varyings
    // linearly, which can shorten the normal vector)
    vec3 N = normalize(vNormal);

    // Direction toward the light
    vec3 L = normalize(uLightPos - vWorldPosition);

    // Direction toward the camera
    vec3 V = normalize(uCameraPos - vWorldPosition);

    // Default surface color (white).
    // In the real terrain shader, Teammate A replaces this with
    // a height-based color (grass/rock/snow).
    vec3 surfaceColor = vec3(0.55, 0.72, 1.0);

    // Material coefficients
    float ka = 0.2;    // ambient strength
    float kd = 0.70;   // diffuse strength
    float ks = 0.9;    // specular strength

    vec3 ambient = ambientLight(uAmbientColor, surfaceColor, ka);
    vec3 diffuse = diffuseLight(L, N, uLightColor, surfaceColor, kd);
    vec3 specular = specularLight(L, V, N, uLightColor, uShininess, ks);

    vec3 litColor = ambient + diffuse + specular;
    if (uViewMode == 1) litColor = ambient;
    else if (uViewMode == 2) litColor = diffuse;
    else if (uViewMode == 3) litColor = specular;

    gl_FragColor = vec4(litColor, 1.0);
}
