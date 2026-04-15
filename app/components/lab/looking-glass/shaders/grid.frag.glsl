precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uAspect;       // canvas width / height
uniform float uImgAspect;    // image width / height
uniform float uFadeIn;       // 0→1 intro fade
uniform float uTime;

// Grid config
uniform vec2 uGridSize;      // cells X, cells Y
uniform float uPunchRadius;  // circle punch per cell
uniform float uFacetStrength;
uniform vec2 uLightDir;
uniform float uPortraitBleed;
uniform vec3 uBgColor;

// Band config
uniform float uBandCenterX;
uniform float uBandWidth;
uniform float uBandDarkness;
uniform float uBandFeather;
uniform float uBandDensityBoost;

varying vec2 vUv;

// ─── Cover UV: maps canvas UV to image UV (cover-fit, centered) ───────────────
vec2 coverUV(vec2 uv, float canvasAspect, float imgAspect) {
  vec2 scale;
  if (canvasAspect > imgAspect) {
    // Canvas is wider — fit height, crop sides
    scale = vec2(canvasAspect / imgAspect, 1.0);
  } else {
    // Canvas is taller — fit width, crop top/bottom
    scale = vec2(1.0, imgAspect / canvasAspect);
  }
  vec2 centered = (uv - 0.5) * scale + 0.5;
  return centered;
}

// ─── Smooth noise for subtle variation ───────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // Map to image UV (cover fit)
  vec2 imgUV = coverUV(uv, uAspect, uImgAspect);

  // ─── Band mask (horizontal, centered) ─────────────────────────────────────
  float distFromBand = abs(uv.x - uBandCenterX) / (uBandWidth * 0.5);
  float bandMask = 1.0 - smoothstep(1.0 - uBandFeather, 1.0, distFromBand);

  // ─── Adaptive grid density ─────────────────────────────────────────────────
  // In the band, cells are denser (more packed)
  vec2 gridSize = uGridSize * (1.0 + bandMask * (uBandDensityBoost - 1.0));

  // ─── Cell coordinates ──────────────────────────────────────────────────────
  vec2 cellCoord = uv * gridSize;
  vec2 cellIndex = floor(cellCoord);
  vec2 localUV = fract(cellCoord);  // 0-1 within each cell

  // ─── Sample portrait at cell center (not per-fragment) ────────────────────
  // This creates the "faceted" look — each cell shows one color
  vec2 cellCenterUV = (cellIndex + 0.5) / gridSize;
  vec2 cellImgUV = coverUV(cellCenterUV, uAspect, uImgAspect);

  // Clamp to valid image bounds
  cellImgUV = clamp(cellImgUV, 0.0, 1.0);
  vec4 portraitSample = texture2D(uTexture, cellImgUV);

  // ─── Per-cell directional lighting (embossing) ────────────────────────────
  // localUV goes 0→1 within each cell
  // We treat the cell as a tiny dome — brighter toward light direction
  vec2 cellNormal = (localUV - 0.5) * 2.0;  // -1 to 1
  float lighting = dot(normalize(cellNormal + 0.001), normalize(uLightDir));
  lighting = lighting * 0.5 + 0.5;  // remap to 0-1
  float facetLight = mix(1.0, lighting, uFacetStrength);

  // ─── Circle punch (perforated look) ───────────────────────────────────────
  float distToCenter = length(localUV - 0.5);
  // Slightly vary punch radius per cell for organic feel
  float cellHash = hash(cellIndex);
  float punchR = uPunchRadius * (0.9 + cellHash * 0.2);
  float circleMask = 1.0 - smoothstep(punchR - 0.04, punchR + 0.02, distToCenter);

  // ─── Portrait color in band vs background ─────────────────────────────────
  // In the band: portrait is dark/abstracted
  // Outside band: mostly background color with slight portrait tint
  float bandDarkFactor = mix(1.0, uBandDarkness, bandMask);
  vec3 portraitColor = portraitSample.rgb * bandDarkFactor;

  // Blend portrait with background based on band position
  float portraitMix = mix(uPortraitBleed * 0.3, uPortraitBleed, bandMask);
  vec3 cellColor = mix(uBgColor, portraitColor, portraitMix);

  // Apply per-cell lighting
  cellColor *= facetLight;

  // ─── Combine: cell color through circle punch ─────────────────────────────
  // Outside circle: background color (slightly darkened for depth)
  vec3 bgDark = uBgColor * 0.85;
  vec3 finalColor = mix(bgDark, cellColor, circleMask);

  // ─── Subtle grain ─────────────────────────────────────────────────────────
  float grain = (hash(uv * 1000.0 + uTime * 0.01) - 0.5) * 0.025;
  finalColor += grain;

  // ─── Vignette ─────────────────────────────────────────────────────────────
  float vignette = 1.0 - smoothstep(0.5, 1.4, length((uv - 0.5) * vec2(1.0, uAspect / uImgAspect)));
  finalColor *= mix(0.85, 1.0, vignette);

  // ─── Fade in ──────────────────────────────────────────────────────────────
  finalColor = mix(uBgColor, finalColor, uFadeIn);

  gl_FragColor = vec4(finalColor, 1.0);
}
