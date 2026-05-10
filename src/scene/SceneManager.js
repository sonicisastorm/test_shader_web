import * as THREE from 'three';
import { Terrain } from './Terrain.js';
import Lights from './Lights.js';
import PhongMaterial from '../rendering/PhongMaterial.js';

export class SceneManager {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x1a1a2e);

    this._lights = new Lights();
    this._cameraProxy = { position: new THREE.Vector3() };
    this._mesh = null;
    this._phongMaterial = null;
    this._viewMode = 0;
    this._initPhongMaterial();
    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown); 

    this._terrain = null;
    this._initTerrain();
  }

  async _initPhongMaterial() {
    const phong = await PhongMaterial.create({
      shininess: 128.0,
      ...this._lights.getUniforms(),
    });
    this._phongMaterial = phong;
    this._phongMaterial.setViewMode(this._viewMode);

    // Optional debug object that also uses custom GLSL (no built-in materials).
    const geo = new THREE.BoxGeometry(5, 5, 5);
    this._mesh = new THREE.Mesh(geo, phong.getMaterial());
    this.instance.add(this._mesh);
  }

  _onKeyDown(e) {
    if (e.code === 'Digit1') this._viewMode = 1; // ambient
    else if (e.code === 'Digit2') this._viewMode = 2; // diffuse
    else if (e.code === 'Digit3') this._viewMode = 3; // specular
    else if (e.code === 'Digit4') this._viewMode = 0; // combined
    else return;

    if (this._phongMaterial) {
      this._phongMaterial.setViewMode(this._viewMode);
    }
  }

  async _initTerrain() {
    this._terrain = new Terrain(this.instance, { /* ...options */ });
    await this._terrain.terrainMaterial.whenReady();

    if (this._camera) {
      this._terrain.terrainMaterial.setCameraPosition(this._camera);
    }

    this._terrain.setPosition(0, -8, 0);
  }

  update(elapsed, camPos) {
    if (this._mesh) {
      this._mesh.rotation.y = elapsed * 0.5;
      this._mesh.rotation.x = elapsed * 0.2;
    }

    if (camPos) {
      this._cameraProxy.position.copy(camPos);
      this._camera = this._cameraProxy;
    }

    if (this._phongMaterial) {
      this._phongMaterial.update(elapsed, this._cameraProxy, this._lights.getUniforms());
    }

    if (this._terrain) {
      this._terrain.update(elapsed);
      if (camPos) {
        this._terrain.terrainMaterial.setCameraPosition({ position: camPos });
      }
    }
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
