# Molar crown for the hero, derived from BodyParts3D FMA55698
# (right upper first secondary molar), (c) 2008 DBCLS, CC BY-SA 2.1 JP.
# Smooth the whole tooth first, then cut at the cervical line, so the margin stays crisp.
import sys, os, numpy as np, trimesh, fast_simplification
src = sys.argv[1] if len(sys.argv) > 1 else 'FMA55698.stl'
cut_mm = float(sys.argv[2]) if len(sys.argv) > 2 else 9.0
out = sys.argv[3] if len(sys.argv) > 3 else 'molar-crown.glb'

tooth = trimesh.load(src)
tooth = tooth.subdivide()
trimesh.smoothing.filter_taubin(tooth, lamb=0.5, nu=-0.53, iterations=14)
pts, faces = fast_simplification.simplify(tooth.vertices.astype(np.float32), tooth.faces,
                                          target_reduction=1 - 30000 / len(tooth.faces))
tooth = trimesh.Trimesh(pts, faces)

z0 = tooth.bounds[0][2]   # cusp tips (upper tooth, crown points down)
crown = tooth.slice_plane(plane_origin=[0, 0, z0 + cut_mm], plane_normal=[0, 0, -1], cap=True)
R = trimesh.transformations.rotation_matrix
crown.apply_transform(R(np.pi, [1, 0, 0]))       # occlusal surface up
crown.apply_transform(R(-np.pi / 2, [1, 0, 0]))  # Z-up -> glTF Y-up
crown.apply_translation(-crown.bounds.mean(axis=0))
crown.apply_scale(1.0 / crown.extents.max())
crown.fix_normals()
crown.export(out, include_normals=False)
print(out, len(crown.faces), crown.is_watertight, crown.extents.round(3), os.path.getsize(out))
