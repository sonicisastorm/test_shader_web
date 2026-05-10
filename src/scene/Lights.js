// ============================================================
// src/scene/Lights.js
// Directional + ambient light setup — Person B (Nazrin)
//
// Manages the scene's light sources and provides a uniform
// data object that PhongMaterial (and any other shader material)
// can consume each frame via getUniforms().
//
// This class works alongside Three.js built-in lights that
// Teammate C added in SceneManager — those light the
// MeshStandardMaterial placeholder cube, while this class
// feeds data to our custom GLSL shaders.
// ============================================================

import * as THREE from 'three';

export default class Lights {
    /**
     * @param {object} [options]
     * @param {THREE.Vector3} [options.lightPos]     – world-space light position
     * @param {THREE.Vector3} [options.lightColor]   – directional light RGB (0–1)
     * @param {THREE.Vector3} [options.ambientColor] – ambient light RGB (0–1)
     */
    constructor(options = {}) {
        // Directional light source position (world space).
        // Default: warm sunlight from upper-right.
        this.lightPos = options.lightPos
            ? options.lightPos.clone()
            : new THREE.Vector3(50.0, 80.0, 50.0);

        // Directional light color — warm white by default.
        this.lightColor = options.lightColor
            ? options.lightColor.clone()
            : new THREE.Vector3(1.0, 0.95, 0.8);

        // Ambient light color — subtle cool tint.
        this.ambientColor = options.ambientColor
            ? options.ambientColor.clone()
            : new THREE.Vector3(0.15, 0.15, 0.25);
    }

    /**
     * Returns a plain object of current light values that can be
     * passed directly to PhongMaterial.update() or spread into
     * any uniform map.
     *
     * @returns {{ uLightPos: THREE.Vector3, uLightColor: THREE.Vector3, uAmbientColor: THREE.Vector3 }}
     */
    getUniforms() {
        return {
            uLightPos:     this.lightPos,
            uLightColor:   this.lightColor,
            uAmbientColor: this.ambientColor,
        };
    }

    /**
     * Animate the light position (e.g. orbiting sun).
     * Call this per-frame if you want the light to move.
     *
     * @param {number} elapsedTime – seconds since app start
     * @param {number} [radius=80] – orbit radius
     * @param {number} [speed=0.1] – orbit speed (radians/sec)
     * @param {number} [height=60] – light Y position
     */
    orbit(elapsedTime, radius = 80, speed = 0.1, height = 60) {
        const angle = elapsedTime * speed;
        this.lightPos.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
    }

    /**
     * Set the directional light position.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.lightPos.set(x, y, z);
    }

    /**
     * Set the directional light color.
     * @param {number} r – 0–1
     * @param {number} g – 0–1
     * @param {number} b – 0–1
     */
    setLightColor(r, g, b) {
        this.lightColor.set(r, g, b);
    }

    /**
     * Set the ambient light color.
     * @param {number} r – 0–1
     * @param {number} g – 0–1
     * @param {number} b – 0–1
     */
    setAmbientColor(r, g, b) {
        this.ambientColor.set(r, g, b);
    }
}
