# Garden Gold Master pipeline

## Harmonized skill order

1. `create-3d-model` owns scope, safety, deliverables, and final artifact truth.
2. `blender-skill-harmonizer` resolves overlap and freezes the source/handoff policy.
3. `blender-agent-studio:blender-modeling-workflow` owns the contract, staged build, and deterministic Python source.
4. `reference-look-calibration` records the reference crop, extent, palette, and before/after look metrics; it does not repair geometry.
5. `hard-surface` owns the planter rim, shell, ribs, base, bevel hierarchy, and manufacturing plausibility.
6. `geometry-nodes` owns only reusable rib/leaf-distribution construction; all export geometry is realized.
7. `vegetation-artist` owns species silhouette, phyllotaxis, canopy density, leaf pivots, and wind readiness.
8. `sculpting` owns high-poly leaf undulation, veins, fruit dimples, and restrained micro form.
9. `retopology` owns web LOD topology, silhouette preservation, and deformation-safe density.
10. `realistic-style` owns real scale, high-to-low discipline, and physically plausible finish.
11. `blender-materials` owns export-safe Principled PBR materials.
12. `texture-workflow` owns 4K master maps, runtime variants, normal/AO/roughness bake, and color-space rules.
13. `lookdev` owns the clay → neutral → beauty comparison loop.
14. `blender-lighting` owns the warm key, restrained fill, rim separation, and contact shadows after geometry/material lock.
15. `blender-agent-studio:blender-asset-validation` owns metrics, six-view renders, and fresh-import evidence.
16. `blender-agent-studio:blender-iterative-refinement` freezes the candidate, selects the largest visible defect, repairs durable source, repeats identical validation, and retains only measured improvement.
17. `asset-optimization` owns triangle/material/UV budgets and LOD0/1/2 audit.
18. `blender-export` owns GLB packaging; final acceptance belongs to fresh-import Blender and Three.js/WebGL renders.

## Conflict decisions

- The supplied image is a look/proportion reference, not a multi-view technical drawing. Exact unseen geometry is not claimed.
- Visual geometry failures cannot be passed by scripts, polycount, shaders, camera crop, or lighting.
- High-poly sculpt geometry is archived in the versioned `.blend`; web GLB contains retopologized/realized geometry only.
- Vegetation uses closed leaf meshes with physical thickness, not alpha cards, because the result screen shows close, repeated seedlings.
- The current public GLB files remain runtime-compatible. Replacement happens only after authored, fresh-import, and WebGL evidence passes.
- KTX2 is preferred when an encoder is available; otherwise a documented screen-size 2K texture variant is accepted by the user’s stated rule.

## Quality questions

- Does the planter read like the supplied molded trough from the front before tertiary detail is visible?
- Does each crop remain identifiable from silhouette without labels?
- Are lettuce and spinach rosettes volumetric rather than flat piles?
- Do tomato, chili, and basil have believable branching and sufficient leaf density without hiding fruit?
- Does strawberry read as a compact crown with trifoliate serrated leaves and hanging fruit?
- Do imported GLBs preserve leaf thickness, normals, roughness, color, shadow, and animation in Three.js?
