import * as THREE from 'three';

const _HALF_PI = Math.PI / 2;

/**
 * CameraController — WASD + mouse-look with smooth damping.
 *
 * Controls:
 *   W/S         — forward / back
 *   A/D         — strafe left / right
 *   Q/E         — fly up / down
 *   Shift       — 3× speed sprint
 *   Mouse drag  — look (requires pointer lock — click canvas first)
 *
 * Call update(dt) every frame. 
 */
export class CameraController {
  constructor(camera, domElement, {
    moveSpeed       = 5,
    lookSensitivity = 0.002,
    damping         = 8,
  } = {}) {
    this.camera          = camera;
    this.domElement      = domElement;
    this.moveSpeed       = moveSpeed;
    this.lookSensitivity = lookSensitivity;
    this.damping         = damping;

    this._keys = {
      KeyW: false, KeyS: false, KeyA: false,
      KeyD: false, KeyQ: false, KeyE: false,
      ShiftLeft: false, ShiftRight: false,
    };

    this._euler    = new THREE.Euler(0, 0, 0, 'YXZ');
    this._velocity = new THREE.Vector3();
    this._dir      = new THREE.Vector3();
    this._pointerLocked = false;

    this._onKeyDown           = this._onKeyDown.bind(this);
    this._onKeyUp             = this._onKeyUp.bind(this);
    this._onMouseMove         = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    document.addEventListener('keydown',            this._onKeyDown);
    document.addEventListener('keyup',              this._onKeyUp);
    document.addEventListener('mousemove',          this._onMouseMove);
    document.addEventListener('pointerlockchange',  this._onPointerLockChange);
    domElement.addEventListener('click', () => domElement.requestPointerLock());
  }

  _onKeyDown(e) { if (e.code in this._keys) this._keys[e.code] = true;  }
  _onKeyUp(e)   { if (e.code in this._keys) this._keys[e.code] = false; }

  _onPointerLockChange() {
    this._pointerLocked = document.pointerLockElement === this.domElement;
  }

  _onMouseMove(e) {
    if (!this._pointerLocked) return;
    this._euler.setFromQuaternion(this.camera.quaternion);
    this._euler.y -= e.movementX * this.lookSensitivity;
    this._euler.x -= e.movementY * this.lookSensitivity;
    this._euler.x  = Math.max(-_HALF_PI + 0.01, Math.min(_HALF_PI - 0.01, this._euler.x));
    this.camera.quaternion.setFromEuler(this._euler);
  }

  update(dt) {
    const k   = this._keys;
    const spd = (k.ShiftLeft || k.ShiftRight) ? this.moveSpeed * 3 : this.moveSpeed;

    this._dir.set(
      (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0),
      (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0),
      (k.KeyS ? 1 : 0) - (k.KeyW ? 1 : 0),
    );
    if (this._dir.lengthSq() > 0) this._dir.normalize();

    const worldDir = this._dir.clone().applyQuaternion(this.camera.quaternion);
    this._velocity.lerp(worldDir.multiplyScalar(spd), Math.min(1, this.damping * dt));
    this.camera.position.addScaledVector(this._velocity, dt);
  }

  destroy() {
    document.removeEventListener('keydown',           this._onKeyDown);
    document.removeEventListener('keyup',             this._onKeyUp);
    document.removeEventListener('mousemove',         this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
