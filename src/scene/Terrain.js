// =============================================================
//  src/scene/Terrain.js
//  Sets up the Three.js PlaneGeometry terrain mesh and owns
//  its lifecycle (create, update, dispose).
//
//  Usage
//  -----
//  import { Terrain } from './scene/Terrain.js';
//
//  const terrain = new Terrain(scene, {
//    width: 100, depth: 100,
//    widthSegments: 256, depthSegments: 256,
//    materialOptions: { amplitude: 8, octaves: 6 }
//  });
//
//  // Inside your render loop:
//  terrain.update(clock.getElapsedTime());
// ============================================================= 

import * as THREE from 'three';
import { TerrainMaterial } from '../rendering/TerrainMaterial.js';

/** @typedef {import('../rendering/TerrainMaterial.js').TerrainMaterialOptions} TerrainMaterialOptions */

/**
 * @typedef {Object} TerrainOptions
 * @property {number} [width=100]            World-space width (X axis)
 * @property {number} [depth=100]            World-space depth (Z axis)
 * @property {number} [widthSegments=256]    Vertex resolution along X — higher = smoother displacement
 * @property {number} [depthSegments=256]    Vertex resolution along Z
 * @property {TerrainMaterialOptions} [materialOptions={}]
 */

export class Terrain {
  /**
   * @param {THREE.Scene} scene
   * @param {TerrainOptions} [options={}]
   */
  constructor(scene, options = {}) {
    const {
      width          = 100,
      depth          = 100,
      widthSegments  = 256,
      depthSegments  = 256,
      materialOptions = {},
    } = options;

    this._scene = scene;

    // ---- Geometry ------------------------------------------------
    //  PlaneGeometry is horizontal (XZ) by default — rotate to lie flat.
    this.geometry = new THREE.PlaneGeometry(
      width,
      depth,
      widthSegments,
      depthSegments,
    );
    // Rotate so Y is up (Three.js default plane faces +Z)
    this.geometry.rotateX(-Math.PI / 2);

    // ---- Material ------------------------------------------------
    this.material = new TerrainMaterial(materialOptions);

    // Use a temporary invisible material so the mesh is never null
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ visible: false }));
    this.mesh.name = 'terrain';
    scene.add(this.mesh);

    // Swap in the real shader once it's compiled
    this.material.whenReady().then(() => {
      this.mesh.material = this.material.shaderMaterial;
    });
    // ---- Bounding / helpers -------------------------------------
    //  Expand the bounding sphere to account for maximum displacement
    //  so frustum culling never clips the terrain incorrectly.
    const maxDisp = materialOptions.amplitude ?? 8;
    this.geometry.computeBoundingSphere();
    if (this.geometry.boundingSphere) {
      this.geometry.boundingSphere.radius += maxDisp;
    }
  }

  // ---- Public API -----------------------------------------------

  /**
   * Call every frame inside your animation loop.
   * @param {number} elapsedSeconds - clock.getElapsedTime()
   */
  update(elapsedSeconds) {
    this.material.update(elapsedSeconds);
  }

  /**
   * Move the terrain mesh in world space.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  /**
   * Dynamically change resolution by rebuilding geometry.
   * Expensive — avoid calling per-frame.
   * @param {number} widthSegments
   * @param {number} depthSegments
   */
  setResolution(widthSegments, depthSegments) {
    const params = this.geometry.parameters;
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(
      params.width,
      params.height,
      widthSegments,
      depthSegments,
    );
    this.geometry.rotateX(-Math.PI / 2);
    this.mesh.geometry = this.geometry;
  }

  /**
   * Expose TerrainMaterial so callers can tweak uniforms directly.
   * @returns {TerrainMaterial}
   */
  get terrainMaterial() {
    return this.material;
  }

  /** Clean up GPU resources. */
  dispose() {
    this._scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}