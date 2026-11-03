// Signboard catalogue: atlas packing must be watertight, picks deterministic, every
// design carries real Bengali text (the whole point of Milestone 3 signage).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESIGNS, LAYOUT, designUV, designSpanWidth, pickDesign, spanWidth,
  ATLAS_SIZE, CELL_W, CELL_H, COLS, SIGN_W, SIGN_H,
} from '../src/world/signCatalog.js';

test('every design has Bengali main text and sensible colours', () => {
  assert.ok(DESIGNS.length >= 18, `authored designs: ${DESIGNS.length}`);
  for (const d of DESIGNS) {
    assert.ok(d.bn.length >= 3, `bn text "${d.bn}"`);
    assert.ok(/[\u0980-\u09FF]/.test(d.bn), `"${d.bn}" must contain Bengali script`);
    assert.match(d.bg, /^#[0-9a-f]{6}$/i);
    assert.match(d.fg, /^#[0-9a-f]{6}$/i);
    assert.ok(['shop', 'building', 'ad'].includes(d.kind));
    assert.ok([1, 2].includes(d.span));
    if (d.kind === 'building') assert.equal(d.span, 2, 'building names use wide boards');
  }
  // both scripts appear across the catalogue (Bengali main + Latin sub)
  assert.ok(DESIGNS.some(d => /[A-Za-z]/.test(d.en || '')), 'English subtext present');
});

test('atlas layout packs every design inside the grid with no overlap', () => {
  assert.equal(LAYOUT.length, DESIGNS.length);
  const occupied = new Set();
  for (const c of LAYOUT) {
    assert.ok(c.row >= 0 && c.row < ATLAS_SIZE / CELL_H, `row ${c.row}`);
    assert.ok(c.col >= 0 && c.col + c.span <= COLS, `col span ${c.col}+${c.span}`);
    for (let j = 0; j < c.span; j++) {
      const key = `${c.row}:${c.col + j}`;
      assert.ok(!occupied.has(key), `cell ${key} double-booked`);
      occupied.add(key);
    }
  }
  assert.ok(occupied.size <= (ATLAS_SIZE / CELL_H) * COLS);
});

test('UV rects are inside [0,1] and match the cell grid', () => {
  for (let i = 0; i < DESIGNS.length; i++) {
    const [u0, v0, u1, v1] = designUV(i);
    assert.ok(u0 >= 0 && u1 <= 1 && v0 >= 0 && v1 <= 1, `uv ${i}: ${u0},${v0},${u1},${v1}`);
    assert.ok(u1 > u0 && v1 > v0);
    const c = LAYOUT[i];
    const expectedW = c.span * CELL_W / ATLAS_SIZE;
    assert.ok(Math.abs((u1 - u0) - expectedW) < 1e-9);
    assert.ok(Math.abs((v1 - v0) - CELL_H / ATLAS_SIZE) < 1e-9);
  }
});

test('picks are deterministic, in range, and respect kind/span filters', () => {
  for (const kind of ['shop', 'building', 'ad']) {
    for (let i = 0; i < 60; i++) {
      const d = pickDesign(`key-${kind}-${i}`, kind);
      assert.ok(DESIGNS[d].kind === kind);
    }
  }
  const wide = pickDesign('some-key', 'ad', 2);
  assert.equal(DESIGNS[wide].span, 2);
  assert.equal(pickDesign('same-key', 'shop'), pickDesign('same-key', 'shop'));
  assert.equal(designSpanWidth(wide), SIGN_W * 2);
  assert.equal(spanWidth(1), SIGN_W);
  assert.ok(Math.abs(SIGN_W - SIGN_H * 4) < 1e-9);   // 4:1 cell aspect kept in world
});
