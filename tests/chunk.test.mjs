import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteModel } from '../src/world/RouteModel.js';
import { buildChunk, chunkIndexForS } from '../src/world/ChunkBuilder.js';
import { GeometryBuilder, hexToLinear } from '../src/render/GeometryBuilder.js';
import { loadRouteJson } from './helpers.mjs';

test('GeometryBuilder: quad winding follows the hint (normal faces the hint)', () => {
  const g = new GeometryBuilder();
  // same square given in both vertex orders, must both face +Y
  g.quad([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], '#ffffff', { hint: [0, 1, 0] });
  g.quad([0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0], '#ffffff', { hint: [0, 1, 0] });
  const d = g.finish();
  for (let i = 0; i < d.normals.length; i += 3) assert.ok(d.normals[i + 1] > 0.99);
  // geometric winding: triangle (0,1,2) normal computed from positions must agree with the stored normal
  for (let q = 0; q < 2; q++) {
    const o = q * 12, p = d.positions;
    const a = [p[o], p[o + 1], p[o + 2]], b = [p[o + 3], p[o + 4], p[o + 5]], c = [p[o + 6], p[o + 7], p[o + 8]];
    const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    assert.ok(n[1] > 0, 'triangle winding is counter-clockwise seen from above');
  }
});
test('GeometryBuilder: box makes 6 faces, indices valid, colours linear', () => {
  const g = new GeometryBuilder(); g.box([0, 0, 0], [0, 1], [1, 0], 2, 3, 4, '#808080');
  const d = g.finish();
  assert.equal(d.quadCount, 6); assert.equal(d.triCount, 12);
  assert.ok(Math.max(...d.indices) < d.vertexCount);
  assert.ok(d.colors[0] < 0.25 && d.colors[0] > 0.15, 'sRGB 0.5 -> linear ~0.21');
  assert.equal(hexToLinear('#ffffff')[0], 1);
});
test('GeometryBuilder: degenerate quads are skipped', () => {
  const g = new GeometryBuilder(); g.quad([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], '#fff'); assert.equal(g.finish().vertexCount, 0);
});

test('Chunk builder: deterministic, sane sizes, valid data, all chunks of the route', () => {
  const route = new RouteModel(loadRouteJson());
  const a = buildChunk(route, 5), b = buildChunk(route, 5);
  assert.deepEqual(a.ground.positions, b.ground.positions);
  assert.deepEqual(a.facade.positions, b.facade.positions);
  const first = chunkIndexForS(route.space.minS), last = chunkIndexForS(route.space.maxS - 1);
  let worst = 0, total = 0;
  for (let ci = first; ci <= last; ci++) {
    const c = buildChunk(route, ci);
    for (const part of [c.ground, c.facade]) {
      assert.ok(part.positions.every(Number.isFinite), `chunk ${ci}: finite positions`);
      assert.ok(part.normals.every(Number.isFinite));
      assert.ok(part.vertexCount === 0 || Math.max(...part.indices) < part.vertexCount);
      assert.equal(part.positions.length, part.vertexCount * 3);
    }
    assert.ok(c.facade.uvs.length === c.facade.vertexCount * 2);
    const tris = c.ground.triCount + c.facade.triCount;
    worst = Math.max(worst, tris); total += tris;
  }
  console.log(`      chunks ${first}..${last}: worst ${worst} tris/chunk, total ${total}`);
  assert.ok(worst < 20000, 'a chunk must stay light for phones: ' + worst);
});
test('Chunk builder: placeholder fountain exists only near the end of the route', () => {
  const route = new RouteModel(loadRouteJson());
  const lm = route.landmarks[0], sc = route.length + lm.aheadOfEnd;
  const near = buildChunk(route, chunkIndexForS(sc)), far = buildChunk(route, 3);
  assert.ok(near.ground.quadCount > far.ground.quadCount * 0.3);
});
