// Licence guard: every asset file in assets/ must have a row in the ASSETS.md ledger,
// and the ledger must keep its key rows. Runs in Node, no dependencies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const ledger = readFileSync(new URL('../assets/ASSETS.md', import.meta.url), 'utf8');

function* walk(dir) {
  for (const name of readdirSync(new URL(dir, ROOT))) {
    const rel = dir + name;
    const st = statSync(new URL(rel, ROOT));
    if (st.isDirectory()) yield* walk(rel + '/');
    else yield rel;
  }
}

test('ASSETS.md keeps its required rows (Three.js MIT, OFL fonts, no-Google-Maps rule)', () => {
  assert.ok(/Three\.js.*MIT/s.test(ledger), 'Three.js MIT row present');
  assert.ok(/Hind Siliguri/.test(ledger) && /Bricolage Grotesque/.test(ledger), 'font licences present');
  assert.ok(/No Google Maps imagery/.test(ledger), 'the no-Google-Maps rule stays in the ledger');
  assert.ok(exists('vendor/three/LICENSE'), 'Three.js licence text is vendored');
});

test('every asset file under assets/ has a ledger row (licence compliance)', () => {
  const files = [...walk('assets/')].filter((f) => !f.endsWith('ASSETS.md'));
  for (const f of files) {
    const base = f.split('/').pop();
    assert.ok(ledger.includes(base), `asset "${f}" is not listed in assets/ASSETS.md — add source, author and licence`);
  }
  // note: today assets/ contains only ASSETS.md (game is 100% procedural); this test bites
  // the moment the first texture/model/audio file is added without a licence row.
});

function exists(rel) {
  try { statSync(new URL(rel, ROOT)); return true; } catch { return false; }
}
