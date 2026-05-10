// =============================================================
//  shaders/terrain/fragment.glsl
//  Height-based color ramp + procedural detail texture.
//
//  Color zones (bottom → top, driven by v_height [0, 1]):
//    0.00 – 0.15  deep water
//    0.15 – 0.28  shallow / shoreline
//    0.28 – 0.42  sand / beach
//    0.42 – 0.62  lowland grass
//    0.62 – 0.78  highland / rock
//    0.78 – 0.90  bare rock
//    0.90 – 1.00  snow cap
//
//  Uniforms (set via TerrainMaterial.js)
//  ----------
//  vec3  u_lightDir    — world-space directional light direction
//  vec3  u_lightColor  — light RGB
//  vec3  u_ambientColor
//  float u_detailScale — UV scale for procedural detail noise
//  float u_detailAmp   — strength of surface micro-detail (0–1)
//  float u_fogDensity  — exponential fog density  (0 = off)
//  vec3  u_fogColor
//  float u_waterLevel  — height threshold for specular water gloss
//  float u_time        — for animated water specular
// =============================================================

precision highp float;

// Add `highp` explicitly to both vertex AND fragment
varying highp vec2  v_uv;
varying highp float v_height;
varying highp vec3  v_worldNormal;
varying highp vec3  v_worldPos;

// Uniforms
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform vec3  u_ambientColor;
uniform float u_detailScale;
uniform float u_detailAmp;
uniform float u_fogDensity;
uniform vec3  u_fogColor;
uniform float u_waterLevel;
uniform float u_time;

// Camera position for specular
uniform vec3  u_cameraPos;

// ---- Simplex from simplex.glsl (concatenated at build) ----------
// simplex2() expected in scope for procedural micro-detail.
// -----------------------------------------------------------------

// ---- Color ramp -------------------------------------------------

vec3 terrainColor(float h) {
    // Clamp and define band boundaries
    float t = clamp(h, 0.0, 1.0);

    vec3 deepWater    = vec3(0.05, 0.12, 0.35);
    vec3 shallowWater = vec3(0.12, 0.35, 0.65);
    vec3 sand         = vec3(0.76, 0.70, 0.50);
    vec3 grass        = vec3(0.22, 0.55, 0.18);
    vec3 highland     = vec3(0.30, 0.42, 0.22);
    vec3 rock         = vec3(0.45, 0.40, 0.35);
    vec3 snow         = vec3(0.92, 0.95, 1.00);

    vec3 col;
    if      (t < 0.15) col = mix(deepWater,    shallowWater, t / 0.15);
    else if (t < 0.28) col = mix(shallowWater, sand,         (t - 0.15) / 0.13);
    else if (t < 0.42) col = mix(sand,         grass,        (t - 0.28) / 0.14);
    else if (t < 0.62) col = mix(grass,        highland,     (t - 0.42) / 0.20);
    else if (t < 0.78) col = mix(highland,     rock,         (t - 0.62) / 0.16);
    else if (t < 0.90) col = mix(rock,         snow,         (t - 0.78) / 0.12);
    else               col = snow;

    return col;
}

// ---- Procedural micro-detail overlay ----------------------------
//  Blends high-frequency simplex noise into the albedo to simulate
//  surface texture variation (grass blades, rock graininess, etc.)

float microDetail(vec2 uv) {
    float d  = simplex2(uv * u_detailScale);
    d       += simplex2(uv * u_detailScale * 3.7) * 0.4;
    return d * 0.5 + 0.5;  // [0, 1]
}

// ---- Blinn-Phong lighting ---------------------------------------

vec3 blinnPhong(vec3 albedo, vec3 N, vec3 L, vec3 V) {
    float diff  = max(dot(N, L), 0.0);
    vec3  H     = normalize(L + V);
    float spec  = pow(max(dot(N, H), 0.0), 64.0);
    return u_ambientColor * albedo
         + u_lightColor   * albedo * diff
         + u_lightColor   * spec * 0.3;
}

// ---- Water specular ---------------------------------------------

float waterSpecular(vec3 N, vec3 V, vec3 L) {
    vec3  H    = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 128.0);
    // Animated chop: perturb normal slightly with time
    float chop = simplex2(v_uv * 20.0 + vec2(u_time * 0.3));
    return spec * (0.8 + 0.2 * chop);
}

// ---- Exponential fog --------------------------------------------

float fogFactor(float dist) {
    return exp(-u_fogDensity * dist);
}

// ---- Main -------------------------------------------------------

void main() {
    vec3 N = normalize(v_worldNormal);
    vec3 L = normalize(u_lightDir);
    vec3 V = normalize(u_cameraPos - v_worldPos);

    // Base albedo from height ramp
    vec3 albedo = terrainColor(v_height);

    // Blend in procedural micro-detail
    float detail = microDetail(v_uv);
    albedo = mix(albedo, albedo * (0.85 + 0.3 * detail), u_detailAmp);

    // Lighting
    vec3 color = blinnPhong(albedo, N, L, V);

    // Extra water gloss below water level
    float isWater = step(v_height, u_waterLevel);
    float wSpec   = waterSpecular(N, V, L);
    color += isWater * u_lightColor * wSpec * 0.6;

    // Transparency tint for shallow water
    color = mix(color, vec3(0.08, 0.25, 0.55), isWater * 0.35);

    // Exponential fog
    float dist = length(v_worldPos - u_cameraPos);
    float ff   = clamp(fogFactor(dist), 0.0, 1.0);
    color = mix(u_fogColor, color, ff);

    gl_FragColor = vec4(color, 1.0);
}
