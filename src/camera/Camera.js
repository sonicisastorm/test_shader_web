import * as THREE from 'three';

/**
 * Camera — PerspectiveCamera wrapper.
 * Owns the THREE.PerspectiveCamera and handles resize automatically.
 *
 * Teammates: access the raw camera via camera.instance
 */
export class Camera {
  constructor({ fov = 60, near = 0.1, far = 1000, position } = {}) {
    const aspect    = window.innerWidth / window.innerHeight;
    this.instance   = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.instance.position.copy(position ?? new THREE.Vector3(0, 4, 12));
    this.instance.lookAt(0, 0, 0);
    this._onResize  = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }
  _onResize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
  destroy() { window.removeEventListener('resize', this._onResize); }
}
