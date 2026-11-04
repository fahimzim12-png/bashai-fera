# M5 Photo-Analysis Provenance — the 41-photo reference board

Method (user-directed): collect real photos of the four real locations, analyse them,
then build original 3D structures from that analysis. No GTA assets, brands or map data
were copied — only the colour/light/wardrobe truths of Dhaka.

## Board

| Query | Photos | What they established |
|---|---|---|
| Farmgate footbridge + MRT viaduct | 6 | arcade-depth shop rows under the viaduct, warm haze sky, crowd density |
| Kazi Nazrul Islam Avenue towers | 6 | skyline mix: glass slabs + red brick + pastel mid-rise |
| Kawran Bazar market | 6 | saturated produce greens (#77a07f/#a4b16d), blue crates, bamboo tukri, tarps |
| Pan Pacific Sonargaon | 5 | terracotta-maroon slab (#8e5b4d/#56292b), arched pavilion, sand plaza |
| Street colour / rickshaw art | 6 | pastel painted facades, stacked signboards, rickshaw folk-art hoods |
| Apartment facades | 6 | balcony rhythm, water tanks, monsoon seepage, cyan-sky saturation |
| Local bus fleet | 6 | cream/red/green liveries, side Bengali signage, weathering |

Programmatic palette extraction (median cut, per photo): `palette_report.json` in this
folder — mean facade saturation on the board runs 0.25–0.55; the pre-regrade route
palettes sat at ~0.10, which is why the city read grey.

## Decisions driven by the board

1. **Palettes** (route JSON): walls repainted to photo pastels — cream #f0e0bc, pink
   #e2ae9e, sky #9fc2d8, mint #a8c8a8, yellow #ecd68e, terracotta #c9835e, brick #a0624a.
2. **Light**: saturated azure-to-gold sky (#5e93c6 -> #f5d9a4), golden sun #ffdf9e at
   2.9 intensity, cool sky-bounce fill #a9c3d8, fog starts at 45% of view distance.
3. **Buildings**: repaint-panel splits, per-floor slab shadows, recessed pier shopfronts,
   tall sign bands, painted balcony railings + laundry, parapets, bigger billboards.
4. **Vehicles**: tint-following neutral bus bands (red DHAKA coach / pink-cream / cream /
   green / sky-blue), taxi-yellow cars at doubled frequency, rickshaw hood art baked.
5. **People**: wrap-skirt part renders lungi (striped flare), sari (floor length) and
   salwar-kameez (knee length) via per-instance scale + tint.
6. **District payoffs**: Karwan Bazar produce mounds + blue crates; SAARC fountain
   running with jets, striped kerb ring, brass rail, palms; Sonargaon as the terracotta
   slab with arched pavilion and fountain pool.

Rendered verification at the five checkpoints lives in the milestone screenshots
(Farmgate junction, avenue mid-sweep, Karwan Bazar, SAARC approach, fountain arrival).
