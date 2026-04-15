precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

// Curl uniforms
uniform float uCurlAmount;  // 0 = flat, 1 = fully peeled
uniform int uCurlCorner;    // 0=TR, 1=TL, 2=BR, 3=BL

varying vec2 vUv;
varying float vCurlFactor;
varying float vIsBack;

void main() {
  vUv = uv;

  vec3 pos = position;

  // ─── Page curl deformation ─────────────────────────────────────────────────
  // Determine corner position in local space (plane goes -0.5 to 0.5)
  vec2 cornerPos;
  if (uCurlCorner == 0) cornerPos = vec2(0.5, 0.5);   // TR
  else if (uCurlCorner == 1) cornerPos = vec2(-0.5, 0.5);  // TL
  else if (uCurlCorner == 2) cornerPos = vec2(0.5, -0.5);  // BR
  else cornerPos = vec2(-0.5, -0.5);  // BL

  // Distance from this vertex to the curl corner
  float distToCorner = length(pos.xy - cornerPos);
  float maxDist = length(vec2(1.0, 1.0));  // diagonal of the plane

  // Curl factor: vertices near the corner curl more
  float curlFactor = 1.0 - smoothstep(0.0, 0.7, distToCorner / maxDist);
  curlFactor *= uCurlAmount;
  vCurlFactor = curlFactor;

  // Lift the corner in Z
  pos.z += curlFactor * 0.08;

  // Slight rotation around the fold axis
  float foldAngle = curlFactor * 0.6;  // radians
  // Rotate the curled portion back toward viewer
  float cosA = cos(foldAngle);
  float sinA = sin(foldAngle);

  // Fold axis direction (perpendicular to corner direction)
  vec2 toCorner = normalize(cornerPos);
  vec2 foldAxis = vec2(-toCorner.y, toCorner.x);

  // Project position onto fold axis and apply rotation
  float proj = dot(pos.xy - cornerPos, foldAxis);
  vec2 perpComponent = pos.xy - cornerPos - proj * foldAxis;
  float perpLen = length(perpComponent);
  if (perpLen > 0.001) {
    vec2 perpDir = perpComponent / perpLen;
    float newPerpLen = perpLen * cosA;
    float newZ = perpLen * sinA * curlFactor;
    pos.xy = cornerPos + proj * foldAxis + perpDir * newPerpLen;
    pos.z += newZ;
  }

  // Track if this vertex is on the "back" of the curl (for paper color)
  vIsBack = step(0.5, curlFactor);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
