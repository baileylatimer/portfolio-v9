precision highp float;

uniform sampler2D uTexture;
uniform float uAspect;
uniform float uImgAspect;
uniform float uOpacity;
uniform float uCurlAmount;
uniform float uBorderWidth;  // in UV space
uniform vec3 uBorderColor;
uniform vec3 uPaperColor;

// Position and size of the reveal square in canvas UV space
uniform vec2 uRevealPos;   // center of square (canvas UV)
uniform vec2 uRevealSize;  // width/height of square (canvas UV)

varying vec2 vUv;
varying float vCurlFactor;
varying float vIsBack;

// ─── Cover UV ─────────────────────────────────────────────────────────────────
vec2 coverUV(vec2 uv, float canvasAspect, float imgAspect) {
  vec2 scale;
  if (canvasAspect > imgAspect) {
    scale = vec2(canvasAspect / imgAspect, 1.0);
  } else {
    scale = vec2(1.0, imgAspect / canvasAspect);
  }
  return (uv - 0.5) * scale + 0.5;
}

// ─── Noise ────────────────────────────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // vUv is 0-1 within the reveal quad itself
  // We need to map it to the canvas UV space to sample the portrait correctly

  // Canvas UV of this fragment = quad position + local UV offset
  vec2 quadMin = uRevealPos - uRevealSize * 0.5;
  vec2 canvasUV = quadMin + vUv * uRevealSize;

  // Map canvas UV to image UV (same cover logic as grid shader)
  vec2 imgUV = coverUV(canvasUV, uAspect, uImgAspect);
  imgUV = clamp(imgUV, 0.0, 1.0);

  // Sample the clean portrait
  vec4 portrait = texture2D(uTexture, imgUV);

  // ─── Border ───────────────────────────────────────────────────────────────
  float bw = uBorderWidth;
  float inBorder = 0.0;
  if (vUv.x < bw || vUv.x > 1.0 - bw || vUv.y < bw || vUv.y > 1.0 - bw) {
    inBorder = 1.0;
  }

  // ─── Paper texture (procedural) ───────────────────────────────────────────
  float paperNoise = hash(vUv * 200.0) * 0.04 - 0.02;
  vec3 paperColor = uPaperColor + paperNoise;

  // ─── Curl: blend portrait → paper as curl increases ───────────────────────
  // Front face: portrait → paper blend
  vec3 frontColor = mix(portrait.rgb, paperColor, vCurlFactor * 0.8);
  // Back face: pure paper with slight shadow
  float backShadow = 1.0 - vCurlFactor * 0.3;
  vec3 backColor = paperColor * backShadow;

  // Choose front or back based on curl factor
  vec3 color = mix(frontColor, backColor, vIsBack);

  // Apply border (always white, even when curled)
  color = mix(color, uBorderColor, inBorder * (1.0 - vCurlFactor * 0.5));

  // ─── Shadow under curl ────────────────────────────────────────────────────
  // Darken the portrait near the curl corner
  float cornerDist = length(vUv - vec2(1.0, 1.0));  // TR corner
  float shadowMask = smoothstep(0.6, 0.0, cornerDist) * vCurlFactor * 0.4;
  color = mix(color, color * 0.5, shadowMask);

  gl_FragColor = vec4(color, uOpacity);
}
