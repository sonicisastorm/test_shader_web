// ============================================================
// src/rendering/ShaderMaterial.js
// Base class for all custom shader materials — Person B (Nazrin)
//
// Wraps THREE.ShaderMaterial and provides:
//   - A consistent way to define vertex/fragment shaders + uniforms
//   - A per-frame update() hook for time, camera, resolution
//   - getMaterial() to hand the Three.js material to a Mesh
//
// Both PhongMaterial (B) and TerrainMaterial (A) can extend this.
// ============================================================

import * as THREE from 'three';

export default class ShaderMaterial {
    /**
     * @param {object} options
     * @param {string} options.vertexShader   – GLSL vertex source string
     * @param {string} options.fragmentShader – GLSL fragment source string
     * @param {object} [options.uniforms={}]  – Three.js uniform map
     * @param {boolean} [options.wireframe=false]
     * @param {number}  [options.side=THREE.FrontSide]
     * @param {boolean} [options.transparent=false]
     */
    constructor({
        vertexShader,
        fragmentShader,
        uniforms = {},
        wireframe = false,
        side = THREE.FrontSide,
        transparent = false,
    }) {
        // Merge caller-provided uniforms with the base set that
        // every shader in this project expects (Day-1 contract).
        this.uniforms = {
            uTime:         { value: 0.0 },
            uResolution:   { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uLightPos:     { value: new THREE.Vector3(50.0, 80.0, 50.0) },
            uLightColor:   { value: new THREE.Vector3(1.0, 0.95, 0.8) },
            uAmbientColor: { value: new THREE.Vector3(0.15, 0.15, 0.25) },
            uCameraPos:    { value: new THREE.Vector3(0, 0, 0) },
            uShininess:    { value: 128.0 },
            uViewMode:     { value: 0 },
            ...uniforms,   // caller overrides win
        };

        // Create the underlying Three.js material.
        // Using ShaderMaterial (not RawShaderMaterial) so Three.js
        // auto-injects built-in attributes and uniforms.
        this._material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: this.uniforms,
            wireframe,
            side,
            transparent,
        });
    }

    /**
     * Per-frame update. Call this every frame from the render loop.
     * Pushes current time and camera position into the uniforms.
     *
     * @param {number} elapsedTime – seconds since app start
     * @param {THREE.Camera} camera – current active camera
     */
    update(elapsedTime, camera) {
        this.uniforms.uTime.value = elapsedTime;

        if (camera) {
            this.uniforms.uCameraPos.value.copy(camera.position);
        }

        // Keep resolution current (in case of window resize)
        this.uniforms.uResolution.value.set(
            window.innerWidth,
            window.innerHeight
        );
    }

    /**
     * Set the light position uniform.
     * @param {THREE.Vector3} position
     */
    setLightPosition(position) {
        this.uniforms.uLightPos.value.copy(position);
    }

    /**
     * Set the light color uniform.
     * @param {THREE.Vector3} color – RGB, each component 0–1
     */
    setLightColor(color) {
        this.uniforms.uLightColor.value.copy(color);
    }

    /**
     * Set the ambient color uniform.
     * @param {THREE.Vector3} color – RGB, each component 0–1
     */
    setAmbientColor(color) {
        this.uniforms.uAmbientColor.value.copy(color);
    }

    /**
     * Returns the underlying THREE.ShaderMaterial so you can
     * assign it to a Mesh:  mesh.material = myMat.getMaterial();
     *
     * @returns {THREE.ShaderMaterial}
     */
    getMaterial() {
        return this._material;
    }

    /**
     * Clean up GPU resources.
     */
    dispose() {
        this._material.dispose();
    }
}
