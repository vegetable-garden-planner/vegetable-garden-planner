"""Rebuild the step-three planter as closed, production-safe hard-surface geometry.

The imported modular planter used by the blockout contains disconnected open
panels after its source bevels are applied.  This pass preserves that source in
the Blender file, then creates a new tapered shell, rim, ribs, soil and drainage
assembly whose individual components are all watertight before consolidation.
"""

from __future__ import annotations

import json
import math
import random
import runpy
from pathlib import Path

import bmesh
import bpy


SCRIPT_PATH = Path(__file__).resolve()
FRONTEND_ROOT = SCRIPT_PATH.parents[2]
GARDEN_ROOT = FRONTEND_ROOT / "public" / "models" / "garden"
REFINE_SCRIPT = SCRIPT_PATH.with_name("refine-garden-step3-aaa.py")
OUTPUT_BLEND = GARDEN_ROOT / "garden-step3-final-topology.blend"

PLANTER_MATERIAL = "MAT-Planter-Hero-PBR"
SOIL_MATERIAL = "MAT-PlanterSoil-Hero-PBR"
ROOT_NAME = "ROOT_Planter_GardenStep3"


def target_collection() -> bpy.types.Collection:
    collection = bpy.data.collections.get("COL_Planter")
    if collection is None:
        collection = bpy.data.collections.new("COL_Planter")
        bpy.context.scene.collection.children.link(collection)
    return collection


def lod_collection(level: int) -> bpy.types.Collection:
    if level == 0:
        return target_collection()
    name = f"COL_LOD{level}"
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj: bpy.types.Object, modifier: bpy.types.Modifier) -> None:
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def ensure_soil_material() -> bpy.types.Material:
    material = bpy.data.materials.get(SOIL_MATERIAL) or bpy.data.materials.new(SOIL_MATERIAL)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.92
    shader.inputs["Base Color"].default_value = (0.055, 0.024, 0.008, 1.0)
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.48
    material.node_tree.links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    texture_specs = (
        ("BaseColor", "sRGB", shader.inputs["Base Color"]),
        ("Roughness", "Non-Color", shader.inputs["Roughness"]),
        ("Metallic", "Non-Color", shader.inputs["Metallic"]),
        ("Normal", "Non-Color", normal_map.inputs["Color"]),
    )
    for map_name, color_space, target in texture_specs:
        path = GARDEN_ROOT / "textures" / "runtime" / "planter" / f"T_PlanterSoil_{map_name}_1K-v2.png"
        image = bpy.data.images.load(str(path), check_existing=True)
        image.colorspace_settings.name = color_space
        texture = nodes.new("ShaderNodeTexImage")
        texture.name = f"TEX_PlanterSoil_{map_name}"
        texture.image = image
        material.node_tree.links.new(texture.outputs["Color"], target)
    return material


def bevel_object(obj: bpy.types.Object, width: float, segments: int) -> None:
    modifier = obj.modifiers.new("MOD_ManufacturingBevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(24)
    modifier.harden_normals = True
    apply_modifier(obj, modifier)


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    bevel: float,
    segments: int,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        bevel_object(obj, bevel, segments)
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def rounded_loop(width: float, depth: float, radius: float, z: float, corner_segments: int) -> list[tuple[float, float, float]]:
    points: list[tuple[float, float, float]] = []
    centers = (
        (width * 0.5 - radius, depth * 0.5 - radius, 0.0),
        (-width * 0.5 + radius, depth * 0.5 - radius, math.pi * 0.5),
        (-width * 0.5 + radius, -depth * 0.5 + radius, math.pi),
        (width * 0.5 - radius, -depth * 0.5 + radius, math.pi * 1.5),
    )
    for center_x, center_y, start in centers:
        for index in range(corner_segments):
            angle = start + (math.pi * 0.5) * index / corner_segments
            points.append((center_x + math.cos(angle) * radius, center_y + math.sin(angle) * radius, z))
    return points


def add_closed_ring_shell(
    name: str,
    outer_bottom: tuple[float, float, float, float],
    outer_top: tuple[float, float, float, float],
    inner_bottom: tuple[float, float, float, float],
    inner_top: tuple[float, float, float, float],
    corner_segments: int,
    bevel: float,
    bevel_segments: int,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    loops = [
        rounded_loop(*outer_bottom, corner_segments),
        rounded_loop(*outer_top, corner_segments),
        rounded_loop(*inner_top, corner_segments),
        rounded_loop(*inner_bottom, corner_segments),
    ]
    count = len(loops[0])
    vertices = [coordinate for loop in loops for coordinate in loop]
    faces: list[tuple[int, int, int, int]] = []
    outer_bottom_offset, outer_top_offset, inner_top_offset, inner_bottom_offset = (0, count, count * 2, count * 3)
    for index in range(count):
        next_index = (index + 1) % count
        faces.extend((
            (
                outer_bottom_offset + index,
                outer_bottom_offset + next_index,
                outer_top_offset + next_index,
                outer_top_offset + index,
            ),
            (
                inner_top_offset + index,
                inner_top_offset + next_index,
                inner_bottom_offset + next_index,
                inner_bottom_offset + index,
            ),
            (
                outer_top_offset + index,
                outer_top_offset + next_index,
                inner_top_offset + next_index,
                inner_top_offset + index,
            ),
            (
                inner_bottom_offset + index,
                inner_bottom_offset + next_index,
                outer_bottom_offset + next_index,
                outer_bottom_offset + index,
            ),
        ))
    mesh = bpy.data.meshes.new(f"{name}-Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    working = bmesh.new()
    working.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(working, faces=list(working.faces))
    working.to_mesh(mesh)
    working.free()
    if bevel > 0:
        bevel_object(obj, bevel, bevel_segments)
    return obj


def add_closed_torus(
    name: str,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    major_segments: int,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.010,
        minor_radius=0.0015,
        major_segments=major_segments,
        minor_segments=8,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def add_soil_clumps(
    parts: list[bpy.types.Object],
    count: int,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    seed: int,
) -> None:
    randomizer = random.Random(seed)
    for index in range(count):
        radius = randomizer.uniform(0.0025, 0.0054)
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1,
            radius=radius,
            location=(
                randomizer.uniform(-0.238, 0.238),
                randomizer.uniform(-0.056, 0.056),
                0.229 + randomizer.uniform(0.001, 0.0045),
            ),
        )
        clump = bpy.context.object
        clump.name = f"TMP_SoilClump_{index + 1:02d}"
        clump.scale = (
            randomizer.uniform(0.82, 1.38),
            randomizer.uniform(0.82, 1.34),
            randomizer.uniform(0.45, 0.82),
        )
        activate(clump)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        assign_material(clump, material)
        move_to_collection(clump, collection)
        parts.append(clump)


def build_planter_lod(
    level: int,
    material: bpy.types.Material,
    soil_material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    collection.hide_viewport = False
    collection.hide_render = False
    specifications = {
        0: {"corner": 12, "bevel": 5, "front_ribs": 31, "side_ribs": 7, "soil": 42, "drain": 32},
        1: {"corner": 8, "bevel": 3, "front_ribs": 21, "side_ribs": 5, "soil": 24, "drain": 20},
        2: {"corner": 5, "bevel": 2, "front_ribs": 13, "side_ribs": 3, "soil": 12, "drain": 12},
    }
    spec = specifications[level]
    prefix = f"TMP_Planter_LOD{level}"
    parts: list[bpy.types.Object] = []
    parts.append(add_closed_ring_shell(
        f"{prefix}_Body",
        (0.520, 0.170, 0.021, 0.045),
        (0.570, 0.210, 0.026, 0.225),
        (0.458, 0.116, 0.014, 0.060),
        (0.520, 0.150, 0.018, 0.225),
        spec["corner"],
        0.0026,
        spec["bevel"],
        material,
        collection,
    ))
    parts.append(add_closed_ring_shell(
        f"{prefix}_Rim",
        (0.586, 0.226, 0.028, 0.222),
        (0.598, 0.236, 0.030, 0.250),
        (0.520, 0.150, 0.018, 0.222),
        (0.520, 0.150, 0.018, 0.250),
        spec["corner"],
        0.0014,
        spec["bevel"],
        material,
        collection,
    ))
    parts.append(add_box(f"{prefix}_Base", (0.536, 0.184, 0.026), (0, 0, 0.030), 0.003, spec["bevel"], material, collection))
    parts.append(add_box(f"{prefix}_Soil", (0.505, 0.134, 0.018), (0, 0, 0.220), 0.007, spec["bevel"], soil_material, collection))

    rib_height = 0.166
    for side, y in (("Front", -0.103), ("Back", 0.103)):
        for index in range(spec["front_ribs"]):
            t = 0.5 if spec["front_ribs"] == 1 else index / (spec["front_ribs"] - 1)
            x = -0.246 + t * 0.492
            parts.append(add_box(
                f"{prefix}_Rib_{side}_{index + 1:02d}",
                (0.0063, 0.0070, rib_height),
                (x, y, 0.133),
                0.0012,
                spec["bevel"],
                material,
                collection,
            ))
    for side, x in (("Left", -0.278), ("Right", 0.278)):
        for index in range(spec["side_ribs"]):
            t = 0.5 if spec["side_ribs"] == 1 else index / (spec["side_ribs"] - 1)
            y = -0.074 + t * 0.148
            parts.append(add_box(
                f"{prefix}_Rib_{side}_{index + 1:02d}",
                (0.0070, 0.0063, rib_height),
                (x, y, 0.133),
                0.0012,
                spec["bevel"],
                material,
                collection,
            ))

    for side, y in (("Front", -0.1068), ("Back", 0.1068)):
        parts.append(add_box(
            f"{prefix}_PartingLine_{side}",
            (0.525, 0.0010, 0.0014),
            (0, y, 0.119),
            0.00025,
            max(2, spec["bevel"] - 1),
            material,
            collection,
        ))
    for index, x in enumerate((-0.225, -0.075, 0.075, 0.225), 1):
        parts.append(add_box(
            f"{prefix}_BaseReinforcement_{index:02d}",
            (0.022, 0.154, 0.009),
            (x, 0, 0.013),
            0.001,
            max(2, spec["bevel"] - 1),
            material,
            collection,
        ))
        parts.append(add_closed_torus(
            f"{prefix}_DrainageRing_{index:02d}",
            (x, 0, 0.008),
            material,
            collection,
            spec["drain"],
        ))
        bpy.ops.mesh.primitive_cylinder_add(vertices=spec["drain"], radius=0.0077, depth=0.0035, location=(x, 0, 0.0075))
        drain = bpy.context.object
        drain.name = f"{prefix}_DrainageInsert_{index:02d}"
        assign_material(drain, material)
        move_to_collection(drain, collection)
        parts.append(drain)
    add_soil_clumps(parts, spec["soil"], soil_material, collection, 9341 + level)

    for part in parts:
        for polygon in part.data.polygons:
            polygon.use_smooth = True
    activate(parts[0])
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = f"GEO-Planter-LOD{level}"
    joined.data.name = f"GEO-Planter-LOD{level}-Mesh"
    joined["asset_id"] = "planter"
    joined["lod"] = level
    joined["hard_surface"] = "closed_tapered_shell_bevel_ribs_seams_drainage"
    joined["topology"] = "watertight_disconnected_manifold_components"

    activate(joined)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(64), island_margin=0.014)
    bpy.ops.object.mode_set(mode="OBJECT")
    if joined.data.uv_layers:
        joined.data.uv_layers.active.name = "UV_Hero"
    root = bpy.data.objects.get(ROOT_NAME)
    if root:
        joined.parent = root
        joined.matrix_parent_inverse = root.matrix_world.inverted()
    return joined


def manifold_report(obj: bpy.types.Object) -> dict[str, object]:
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    report = {
        "vertices": len(mesh.verts),
        "faces": len(mesh.faces),
        "triangles": sum(max(0, len(face.verts) - 2) for face in mesh.faces),
        "boundaryEdges": sum(1 for edge in mesh.edges if edge.is_boundary),
        "nonManifoldEdges": sum(1 for edge in mesh.edges if not edge.is_manifold),
    }
    mesh.free()
    return report


def preserve_previous_lods() -> None:
    for level in (0, 1, 2):
        current = bpy.data.objects.get(f"GEO-Planter-LOD{level}")
        if current is None:
            continue
        legacy_name = f"GEO-Planter-LOD{level}-LegacyOpen"
        old_legacy = bpy.data.objects.get(legacy_name)
        if old_legacy:
            old_legacy.name = f"{legacy_name}-Previous"
        current.name = legacy_name
        current.hide_render = True
        current.hide_viewport = True
        current.hide_set(True)


def main() -> None:
    scene = bpy.context.scene
    if scene.get("aaa_planter_manifold_rebuilt"):
        print("AAA_PLANTER_TOPOLOGY_ALREADY_REBUILT")
        return
    material = bpy.data.materials.get(PLANTER_MATERIAL)
    if material is None:
        raise RuntimeError(f"Missing material: {PLANTER_MATERIAL}")
    soil_material = ensure_soil_material()
    preserve_previous_lods()
    new_lods = [build_planter_lod(level, material, soil_material, lod_collection(level)) for level in (0, 1, 2)]
    report = {obj.name: manifold_report(obj) for obj in new_lods}
    if any(item["nonManifoldEdges"] for item in report.values()):
        raise RuntimeError(f"Planter topology repair failed: {report}")

    library = runpy.run_path(str(REFINE_SCRIPT), run_name="garden_refine_library")
    exports = [library["export_glb"]("planter", level) for level in (0, 1, 2)]
    scene["aaa_planter_manifold_rebuilt"] = True
    scene["aaa_planter_topology_report"] = json.dumps(report)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND), copy=False)
    print("AAA_PLANTER_TOPOLOGY_REPAIR")
    print(json.dumps({
        "lods": report,
        "exports": [{"file": path.name, "bytes": path.stat().st_size} for path in exports],
    }, indent=2))


if __name__ == "__main__":
    main()
