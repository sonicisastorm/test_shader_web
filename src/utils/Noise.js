// =============================================================
//  src/utils/Noise.js
//  JavaScript-side noise helpers that mirror / complement the
//  GLSL functions in shaders/noise/.
//
//  Useful for:
//    • CPU-side heightmap generation / LOD pre-baking
//    • Collision mesh sampling
//    • Procedural object placement (trees, rocks) via height query
//    • Offline texture baking to a Float32Array / canvas
//
//  All functions return values in [-1, 1] unless noted.
// =============================================================

// ---- Internal helpers ------------------------------------------

/**
 * Fast 2-D hash — maps (ix, iy) integers to a float in [0, 1).
 * @param {number} ix
 * @param {number} iy 
 * @returns {number}
 */
function hash2(ix, iy) {
  let n = ix * 1619 + iy * 31337;
  n  = (n << 13) ^ n;
  return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
}

/** Quintic fade: 6t^5 - 15t^4 + 10t^3 */
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

/** Linear interpolate */
function lerp(a, b, t) { return a + (b - a) * t; }

// ---- 2-D Value noise -------------------------------------------
//  Simpler than Perlin; useful for large-scale height variation.

/**
 * @param {number} x
 * @param {number} y
 * @returns {number} [-1, 1]
 */
export function valueNoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,        fy = y - iy;
  const ux = fade(fx),      uy = fade(fy);

  const v00 = hash2(ix,     iy);
  const v10 = hash2(ix + 1, iy);
  const v01 = hash2(ix,     iy + 1);
  const v11 = hash2(ix + 1, iy + 1);

  return lerp(lerp(v00, v10, ux), lerp(v01, v11, ux), uy);
}

// ---- 2-D Gradient (Perlin-style) noise -------------------------

/** Gradient vectors for Perlin noise */
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0,  1], [ 0, -1],
];

function grad2dot(ix, iy, fx, fy) {
  const g = GRAD2[((ix * 1619 + iy * 31337) & 0xffff) % GRAD2.length];
  return g[0] * fx + g[1] * fy;
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {number} [-1, 1]  (approx)
 */
export function perlin2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,        fy = y - iy;
  const ux = fade(fx),      uy = fade(fy);

  const n00 = grad2dot(ix,     iy,     fx,     fy);
  const n10 = grad2dot(ix + 1, iy,     fx - 1, fy);
  const n01 = grad2dot(ix,     iy + 1, fx,     fy - 1);
  const n11 = grad2dot(ix + 1, iy + 1, fx - 1, fy - 1);

  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy);
}

// ---- fBm (fractal Brownian motion) -----------------------------

/**
 * @param {number} x
 * @param {number} y
 * @param {number} [octaves=6]
 * @param {number} [lacunarity=2.0]
 * @param {number} [gain=0.5]
 * @returns {number}  (normalised, ~[-1, 1])
 */
export function fbm2(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
  let value = 0, amplitude = 0.5, total = 0;
  let cx = x, cy = y;
  for (let i = 0; i < octaves; i++) {
    value     += amplitude * perlin2(cx, cy);
    total     += amplitude;
    cx        *= lacunarity;
    cy        *= lacunarity;
    amplitude *= gain;
  }
  return value / total;
}

// ---- Ridge / mountain noise ------------------------------------

/**
 * Produces sharp ridgelines by folding the noise (1 - |n|).
 * @param {number} x
 * @param {number} y
 * @param {number} [octaves=6]
 * @returns {number} [0, 1]
 */
export function ridgeFbm(x, y, octaves = 6) {
  let value = 0, amplitude = 0.5, weight = 1, total = 0;
  let cx = x, cy = y;
  for (let i = 0; i < octaves; i++) {
    let n  = 1 - Math.abs(perlin2(cx, cy));
    n     *= n * weight;
    weight = Math.min(Math.max(n, 0), 1);
    value += amplitude * n;
    total += amplitude;
    cx    *= 2; cy    *= 2;
    amplitude *= 0.5;
  }
  return value / total;
}

// ---- Domain-warped fBm -----------------------------------------

/**
 * Warps the sample position with two fBm offsets before sampling —
 * the source of the fluid, cloud-like look.
 * @param {number} x
 * @param {number} y
 * @param {number} [octaves=6]
 * @param {number} [warpStrength=1.0]
 * @returns {number}
 */
export function warpedFbm(x, y, octaves = 6, warpStrength = 1.0) {
  const qx = fbm2(x,           y,           octaves);
  const qy = fbm2(x + 5.2,     y + 1.3,     octaves);
  const rx = fbm2(x + 2*qx + 1.7, y + 2*qy + 9.2, octaves);
  const ry = fbm2(x + 2*qx + 8.3, y + 2*qy + 2.8, octaves);
  return fbm2(x + warpStrength * rx, y + warpStrength * ry, octaves);
}

// ---- HeightSampler class ---------------------------------------
//  Mirrors TerrainMaterial uniforms so JS-side queries match
//  what the vertex shader produces (within floating-point limits).

export class HeightSampler {
  /**
   * @param {object} [opts={}]
   * @param {number} [opts.amplitude=8]
   * @param {number} [opts.frequency=0.08]
   * @param {number} [opts.octaves=6]
   * @param {number} [opts.warpStrength=0.4]
   * @param {number} [opts.ridgeBlend=0.3]
   */
  constructor(opts = {}) {
    this.amplitude    = opts.amplitude    ?? 8;
    this.frequency    = opts.frequency    ?? 0.08;
    this.octaves      = opts.octaves      ?? 6;
    this.warpStrength = opts.warpStrength ?? 0.4;
    this.ridgeBlend   = opts.ridgeBlend   ?? 0.3;
  }

  /**
   * Returns the world-space Y displacement at (worldX, worldZ).
   * Equivalent to what the vertex shader computes for that position.
   * @param {number} worldX
   * @param {number} worldZ
   * @returns {number} world-space Y offset
   */
  sampleHeight(worldX, worldZ) {
    const px = worldX * this.frequency;
    const py = worldZ * this.frequency;

    // Domain warp
    const qx = fbm2(px,       py,       this.octaves) * this.warpStrength;
    const qy = fbm2(px + 5.2, py + 1.3, this.octaves) * this.warpStrength;

    const noiseH = fbm2(px + qx, py + qy, this.octaves);
    const rH     = ridgeFbm(px + qx, py + qy, this.octaves) * 2 - 1; // ridge is [0,1] -> [-1,1]
    const h      = lerp(noiseH, rH, this.ridgeBlend);

    return h * this.amplitude;
  }

  /**
   * Bakes a heightmap into a Float32Array (row-major, Y-up).
   * @param {number} width    — number of samples along X
   * @param {number} depth    — number of samples along Z
   * @param {number} worldW   — world width to span
   * @param {number} worldD   — world depth to span
   * @returns {Float32Array}  length = width * depth
   */
  bakeHeightmap(width, depth, worldW, worldD) {
    const data = new Float32Array(width * depth);
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const wx = (x / (width  - 1) - 0.5) * worldW;
        const wz = (z / (depth  - 1) - 0.5) * worldD;
        data[z * width + x] = this.sampleHeight(wx, wz);
      }
    }
    return data;
  }

  /**
   * Finds a flat-ish spawn position near a given world coordinate.
   * Returns null if no suitable spot is found within maxTries.
   * @param {number} nearX
   * @param {number} nearZ
   * @param {number} [radius=20]
   * @param {number} [maxSlope=0.5]   max height delta between adjacent samples
   * @param {number} [maxTries=64]
   * @returns {{ x: number, y: number, z: number } | null}
   */
  findFlatSpot(nearX, nearZ, radius = 20, maxSlope = 0.5, maxTries = 64) {
    const eps = 1.0;
    for (let i = 0; i < maxTries; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * radius;
      const cx    = nearX + Math.cos(angle) * dist;
      const cz    = nearZ + Math.sin(angle) * dist;

      const h  = this.sampleHeight(cx,       cz);
      const hL = this.sampleHeight(cx - eps, cz);
      const hR = this.sampleHeight(cx + eps, cz);
      const hU = this.sampleHeight(cx,       cz - eps);
      const hD = this.sampleHeight(cx,       cz + eps);

      const slope = Math.max(
        Math.abs(h - hL), Math.abs(h - hR),
        Math.abs(h - hU), Math.abs(h - hD),
      );

      if (slope < maxSlope) return { x: cx, y: h, z: cz };
    }
    return null;
  }
}