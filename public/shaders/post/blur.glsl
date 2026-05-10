// Two-pass Gaussian blur — reference GLSL.
// The actual implementation lives in BlurPass.js as an inline string
// so it works without vite-plugin-glsl.
uniform sampler2D uTexture;
uniform vec2      uResolution;
uniform bool      uHorizontal;
uniform float     uStrength;
void main() {
  vec2 uv  = gl_FragCoord.xy / uResolution;
  vec2 off = uStrength / uResolution;
  vec2 dir = uHorizontal ? vec2(off.x, 0.0) : vec2(0.0, off.y); 
  float w[5]; w[0]=0.2270270; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.0540540; w[4]=0.0162162;
  vec3 col = texture2D(uTexture, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    col += texture2D(uTexture, uv + dir * float(i)).rgb * w[i];
    col += texture2D(uTexture, uv - dir * float(i)).rgb * w[i];
  }
  gl_FragColor = vec4(col, 1.0);
}
