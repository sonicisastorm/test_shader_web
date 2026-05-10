import * as THREE from 'three';

/**
 * OrbitControls — fallback orbit camera (no pointer lock needed).
 *
 * Controls:
 *   Left-drag   — rotate orbit
 *   Right-drag  — pan target
 *   Scroll      — zoom
 *
 * Note: Do NOT run this simultaneously with CameraController.
 */
export class OrbitControls {
  constructor(camera, domElement, {
    target            = new THREE.Vector3(0, 0, 0),
    radius            = 12,
    minRadius         = 2,
    maxRadius         = 100,
    rotateSensitivity = 0.005,
    panSensitivity    = 0.01,
    zoomSensitivity   = 1.0,
  } = {}) {
    this.camera  = camera;
    this.domElement = domElement;
    this.target  = target.clone();
    this.enabled = true;

    this._radius  = radius;
    this._minR    = minRadius;
    this._maxR    = maxRadius;
    this._rotSens = rotateSensitivity;
    this._panSens = panSensitivity;
    this._zoomSens = zoomSensitivity;
    this._phi     = Math.PI / 4;
    this._theta   = 0;
    this._mouse   = { x: 0, y: 0 };
    this._buttons = { left: false, right: false };

    this._onMouseDown   = this._onMouseDown.bind(this);
    this._onMouseMove   = this._onMouseMove.bind(this);
    this._onMouseUp     = this._onMouseUp.bind(this);
    this._onWheel       = this._onWheel.bind(this);
    this._noContext     = (e) => e.preventDefault();

    domElement.addEventListener('mousedown',   this._onMouseDown);
    domElement.addEventListener('mousemove',   this._onMouseMove);
    domElement.addEventListener('mouseup',     this._onMouseUp);
    domElement.addEventListener('mouseleave',  this._onMouseUp);
    domElement.addEventListener('wheel',       this._onWheel, { passive: false });
    domElement.addEventListener('contextmenu', this._noContext);

    this._updateCamera();
  }

  _updateCamera() {
    const sp = Math.sin(this._phi), cp = Math.cos(this._phi);
    this.camera.position.set(
      this.target.x + this._radius * sp * Math.sin(this._theta),
      this.target.y + this._radius * cp,
      this.target.z + this._radius * sp * Math.cos(this._theta),
    );
    this.camera.lookAt(this.target);
  }

  _onMouseDown(e) {
    this._mouse.x = e.clientX; this._mouse.y = e.clientY;
    if (e.button === 0) this._buttons.left  = true;
    if (e.button === 2) this._buttons.right = true;
  }
  _onMouseMove(e) {
    if (!this.enabled) return;
    const dx = e.clientX - this._mouse.x, dy = e.clientY - this._mouse.y;
    this._mouse.x = e.clientX; this._mouse.y = e.clientY;
    if (this._buttons.left) {
      this._theta -= dx * this._rotSens;
      this._phi    = Math.max(0.05, Math.min(Math.PI - 0.05, this._phi + dy * this._rotSens));
      this._updateCamera();
    }
    if (this._buttons.right) {
      const px = new THREE.Vector3(), py = new THREE.Vector3();
      this.camera.getWorldDirection(py);
      px.crossVectors(py, this.camera.up).normalize();
      py.crossVectors(px, py).normalize();
      this.target.addScaledVector(px, -dx * this._panSens * (this._radius / 10));
      this.target.addScaledVector(py,  dy * this._panSens * (this._radius / 10));
      this._updateCamera();
    }
  }
  _onMouseUp(e) {
    if (e.button === 0) this._buttons.left  = false;
    if (e.button === 2) this._buttons.right = false;
  }
  _onWheel(e) {
    e.preventDefault();
    this._radius = Math.max(this._minR, Math.min(this._maxR,
      this._radius + e.deltaY * 0.01 * this._zoomSens));
    this._updateCamera();
  }

  update() {} // no-op, kept for API compatibility

  destroy() {
    this.domElement.removeEventListener('mousedown',   this._onMouseDown);
    this.domElement.removeEventListener('mousemove',   this._onMouseMove);
    this.domElement.removeEventListener('mouseup',     this._onMouseUp);
    this.domElement.removeEventListener('mouseleave',  this._onMouseUp);
    this.domElement.removeEventListener('wheel',       this._onWheel);
    this.domElement.removeEventListener('contextmenu', this._noContext);
  }
}
