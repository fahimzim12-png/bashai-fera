# Corridor Digest (from OSM extracts + press research, 2026-11-04)

All distances in the game's route frame (s = metres from the Farmgate junction).
Local metre frame: +x east, +z north, origin 23.7525 N, 90.3920 E.

## Real centreline waypoints (game control points)

| s (m) | x (east) | z (north) | source |
|---|---|---|---|
| 0 | 0 | 0 | Farmgate junction 23.7590, 90.3871 |
| 60 | 20 | −56 | junction exit sweep |
| 150 | 55 | −133 | junction-exit curve complete |
| 350 | 122 | −319 | long constant sweep (~160° bearing) |
| 600 | 209 | −548 | straight mid-corridor |
| 900 | 312 | −823 | approaching market |
| 1080 | 375 | −987 | market stretch (Kawran Bazar station ≈ s 1040) |
| 1200 | 418 | −1093 | mor approach bend |
| 1280 | 447 | −1160 | SAARC mor 23.7499, 90.3932 |

Total along-road ≈ 1.25 km (game spline ≈ 1.25 km + 60 m start pad + 150 m end pad).

## Junctions touching the corridor (in order)

| s | Junction | Arms | Notes |
|---|---|---|---|
| 0 | Farmgate | Mirpur Rd N, Mirpur Rd S, avenue W arm, Green Rd S, Indira Rd NE | 5-arm signal; footbridge + metro station + expressway landing cluster |
| 150 | Khamarbari | Khamarbari Sarak | govt complex on the left (east); expressway traffic turns here |
| 420 | Tejgaon service link | service road (east) | minor arm toward rail corridor |
| 1060 | Karwan Bazar mor | FDC Rd, rail level crossing | roundabout signal at the market edge |
| ~1250 | SAARC mor | Panthapath, Bijoy Sarani, Sonargaon Rd | destination traffic circle |

## Side-of-road ground truth (heading SSE, left = east)

- **Left (east):** Khamarbari complex (s 40–300), the entire Kawran Bazar market complex
  (sheds, DNCC kitchen market, fish market, porters) s 870–1180, trunk railway + level
  crossing behind it, FDC compound, elevated-expressway mainline on the rail corridor,
  BDBL Bhaban (18F) / BSEC Bhaban / TV-studio towers behind the sheds, Sonargaon gardens
  beyond the mor.
- **Right (west):** commercial streetwall mid-corridor, Green Road/Ananda Cinema area near
  Farmgate, Panthapath arm at the mor.

## Overpass extract summary (`osm-avenue.json`)

7 named ways, split dual carriageway: lanes 2/3/4 (oneway=yes), `trunk` + one `trunk_link`
(the Bijoy Sarani ramp), maxspeed 60 on the tagged stretch. Farmgate-area extract (digested,
not committed): 106 named ways including Khamarbari Sarak (trunk, oneway), Green Road,
Indira Road, Satrasta Road, Nakhalpara Road, Begum Rokeya Sarani, plus `Foot Over Bridge,
Farmgate` pedestrian/steps ways mapping the 2023 bridge.

## Press-verified landmark anchors (lat, lon)

| Anchor | Coordinates |
|---|---|
| Farmgate junction | 23.7590, 90.3871 |
| Farmgate metro station | 23.75906, 90.38708 |
| Kawran Bazar metro station | 23.75172, 90.39260 |
| Kawran Bazar market core | 23.7514, 90.3970 |
| FDC | 23.75280, 90.39803 |
| Tejgaon rail station | 23.76224, 90.39501 |
| SAARC fountain | 23.74987, 90.39323 |
| Sonargaon Hotel | 23.74957, 90.39487 |
