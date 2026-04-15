/**
 * LookingGlass.tsx — Privacy glass / reeded glass effect.
 *
 * Each tile acts as a small convex lens:
 *  - Refracts (offsets) the UV sample so adjacent tiles show slightly different
 *    parts of the image → realistic distortion, not flat mosaic
 *  - Specular highlight follows the cursor (cursor = light source behind glass)
 *  - No hard grout lines — only a subtle Fresnel edge darkening
 *  - Cursor reveal window shows the portrait clearly with crop-style border
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GRID_CONFIG, REVEAL_CONFIG } from './config';

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uAspect;
uniform float uImgAspect;
uniform float uFadeIn;

uniform vec2  uGridSize;
uniform float uEdgeWidth;    // thin seam width (fraction of cell)

uniform vec2  uCursor;
uniform vec2  uRevealSize;
uniform float uBorderThin;
uniform float uBorderThick;
uniform float uHandleLen;
uniform vec3  uBorderColor;

// ─── Cover UV ────────────────────────────────────────────────────────────────
vec2 coverUV(vec2 uv, float ca, float ia) {
  vec2 s = ca > ia ? vec2(ca / ia, 1.0) : vec2(1.0, ia / ca);
  return (uv - 0.5) * s + 0.5;
}

// ─── Variable-width border ────────────────────────────────────────────────────
bool isOnBorder(vec2 uv, vec2 bMin, vec2 bMax) {
  vec2 center = (bMin + bMax) * 0.5;
  float dL = bMin.x - uv.x, dR = uv.x - bMax.x;
  float dB = bMin.y - uv.y, dT = uv.y - bMax.y;

  bool nL = dL > -uBorderThick && dL <= 0.0;
  bool nR = dR > -uBorderThick && dR <= 0.0;
  bool nB = dB > -uBorderThick && dB <= 0.0;
  bool nT = dT > -uBorderThick && dT <= 0.0;

  float px = uv.x, py = uv.y;
  bool hX = px < bMin.x + uHandleLen || px > bMax.x - uHandleLen || abs(px - center.x) < uHandleLen;
  bool hY = py < bMin.y + uHandleLen || py > bMax.y - uHandleLen || abs(py - center.y) < uHandleLen;

  bool tL = dL > -uBorderThin && dL <= 0.0 && uv.y >= bMin.y && uv.y <= bMax.y;
  bool tR = dR > -uBorderThin && dR <= 0.0 && uv.y >= bMin.y && uv.y <= bMax.y;
  bool tB = dB > -uBorderThin && dB <= 0.0 && uv.x >= bMin.x && uv.x <= bMax.x;
  bool tT = dT > -uBorderThin && dT <= 0.0 && uv.x >= bMin.x && uv.x <= bMax.x;

  bool kL = nL && hY && uv.y >= bMin.y && uv.y <= bMax.y;
  bool kR = nR && hY && uv.y >= bMin.y && uv.y <= bMax.y;
  bool kB = nB && hX && uv.x >= bMin.x && uv.x <= bMax.x;
  bool kT = nT && hX && uv.x >= bMin.x && uv.x <= bMax.x;

  return tL || tR || tB || tT || kL || kR || kB || kT;
}

void main() {
  vec2 uv = vUv;

  // ── Reveal box ────────────────────────────────────────────────────────────
  vec2 bMin = uCursor - uRevealSize;
  vec2 bMax = uCursor + uRevealSize;
  vec2 dd   = max(bMin - uv, uv - bMax);
  bool insideBox = max(dd.x, dd.y) < 0.0;
  bool onBorder  = isOnBorder(uv, bMin, bMax);

  vec3 color;

  if (onBorder) {
    color = uBorderColor;

  } else if (insideBox) {
    // ── Clear window ────────────────────────────────────────────────────────
    vec2 imgUV = clamp(coverUV(uv, uAspect, uImgAspect), 0.0, 1.0);
    color = texture2D(uTexture, imgUV).rgb;

  } else {
    // ── Privacy glass tile ──────────────────────────────────────────────────
    vec2 cellCoord = uv * uGridSize;
    vec2 cellIdx   = floor(cellCoord);
    vec2 localUV   = fract(cellCoord);          // 0-1 within cell
    vec2 cellUV    = (cellIdx + 0.5) / uGridSize; // cell center in canvas UV

    // ── Convex lens normal — vertical reed profile ────────────────────────
    // Stronger X curvature, weaker Y → light spreads as vertical bars
    // (matches real reeded / privacy glass orientation)
    vec2 lc = localUV * 2.0 - 1.0;             // -1..1 within cell
    float nx = lc.x * 0.70;   // strong horizontal curvature → vertical light
    float ny = lc.y * 0.28;   // weak vertical curvature → less circular
    float nz = sqrt(max(0.001, 1.0 - nx*nx - ny*ny));
    vec3 normal = normalize(vec3(nx, ny, nz));

    // ── Cursor-following light (distant source) ───────────────────────────
    vec2 toLight2D = uCursor - cellUV;
    toLight2D.x *= uAspect / max(uImgAspect, 0.001);
    float dist    = length(toLight2D) + 0.001;
    // Z=1.2 pushes the light source further behind the glass → broader, softer
    vec3 lightDir = normalize(vec3(toLight2D / dist, 1.2));
    float atten   = 1.0 / (1.0 + dist * dist * 6.0);

    // ── Global brightness falloff from cursor ─────────────────────────────
    // Tiles near the reveal box are bright; tiles far away fade to dark.
    // Uses a wider, smoother falloff than the specular attenuation.
    float globalAtten = 1.0 / (1.0 + dist * dist * 2.5);
    float brightness  = mix(0.45, 1.0, globalAtten); // 0.45 = dark far edge

    // ── Multi-sample frosted blur ─────────────────────────────────────────
    // Each tile averages several UV samples spread across its lens footprint.
    // This creates the "blurry color blob" look of real privacy glass.
    // Blur radius scales with distance from cursor: far tiles are blurrier.
    float blurRadius = mix(0.40, 0.75, 1.0 - atten); // heavier blur
    vec2 cellSize = 1.0 / uGridSize;

    // 9-tap rotated grid (good quality, avoids axis-aligned artifacts)
    vec3 portrait = vec3(0.0);
    float totalW  = 0.0;
    // Offsets in local UV space (-1..1), rotated 22.5° to avoid grid aliasing
    vec2 taps[9];
    taps[0] = vec2( 0.000,  0.000);
    taps[1] = vec2( 0.924,  0.383);
    taps[2] = vec2(-0.383,  0.924);
    taps[3] = vec2(-0.924, -0.383);
    taps[4] = vec2( 0.383, -0.924);
    taps[5] = vec2( 0.707,  0.707);
    taps[6] = vec2(-0.707,  0.707);
    taps[7] = vec2(-0.707, -0.707);
    taps[8] = vec2( 0.707, -0.707);

    for (int i = 0; i < 9; i++) {
      // Refraction: each tap is offset by the lens normal + blur spread
      vec2 tapOffset = (taps[i] * blurRadius + vec2(normal.x, normal.y) * 0.35) * cellSize;
      vec2 sUV = clamp(coverUV(cellUV + tapOffset, uAspect, uImgAspect), 0.0, 1.0);
      float w = 1.0 - length(taps[i]) * 0.15; // center tap weighted slightly more
      portrait += texture2D(uTexture, sUV).rgb * w;
      totalW   += w;
    }
    portrait /= totalW;

    // ── Lighting ──────────────────────────────────────────────────────────
    float diffuse = max(0.0, dot(normal, lightDir));

    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // ── Fresnel edge darkening ────────────────────────────────────────────
    float edgeFresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);

    // ── Thin seam shadow ──────────────────────────────────────────────────
    float ex = smoothstep(0.0, uEdgeWidth, localUV.x) *
               (1.0 - smoothstep(1.0 - uEdgeWidth, 1.0, localUV.x));
    float ey = smoothstep(0.0, uEdgeWidth, localUV.y) *
               (1.0 - smoothstep(1.0 - uEdgeWidth, 1.0, localUV.y));
    float seam = ex * ey;

    // ── Combine ───────────────────────────────────────────────────────────
    vec3 glassTint = vec3(0.97, 0.99, 1.03);
    color = portrait * glassTint;
    // Diffuse shading (softer — light is further away)
    color = color * (0.60 + 0.40 * diffuse);
    // Specular: softer exponent range, lower intensity
    float specExp = mix(8.0, 32.0, atten);
    float spec2   = pow(max(0.0, dot(normalize(lightDir + vec3(0.0,0.0,1.0)), normal)), specExp);
    color += spec2 * atten * 0.35 * vec3(1.0, 1.0, 1.02);
    // Fresnel edge darkening
    color *= 1.0 - edgeFresnel * 0.25;
    // Seam shadow
    color *= mix(0.82, 1.0, seam);
    // Global brightness falloff: bright near cursor, dark at edges
    color *= brightness;
  }

  // ── Fade in ───────────────────────────────────────────────────────────────
  color = mix(vec3(0.82, 0.79, 0.74), color, uFadeIn);
  gl_FragColor = vec4(color, 1.0);
}
`;

interface LookingGlassProps {
  imageSrc: string;
}

export default function LookingGlass({ imageSrc }: LookingGlassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas    = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xd1cbc0, 1);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    let imgAspect = 3 / 4;
    const texture = new THREE.TextureLoader().load(imageSrc, (tex) => {
      imgAspect = tex.image.width / tex.image.height;
      uniforms.uImgAspect.value = imgAspect;
    });
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const THIN_PX       = 1;
    const THICK_PX      = 4;
    const HANDLE_LEN_PX = 20;

    const uniforms = {
      uTexture:     { value: texture },
      uAspect:      { value: 1.0 },
      uImgAspect:   { value: imgAspect },
      uFadeIn:      { value: 0.0 },
      uGridSize:    { value: new THREE.Vector2(GRID_CONFIG.cellsX, GRID_CONFIG.cellsY) },
      uEdgeWidth:   { value: 0.04 },   // very thin seam (4% of cell width)
      uCursor:      { value: new THREE.Vector2(-2, -2) },
      uRevealSize:  { value: new THREE.Vector2(REVEAL_CONFIG.halfW, REVEAL_CONFIG.halfW) },
      uBorderThin:  { value: THIN_PX / 1000 },
      uBorderThick: { value: THICK_PX / 1000 },
      uHandleLen:   { value: HANDLE_LEN_PX / 1000 },
      uBorderColor: { value: new THREE.Color(...(REVEAL_CONFIG.borderColor as [number, number, number])) },
    };

    const geo  = new THREE.PlaneGeometry(1, 1);
    const mat  = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    scene.add(new THREE.Mesh(geo, mat));

    const updateSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      const aspect = w / h;
      uniforms.uAspect.value = aspect;
      uniforms.uRevealSize.value.set(REVEAL_CONFIG.halfW, REVEAL_CONFIG.halfW * aspect);
      // tileAspect > 1 = tiles are taller than wide (portrait/reeded glass look)
      uniforms.uGridSize.value.set(
        GRID_CONFIG.cellsX,
        Math.round(GRID_CONFIG.cellsX * aspect * GRID_CONFIG.tileAspect)
      );
      const minDim = Math.min(w, h);
      uniforms.uBorderThin.value  = THIN_PX  / minDim;
      uniforms.uBorderThick.value = THICK_PX / minDim;
      uniforms.uHandleLen.value   = HANDLE_LEN_PX / minDim;
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      uniforms.uCursor.value.set(
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height
      );
    };
    const onMouseLeave = () => uniforms.uCursor.value.set(-2, -2);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    let animId: number;
    let alive = true;
    const FADE_SPEED = 0.018;
    const render = () => {
      if (!alive) return;
      animId = requestAnimationFrame(render);
      if (uniforms.uFadeIn.value < 1.0) {
        uniforms.uFadeIn.value = Math.min(1.0, uniforms.uFadeIn.value + FADE_SPEED);
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      alive = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [imageSrc]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, cursor: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
