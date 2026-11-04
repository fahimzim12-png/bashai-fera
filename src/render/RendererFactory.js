import * as THREE from 'three';

/** Reads the GPU name with a throw-away context (the real renderer needs the answer BEFORE it is created). */
export function probeGpu() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { supported: false, gpu: '' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return { supported: true, gpu };
  } catch (_) {
    return { supported: false, gpu: '' };
  }
}

export function createRenderer(canvas, { antialias, onLost, onRestored }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0xe8c9a2, 1);
  // Milestone 4: filmic tone mapping grounds the whole Dhaka palette (no more raw sRGB
  // blowout on sunlit concrete) and the output colour space is pinned explicitly.
  // M5 regrade: default exposure lifted to 1.18 (the route's lighting block owns the
  // final value; this keeps the fallback consistent).
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Shadow MAP support is always on; the light's castShadow flag (per quality tier) decides
  // whether any shadow pass actually runs. Keeping this constant avoids material recompiles.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // A phone can discard the GPU context when the app is backgrounded. Handle it instead of showing a black screen.
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost && onLost(); }, false);
  canvas.addEventListener('webglcontextrestored', () => { onRestored && onRestored(); }, false);
  return renderer;
}
