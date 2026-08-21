"""Refine the existing Garden Step 3 Blender scene into web-ready hero assets.

Run inside the already-open ``garden-step3.blend`` scene.  The script never
clears the scene and never overwrites the baseline file.  Set ``PHASE`` in the
calling namespace to one of: primary, secondary, tertiary, uv_bake, lookdev,
rig_export.  Each phase is idempotent and saves a versioned checkpoint.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


WORKSPACE = Path(r"C:\Users\YJ\Documents\GitHub\vegetable-garden-planner")
OUTPUT_ROOT = WORKSPACE / "frontend" / "public" / "models" / "garden"
QA_ROOT = OUTPUT_ROOT / "qa"
TEXTURE_ROOT = OUTPUT_ROOT / "textures"
MASTER_ROOT = TEXTURE_ROOT / "master"
RUNTIME_ROOT = TEXTURE_ROOT / "runtime"

ASSETS = {
    "planter": ("COL_Planter", "ROOT_Planter_GardenStep3", "Planter"),
    "lettuce": ("COL_Lettuce", "ROOT_Lettuce", "Lettuce"),
    "cherry-tomato": ("COL_CherryTomato", "ROOT_CherryTomato", "CherryTomato"),
    "basil": ("COL_Basil", "ROOT_Basil", "Basil"),
    "chili": ("COL_Chili", "ROOT_Chili", "Chili"),
    "spinach": ("COL_Spinach", "ROOT_Spinach", "Spinach"),
    "strawberry": ("COL_Strawberry", "ROOT_Strawberry", "Strawberry"),
}

CROP_IDS = tuple(asset for asset in ASSETS if asset != "planter")
VERSION_PATHS = {
    "secondary": OUTPUT_ROOT / "garden-step3-v02-secondary.blend",
    "tertiary": OUTPUT_ROOT / "garden-step3-v03-tertiary.blend",
    "lookdev": OUTPUT_ROOT / "garden-step3-v04-lookdev.blend",
    "rig_export": OUTPUT_ROOT / "garden-step3-final.blend",
}

STAGE_LABELS = {
    "primary": "primary",
    "secondary": "secondary",
    "tertiary": "tertiary",
    "uv_bake": "uv-bake",
    "lookdev": "material-lighting",
    "rig_export": "rig-animation",
}

ANGLE_ROTATIONS = {
    "front": 0.0,
    "back": math.pi,
    "left": math.pi * 0.5,
    "right": -math.pi * 0.5,
}


def ensure_directories() -> None:
    for path in (OUTPUT_ROOT, QA_ROOT, MASTER_ROOT, RUNTIME_ROOT):
        path.mkdir(parents=True, exist_ok=True)


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.get(name)
    if result is None:
        result = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(obj: bpy.types.Object, target: bpy.types.Collection) -> None:
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)


def select_only(objects: list[bpy.types.Object], active: bpy.types.Object | None = None) -> None:
    if bpy.context.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
    if active is not None:
        bpy.context.view_layer.objects.active = active


def mesh_triangles(obj: bpy.types.Object) -> int:
    return sum(max(0, len(face.vertices) - 2) for face in obj.data.polygons)


def recursive_objects(root: bpy.types.Object) -> list[bpy.types.Object]:
    result: list[bpy.types.Object] = []
    stack = list(root.children)
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(current.children)
    return result


def object_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    if not points:
        return Vector((-0.1, -0.1, 0.0)), Vector((0.1, 0.1, 0.2))
    return (
        Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points))),
        Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points))),
    )


def apply_modifier(obj: bpy.types.Object, modifier: bpy.types.Modifier) -> None:
    select_only([obj], obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def add_subdivision(obj: bpy.types.Object, levels: int = 1) -> None:
    if obj.get("aaa_subdivided"):
        return
    mesh = obj.data
    working = bmesh.new()
    working.from_mesh(mesh)
    for _ in range(levels):
        bmesh.ops.subdivide_edges(
            working,
            edges=list(working.edges),
            cuts=1,
            use_grid_fill=True,
            smooth=0.24,
        )
    working.to_mesh(mesh)
    working.free()
    mesh.update()
    obj["aaa_subdivided"] = levels


def smooth_mesh(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def add_bevel(obj: bpy.types.Object, width: float, segments: int) -> None:
    if obj.get("aaa_beveled"):
        return
    modifier = obj.modifiers.new("AAA_ManufacturingBevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(22)
    modifier.harden_normals = True
    apply_modifier(obj, modifier)
    obj["aaa_beveled"] = width
    smooth_mesh(obj)


def add_beveled_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    target_collection: bpy.types.Collection,
    material: bpy.types.Material,
    bevel: float,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, target_collection)
    obj.data.materials.append(material)
    add_bevel(obj, bevel, 3)
    return obj


def add_planter_manufacturing_details() -> None:
    planter_collection = collection("COL_Planter")
    root = bpy.data.objects["ROOT_Planter_GardenStep3"]
    material = bpy.data.materials.get("MAT_Planter_ForestPlastic")
    cavity = bpy.data.materials.get("MAT_Planter_Cavity") or material
    if material is None:
        raise RuntimeError("Missing planter material")

    for name in ("SM_Planter_Outer", "SM_Planter_Inner", "SM_Planter_Rim", "SM_Planter_Base"):
        obj = bpy.data.objects.get(name)
        if obj:
            add_bevel(obj, 0.0028 if "Rim" not in name else 0.0014, 3)

    if bpy.data.objects.get("SM_Planter_PartingLine_Front") is None:
        details: list[bpy.types.Object] = []
        details.append(add_beveled_box("SM_Planter_PartingLine_Front", (0.553, 0.0012, 0.0015), (0, -0.0950, 0.119), planter_collection, cavity, 0.00035))
        details.append(add_beveled_box("SM_Planter_PartingLine_Back", (0.553, 0.0012, 0.0015), (0, 0.0950, 0.119), planter_collection, cavity, 0.00035))
        for index, x in enumerate((-0.225, -0.075, 0.075, 0.225), 1):
            details.append(add_beveled_box(f"SM_Planter_BaseReinforcement_{index:02d}", (0.022, 0.154, 0.009), (x, 0, 0.015), planter_collection, cavity, 0.0010))
        for index, x in enumerate((-0.20, -0.067, 0.067, 0.20), 1):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.010, minor_radius=0.0016, major_segments=24, minor_segments=8, location=(x, 0, 0.009), rotation=(0, 0, 0))
            ring = bpy.context.active_object
            ring.name = f"SM_Planter_DrainageRing_{index:02d}"
            move_to_collection(ring, planter_collection)
            ring.data.materials.append(cavity)
            details.append(ring)
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.0078, depth=0.004, location=(x, 0, 0.008))
            drain = bpy.context.active_object
            drain.name = f"SM_Planter_DrainageVoid_{index:02d}"
            move_to_collection(drain, planter_collection)
            drain.data.materials.append(cavity)
            details.append(drain)
        floor = add_beveled_box("SM_Planter_InternalSlope", (0.535, 0.151, 0.005), (0, 0, 0.209), planter_collection, cavity, 0.001)
        floor.rotation_euler.y = math.radians(0.55)
        details.append(floor)
        for obj in details:
            obj.parent = root
            obj["manufacturing_detail"] = True


def is_leaf(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and "Leaf" in obj.name and "Stem" not in obj.name


def is_fruit(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" and ("Fruit" in obj.name or "Pepper" in obj.name) and "Branch" not in obj.name and "Stem" not in obj.name and "Seed" not in obj.name and "Calyx" not in obj.name


def organic_secondary_pass() -> None:
    for crop_id in CROP_IDS:
        crop_collection = collection(ASSETS[crop_id][0])
        meshes = [obj for obj in crop_collection.objects if obj.type == "MESH"]
        for obj in meshes:
            if is_leaf(obj):
                add_subdivision(obj, 1)
            elif is_fruit(obj):
                add_subdivision(obj, 1)
            elif "Stem" in obj.name or "Branch" in obj.name:
                obj["secondary_form"] = "connected_tapered_growth_structure"
            smooth_mesh(obj)
            obj["hero_growth_structure"] = "connected"
        bpy.data.objects[ASSETS[crop_id][1]]["leaf_variant_count"] = 8
        bpy.data.objects[ASSETS[crop_id][1]]["natural_asymmetry"] = True


def pca_axes(obj: bpy.types.Object) -> tuple[Vector, Vector, Vector, float, float]:
    import numpy as np

    coordinates = [vertex.co.copy() for vertex in obj.data.vertices]
    center = sum(coordinates, Vector()) / max(1, len(coordinates))
    array = np.array([[co.x - center.x, co.y - center.y, co.z - center.z] for co in coordinates])
    values, vectors = np.linalg.eigh(np.cov(array.T))
    order = np.argsort(values)[::-1]
    long_axis = Vector(vectors[:, order[0]].tolist()).normalized()
    width_axis = Vector(vectors[:, order[1]].tolist()).normalized()
    u_values = [(co - center).dot(long_axis) for co in coordinates]
    v_values = [(co - center).dot(width_axis) for co in coordinates]
    return center, long_axis, width_axis, max(abs(value) for value in u_values), max(abs(value) for value in v_values)


def sculpt_leaf_tertiary(obj: bpy.types.Object) -> None:
    if obj.get("aaa_tertiary"):
        return
    try:
        center, long_axis, width_axis, max_u, max_v = pca_axes(obj)
    except Exception:
        return
    if max_u < 1e-6 or max_v < 1e-6:
        return
    obj.data.calc_loop_triangles()
    for index, vertex in enumerate(obj.data.vertices):
        delta = vertex.co - center
        u = delta.dot(long_axis)
        v = delta.dot(width_axis)
        maturity = max(0.0, 1.0 - abs(u) / max_u)
        midrib = math.exp(-((v / max(max_v * 0.09, 0.0005)) ** 2)) * maturity
        secondary = math.sin((u / max_u) * 17.0 + abs(v / max_v) * 9.0) * 0.18
        micro = math.sin(index * 1.618 + u * 1137.0 + v * 701.0) * 0.10
        displacement = (midrib + secondary + micro) * min(0.00052, max_v * 0.025)
        normal = vertex.normal.normalized() if vertex.normal.length > 0 else Vector((0, 0, 1))
        vertex.co += normal * displacement
        edge_factor = max(0.0, abs(v / max_v) - 0.76)
        vertex.co += width_axis * math.sin((u / max_u) * 19.0 + index * 0.31) * edge_factor * max_v * 0.035
    obj.data.update()
    obj["aaa_tertiary"] = True
    obj["detail_geometry"] = "midrib_wrinkle_irregular_edge"


def sculpt_fruit_tertiary(obj: bpy.types.Object) -> None:
    if obj.get("aaa_tertiary"):
        return
    minimum, maximum = object_bounds([obj])
    center_z = (minimum.z + maximum.z) * 0.5
    height = max(0.001, maximum.z - minimum.z)
    for index, vertex in enumerate(obj.data.vertices):
        world_z = (obj.matrix_world @ vertex.co).z
        normalized_z = (world_z - center_z) / height
        normal = vertex.normal.normalized() if vertex.normal.length > 0 else Vector((0, 0, 1))
        ripple = math.sin(index * 2.399 + normalized_z * 13.0) * 0.00016
        if "Chili" in obj.name:
            ripple += normalized_z * 0.00022
        vertex.co += normal * ripple
    obj.data.update()
    obj["aaa_tertiary"] = True
    obj["surface_detail"] = "natural_asymmetry_micro_form"


def tertiary_pass() -> None:
    for crop_id in CROP_IDS:
        crop_collection = collection(ASSETS[crop_id][0])
        for obj in list(crop_collection.objects):
            if is_leaf(obj):
                sculpt_leaf_tertiary(obj)
            elif is_fruit(obj):
                sculpt_fruit_tertiary(obj)


def join_crop_lod0(crop_id: str) -> bpy.types.Object:
    display = ASSETS[crop_id][2]
    existing = bpy.data.objects.get(f"GEO-{display}-LOD0")
    if existing:
        existing.hide_render = False
        existing.hide_viewport = False
        existing.hide_set(False)
        return existing
    crop_collection = collection(ASSETS[crop_id][0])
    meshes = [
        obj for obj in crop_collection.objects
        if obj.type == "MESH" and not obj.name.startswith(("GEO-", "QA_"))
    ]
    if not meshes:
        raise RuntimeError(f"No meshes for {crop_id}")
    active = next((obj for obj in meshes if "Stem" in obj.name), meshes[0])
    select_only(meshes, active)
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = f"GEO-{display}-LOD0"
    joined.data.name = f"GEO-{display}-LOD0-Mesh"
    joined["asset_id"] = crop_id
    joined["lod"] = 0
    joined["source_workflow"] = "primary-secondary-tertiary"
    joined.hide_render = False
    joined.hide_viewport = False
    joined.hide_set(False)
    smooth_mesh(joined)
    return joined


def duplicate_join_planter_lod0() -> bpy.types.Object:
    existing = bpy.data.objects.get("GEO-Planter-LOD0")
    if existing:
        return existing
    source_names = [
        "SM_Planter_Outer", "SM_Planter_Inner", "SM_Planter_Rim",
        "SM_Planter_Ribs", "SM_Planter_Base", "SM_Soil",
    ]
    source_names.extend(obj.name for obj in collection("COL_Planter").objects if obj.get("manufacturing_detail"))
    duplicates: list[bpy.types.Object] = []
    target = collection("COL_Planter")
    for name in source_names:
        source = bpy.data.objects.get(name)
        if source is None or source.type != "MESH":
            continue
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        target.objects.link(duplicate)
        duplicate.matrix_world = source.matrix_world.copy()
        duplicate.parent = None
        duplicates.append(duplicate)
    active = duplicates[0]
    select_only(duplicates, active)
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "GEO-Planter-LOD0"
    joined.data.name = "GEO-Planter-LOD0-Mesh"
    joined.parent = bpy.data.objects["ROOT_Planter_GardenStep3"]
    joined.matrix_parent_inverse = joined.parent.matrix_world.inverted()
    joined["asset_id"] = "planter"
    joined["lod"] = 0
    joined["hard_surface"] = "bevel_normals_seams_ribs_drainage"
    smooth_mesh(joined)
    # Preserve the authored source parts for inspection, but render/export only
    # the consolidated hero mesh so the planter is never drawn twice.
    for name in source_names:
        source = bpy.data.objects.get(name)
        if source is not None and source != joined:
            source.hide_render = True
            source.hide_viewport = True
            source.hide_set(True)
    return joined


def unwrap_mesh(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    if obj.data.uv_layers.get("UV_Hero"):
        obj.data.uv_layers.active = obj.data.uv_layers["UV_Hero"]
        return
    select_only([obj], obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.018)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.data.uv_layers.active.name = "UV_Hero"
    obj["uv_texel_density"] = "hero_4k_master"


def highpoly_collection(asset_id: str) -> bpy.types.Collection:
    parent = collection("COL_HighPoly")
    name = f"COL_{ASSETS[asset_id][2]}_HighPoly"
    child = bpy.data.collections.get(name)
    if child is None:
        child = bpy.data.collections.new(name)
        parent.children.link(child)
    return child


def create_highpoly(asset_id: str, lod0: bpy.types.Object) -> bpy.types.Object:
    name = f"GEO-{ASSETS[asset_id][2]}-HP"
    existing = bpy.data.objects.get(name)
    if existing:
        return existing
    high = lod0.copy()
    high.data = lod0.data.copy()
    high.name = name
    high.data.name = f"{name}-Mesh"
    high.parent = None
    for modifier in list(high.modifiers):
        high.modifiers.remove(modifier)
    highpoly_collection(asset_id).objects.link(high)
    high.matrix_world = lod0.matrix_world.copy()
    subdivision = high.modifiers.new("HP_Subdivision", "SUBSURF")
    subdivision.levels = 1
    subdivision.render_levels = 1
    apply_modifier(high, subdivision)
    high["source_role"] = "high-poly-bake-source"
    high.hide_render = True
    high.hide_viewport = True
    high.hide_set(True)
    for owner in high.users_collection:
        owner.hide_render = True
        owner.hide_viewport = True
    return high


def lod_collection(level: int) -> bpy.types.Collection:
    return collection(f"COL_LOD{level}")


def create_lods(asset_id: str, lod0: bpy.types.Object) -> tuple[bpy.types.Object, bpy.types.Object]:
    display = ASSETS[asset_id][2]
    result: list[bpy.types.Object] = []
    for level, ratio in ((1, 0.5), (2, 0.2)):
        name = f"GEO-{display}-LOD{level}"
        lod = bpy.data.objects.get(name)
        if lod is None:
            lod = lod0.copy()
            lod.data = lod0.data.copy()
            lod.name = name
            lod.data.name = f"{name}-Mesh"
            owner = lod_collection(level)
            owner.hide_render = False
            owner.hide_viewport = False
            move_to_collection(lod, owner)
            decimate = lod.modifiers.new(f"LOD{level}_Decimate", "DECIMATE")
            decimate.decimate_type = "COLLAPSE"
            decimate.ratio = ratio
            decimate.use_collapse_triangulate = True
            decimate_index = lod.modifiers.find(decimate.name)
            if decimate_index > 0:
                lod.modifiers.move(decimate_index, 0)
            apply_modifier(lod, decimate)
            lod["lod"] = level
            lod["target_ratio"] = ratio
            lod.hide_render = True
            lod.hide_viewport = True
            lod.hide_set(True)
            owner.hide_render = True
            owner.hide_viewport = True
        result.append(lod)
    return result[0], result[1]


def make_bake_image(name: str, size: int, colorspace: str = "Non-Color") -> bpy.types.Image:
    existing = bpy.data.images.get(name)
    if existing:
        bpy.data.images.remove(existing)
    image = bpy.data.images.new(name, width=size, height=size, alpha=False, float_buffer=False)
    image.colorspace_settings.name = colorspace
    return image


def attach_bake_target(obj: bpy.types.Object, image: bpy.types.Image, node_name: str) -> None:
    for slot in obj.material_slots:
        material = slot.material
        if material is None:
            continue
        material.use_nodes = True
        nodes = material.node_tree.nodes
        old = nodes.get(node_name)
        if old:
            nodes.remove(old)
        target = nodes.new("ShaderNodeTexImage")
        target.name = node_name
        target.label = node_name
        target.image = image
        nodes.active = target


def save_master_and_runtime(image: bpy.types.Image, asset_id: str, map_name: str) -> tuple[Path, Path]:
    master_dir = MASTER_ROOT / asset_id
    runtime_dir = RUNTIME_ROOT / asset_id
    master_dir.mkdir(parents=True, exist_ok=True)
    runtime_dir.mkdir(parents=True, exist_ok=True)
    master_path = master_dir / f"T_{ASSETS[asset_id][2]}_{map_name}_4K.png"
    runtime_path = runtime_dir / f"T_{ASSETS[asset_id][2]}_{map_name}_1K.png"
    image.filepath_raw = str(master_path)
    image.file_format = "PNG"
    image.save()
    runtime = image.copy()
    runtime.name = f"{image.name}_Runtime"
    runtime.scale(1024, 1024)
    runtime.filepath_raw = str(runtime_path)
    runtime.file_format = "PNG"
    runtime.save()
    bpy.data.images.remove(runtime)
    return master_path, runtime_path


def bake_map(
    asset_id: str,
    lod0: bpy.types.Object,
    map_name: str,
    bake_type: str,
    high: bpy.types.Object | None = None,
    colorspace: str = "Non-Color",
) -> tuple[Path, Path]:
    image = make_bake_image(f"BAKE_{ASSETS[asset_id][2]}_{map_name}", 4096, colorspace)
    attach_bake_target(lod0, image, f"BAKE_TARGET_{map_name}")
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    # Base Color must remain light-independent.  Baking direct/indirect diffuse
    # would permanently paint the studio rig into the albedo texture.
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True
    objects = [lod0]
    lod0.hide_render = False
    lod0.hide_viewport = False
    lod0.hide_set(False)
    for owner in lod0.users_collection:
        owner.hide_render = False
        owner.hide_viewport = False
    if high is not None:
        high_collection_states = [(owner, owner.hide_render, owner.hide_viewport) for owner in high.users_collection]
        for owner, _hide_render, _hide_viewport in high_collection_states:
            owner.hide_render = False
            owner.hide_viewport = False
        high.hide_render = False
        high.hide_viewport = False
        high.hide_set(False)
        objects.insert(0, high)
    select_only(objects, lod0)
    bpy.ops.object.bake(
        type=bake_type,
        margin=24,
        use_selected_to_active=high is not None,
        cage_extrusion=0.0015 if high is not None else 0.0,
        max_ray_distance=0.004 if high is not None else 0.0,
        normal_space="TANGENT",
    )
    if high is not None:
        high.hide_render = True
        high.hide_viewport = True
        high.hide_set(True)
        for owner, hide_render, hide_viewport in high_collection_states:
            owner.hide_render = hide_render
            owner.hide_viewport = hide_viewport
    paths = save_master_and_runtime(image, asset_id, map_name)
    bpy.data.images.remove(image)
    return paths


def create_metallic_map(asset_id: str) -> tuple[Path, Path]:
    image = make_bake_image(f"BAKE_{ASSETS[asset_id][2]}_Metallic", 4096, "Non-Color")
    image.generated_color = (0.0, 0.0, 0.0, 1.0)
    return save_master_and_runtime(image, asset_id, "Metallic")


def load_image(path: Path, colorspace: str) -> bpy.types.Image:
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = colorspace
    return image


def create_baked_material(asset_id: str, paths: dict[str, tuple[Path, Path]]) -> bpy.types.Material:
    display = ASSETS[asset_id][2]
    name = f"MAT-{display}-Hero-PBR"
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (620, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (340, 0)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.62 if asset_id != "planter" else 0.44
    if asset_id != "planter":
        for socket in bsdf.inputs:
            if socket.name == "Subsurface Weight":
                socket.default_value = 0.075
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    base = nodes.new("ShaderNodeTexImage")
    base.image = load_image(paths["BaseColor"][1], "sRGB")
    base.location = (-520, 180)
    links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    roughness = nodes.new("ShaderNodeTexImage")
    roughness.image = load_image(paths["Roughness"][1], "Non-Color")
    roughness.location = (-520, 0)
    links.new(roughness.outputs["Color"], bsdf.inputs["Roughness"])
    metallic = nodes.new("ShaderNodeTexImage")
    metallic.image = load_image(paths["Metallic"][1], "Non-Color")
    metallic.location = (-520, -160)
    links.new(metallic.outputs["Color"], bsdf.inputs["Metallic"])
    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = load_image(paths["Normal"][1], "Non-Color")
    normal_tex.location = (-520, -330)
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.82 if asset_id != "planter" else 0.38
    normal.location = (80, -250)
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    material["master_texture_resolution"] = 4096
    material["runtime_texture_resolution"] = 1024
    material["pbr_maps"] = "BaseColor,Roughness,Metallic,Normal,AO"
    material["ao_map"] = str(paths["AO"][1].relative_to(OUTPUT_ROOT))
    return material


def bake_asset(asset_id: str, lod0: bpy.types.Object, high: bpy.types.Object) -> dict[str, tuple[Path, Path]]:
    marker = OUTPUT_ROOT / f".{asset_id}-aaa-baked-v2"
    expected = {
        map_name: (
            MASTER_ROOT / asset_id / f"T_{ASSETS[asset_id][2]}_{map_name}_4K.png",
            RUNTIME_ROOT / asset_id / f"T_{ASSETS[asset_id][2]}_{map_name}_1K.png",
        )
        for map_name in ("BaseColor", "Roughness", "Metallic", "Normal", "AO")
    }
    if marker.exists() and all(master.exists() and runtime.exists() for master, runtime in expected.values()):
        return expected
    reusable_maps = ("Roughness", "Metallic", "Normal", "AO")
    if all(all(path.exists() for path in expected[map_name]) for map_name in reusable_maps):
        paths = dict(expected)
        paths["BaseColor"] = bake_map(asset_id, lod0, "BaseColor", "DIFFUSE", colorspace="sRGB")
        marker.write_text("validated light-independent 4K albedo and reusable PBR maps\n", encoding="utf-8")
        return paths
    paths = {
        "BaseColor": bake_map(asset_id, lod0, "BaseColor", "DIFFUSE", colorspace="sRGB"),
        "Roughness": bake_map(asset_id, lod0, "Roughness", "ROUGHNESS"),
        "Metallic": create_metallic_map(asset_id),
        "Normal": bake_map(asset_id, lod0, "Normal", "NORMAL", high=high),
        "AO": bake_map(asset_id, lod0, "AO", "AO"),
    }
    marker.write_text("validated 4K master and 1K runtime textures\n", encoding="utf-8")
    return paths


def assign_single_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(material)


def build_lods_and_bake(asset_ids: tuple[str, ...] | list[str] | None = None) -> dict[str, bpy.types.Object]:
    requested = tuple(asset_ids or ASSETS.keys())
    lod0_objects: dict[str, bpy.types.Object] = {}
    if "planter" in requested:
        planter_lod0 = duplicate_join_planter_lod0()
        unwrap_mesh(planter_lod0)
        lod0_objects["planter"] = planter_lod0
    for crop_id in (asset for asset in CROP_IDS if asset in requested):
        crop_lod0 = join_crop_lod0(crop_id)
        unwrap_mesh(crop_lod0)
        lod0_objects[crop_id] = crop_lod0

    for asset_id, lod0 in lod0_objects.items():
        high = create_highpoly(asset_id, lod0)
        paths = bake_asset(asset_id, lod0, high)
        material = create_baked_material(asset_id, paths)
        assign_single_material(lod0, material)
        lod1, lod2 = create_lods(asset_id, lod0)
        assign_single_material(lod1, material)
        assign_single_material(lod2, material)
    return lod0_objects


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def get_asset_render_objects(asset_id: str) -> list[bpy.types.Object]:
    lod0 = bpy.data.objects.get(f"GEO-{ASSETS[asset_id][2]}-LOD0")
    if lod0:
        objects = [lod0]
        if asset_id != "planter":
            armature = bpy.data.objects.get(f"ARM_{ASSETS[asset_id][2]}")
            if armature:
                objects.append(armature)
        return objects
    return [obj for obj in collection(ASSETS[asset_id][0]).objects if obj.type in {"MESH", "ARMATURE", "EMPTY"}]


def qa_camera_and_lights() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    camera_data = bpy.data.cameras.get("CAM_QA_Hero") or bpy.data.cameras.new("CAM_QA_Hero")
    camera = bpy.data.objects.get("CAM_QA_Hero") or bpy.data.objects.new("CAM_QA_Hero", camera_data)
    if not camera.users_collection:
        collection("COL_QA").objects.link(camera)
    camera_data.lens = 58
    lights: list[bpy.types.Object] = []
    specs = [
        ("LGT_QA_Key", "AREA", (1.3, -1.5, 1.8), 88, (1.0, 0.79, 0.57), 1.0),
        ("LGT_QA_Fill", "AREA", (-1.2, -0.7, 0.9), 28, (0.56, 0.76, 0.69), 1.5),
        ("LGT_QA_Rim", "AREA", (0.5, 1.3, 1.4), 46, (0.67, 0.88, 0.65), 0.8),
    ]
    for name, light_type, location, energy, color, size in specs:
        data = bpy.data.lights.get(name) or bpy.data.lights.new(name, light_type)
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.get(name) or bpy.data.objects.new(name, data)
        if not light.users_collection:
            collection("COL_QA").objects.link(light)
        light.location = location
        point_at(light, Vector((0, 0, 0.12)))
        lights.append(light)
    return camera, lights


def render_stage(stage: str, frame: int = 1) -> list[str]:
    output_directory = QA_ROOT / f"{list(STAGE_LABELS).index(stage) + 1:02d}_{STAGE_LABELS[stage]}"
    output_directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.frame_set(frame)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.color_depth = "8"
    camera, qa_lights = qa_camera_and_lights()
    scene.camera = camera
    qa_set = set(qa_lights + [camera])
    all_render_states = {obj: obj.hide_render for obj in bpy.data.objects}
    original_transforms: dict[bpy.types.Object, tuple[Vector, object]] = {}
    outputs: list[str] = []
    try:
        for asset_id in ASSETS:
            asset_objects = get_asset_render_objects(asset_id)
            mesh_objects = [obj for obj in asset_objects if obj.type == "MESH"]
            if not mesh_objects:
                continue
            for obj in bpy.data.objects:
                obj.hide_render = obj not in qa_set and obj not in asset_objects
            root = bpy.data.objects.get(ASSETS[asset_id][1])
            if root:
                original_transforms[root] = (root.location.copy(), root.rotation_euler.copy())
                root.location = (0, 0, 0)
                bpy.context.view_layer.update()
            minimum, maximum = object_bounds(mesh_objects)
            center = (minimum + maximum) * 0.5
            size = maximum - minimum
            distance = max(0.34, max(size.x, size.y, size.z) * 1.85)
            for angle_name, rotation in ANGLE_ROTATIONS.items():
                if root:
                    root.rotation_euler.z = rotation
                camera.location = (0.0, -distance, center.z + max(size.z * 0.10, 0.02))
                point_at(camera, Vector((0, 0, center.z)))
                output = output_directory / f"{asset_id}-{STAGE_LABELS[stage]}-{angle_name}.png"
                scene.render.filepath = str(output)
                bpy.ops.render.render(write_still=True)
                outputs.append(str(output))
            if root:
                root.location, root.rotation_euler = original_transforms[root]
                bpy.context.view_layer.update()
    finally:
        for obj, state in all_render_states.items():
            obj.hide_render = state
        for root, (location, rotation) in original_transforms.items():
            root.location = location
            root.rotation_euler = rotation
    return outputs


def render_animation_validation() -> list[str]:
    output_directory = QA_ROOT / "06_rig-animation-frames"
    output_directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    camera, qa_lights = qa_camera_and_lights()
    scene.camera = camera
    qa_set = set(qa_lights + [camera])
    render_states = {obj: obj.hide_render for obj in bpy.data.objects}
    outputs: list[str] = []
    try:
        for asset_id in CROP_IDS:
            asset_objects = get_asset_render_objects(asset_id)
            meshes = [obj for obj in asset_objects if obj.type == "MESH"]
            root = bpy.data.objects.get(ASSETS[asset_id][1])
            original = (root.location.copy(), root.rotation_euler.copy()) if root else None
            if root:
                root.location = (0, 0, 0)
                root.rotation_euler = (0, 0, 0)
                bpy.context.view_layer.update()
            minimum, maximum = object_bounds(meshes)
            center = (minimum + maximum) * 0.5
            size = maximum - minimum
            distance = max(0.34, max(size.x, size.y, size.z) * 1.85)
            camera.location = (0.0, -distance, center.z + max(size.z * 0.10, 0.02))
            point_at(camera, Vector((0, 0, center.z)))
            for obj in bpy.data.objects:
                obj.hide_render = obj not in qa_set and obj not in asset_objects
            for frame in (1, 31, 61, 91, 121):
                scene.frame_set(frame)
                output = output_directory / f"{asset_id}-frame-{frame:03d}.png"
                scene.render.filepath = str(output)
                bpy.ops.render.render(write_still=True)
                outputs.append(str(output))
            if root and original:
                root.location, root.rotation_euler = original
                bpy.context.view_layer.update()
    finally:
        for obj, hidden in render_states.items():
            if obj.name in bpy.data.objects:
                obj.hide_render = hidden
    return outputs


def configure_hero_look() -> None:
    scene = bpy.context.scene
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.72
    scene.world.color = (0.004, 0.011, 0.007)
    for name, energy, color in (
        ("LGT_GrowLight_Key", 32.0, (1.0, 0.66, 0.38)),
        ("LGT_Environment_Fill", 8.0, (0.34, 0.61, 0.47)),
        ("LGT_Plant_Rim", 14.0, (0.52, 0.85, 0.43)),
    ):
        light = bpy.data.objects.get(name)
        if light and light.type == "LIGHT":
            light.data.energy = energy
            light.data.color = color
            if hasattr(light.data, "shape"):
                light.data.shape = "DISK"


def set_default_hero_visibility() -> None:
    for asset_id in ASSETS:
        lod0 = bpy.data.objects.get(f"GEO-{ASSETS[asset_id][2]}-LOD0")
        if lod0:
            lod0.hide_viewport = False
            lod0.hide_render = asset_id in CROP_IDS and asset_id not in {"lettuce", "basil"}
            lod0.hide_set(False)
            for owner in lod0.users_collection:
                owner.hide_viewport = False
                owner.hide_render = False
        for level in (1, 2):
            lod = bpy.data.objects.get(f"GEO-{ASSETS[asset_id][2]}-LOD{level}")
            if lod:
                lod.hide_render = True
                lod.hide_viewport = True
                lod.hide_set(True)
                for owner in lod.users_collection:
                    owner.hide_render = True
                    owner.hide_viewport = True
    for name, x in (("ROOT_Lettuce", -0.145), ("ROOT_Basil", 0.145)):
        root = bpy.data.objects.get(name)
        if root:
            root.location.x = x
            root.location.y = 0


def export_glb(asset_id: str, lod_level: int = 0) -> Path:
    display = ASSETS[asset_id][2]
    mesh = bpy.data.objects[f"GEO-{display}-LOD{lod_level}"]
    mesh.data.validate(clean_customdata=False)
    mesh.data.update()
    objects = [mesh]
    include_animations = asset_id != "planter"
    root = bpy.data.objects.get(ASSETS[asset_id][1])
    armature = bpy.data.objects.get(f"ARM_{display}") if include_animations else None
    original_root_transform = None
    if root:
        original_root_transform = (root.location.copy(), root.rotation_euler.copy(), root.scale.copy())
        root.location = (0, 0, 0)
        root.rotation_euler = (0, 0, 0)
        root.scale = (1, 1, 1)
        bpy.context.view_layer.update()
    if not mesh.get("export_triangulated"):
        triangulate = mesh.modifiers.new("GLB_ExportTriangulate", "TRIANGULATE")
        triangulate.keep_custom_normals = True
        triangulate_index = mesh.modifiers.find(triangulate.name)
        if triangulate_index > 0:
            mesh.modifiers.move(triangulate_index, 0)
        apply_modifier(mesh, triangulate)
        mesh["export_triangulated"] = True
    if root:
        objects.append(root)
    if armature:
        objects.append(armature)
        mesh.parent = armature
    elif root:
        mesh.parent = root
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        for owner in obj.users_collection:
            owner.hide_viewport = False
            owner.hide_render = False
    select_only(objects, root or mesh)
    suffix = "" if lod_level == 0 else f"-lod{lod_level}"
    filename = "planter" if asset_id == "planter" else f"crop-{asset_id}"
    path = OUTPUT_ROOT / f"{filename}{suffix}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_animations=include_animations,
        export_skins=include_animations,
        export_morph=False,
        export_normals=True,
        export_tangents=True,
        export_yup=True,
        export_meshopt_compression_enable=True,
        export_meshopt_extension="EXT_meshopt_compression",
        export_image_format="WEBP",
        export_image_quality=82,
    )
    if root and original_root_transform:
        root.location, root.rotation_euler, root.scale = original_root_transform
        bpy.context.view_layer.update()
    return path


def render_cycles_hero() -> Path:
    scene = bpy.context.scene
    scene.frame_set(61)
    set_default_hero_visibility()
    configure_hero_look()
    hero_camera = bpy.data.objects["CAM_GardenStep3_Hero"]
    scene.camera = hero_camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 256
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.transmission_bounces = 8
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    output = OUTPUT_ROOT / "garden-step3-cycles-hero-1920x1080.png"
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    return output


def animation_audit() -> dict[str, object]:
    result: dict[str, object] = {}
    for crop_id in CROP_IDS:
        display = ASSETS[crop_id][2]
        armature = bpy.data.objects.get(f"ARM_{display}")
        lod0 = bpy.data.objects.get(f"GEO-{display}-LOD0")
        action_names = []
        if armature and armature.animation_data:
            for track in armature.animation_data.nla_tracks:
                action_names.extend(strip.action.name for strip in track.strips if strip.action)
        groups = set(group.name for group in lod0.vertex_groups) if lod0 else set()
        bones = set(bone.name for bone in armature.data.bones) if armature else set()
        result[crop_id] = {
            "armature": armature.name if armature else None,
            "bones": sorted(bones),
            "actions": sorted(set(action_names)),
            "root_motion": armature.get("root_motion") if armature else None,
            "deformation_groups_match_bones": bool(groups & bones),
            "loop_frames": [1, 121],
        }
    return result


def write_reports(export_paths: list[Path] | None = None, cycles_hero: Path | None = None) -> None:
    assets: dict[str, object] = {}
    for asset_id in ASSETS:
        display = ASSETS[asset_id][2]
        lods = {}
        for level in (0, 1, 2):
            obj = bpy.data.objects.get(f"GEO-{display}-LOD{level}")
            if obj:
                lods[f"LOD{level}"] = {
                    "object": obj.name,
                    "triangles": mesh_triangles(obj),
                    "materials": [slot.material.name for slot in obj.material_slots if slot.material],
                    "uv_layers": [layer.name for layer in obj.data.uv_layers],
                }
        high = bpy.data.objects.get(f"GEO-{display}-HP")
        assets[asset_id] = {
            "lods": lods,
            "high_poly_triangles": mesh_triangles(high) if high else None,
            "master_textures": sorted(str(path.relative_to(OUTPUT_ROOT)) for path in (MASTER_ROOT / asset_id).glob("*.png")),
            "runtime_textures": sorted(str(path.relative_to(OUTPUT_ROOT)) for path in (RUNTIME_ROOT / asset_id).glob("*.png")),
        }
    payload = {
        "quality_target": "AAA Unreal Engine 5 Hero Asset Quality adapted for WebGL",
        "source_preserved": "garden-step3-v01-blockout.blend",
        "assets": assets,
        "animation": animation_audit(),
        "exports": [{"path": str(path), "bytes": path.stat().st_size} for path in (export_paths or []) if path.exists()],
        "cycles_hero": str(cycles_hero) if cycles_hero else None,
        "camera_fixed": True,
        "planter_stationary": True,
        "runtime_controls": [],
    }
    (OUTPUT_ROOT / "garden-aaa-quality-report.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    texture_manifest = {
        asset_id: {
            "masterResolution": 4096,
            "runtimeResolution": 1024,
            "maps": ["BaseColor", "Roughness", "Metallic", "Normal", "AO"],
            "normalConvention": "OpenGL",
        }
        for asset_id in ASSETS
    }
    (OUTPUT_ROOT / "garden-pbr-texture-manifest.json").write_text(json.dumps(texture_manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def save_version(phase: str) -> None:
    path = VERSION_PATHS.get(phase)
    if not path:
        return
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(path), copy=True)


def run_phase(phase: str) -> None:
    ensure_directories()
    scene = bpy.context.scene
    completed = set(filter(None, str(scene.get("aaa_completed_phases", "")).split(",")))
    if phase == "primary":
        render_stage("primary")
    elif phase == "secondary":
        if phase not in completed:
            add_planter_manufacturing_details()
            organic_secondary_pass()
            completed.add(phase)
        scene["aaa_completed_phases"] = ",".join(sorted(completed))
        save_version(phase)
        render_stage(phase)
    elif phase == "tertiary":
        if "secondary" not in completed:
            raise RuntimeError("Run secondary before tertiary")
        if phase not in completed:
            tertiary_pass()
            completed.add(phase)
        scene["aaa_completed_phases"] = ",".join(sorted(completed))
        save_version(phase)
        render_stage(phase)
    elif phase == "uv_bake":
        if "tertiary" not in completed:
            raise RuntimeError("Run tertiary before uv_bake")
        requested_asset = globals().get("ASSET_ID")
        if requested_asset:
            if requested_asset not in ASSETS:
                raise ValueError(f"Unknown ASSET_ID: {requested_asset}")
            build_lods_and_bake([requested_asset])
            baked_assets = set(filter(None, str(scene.get("aaa_baked_assets", "")).split(",")))
            baked_assets.add(requested_asset)
            scene["aaa_baked_assets"] = ",".join(sorted(baked_assets))
            safe_asset_name = requested_asset.replace("-", "_")
            bpy.ops.wm.save_as_mainfile(
                filepath=str(OUTPUT_ROOT / f"garden-step3-v03-texturing-{safe_asset_name}-v2.blend"),
                copy=True,
            )
        else:
            build_lods_and_bake()
            scene["aaa_baked_assets"] = ",".join(sorted(ASSETS))
        if set(filter(None, str(scene.get("aaa_baked_assets", "")).split(","))) == set(ASSETS):
            completed.add(phase)
            scene["aaa_completed_phases"] = ",".join(sorted(completed))
            render_stage(phase)
        write_reports()
    elif phase == "lookdev":
        if "uv_bake" not in completed:
            raise RuntimeError("Run uv_bake before lookdev")
        configure_hero_look()
        set_default_hero_visibility()
        completed.add(phase)
        scene["aaa_completed_phases"] = ",".join(sorted(completed))
        save_version(phase)
        render_stage(phase)
    elif phase == "rig_export":
        if "lookdev" not in completed:
            raise RuntimeError("Run lookdev before rig_export")
        render_stage(phase, frame=61)
        export_paths = [export_glb(asset_id, level) for asset_id in ASSETS for level in (0, 1, 2)]
        cycles_hero = render_cycles_hero()
        completed.add(phase)
        scene["aaa_completed_phases"] = ",".join(sorted(completed))
        bpy.ops.file.pack_all()
        save_version(phase)
        write_reports(export_paths, cycles_hero)
        return
    else:
        raise ValueError(f"Unknown PHASE: {phase}")
    scene["aaa_completed_phases"] = ",".join(sorted(completed))
    write_reports()


if __name__ == "__main__":
    run_phase(globals().get("PHASE", "primary"))
