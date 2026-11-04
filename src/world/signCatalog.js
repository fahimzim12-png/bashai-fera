// Signboard catalogue: real, readable text on every sign - authored fictional Dhaka shop
// names, building names and ads (no real brands), painted onto ONE shared canvas atlas
// at start-up (SignAtlasTexture) using the bundled Hind Siliguri font. ChunkBuilder only
// consumes this catalogue's geometry + UV data, so chunk building stays pure & testable.
//
// Atlas: 1024x1024, cells 256x64 px (4:1). World scale: sign height 0.6 m ->
// span 1 = 2.4 m wide, span 2 = 4.8 m wide (rooftop billboards use span 2 at 1.2 m tall).
import { hashString } from '../core/Rng.js';

export const ATLAS_SIZE = 1024;
export const CELL_W = 256, CELL_H = 64, COLS = 4;
export const SIGN_H = 0.6;                       // metres
export const SIGN_W = SIGN_H * (CELL_W / CELL_H); // 2.4 m per span cell

const SH = (bn, en, bg, fg, band, kind = 'shop', span = 1) => ({ bn, en, bg, fg, band, kind, span });

// Fictional but believable Dhaka street commerce. Kinds: shop | building | ad.
export const DESIGNS = [
  SH('রিনা ফ্যাশনার্স', 'RINA FASHIONS', '#8c1f3d', '#ffe9a8', '#ffd23a', 'shop'),
  SH('তাসনিম পোশাক', 'TASNIM POISHAK', '#1f5c3d', '#eafff2', '#ffd23a', 'shop'),
  SH('মুন টেইলার্স', 'MOON TAILORS', '#1f3d8c', '#ffffff', '#ff5c5c', 'shop'),
  SH('নিউ মডেল কাপড়', 'NEW MODEL KAPASH', '#b04a12', '#fff3e0', '#ffe082', 'shop'),
  SH('ফার্মগেট চা স্টল', 'CHA STALL', '#14532d', '#f7fee7', '#fbbf24', 'shop'),
  SH('রাহমান ট্রেডার্স', 'RAHMAN TRADERS', '#5c1010', '#ffe8e8', '#facc15', 'shop'),
  SH('আল-মদিনা স্টোর', 'AL-MADINA STORE', '#0f5c5c', '#e8fffb', '#facc15', 'shop'),
  SH('জান্নাত ফ্যাশন হাউস', 'FASHION HOUSE', '#8c1f6b', '#ffe8f7', '#ffd23a', 'shop'),
  SH('ঢাকা ফার্মেসি', 'DHAKA PHARMACY', '#166534', '#f0fdf4', '#22c55e', 'shop'),
  SH('বিসমিল্লাহ হোটেল', 'BISMILLAH HOTEL', '#7c3a06', '#fff7e0', '#f59e0b', 'shop'),
  SH('মতিন ইলেকট্রনিক্স', 'MOTIN ELECTRONICS', '#172554', '#dbeafe', '#38bdf8', 'shop'),
  SH('শুভ্র প্যানজাবি হাউস', 'PANJABI HOUSE', '#3f6212', '#f7fee7', '#a3e635', 'shop'),
  SH('পাইকারি কাপড়', 'WHOLESALE CLOTH', '#4a1d6b', '#f5f3ff', '#facc15', 'shop'),
  SH('মোবাইল রিচার্জ', 'MOBILE RECHARGE', '#164e63', '#ecfeff', '#22d3ee', 'shop'),
  SH('সেল! সেল! সেল!', 'SALE SALE SALE', '#b91c1c', '#fef2f2', '#fbbf24', 'ad'),
  SH('ঈদ কলেকশন', 'EID COLLECTION', '#6d28d9', '#f5f3ff', '#fbbf24', 'ad'),
  SH('নতুন পোশাক এসেছে', 'NEW ARRIVALS', '#c2410c', '#fff7ed', '#fde047', 'ad'),
  SH('মেহেদী প্লাজা', 'MEHEDI PLAZA', '#1e3a5f', '#f0f9ff', '#fbbf24', 'building', 2),
  SH('করিম মার্কেট', 'KARIM MARKET', '#3f3f46', '#fafafa', '#facc15', 'building', 2),
  SH('রূপনগর টাওয়ার', 'RUPNAGAR TOWER', '#134e4a', '#f0fdfa', '#fbbf24', 'building', 2),
  SH('আপনার শহর আপনার পথ', 'YOUR CITY YOUR WAY', '#1d4ed8', '#ffffff', '#facc15', 'ad', 2),
  SH('সবুজ ঢাকা গড়ি', 'GREEN DHAKA', '#15803d', '#f0fdf4', '#fef08a', 'ad', 2),
  SH('গার্মেন্টস পাইকারি বাজার', 'GARMENTS WHOLESALE', '#701a30', '#fff1f2', '#fb7185', 'building', 2),
  // Milestone 4: metro station nameboards (DMTCL brand green), market zone + corridor identities.
  SH('ফার্মগেট', 'FARMGATE', '#006747', '#ffffff', '#facc15', 'building', 2),
  SH('কাওরান বাজার', 'KAWRAN BAZAR', '#006747', '#ffffff', '#facc15', 'building', 2),
  SH('কাওরান বাজার কমপ্লেক্স', 'KAWRAN BAZAR COMPLEX', '#3f3f46', '#fafafa', '#facc15', 'building', 2),
  SH('এফডিসি', 'BFDC', '#1f2937', '#f9fafb', '#facc15', 'building', 2),
  SH('সোনারগাঁও', 'SONARGAON', '#134e4a', '#f0fdfa', '#fbbf24', 'building', 2),
  SH('পাইকারি ফল আড়ৎ', 'FRUIT ARAT', '#7c2d12', '#fff7ed', '#fbbf24', 'shop'),
  SH('পাইকারি মাছ বাজার', 'FISH MARKET', '#0c4a6e', '#e0f2fe', '#38bdf8', 'shop'),
  SH('কাঁচা মাছ-মাংস নিষিদ্ধ', 'NO RAW PRODUCE', '#7f1d1d', '#fee2e2', '#fbbf24', 'ad'),
  // Milestone 5: district-flavoured signage — Karwan Bazar wholesale rows, Farmgate
  // commerce, avenue offices. Same fictional-but-believable discipline as the rest.
  SH('আলু পেঁয়াজ পাইকারি', 'ONION POTATO WHOLESALE', '#4a2d0c', '#fff3e0', '#fbbf24', 'shop'),
  SH('মিন্টু মাছ ঘর', 'MINTU FISH HOUSE', '#0c4a6e', '#e0f2fe', '#38bdf8', 'shop'),
  SH('কাঁচা বাজার', 'KACHA BAZAR', '#155e2f', '#f0fdf4', '#facc15', 'shop'),
  SH('ফার্মগেট স্টোর', 'FARMGATE STORE', '#7c2d12', '#fff7ed', '#fbbf24', 'shop'),
  SH('চা-নাস্তা ঘর', 'CHA AND NASHTA', '#3f2d12', '#fffbeb', '#f59e0b', 'shop'),
  SH('নগর ক্লিনিক', 'NAGAR CLINIC', '#0f766e', '#f0fdfa', '#22d3ee', 'shop'),
  SH('বই ও কাগজ হাউস', 'BOOKS AND PAPER', '#1e3a8a', '#eff6ff', '#fbbf24', 'shop'),
  SH('ইলেকট্রনিক্স পাইকারি', 'ELECTRONICS WHOLESALE', '#312e81', '#eef2ff', '#38bdf8', 'shop'),
  SH('ফলের আড়ত', 'FRUIT DEPOT', '#7c2d12', '#fff7ed', '#facc15', 'shop'),
  SH('বাস স্টপ', 'BUS STOP', '#1f2937', '#f9fafb', '#facc15', 'shop'),
];

// Pack designs into the atlas grid (span-2 designs sit on even columns).
export const LAYOUT = (() => {
  let col = 0, row = 0;
  return DESIGNS.map((d, i) => {
    if (d.span === 2 && col % 2 === 1) col++;
    if (col + d.span > COLS) { col = 0; row++; }
    const cell = { col, row, span: d.span, index: i };
    col += d.span;
    return cell;
  });
})();

/** UV rect [u0,v0,u1,v1] of a design (v flipped for GL). */
export function designUV(index) {
  const c = LAYOUT[index];
  const u0 = c.col * CELL_W / ATLAS_SIZE;
  const u1 = (c.col + c.span) * CELL_W / ATLAS_SIZE;
  const v1 = 1 - c.row * CELL_H / ATLAS_SIZE;
  const v0 = v1 - CELL_H / ATLAS_SIZE;
  return [u0, v0, u1, v1];
}

export function spanWidth(span) { return SIGN_W * span; }

/** Deterministic design pick for a world position. kind filters the pool; span (1|2) optional. */
export function pickDesign(key, kind = 'shop', span = 0) {
  const pool = [];
  for (let i = 0; i < DESIGNS.length; i++) {
    const d = DESIGNS[i];
    if (d.kind === kind && (!span || d.span === span)) pool.push(i);
  }
  return pool[(hashString(key) >>> 0) % pool.length];
}

/** Exact design lookup by its Latin text (station nameboards, FDC, hotel...). -1 if absent. */
export function designByText(en) {
  for (let i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].en === en) return i;
  return -1;
}

/** World-space width of a design's quad (metres). */
export function designSpanWidth(index) { return spanWidth(LAYOUT[index].span); }
