import { App } from './App.js';

const canvas = document.getElementById('shader-canvas');
if (canvas) {
  try {
    window.__app = new App(canvas);
    window.__app.post.bloomPass.threshold = 0.4;
    window.__app.post.bloomPass.intensity  = 1.6;
    console.log('[ShaderKit] App started OK');
  } catch (e) {
    console.error('[ShaderKit] Failed to start:', e);
  }
} 