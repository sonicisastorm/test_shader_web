import * as THREE from 'three';

/**
 * Time — elapsed + delta time tracker.
 * Call tick() each frame; fires a 'tick' event.
 */
export class Time extends THREE.EventDispatcher {
  constructor() {
    super();
    this.start   = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta   = 0;
  }
  tick() {
    const now    = performance.now(); 
    this.delta   = (now - this.current) / 1000;
    this.elapsed = (now - this.start)   / 1000;
    this.current = now;
    this.dispatchEvent({ type: 'tick' });
  }
}
