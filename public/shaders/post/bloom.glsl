// Bloom — reference GLSL (two phases).
// Actual implementation lives in BloomPass.js.
// Phase 0: extract bright pixels above uThreshold
// Phase 1: composite original + blurred bright with Reinhard tone-map
