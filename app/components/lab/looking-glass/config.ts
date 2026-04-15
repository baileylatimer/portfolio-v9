// ─── The Looking Glass — Configuration ───────────────────────────────────────
// All tunable parameters in one place.

export const IMAGE_SRC = '/images/lab/the-looking-glass/portrait.jpg';

// Reeded / privacy glass grid
export const GRID_CONFIG = {
  // Number of cells across the width (fewer = bigger tiles, more dramatic)
  cellsX: 32,
  // cellsY is computed at runtime: cellsX * aspect * tileAspect
  cellsY: 80,
  // Vertical stretch factor — makes tiles portrait-oriented like real reeded glass
  // 1.0 = square tiles, 1.18 = ~18% taller than wide
  tileAspect: 1.18,
  // How much each cell's UV sample is randomly offset (organic feel)
  distortStrength: 0.012,
  // How dark the grout lines between cells are (0 = none, 1 = black)
  edgeDarken: 0.55,
  // Width of grout lines as fraction of cell size (0-0.5)
  edgeWidth: 0.06,
};

// Cursor reveal window
export const REVEAL_CONFIG = {
  // Half-width of the reveal box in UV space (0-1)
  // e.g. 0.12 = box spans 24% of the viewport width
  halfW: 0.12,
  // halfH is computed at runtime to keep the box square in screen space
  halfH: 0.12,
  // Border line width in UV space
  borderWidth: 0.003,
  // Border color (white)
  borderColor: [1.0, 1.0, 1.0] as [number, number, number],
};
