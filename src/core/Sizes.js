import * as THREE from 'three';

/**
 * Sizes — reactive viewport dimensions.
 * Dispatches a 'resize' event whenever the window resizes.
 */
export class Sizes extends THREE.EventDispatcher {
  constructor() {
    super();
    this.width      = window.innerWidth;
    this.height     = window.innerHeight;
    this.pixelRatio = 1;
    this._onResize  = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }
  _onResize() {
    this.width      = window.innerWidth;
    this.height     = window.innerHeight;
    this.pixelRatio = 1;
    this.dispatchEvent({ type: 'resize' });
  }
  destroy() { window.removeEventListener('resize', this._onResize); }
}
