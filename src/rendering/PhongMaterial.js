// ============================================================
// src/rendering/PhongMaterial.js
// Phong-specific material — Person B (Nazrin)
//
// Extends ShaderMaterial with the Phong vertex/fragment shaders.
// Loads GLSL sources via fetch (no vite-plugin-glsl needed).
// Wires uniforms: lightPos, lightColor, ambientColor,
// shininess, camPos.
// ============================================================

import * as THREE from 'three';
import ShaderMaterial from './ShaderMaterial.js';

// GLSL source paths
const SHADER_PATHS = {
    lighting: '/shaders/common/lighting.glsl',
    vertex:   '/shaders/phong/vertex.glsl',
    fragment: '/shaders/phong/fragment.glsl',
};

/**
 * Fetches a GLSL file as text.
 * @param {string} path
 * @returns {Promise<string>}
 */
async function fetchGLSL(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`PhongMaterial: failed to load ${path} (${res.status})`);
    return res.text();
}

export default class PhongMaterial extends ShaderMaterial {
    /**
     * Private constructor — use PhongMaterial.create() instead.
     * @param {object} opts - internal options with loaded shader sources
     */
    constructor(opts) {
        const uniforms = {};

        // Allow caller overrides
        if (opts.lightPos) {
            uniforms.uLightPos = { value: opts.lightPos.clone() };
        }
        if (opts.lightColor) {
            uniforms.uLightColor = { value: opts.lightColor.clone() };
        }
        if (opts.ambientColor) {
            uniforms.uAmbientColor = { value: opts.ambientColor.clone() };
        }
        if (opts.shininess !== undefined) {
            uniforms.uShininess = { value: opts.shininess };
        }

        super({
            vertexShader: opts._vertexSrc,
            fragmentShader: opts._fragmentSrc,
            uniforms,
            wireframe: opts.wireframe || false,
            side: THREE.DoubleSide,   // visible from both sides
        });
    }

    /**
     * Async factory — fetches GLSL sources then constructs the material.
     *
     * @param {object} [options]
     * @param {THREE.Vector3} [options.lightPos]     – override default light position
     * @param {THREE.Vector3} [options.lightColor]   – override default light color
     * @param {THREE.Vector3} [options.ambientColor] – override default ambient color
     * @param {number}        [options.shininess]    – specular exponent (default 32)
     * @param {boolean}       [options.wireframe]    – render as wireframe
     * @returns {Promise<PhongMaterial>}
     */
    static async create(options = {}) {
        const [lightingSrc, vertexSrc, fragmentSrc] = await Promise.all([
            fetchGLSL(SHADER_PATHS.lighting),
            fetchGLSL(SHADER_PATHS.vertex),
            fetchGLSL(SHADER_PATHS.fragment),
        ]);

        const stripPrecision = (src) => src.replace(/^\s*precision\s+\w+\s+\w+\s*;\s*$/gm, '');
        const fullFragment = [stripPrecision(lightingSrc), fragmentSrc].join('\n');

        return new PhongMaterial({
            ...options,
            _vertexSrc: vertexSrc,
            _fragmentSrc: fullFragment,
        });
    }

    /**
     * Per-frame update. Extends the base class to also accept
     * light data from the Lights manager.
     *
     * @param {number} elapsedTime
     * @param {THREE.Camera} camera
     * @param {object} [lightData] – from Lights.getUniforms()
     */
    update(elapsedTime, camera, lightData) {
        // Base class handles uTime, uCameraPos, uResolution
        super.update(elapsedTime, camera);

        // If a Lights manager provides data, push it into uniforms
        if (lightData) {
            if (lightData.uLightPos) {
                this.uniforms.uLightPos.value.copy(lightData.uLightPos);
            }
            if (lightData.uLightColor) {
                this.uniforms.uLightColor.value.copy(lightData.uLightColor);
            }
            if (lightData.uAmbientColor) {
                this.uniforms.uAmbientColor.value.copy(lightData.uAmbientColor);
            }
        }
    }

    /**
     * Set specular exponent.
     * @param {number} value – e.g. 16, 32, 64, 128
     */
    setShininess(value) {
        this.uniforms.uShininess.value = value;
    }

    /**
     * Set debug output mode.
     * 0 = combined, 1 = ambient, 2 = diffuse, 3 = specular
     * @param {number} mode
     */
    setViewMode(mode) {
        this.uniforms.uViewMode.value = mode;
    }
}
