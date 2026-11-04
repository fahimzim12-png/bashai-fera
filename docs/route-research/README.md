# Route Research — Farmgate → Kazi Nazrul Islam Avenue → Kawran Bazar → SAARC Fountain

This folder holds the **geographic evidence** behind the Milestone 4 route rebuild, so every
coordinate in `data/routes/farmgate-saarc.json` can be audited.

## Method

- Real geometry was extracted from **OpenStreetMap** via the Overpass API on **2026-11-04**
  (mirror: overpass.kumi.systems). `osm-avenue.json` is the verbatim extract of every way
  named কাজী নজরুল ইসলাম সরণী / এভিনিউ (Kazi Nazrul Islam Avenue) in the corridor bbox
  `23.744,90.380,23.770,90.410`; the Farmgate junction area extract (106 named ways) was
  digested into `digest.md` rather than committed whole.
- Landmark facts were cross-checked against Wikipedia (EN + BN), The Daily Star, Prothom Alo,
  bdnews24 and Wikimedia Commons category captions (see the route JSON `provenance` block for
  the full URL list).
- Coordinates were converted to a local metre frame (+x east, +z north, origin 23.7525 N,
  90.3920 E) to fit the game centreline.

## Key measured facts

| Thing | Measured / sourced value |
|---|---|
| Avenue class | trunk, dual carriageway, one-way sides of 3–4 lanes, maxspeed 60 (tagged stretch) |
| Corridor length | ~1.25 km along the road, Farmgate junction → SAARC mor |
| Bearing after Farmgate | long constant sweep ~160° (SSE), gentle bend at the junction and into the mor |
| Farmgate junction | 5 arms: Mirpur Rd N/S, avenue W arm, Green Rd S, Indira Rd NE |
| Footbridge (2023) | ~63 m main span × ~6.4 m + ~21 m Holy Cross wing, opened 15 Oct 2023 |
| MRT-6 | median viaduct, hammerhead piers ~20–25 m spacing, 1500 V DC catenary, stations 3-level, green #006747 |
| Elevated expressway | runs along the rail corridor (east/left of the avenue), ramps land just east of Farmgate + FDC-gate ramp (Mar 2024) |
| Kawran Bazar market | DNCC concrete kitchen market + tin-shed rows on the **east (left) side** of the avenue; trunk railway + level crossing behind it; tower backdrop |
| SAARC fountain | Nitun Kundu steel petals, ~9.75 m, 32 m RCC pool, dry/derelict in recent years, tin fence + posters |

## Licence

OpenStreetMap data is © OpenStreetMap contributors, ODbL — see `assets/ASSETS.md`.
The extracts in this folder are kept for provenance/audit and carry the same licence.
