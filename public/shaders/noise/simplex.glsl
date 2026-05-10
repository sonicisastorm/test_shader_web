// =============================================================
//  shaders/noise/simplex.glsl
//  Simplex noise (2D & 3D) + fractal Brownian motion helpers.
//  Simplex implementation by Ashima Arts / Stefan Gustavson.
//
//  Public API
//  ----------
//  float simplex2(vec2 v)              -> [-1, 1] 
//  float simplex3(vec3 v)              -> [-1, 1]
//  float fbm2(vec2 p, int octaves)     -> [~-1, 1]  (normalised)
//  float fbm3(vec3 p, int octaves)     -> [~-1, 1]
//  float ridgeFbm(vec2 p, int octaves) -> [0, 1]    (ridge / mountain)
//  vec2  fbmWarp(vec2 p, int octaves)  -> domain-warped fbm pair
// =============================================================

// ---- shared permutation helpers --------------------------------

vec3 _s_mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 _s_mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 _s_mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 _s_permv3(vec3 x)   { return _s_mod289v3(((x * 34.0) + 1.0) * x); }
vec4 _s_permv4(vec4 x)   { return _s_mod289v4(((x * 34.0) + 1.0) * x); }

// ---- 2-D simplex -----------------------------------------------

float simplex2(vec2 v) {
    const vec4 C = vec4(0.211324865405187,   // (3 - sqrt(3)) / 6
                        0.366025403784439,   // (sqrt(3) - 1) / 2
                       -0.577350269189626,   // -1 + 2*(3-sqrt(3))/6
                        0.024390243902439);  // 1/41

    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = _s_mod289v2(i);
    vec3 p = _s_permv3(_s_permv3(i.y + vec3(0.0, i1.y, 1.0))
                                + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                             dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;

    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

    vec3 g;
    g.x  = a0.x  * x0.x   + h.x  * x0.y;
    g.yz = a0.yz * x12.xz  + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// ---- 3-D simplex -----------------------------------------------

float simplex3(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g0 = step(x0.yzx, x0.xyz);
    vec3 l0 = 1.0 - g0;
    vec3 i1 = min(g0.xyz, l0.zxy);
    vec3 i2 = max(g0.xyz, l0.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = _s_mod289v3(i);
    vec4 p = _s_permv4(
               _s_permv4(
                 _s_permv4(i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x4 = x_ * ns.x + ns.yyyy;
    vec4 y4 = y_ * ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(x4) - abs(y4);

    vec4 b0 = vec4(x4.xy, y4.xy);
    vec4 b1 = vec4(x4.zw, y4.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0v = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1v = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0v.xy, h.x);
    vec3 p1 = vec3(a0v.zw, h.y);
    vec3 p2 = vec3(a1v.xy, h.z);
    vec3 p3 = vec3(a1v.zw, h.w);

    vec4 norm = 1.79284291400159 - 0.85373472095314 *
        vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1),
                             dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1),
                                 dot(p2,x2), dot(p3,x3)));
}

// ---- fBm wrappers -----------------------------------------------
//  Lacunarity = 2.0, gain = 0.5 (standard octave doubling).
//  octaves capped at 8 to keep GLSL loop constant-bound friendly.

float fbm2(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float total = 0.0;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value     += amplitude * simplex2(p);
        total     += amplitude;
        p          = rot * p * 2.0 + vec2(100.3, 43.7);
        amplitude *= 0.5;
    }
    return value / total;   // normalised to ~[-1, 1]
}

float fbm3(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value     += amplitude * simplex3(p);
        total     += amplitude;
        p          = p * 2.01 + vec3(100.3, 43.7, 71.2);
        amplitude *= 0.5;
    }
    return value / total;
}

// ---- Ridge / mountain fBm --------------------------------------
//  Produces sharp ridgelines by folding the noise: 1 - |n|.

float ridgeFbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float weight = 1.0;
    float total = 0.0;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float n    = 1.0 - abs(simplex2(p));
        n         *= n * weight;          // weight emphasises ridges
        weight     = clamp(n, 0.0, 1.0);
        value     += amplitude * n;
        total     += amplitude;
        p          = rot * p * 2.0 + vec2(55.1, 83.4);
        amplitude *= 0.5;
    }
    return value / total;   // [0, 1]
}

// ---- Domain-warped fBm pair ------------------------------------
//  Returns vec2(q.x, q.y) — warp q into fbm2 for fluid look.
//  Usage: float h = fbm2(p + u_amp * fbmWarp(p, oct), oct);

vec2 fbmWarp(vec2 p, int octaves) {
    return vec2(
        fbm2(p + vec2(0.0,  0.0),  octaves),
        fbm2(p + vec2(5.2,  1.3),  octaves)
    );
}
