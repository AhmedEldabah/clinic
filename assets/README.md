# Assets

## molar-crown.glb

The 3D tooth in the hero is a real anatomical model, not a drawing or an AI-generated mesh.

- **Source:** BodyParts3D, FMA55698 "right upper first secondary molar tooth", kept unmodified
  in `source/FMA55698.stl` (from the mirror at https://github.com/Kevin-Mattheus-Moerman/BodyParts3D).
- **Credit:** BodyParts3D, © 2008 Life Science Integrated Database Center (DBCLS),
  licensed under [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
- **Changes:** subdivided, Taubin-smoothed and decimated, then the roots were removed at the
  cervical line (9 mm from the cusp tips) and the cut capped; re-oriented to glTF Y-up and
  scaled to 1 unit (~12k faces). Rebuild with
  `python make-crown.py source/FMA55698.stl 9.0 molar-crown.glb` (run from `assets/`)
  (needs `trimesh`, `fast-simplification`, `mapbox-earcut`).

This adapted model is shared under the same CC BY-SA 2.1 JP licence.
