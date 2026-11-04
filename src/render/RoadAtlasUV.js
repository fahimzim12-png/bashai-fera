// UV-region constants for the road surface atlas (RoadTexture.js paints the pixels).
// Kept THREE-free so the pure chunk builder (and its Node tests) can import them.
export const ROAD_U = [0.0, 0.625];          // u-range of the road region
export const PATH_U = [0.625, 0.8125];       // footpath region
export const MEDIAN_U = [0.8125, 1.0];       // median region
export const ROAD_V_METRES = 10;             // v repeat length per region
export const PATH_V_METRES = 4.8;
export const MEDIAN_V_METRES = 8;
