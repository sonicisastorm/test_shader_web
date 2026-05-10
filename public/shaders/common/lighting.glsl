// ================================================================
// shaders/common/lighting.glsl — shared Phong lighting helpers
// Person B (Nazrin)
//
// Reusable Blinn-Phong lighting functions.
// Any fragment shader can use these (concatenate or copy).
// The terrain fragment shader (Teammate A) has its own inline
// version; this file is the canonical reference implementation.
// ================================================================

// --- Ambient component ---
// Flat, omnidirectional base illumination so geometry is never
// fully black even when facing away from the light.
// ka = ambient strength coefficient (0–1)
vec3 ambientLight(vec3 lightColor, vec3 albedo, float ka) {
    return ka * lightColor * albedo;
}

// --- Diffuse component (Lambertian) ---
// Brightness proportional to cos(angle) between the surface
// normal and the direction toward the light source.
// kd = diffuse strength coefficient (0–1)
vec3 diffuseLight(vec3 L, vec3 N, vec3 lightColor, vec3 albedo, float kd) {
    float diff = max(dot(normalize(N), normalize(L)), 0.0);
    return kd * diff * lightColor * albedo;
}

// --- Specular component (Blinn-Phong) ---
// Uses the half-vector between light and view direction instead
// of reflecting the light vector (classic Phong). This is cheaper
// and avoids artifacts at grazing angles.
// ks = specular strength coefficient (0–1)
vec3 specularLight(vec3 L, vec3 V, vec3 N, vec3 lightColor, float shininess, float ks) {
    vec3  H    = normalize(normalize(L) + normalize(V));
    float spec = pow(max(dot(normalize(N), H), 0.0), shininess);
    return ks * spec * lightColor;
}

// --- Full Phong / Blinn-Phong combined ---
// Convenience wrapper: computes all three components and sums them.
// L         = direction toward the light (not necessarily normalized)
// V         = direction toward the camera (not necessarily normalized)
// N         = surface normal (not necessarily normalized)
// lightColor = light RGB (each component 0–1)
// albedo     = surface base color
// ka, kd, ks = material coefficients for ambient, diffuse, specular
// shininess  = specular exponent (e.g. 16, 32, 64, 128)
vec3 phong(vec3 L, vec3 V, vec3 N,
           vec3 lightColor, vec3 albedo,
           float ka, float kd, float ks, float shininess) {
    return ambientLight(lightColor, albedo, ka)
         + diffuseLight(L, N, lightColor, albedo, kd)
         + specularLight(L, V, N, lightColor, shininess, ks);
}
