// Builds geometry as plain arrays (no Three.js), so it can be tested in Node and later moved
// to a Web Worker if chunk building ever needs to leave the main thread.
//
// Everything in a chunk is merged into ONE mesh per material: a whole 60 m stretch of street
// costs the phone 2 draw calls instead of hundreds. That is the main Redmi 9 optimisation.

const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const _cache = new Map();

/** '#rrggbb' (sRGB, as designers think) -> [r,g,b] linear (as the GPU lights it). */
export function hexToLinear(hex) {
  let c = _cache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)];
    _cache.set(hex, c);
  }
  return c;
}
export function shade(rgb, k) { return [rgb[0] * k, rgb[1] * k, rgb[2] * k]; }

export class GeometryBuilder {
  constructor({ uv = false } = {}) {
    this.useUV = uv;
    this.pos = []; this.nor = []; this.col = []; this.uvs = []; this.idx = [];
    this.vertexCount = 0;
    this.quadCount = 0;
  }

  /**
   * One quad a,b,c,d (go around the edge, either direction). `hint` = a direction the quad should face:
   * winding is flipped automatically to match, so callers never have to think about vertex order.
   * opts: { hint:[x,y,z], uv:[[u,v] x4 in a,b,c,d order], double:true (visible from both sides) }
   */
  quad(a, b, c, d, color, opts = {}) {
    if (typeof color === 'string') color = hexToLinear(color);
    let uv = opts.uv;
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;                                   // degenerate: skip
    nx /= len; ny /= len; nz /= len;
    const h = opts.hint;
    if (h && nx * h[0] + ny * h[1] + nz * h[2] < 0) {          // facing the wrong way: flip
      const t = b; b = d; d = t;
      if (uv) uv = [uv[0], uv[3], uv[2], uv[1]];
      nx = -nx; ny = -ny; nz = -nz;
    }
    this._emit(a, b, c, d, nx, ny, nz, color, uv);
    if (opts.double) this._emit(a, d, c, b, -nx, -ny, -nz, color, uv ? [uv[0], uv[3], uv[2], uv[1]] : null);
    this.quadCount++;
  }

  _emit(a, b, c, d, nx, ny, nz, color, uv) {
    const base = this.vertexCount;
    const vs = [a, b, c, d];
    for (let i = 0; i < 4; i++) {
      const p = vs[i];
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(color[0], color[1], color[2]);
      if (this.useUV) { const t = uv ? uv[i] : [0, 0]; this.uvs.push(t[0], t[1]); }
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vertexCount += 4;
  }

  /** Triangle (used for fans such as the fountain water). */
  tri(a, b, c, color, hint) {
    if (typeof color === 'string') color = hexToLinear(color);
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;
    nx /= len; ny /= len; nz /= len;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { const t = b; b = c; c = t; nx = -nx; ny = -ny; nz = -nz; }
    const base = this.vertexCount;
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]); this.nor.push(nx, ny, nz); this.col.push(color[0], color[1], color[2]);
      if (this.useUV) this.uvs.push(0, 0);
    }
    this.idx.push(base, base + 1, base + 2);
    this.vertexCount += 3;
  }

  /**
   * Oriented box. base=[x,y0,z] is the centre of the bottom face.
   * f=[fx,fz] is the box's forward direction, r=[rx,rz] its right direction (route frame).
   */
  box(base, f, r, sizeF, sizeH, sizeR, color, opts = {}) {
    const side = opts.side || color, top = opts.top || color, bottom = opts.bottom || color;
    const hf = sizeF / 2, hr = sizeR / 2, y0 = base[1], y1 = base[1] + sizeH;
    const C = (sf, sr, y) => [base[0] + f[0] * sf * hf + r[0] * sr * hr, y, base[2] + f[1] * sf * hf + r[1] * sr * hr];
    this.quad(C(1, -1, y0), C(1, 1, y0), C(1, 1, y1), C(1, -1, y1), side, { hint: [f[0], 0, f[1]] });
    this.quad(C(-1, -1, y0), C(-1, 1, y0), C(-1, 1, y1), C(-1, -1, y1), side, { hint: [-f[0], 0, -f[1]] });
    this.quad(C(-1, 1, y0), C(1, 1, y0), C(1, 1, y1), C(-1, 1, y1), side, { hint: [r[0], 0, r[1]] });
    this.quad(C(-1, -1, y0), C(1, -1, y0), C(1, -1, y1), C(-1, -1, y1), side, { hint: [-r[0], 0, -r[1]] });
    this.quad(C(-1, -1, y1), C(1, -1, y1), C(1, 1, y1), C(-1, 1, y1), top, { hint: [0, 1, 0] });
    if (!opts.skipBottom) this.quad(C(-1, -1, y0), C(1, -1, y0), C(1, 1, y0), C(-1, 1, y0), bottom, { hint: [0, -1, 0] });
  }

  finish() {
    const big = this.vertexCount > 65535;
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      colors: new Float32Array(this.col),
      uvs: this.useUV ? new Float32Array(this.uvs) : null,
      indices: big ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
      vertexCount: this.vertexCount,
      triCount: this.idx.length / 3,
      quadCount: this.quadCount,
    };
  }
}
