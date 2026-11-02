// Bangla numerals for the HUD (০১২৩...). Falls back to normal digits if the browser lacks bn-BD.
let nf;
try { nf = new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0, useGrouping: false }); } catch (_) { nf = null; }
export function bnNumber(n) { return nf ? nf.format(Math.round(n)) : String(Math.round(n)); }
export function formatMeters(n) { return `${bnNumber(n)} মি`; }
