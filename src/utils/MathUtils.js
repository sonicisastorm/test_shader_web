// ============================================================
// src/utils/MathUtils.js
// Linear algebra and math helpers — Person B (Nazrin)
// ============================================================

import * as THREE from 'three';

/**
 * Compute the normal matrix (3×3) from a 4×4 model matrix.
 *
 * The normal matrix is the inverse-transpose of the upper-left 3×3
 * of the model-view matrix. This ensures normals stay perpendicular
 * to surfaces even when the object is scaled non-uniformly.
 *
 * Three.js handles this automatically when using ShaderMaterial,
 * but this helper is available if manual computation is ever needed
 * (e.g. for CPU-side normal transforms or custom renderers).
 *
 * @param {THREE.Matrix4} modelMatrix – the object's world transform
 * @returns {THREE.Matrix3} – the 3×3 normal matrix
 */
export function computeNormalMatrix(modelMatrix) {
    const normalMatrix = new THREE.Matrix3();
    normalMatrix.getNormalMatrix(modelMatrix);
    return normalMatrix;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a – start value
 * @param {number} b – end value
 * @param {number} t – interpolation factor [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * GLSL-compatible smoothstep: Hermite interpolation.
 * Returns 0 if x <= edge0, 1 if x >= edge1,
 * and a smooth curve in between.
 *
 * @param {number} edge0 – lower edge
 * @param {number} edge1 – upper edge
 * @param {number} x     – input value
 * @returns {number}
 */
export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

/**
 * Convert degrees to radians.
 * @param {number} degrees
 * @returns {number}
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180.0);
}

/**
 * Convert radians to degrees.
 * @param {number} radians
 * @returns {number}
 */
export function radToDeg(radians) {
    return radians * (180.0 / Math.PI);
}
