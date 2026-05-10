import { App } from 'shader-kit';

const canvas = document.querySelector('#c');
const app = new App(canvas);

// Tune bloom from outside the library
app.post.bloomPass.threshold = 0.5;
app.post.bloomPass.intensity  = 2.0;