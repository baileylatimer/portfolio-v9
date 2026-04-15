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
    vec2 lc = localUV * 2.0 - 1.0;
    float nx = lc.x * 0.70;
    float ny = lc.y * 0.28;
    float nz = sqrt(max(0.001, 1.0 - nx*nx - ny*ny));
    vec3 normal = normalize(vec3(nx, ny, nz));

    // ── Cursor-following light ────────────────────────────────────────────
    vec2 toLight2D = uCursor - cellUV;
    toLight2D.x *= uAspect / max(uImgAspect, 0.001);
    float dist    = length(toLight2D) + 0.001;
    vec3 lightDir = normalize(vec3(toLight2D / dist, 1.2));
    float atten   = 1.0 / (1.0 + dist * dist * 6.0);

    // ── Global brightness falloff ─────────────────────────────────────────
    float globalAtten = 1.0 / (1.0 + dist * dist * 2.5);
    float brightness  = mix(0.45, 1.0, globalAtten);

    // ── Multi-sample frosted blur ─────────────────────────────────────────
    float blurRadius = mix(0.40, 0.75, 1.0 - atten);
    vec2 cellSize = 1.0 / uGridSize;

    vec3 portrait = vec3(0.0);
    float totalW  = 0.0;
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
      vec2 tapOffset = (taps[i] * blurRadius + vec2(normal.x, normal.y) * 0.35) * cellSize;
      vec2 sUV = clamp(coverUV(cellUV + tapOffset, uAspect, uImgAspect), 0.0, 1.0);
      float w = 1.0 - length(taps[i]) * 0.15;
      portrait += texture2D(uTexture, sUV).rgb * w;
      totalW   += w;
    }
    portrait /= totalW;

    // ── Lighting ──────────────────────────────────────────────────────────
    float diffuse = max(0.0, dot(normal, lightDir));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float edgeFresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);

    float ex = smoothstep(0.0, uEdgeWidth, localUV.x) *
               (1.0 - smoothstep(1.0 - uEdgeWidth, 1.0, localUV.x));
    float ey = smoothstep(0.0, uEdgeWidth, localUV.y) *
               (1.0 - smoothstep(1.0 - uEdgeWidth, 1.0, localUV.y));
    float seam = ex * ey;

    vec3 glassTint = vec3(0.97, 0.99, 1.03);
    color = portrait * glassTint;
    color = color * (0.60 + 0.40 * diffuse);
    float specExp = mix(8.0, 32.0, atten);
    float spec2   = pow(max(0.0, dot(normalize(lightDir + vec3(0.0,0.0,1.0)), normal)), specExp);
    color += spec2 * atten * 0.35 * vec3(1.0, 1.0, 1.02);
    color *= 1.0 - edgeFresnel * 0.25;
    color *= mix(0.82, 1.0, seam);
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

    const THIN_PX            = 1;
    const THICK_PX_DESKTOP   = 4;
    const THICK_PX_MOBILE    = 2;
    const HANDLE_LEN_DESKTOP = 20;
    const HANDLE_LEN_MOBILE  = 10;

    const uniforms = {
      uTexture:     { value: texture },
      uAspect:      { value: 1.0 },
      uImgAspect:   { value: imgAspect },
      uFadeIn:      { value: 0.0 },
      uGridSize:    { value: new THREE.Vector2(GRID_CONFIG.cellsX, GRID_CONFIG.cellsY) },
      uEdgeWidth:   { value: 0.04 },
      uCursor:      { value: new THREE.Vector2(-2, -2) },
      uRevealSize:  { value: new THREE.Vector2(REVEAL_CONFIG.halfW, REVEAL_CONFIG.halfW) },
      uBorderThin:  { value: THIN_PX / 1000 },
      uBorderThick: { value: THICK_PX_DESKTOP / 1000 },
      uHandleLen:   { value: HANDLE_LEN_DESKTOP / 1000 },
      uBorderColor: { value: new THREE.Color(...(REVEAL_CONFIG.borderColor as [number, number, number])) },
    };

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    scene.add(new THREE.Mesh(geo, mat));

    // Base cell size in pixels — locked on first render, stays constant on resize
    let baseCellPx = 1;

    const updateSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      const aspect = w / h;
      uniforms.uAspect.value = aspect;

      // Lock baseCellPx on first call
      if (baseCellPx === 1) baseCellPx = w / GRID_CONFIG.cellsX;

      // Pixel-derived grid so cells stay the same physical size on any viewport
      const cellW  = baseCellPx;
      const cellH  = baseCellPx / GRID_CONFIG.tileAspect;
      const cellsX = Math.round(w / cellW);
      const cellsY = Math.round(h / cellH);
      uniforms.uGridSize.value.set(cellsX, cellsY);

      const isMobile = w < 768;
      const minDim   = Math.min(w, h);

      // Reveal box: 1.6× bigger on mobile
      const revealHalf = isMobile ? REVEAL_CONFIG.halfW * 1.6 : REVEAL_CONFIG.halfW;
      uniforms.uRevealSize.value.set(revealHalf, revealHalf * aspect);

      // Crop marks: smaller pixel values on mobile
      const thickPx     = isMobile ? THICK_PX_MOBILE    : THICK_PX_DESKTOP;
      const handleLenPx = isMobile ? HANDLE_LEN_MOBILE  : HANDLE_LEN_DESKTOP;
      uniforms.uBorderThin.value  = THIN_PX      / minDim;
      uniforms.uBorderThick.value = thickPx      / minDim;
      uniforms.uHandleLen.value   = handleLenPx  / minDim;
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    // ── Shared cursor setter ──────────────────────────────────────────────
    const setCursorFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      uniforms.uCursor.value.set(
        (clientX - rect.left) / rect.width,
        1.0 - (clientY - rect.top) / rect.height
      );
    };

    // ── Mouse events ──────────────────────────────────────────────────────
    const onMouseMove  = (e: MouseEvent) => setCursorFromClient(e.clientX, e.clientY);
    const onMouseLeave = () => uniforms.uCursor.value.set(-2, -2);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    // ── Touch events (mobile drag-to-reveal) ──────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      setCursorFromClient(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      setCursorFromClient(t.clientX, t.clientY);
    };
    const onTouchEnd = () => uniforms.uCursor.value.set(-2, -2);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove',  onTouchMove,  { passive: false });
    container.addEventListener('touchend',   onTouchEnd);

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
      container.removeEventListener('mousemove',  onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove',  onTouchMove);
      container.removeEventListener('touchend',   onTouchEnd);
    };
  }, [imageSrc]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, cursor: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
