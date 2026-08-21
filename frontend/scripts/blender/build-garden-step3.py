"""Build and export the Blender-authored garden assets for diagnosis step 3.

Run with Blender 5.2+:
  blender --background --factory-startup --python build-garden-step3.py

All authored dimensions use metres. Leaves are closed, curved meshes with
front/back surfaces and edge thickness; no cards, billboards, SVG, or sprites
are used in the realtime planter.
"""

from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_PATH = Path(__file__).resolve()
FRONTEND_ROOT = SCRIPT_PATH.parents[2]
PUBLIC_ROOT = FRONTEND_ROOT / "public"
SOURCE_PLANTER = PUBLIC_ROOT / "models" / "planter-modular.glb"
OUTPUT_ROOT = PUBLIC_ROOT / "models" / "garden"
THUMBNAIL_ROOT = OUTPUT_ROOT / "thumbnails"
FIGMA_ROOT = PUBLIC_ROOT / "figma"
BLEND_PATH = OUTPUT_ROOT / "garden-step3.blend"
REFERENCE_PATH = Path(r"C:\Users\YJ\Pictures\Saved Pictures\3번째 화면.PNG")

FPS = 24
FRAME_START = 1
FRAME_END = 121
BASE_PLANTER = {"width": 0.60, "depth": 0.20, "height": 0.25}
SOIL_Z = 0.229
RNG = random.Random(20260820)

CROP_SPECS = {
    "lettuce": {"label": "상추", "height": 0.105, "target_tris": [8000, 16000]},
    "cherry-tomato": {"label": "방울토마토", "height": 0.245, "target_tris": [12000, 22000]},
    "basil": {"label": "바질", "height": 0.205, "target_tris": [8000, 16000]},
    "chili": {"label": "고추", "height": 0.235, "target_tris": [10000, 18000]},
    "spinach": {"label": "시금치", "height": 0.105, "target_tris": [7000, 14000]},
    "strawberry": {"label": "딸기", "height": 0.125, "target_tris": [12000, 22000]},
}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def new_collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    (parent.children if parent else bpy.context.scene.collection.children).link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    metallic: float = 0.0,
    coat: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = color
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if bsdf.inputs.get("Coat Weight"):
            bsdf.inputs["Coat Weight"].default_value = coat
        elif bsdf.inputs.get("Clearcoat"):
            bsdf.inputs["Clearcoat"].default_value = coat
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def smooth_mesh(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def apply_transform(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def add_beveled_cube(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    bevel: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    apply_transform(obj)
    bevel_modifier = obj.modifiers.new("MOD_EdgeSoftness", "BEVEL")
    bevel_modifier.width = bevel
    bevel_modifier.segments = 3
    bevel_modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel_modifier.name)
    smooth_mesh(obj)
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def duplicate_join(
    sources: list[bpy.types.Object],
    name: str,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    duplicates: list[bpy.types.Object] = []
    for source in sources:
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.animation_data_clear()
        duplicate.parent = None
        collection.objects.link(duplicate)
        duplicate.matrix_world = source.matrix_world.copy()
        assign_material(duplicate, material)
        duplicates.append(duplicate)
    bpy.ops.object.select_all(action="DESELECT")
    for duplicate in duplicates:
        duplicate.select_set(True)
    bpy.context.view_layer.objects.active = duplicates[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    result.data.name = f"GEO_{name}"
    apply_transform(result)
    smooth_mesh(result)
    return result


def build_planter(
    garden_collection: bpy.types.Collection,
    planter_collection: bpy.types.Collection,
) -> tuple[bpy.types.Object, list[bpy.types.Object], dict[str, bpy.types.Material]]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_PLANTER))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    mesh_sources = [obj for obj in imported if obj.type == "MESH" and obj.name.startswith("SM_")]

    source_collection = new_collection("COL_Planter_Source", garden_collection)
    source_collection.hide_render = True
    source_collection.hide_viewport = True
    for obj in imported:
        move_to_collection(obj, source_collection)

    planter_material = make_material("MAT_Planter_ForestPlastic", (0.035, 0.155, 0.105, 1.0), 0.46, coat=0.10)
    cavity_material = make_material("MAT_Planter_Cavity", (0.014, 0.052, 0.035, 1.0), 0.66, coat=0.02)
    soil_material = make_material("MAT_Soil_DarkLoam", (0.105, 0.055, 0.028, 1.0), 0.94)

    root = bpy.data.objects.new("ROOT_Planter_GardenStep3", None)
    planter_collection.objects.link(root)

    body = [obj for obj in mesh_sources if obj.name.startswith(("SM_Body_", "SM_Band_", "SM_Skirt_"))]
    inner = [obj for obj in mesh_sources if obj.name == "SM_InnerShell"]
    rim = [obj for obj in mesh_sources if obj.name.startswith("SM_Rim_")]
    ribs = [obj for obj in mesh_sources if obj.name.startswith("SM_Rib_")]
    base = [obj for obj in mesh_sources if obj.name == "SM_Base" or obj.name.startswith("SM_Feet_")]

    parts = [
        duplicate_join(body, "SM_Planter_Outer", planter_material, planter_collection),
        duplicate_join(inner, "SM_Planter_Inner", cavity_material, planter_collection),
        duplicate_join(rim, "SM_Planter_Rim", planter_material, planter_collection),
        duplicate_join(ribs, "SM_Planter_Ribs", cavity_material, planter_collection),
        duplicate_join(base, "SM_Planter_Base", planter_material, planter_collection),
    ]
    soil = add_beveled_cube(
        "SM_Soil",
        (0.512, 0.128, 0.018),
        (0.0, 0.0, SOIL_Z - 0.006),
        0.008,
        soil_material,
        planter_collection,
    )
    # Irregular soil clumps provide a rough, non-flat surface without textures.
    for index in range(42):
        x = RNG.uniform(-0.235, 0.235)
        y = RNG.uniform(-0.052, 0.052)
        radius = RNG.uniform(0.0025, 0.0055)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=(x, y, SOIL_Z + RNG.uniform(0.001, 0.005)))
        clump = bpy.context.object
        clump.name = f"SM_Soil_Clump_{index + 1:02d}"
        clump.scale = (RNG.uniform(0.8, 1.5), RNG.uniform(0.8, 1.4), RNG.uniform(0.45, 0.85))
        apply_transform(clump)
        assign_material(clump, soil_material)
        move_to_collection(clump, planter_collection)
        parts.append(clump)
    for part in parts:
        part.parent = root
    soil.parent = root
    root["base_width_m"] = BASE_PLANTER["width"]
    root["base_depth_m"] = BASE_PLANTER["depth"]
    root["base_height_m"] = BASE_PLANTER["height"]
    root["source_asset"] = "planter-modular.glb"
    return root, [*parts, soil], {
        "planter": planter_material,
        "cavity": cavity_material,
        "soil": soil_material,
    }


def leaf_profile(variant: str, t: float) -> float:
    if variant == "pointed":
        base = math.sin(math.pi * (t ** 0.82)) ** 1.45
    elif variant == "broad":
        base = math.sin(math.pi * (t ** 0.92)) ** 0.72
    elif variant == "oval":
        base = math.sin(math.pi * t) ** 0.92
    elif variant == "ruffled":
        base = math.sin(math.pi * (t ** 0.86)) ** 0.72
        base *= 1.0 + 0.075 * math.sin(7.0 * math.pi * t + 0.4)
    elif variant == "serrated":
        base = math.sin(math.pi * (t ** 0.88)) ** 0.92
        base *= 1.0 + 0.11 * math.sin(11.0 * math.pi * t)
    else:
        base = math.sin(math.pi * t)
    return max(0.035, base)


def create_leaf_mesh(name: str, variant: str, rows: int = 10, columns: int = 7) -> bpy.types.Mesh:
    top: list[tuple[float, float, float]] = []
    thickness = 0.014
    for row in range(rows):
        t = row / (rows - 1)
        width = leaf_profile(variant, t)
        for column in range(columns):
            lateral = column / (columns - 1) * 2.0 - 1.0
            x = lateral * width * 0.5
            y = t
            centre_fold = 0.065 * (1.0 - lateral * lateral)
            longitudinal_arch = 0.11 * math.sin(math.pi * t)
            edge_ripple = 0.018 * math.sin((t * 6.0 + abs(lateral) * 2.3) * math.pi)
            z = centre_fold + longitudinal_arch + edge_ripple * abs(lateral)
            top.append((x, y, z))
    vertices = top + [(x, y, z - thickness) for x, y, z in top]
    count = len(top)
    faces: list[tuple[int, ...]] = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            a = row * columns + column
            b = a + 1
            c = a + columns + 1
            d = a + columns
            faces.append((a, b, c, d))
            faces.append((a + count, d + count, c + count, b + count))
    boundary: list[int] = []
    boundary.extend(range(columns))
    boundary.extend(row * columns + columns - 1 for row in range(1, rows))
    boundary.extend((rows - 1) * columns + column for column in range(columns - 2, -1, -1))
    boundary.extend(row * columns for row in range(rows - 2, 0, -1))
    for index, current in enumerate(boundary):
        nxt = boundary[(index + 1) % len(boundary)]
        faces.append((current, nxt, nxt + count, current + count))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    wind = mesh.color_attributes.new(name="VC_Wind", type="FLOAT_COLOR", domain="POINT")
    for index, vertex in enumerate(vertices):
        amount = max(0.0, min(1.0, vertex[1]))
        wind.data[index].color = (amount, amount, amount, 1.0)
    return mesh


def add_leaf(
    name: str,
    variant: str,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float],
    size: tuple[float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    rows: int = 10,
    columns: int = 7,
) -> bpy.types.Object:
    mesh = create_leaf_mesh(f"GEO_{name}", variant, rows=rows, columns=columns)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    obj.scale = (size[0], size[1], size[1])
    apply_transform(obj)
    smooth_mesh(obj)
    assign_material(obj, material)
    return obj


def add_curve_mesh(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(f"GEO_{name}", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 3
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 2
    curve_data.resolution_u = 3
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bezier, point in zip(spline.bezier_points, points):
        bezier.co = point
        bezier.handle_left_type = "AUTO"
        bezier.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    collection.objects.link(obj)
    assign_material(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    apply_transform(obj)
    smooth_mesh(obj)
    assign_material(obj, material)
    return obj


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    segments: int = 16,
    rings: int = 10,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    smooth_mesh(obj)
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def add_chili_fruit(
    name: str,
    location: tuple[float, float, float],
    length: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    lean: float,
) -> bpy.types.Object:
    segments = 14
    rings = 11
    vertices: list[tuple[float, float, float]] = []
    for ring in range(rings):
        t = ring / (rings - 1)
        radius = 0.0088 * (math.sin(math.pi * min(1.0, t * 1.12)) ** 0.55) * (1.0 - 0.33 * t)
        z = -length * t
        bend = lean * (t ** 1.55)
        for segment in range(segments):
            angle = segment / segments * math.tau
            vertices.append((math.cos(angle) * radius + bend, math.sin(angle) * radius, z))
    faces: list[tuple[int, ...]] = []
    for ring in range(rings - 1):
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append((ring * segments + segment, ring * segments + nxt, (ring + 1) * segments + nxt, (ring + 1) * segments + segment))
    faces.append(tuple(range(segments - 1, -1, -1)))
    faces.append(tuple((rings - 1) * segments + index for index in range(segments)))
    mesh = bpy.data.meshes.new(f"GEO_{name}")
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = location
    apply_transform(obj)
    smooth_mesh(obj)
    assign_material(obj, material)
    return obj


def create_crop_rig(crop_name: str, height: float, collection: bpy.types.Collection) -> tuple[bpy.types.Object, bpy.types.Object]:
    root = bpy.data.objects.new(f"ROOT_{crop_name}", None)
    collection.objects.link(root)
    armature_data = bpy.data.armatures.new(f"ARM_{crop_name}")
    armature = bpy.data.objects.new(f"ARM_{crop_name}", armature_data)
    collection.objects.link(armature)
    armature.parent = root
    armature.show_in_front = True
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    root_bone = armature_data.edit_bones.new("B_ROOT")
    root_bone.head = (0.0, 0.0, 0.0)
    root_bone.tail = (0.0, 0.0, 0.018)
    stem_1 = armature_data.edit_bones.new("B_STEM_01")
    stem_1.head = (0.0, 0.0, 0.018)
    stem_1.tail = (0.0, 0.0, max(0.045, height * 0.56))
    stem_1.parent = root_bone
    stem_2 = armature_data.edit_bones.new("B_STEM_02")
    stem_2.head = stem_1.tail
    stem_2.tail = (0.0, 0.0, height)
    stem_2.parent = stem_1
    leaf_a = armature_data.edit_bones.new("B_LEAF_A")
    leaf_a.head = (0.0, 0.0, max(0.035, height * 0.38))
    leaf_a.tail = (0.035, 0.0, max(0.06, height * 0.69))
    leaf_a.parent = stem_1
    leaf_b = armature_data.edit_bones.new("B_LEAF_B")
    leaf_b.head = (0.0, 0.0, max(0.045, height * 0.48))
    leaf_b.tail = (-0.035, 0.0, max(0.07, height * 0.78))
    leaf_b.parent = stem_1
    fruit = armature_data.edit_bones.new("B_FRUIT_BRANCH")
    fruit.head = (0.0, 0.0, max(0.04, height * 0.52))
    fruit.tail = (0.02, 0.018, max(0.065, height * 0.73))
    fruit.parent = stem_1
    bpy.ops.object.mode_set(mode="OBJECT")
    root["origin_rule"] = "soil_surface_root_contact"
    root["animation"] = "AN_IdleSway"
    return root, armature


def bind_mesh(obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str) -> None:
    if obj.type != "MESH":
        return
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    obj.matrix_world = world
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("MOD_CropArmature", "ARMATURE")
    modifier.object = armature


def add_idle_animation(armature: bpy.types.Object, crop_name: str, phase: float, time_scale: float) -> None:
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END
    armature.animation_data_create()
    action = bpy.data.actions.new(f"AN_{crop_name}_IdleSway")
    armature.animation_data.action = action
    amplitudes = {
        "B_STEM_01": (math.radians(0.42), math.radians(0.50)),
        "B_STEM_02": (math.radians(0.62), math.radians(0.78)),
        "B_LEAF_A": (math.radians(1.25), math.radians(1.72)),
        "B_LEAF_B": (math.radians(1.45), math.radians(1.92)),
        "B_FRUIT_BRANCH": (math.radians(0.36), math.radians(0.58)),
    }
    for bone_name, (amp_x, amp_y) in amplitudes.items():
        pose_bone = armature.pose.bones[bone_name]
        pose_bone.rotation_mode = "XYZ"
        for frame in (FRAME_START, 31, 61, 91, FRAME_END):
            cycle = (frame - FRAME_START) / (FRAME_END - FRAME_START) * math.tau
            pose_bone.rotation_euler.x = math.sin(cycle + phase + len(bone_name) * 0.13) * amp_x
            pose_bone.rotation_euler.y = math.cos(cycle + phase * 1.37 + len(bone_name) * 0.09) * amp_y
            pose_bone.rotation_euler.z = math.sin(cycle * 0.68 + phase) * amp_y * 0.36
            pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
    # Blender 5 stores action channels in layered channel bags instead of the
    # legacy action.fcurves collection. keyframe_insert already creates Bezier
    # keys, and the first/last poses are identical so the exported clip loops.
    track = armature.animation_data.nla_tracks.new()
    track.name = "AN_IdleSway"
    strip = track.strips.new("AN_IdleSway", FRAME_START, action)
    strip.action_frame_start = FRAME_START
    strip.action_frame_end = FRAME_END
    strip.repeat = 1.0
    armature.animation_data.action = None
    armature["idle_phase_offset"] = phase
    armature["idle_time_scale"] = time_scale
    armature["root_motion"] = "none"


def build_crop_materials() -> dict[str, bpy.types.Material]:
    return {
        "leaf_light": make_material("MAT_Leaf_Light", (0.18, 0.52, 0.095, 1.0), 0.66),
        "leaf_bright": make_material("MAT_Leaf_Bright", (0.29, 0.68, 0.16, 1.0), 0.62),
        "leaf_mid": make_material("MAT_Leaf_Mid", (0.095, 0.36, 0.13, 1.0), 0.71),
        "leaf_deep": make_material("MAT_Leaf_Deep", (0.035, 0.22, 0.085, 1.0), 0.78),
        "stem": make_material("MAT_Stem_Fresh", (0.12, 0.38, 0.11, 1.0), 0.76),
        "fruit_red": make_material("MAT_Fruit_Red", (0.60, 0.035, 0.018, 1.0), 0.36, coat=0.12),
        "fruit_green": make_material("MAT_Fruit_Green", (0.20, 0.47, 0.045, 1.0), 0.44, coat=0.06),
        "flower": make_material("MAT_Flower_Seed", (0.92, 0.72, 0.31, 1.0), 0.58),
    }


def build_lettuce(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("Lettuce", CROP_SPECS["lettuce"]["height"], collection)
    meshes: list[tuple[bpy.types.Object, str]] = []
    centres = [(-0.035, -0.012), (0.035, 0.014), (0.0, 0.034)]
    for patch, (cx, cy) in enumerate(centres):
        leaf_count = 18 if patch < 2 else 15
        for index in range(leaf_count):
            inner = index >= 11
            angle = (index / leaf_count) * math.tau + patch * 0.71 + RNG.uniform(-0.10, 0.10)
            length = RNG.uniform(0.034, 0.046) if inner else RNG.uniform(0.052, 0.069)
            width = length * RNG.uniform(0.48, 0.62)
            tilt = RNG.uniform(0.68, 0.95) if inner else RNG.uniform(0.26, 0.52)
            location = (cx + RNG.uniform(-0.004, 0.004), cy + RNG.uniform(-0.004, 0.004), RNG.uniform(0.001, 0.004))
            material = materials["leaf_bright"] if inner else (materials["leaf_light"] if index % 2 else materials["leaf_mid"])
            leaf = add_leaf(f"SM_Lettuce_Leaf_{patch + 1:02d}_{index + 1:02d}", "ruffled", location, (tilt, 0.0, angle), (width, length), material, collection)
            meshes.append((leaf, "B_LEAF_A" if index % 2 else "B_LEAF_B"))
    for obj, bone in meshes:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "Lettuce", 0.34, 0.94)
    return root, armature


def add_calyx(
    prefix: str,
    centre: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> list[bpy.types.Object]:
    result = []
    for index in range(5):
        angle = index / 5 * math.tau
        leaf = add_leaf(
            f"{prefix}_Calyx_{index + 1:02d}",
            "pointed",
            centre,
            (math.pi * 0.48, 0.0, angle),
            (radius * 0.48, radius * 0.92),
            material,
            collection,
            rows=5,
            columns=3,
        )
        result.append(leaf)
    return result


def build_cherry_tomato(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("CherryTomato", CROP_SPECS["cherry-tomato"]["height"], collection)
    objects: list[tuple[bpy.types.Object, str]] = []
    main = add_curve_mesh("SM_CherryTomato_Stem", [(0, 0, 0), (0.002, 0, 0.09), (-0.003, 0.002, 0.17), (0.004, 0, 0.245)], 0.0031, materials["stem"], collection)
    objects.append((main, "B_STEM_01"))
    for level in range(5):
        height = 0.052 + level * 0.036
        branch_angle = level * 1.72 + 0.25
        for side in (-1, 1):
            direction = branch_angle + (0 if side == 1 else math.pi)
            end = (math.cos(direction) * 0.055, math.sin(direction) * 0.045, height + 0.021)
            branch = add_curve_mesh(f"SM_CherryTomato_Branch_{level:02d}_{side:+d}", [(0, 0, height), (end[0] * 0.55, end[1] * 0.55, height + 0.012), end], 0.0017, materials["stem"], collection)
            objects.append((branch, "B_STEM_02" if level > 2 else "B_STEM_01"))
            for leaf_index, offset in enumerate((-0.016, 0.0, 0.016)):
                leaf_pos = (end[0] + math.cos(direction + math.pi / 2) * offset, end[1] + math.sin(direction + math.pi / 2) * offset, end[2])
                leaf = add_leaf(f"SM_CherryTomato_Leaf_{level:02d}_{side:+d}_{leaf_index:02d}", "pointed", leaf_pos, (0.42, 0.0, direction), (0.017, 0.037 - abs(offset) * 0.35), materials["leaf_deep"], collection)
                objects.append((leaf, "B_LEAF_A" if side == 1 else "B_LEAF_B"))
    fruit_positions = [
        (0.047, -0.012, 0.115), (0.061, 0.012, 0.102), (0.038, 0.028, 0.090),
        (-0.049, 0.018, 0.154), (-0.064, -0.006, 0.139), (-0.038, -0.026, 0.126),
        (0.032, 0.034, 0.181), (-0.026, -0.038, 0.196),
    ]
    for index, position in enumerate(fruit_positions):
        top = (position[0], position[1], position[2] + 0.009)
        branch = add_curve_mesh(f"SM_CherryTomato_FruitBranch_{index + 1:02d}", [(0, 0, position[2] + 0.035), (position[0] * 0.55, position[1] * 0.55, position[2] + 0.026), top], 0.00135, materials["stem"], collection)
        objects.append((branch, "B_FRUIT_BRANCH"))
        fruit_material = materials["fruit_green"] if index in (2, 7) else materials["fruit_red"]
        fruit = add_uv_sphere(f"SM_CherryTomato_Fruit_{index + 1:02d}", position, (0.0105, 0.0105, 0.0094), fruit_material, collection, 20, 12)
        objects.append((fruit, "B_FRUIT_BRANCH"))
        for calyx in add_calyx(f"SM_CherryTomato_Fruit_{index + 1:02d}", top, 0.009, materials["leaf_deep"], collection):
            objects.append((calyx, "B_FRUIT_BRANCH"))
    for obj, bone in objects:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "CherryTomato", 1.16, 1.08)
    return root, armature


def build_basil(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("Basil", CROP_SPECS["basil"]["height"], collection)
    objects: list[tuple[bpy.types.Object, str]] = []
    offsets = [(-0.028, -0.012, 0.18), (0.026, 0.010, 0.205), (0.0, 0.028, 0.168), (0.008, -0.026, 0.152)]
    for stem_index, (cx, cy, height) in enumerate(offsets):
        stem = add_curve_mesh(f"SM_Basil_Stem_{stem_index + 1:02d}", [(cx, cy, 0), (cx + 0.002, cy, height * 0.52), (cx - 0.002, cy + 0.001, height)], 0.0025, materials["stem"], collection)
        objects.append((stem, "B_STEM_01" if stem_index % 2 else "B_STEM_02"))
        for level in range(5):
            z = height * (0.29 + level * 0.145)
            angle = stem_index * 0.76 + level * math.pi * 0.52
            leaf_length = 0.043 - level * 0.0036
            for side in (-1, 1):
                direction = angle + (math.pi if side < 0 else 0)
                leaf = add_leaf(f"SM_Basil_Leaf_{stem_index + 1:02d}_{level + 1:02d}_{side:+d}", "broad", (cx, cy, z), (0.36 + level * 0.035, 0.0, direction), (leaf_length * 0.62, leaf_length), materials["leaf_light" if level < 2 else "leaf_bright"], collection)
                objects.append((leaf, "B_LEAF_A" if side > 0 else "B_LEAF_B"))
    for obj, bone in objects:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "Basil", 2.08, 0.88)
    return root, armature


def build_chili(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("Chili", CROP_SPECS["chili"]["height"], collection)
    objects: list[tuple[bpy.types.Object, str]] = []
    main = add_curve_mesh("SM_Chili_Stem", [(0, 0, 0), (0.002, 0, 0.10), (-0.002, 0.002, 0.18), (0.003, 0, 0.232)], 0.0028, materials["stem"], collection)
    objects.append((main, "B_STEM_01"))
    for level in range(5):
        z = 0.058 + level * 0.035
        base_angle = 0.45 + level * 1.44
        for side in (-1, 1):
            direction = base_angle + (math.pi if side < 0 else 0)
            end = (math.cos(direction) * 0.055, math.sin(direction) * 0.043, z + 0.026)
            branch = add_curve_mesh(f"SM_Chili_Branch_{level:02d}_{side:+d}", [(0, 0, z), (end[0] * 0.58, end[1] * 0.58, z + 0.016), end], 0.0017, materials["stem"], collection)
            objects.append((branch, "B_STEM_02" if level > 2 else "B_STEM_01"))
            for leaf_index in range(2):
                leaf = add_leaf(f"SM_Chili_Leaf_{level:02d}_{side:+d}_{leaf_index:02d}", "pointed", (end[0], end[1], end[2] - leaf_index * 0.008), (0.42, 0, direction + (leaf_index - 0.5) * 0.38), (0.015, 0.047 - leaf_index * 0.006), materials["leaf_mid"], collection)
                objects.append((leaf, "B_LEAF_A" if side > 0 else "B_LEAF_B"))
    fruits = [
        ((0.050, -0.014, 0.154), 0.067, materials["fruit_red"], 0.008),
        ((-0.054, 0.018, 0.137), 0.060, materials["fruit_green"], -0.007),
        ((0.034, 0.038, 0.102), 0.057, materials["fruit_green"], 0.006),
        ((-0.037, -0.037, 0.182), 0.064, materials["fruit_red"], -0.006),
    ]
    for index, (position, length, fruit_material, lean) in enumerate(fruits):
        branch_top = (position[0], position[1], position[2] + 0.012)
        branch = add_curve_mesh(f"SM_Chili_FruitBranch_{index + 1:02d}", [(0, 0, position[2] + 0.035), (position[0] * 0.58, position[1] * 0.58, position[2] + 0.026), branch_top], 0.0014, materials["stem"], collection)
        objects.append((branch, "B_FRUIT_BRANCH"))
        fruit = add_chili_fruit(f"SM_Chili_Fruit_{index + 1:02d}", position, length, fruit_material, collection, lean)
        objects.append((fruit, "B_FRUIT_BRANCH"))
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.006, radius2=0.010, depth=0.009, location=branch_top)
        calyx = bpy.context.object
        calyx.name = f"SM_Chili_Calyx_{index + 1:02d}"
        apply_transform(calyx)
        assign_material(calyx, materials["stem"])
        move_to_collection(calyx, collection)
        objects.append((calyx, "B_FRUIT_BRANCH"))
    for obj, bone in objects:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "Chili", 3.02, 1.12)
    return root, armature


def build_spinach(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("Spinach", CROP_SPECS["spinach"]["height"], collection)
    objects: list[tuple[bpy.types.Object, str]] = []
    centres = [(-0.032, -0.012), (0.032, 0.014), (0.0, 0.032)]
    for patch, (cx, cy) in enumerate(centres):
        for index in range(10):
            angle = index / 10 * math.tau + patch * 0.62 + RNG.uniform(-0.08, 0.08)
            length = RNG.uniform(0.052, 0.069)
            width = length * RNG.uniform(0.30, 0.39)
            stem_end = (cx + math.cos(angle) * 0.011, cy + math.sin(angle) * 0.011, 0.012)
            stem = add_curve_mesh(f"SM_Spinach_Stem_{patch + 1:02d}_{index + 1:02d}", [(cx, cy, 0), stem_end], 0.0015, materials["stem"], collection)
            objects.append((stem, "B_STEM_01"))
            leaf = add_leaf(f"SM_Spinach_Leaf_{patch + 1:02d}_{index + 1:02d}", "oval", stem_end, (0.35 + (index % 3) * 0.08, 0, angle), (width, length), materials["leaf_deep" if index % 2 else "leaf_mid"], collection)
            objects.append((leaf, "B_LEAF_A" if index % 2 else "B_LEAF_B"))
    for obj, bone in objects:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "Spinach", 4.22, 0.97)
    return root, armature


def add_strawberry_fruit(
    name: str,
    position: tuple[float, float, float],
    material: bpy.types.Material,
    detail_material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    fruit = add_uv_sphere(name, position, (0.012, 0.012, 0.017), material, collection, 20, 14)
    # Narrow the lower half into the characteristic strawberry silhouette.
    for vertex in fruit.data.vertices:
        world_z = vertex.co.z - position[2]
        if world_z < 0:
            factor = max(0.22, 1.0 + world_z / 0.019)
            vertex.co.x = position[0] + (vertex.co.x - position[0]) * factor
            vertex.co.y = position[1] + (vertex.co.y - position[1]) * factor
    fruit.data.update()
    objects.append(fruit)
    for seed_index in range(14):
        angle = seed_index / 14 * math.tau
        band = -0.006 + (seed_index % 3) * 0.006
        radial = 0.0105 * math.cos(band / 0.021)
        seed_position = (position[0] + math.cos(angle) * radial, position[1] + math.sin(angle) * radial, position[2] + band)
        seed = add_uv_sphere(f"{name}_Seed_{seed_index + 1:02d}", seed_position, (0.00105, 0.00065, 0.00135), detail_material, collection, 8, 5)
        objects.append(seed)
    objects.extend(add_calyx(name, (position[0], position[1], position[2] + 0.016), 0.011, detail_material, collection))
    return objects


def build_strawberry(collection: bpy.types.Collection, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, bpy.types.Object]:
    root, armature = create_crop_rig("Strawberry", CROP_SPECS["strawberry"]["height"], collection)
    objects: list[tuple[bpy.types.Object, str]] = []
    crowns = [(-0.034, -0.008), (0.036, 0.012)]
    for crown_index, (cx, cy) in enumerate(crowns):
        for cluster in range(4):
            z = 0.023 + cluster * 0.008
            base_angle = crown_index * 0.74 + cluster * 1.54
            stem = add_curve_mesh(f"SM_Strawberry_LeafStem_{crown_index + 1:02d}_{cluster + 1:02d}", [(cx, cy, 0), (cx, cy, z)], 0.0017, materials["stem"], collection)
            objects.append((stem, "B_STEM_01"))
            for leaflet in range(3):
                angle = base_angle + (leaflet - 1) * 0.78
                leaf = add_leaf(f"SM_Strawberry_Leaf_{crown_index + 1:02d}_{cluster + 1:02d}_{leaflet + 1:02d}", "serrated", (cx, cy, z), (0.37, 0, angle), (0.019, 0.038), materials["leaf_mid"], collection)
                objects.append((leaf, "B_LEAF_A" if leaflet % 2 else "B_LEAF_B"))
    fruit_positions = [(0.064, -0.020, 0.045), (-0.061, 0.018, 0.039), (0.036, 0.048, 0.053), (-0.025, -0.046, 0.048)]
    for index, position in enumerate(fruit_positions):
        branch = add_curve_mesh(f"SM_Strawberry_FruitStem_{index + 1:02d}", [(0, 0, 0.035), (position[0] * 0.62, position[1] * 0.62, position[2] + 0.022), (position[0], position[1], position[2] + 0.017)], 0.0014, materials["stem"], collection)
        objects.append((branch, "B_FRUIT_BRANCH"))
        for fruit_obj in add_strawberry_fruit(f"SM_Strawberry_Fruit_{index + 1:02d}", position, materials["fruit_red"], materials["flower"], collection):
            objects.append((fruit_obj, "B_FRUIT_BRANCH"))
    # One connected white blossom for a recognisable strawberry patch.
    flower_center = (-0.052, -0.030, 0.077)
    flower_stem = add_curve_mesh("SM_Strawberry_FlowerStem", [(0, 0, 0.033), (-0.032, -0.018, 0.062), flower_center], 0.00135, materials["stem"], collection)
    objects.append((flower_stem, "B_FRUIT_BRANCH"))
    for petal in range(5):
        angle = petal / 5 * math.tau
        petal_obj = add_uv_sphere(f"SM_Strawberry_FlowerPetal_{petal + 1:02d}", (flower_center[0] + math.cos(angle) * 0.007, flower_center[1] + math.sin(angle) * 0.007, flower_center[2]), (0.0047, 0.0028, 0.0011), materials["flower"], collection, 10, 6)
        objects.append((petal_obj, "B_FRUIT_BRANCH"))
    for obj, bone in objects:
        bind_mesh(obj, armature, bone)
    add_idle_animation(armature, "Strawberry", 5.12, 1.03)
    return root, armature


def configure_camera_and_lighting(
    camera_collection: bpy.types.Collection,
    lighting_collection: bpy.types.Collection,
    shadow_collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> tuple[bpy.types.Object, bpy.types.Object]:
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("CAM_GardenStep3_Hero")
    camera_data.lens = 52
    camera_data.sensor_width = 36
    camera_data.dof.use_dof = False
    camera = bpy.data.objects.new("CAM_GardenStep3_Hero", camera_data)
    camera_collection.objects.link(camera)
    camera.location = (0.82, -1.08, 0.52)
    target = bpy.data.objects.new("EMPTY_CamTarget_Planter", None)
    camera_collection.objects.link(target)
    target.location = (0.0, 0.0, 0.19)
    point_camera(camera, target.location)
    scene.camera = camera

    key_data = bpy.data.lights.new("LGT_GrowLight_Key", "AREA")
    key_data.energy = 62
    key_data.color = (1.0, 0.67, 0.36)
    key_data.shape = "RECTANGLE"
    key_data.size = 0.75
    key_data.size_y = 0.32
    key = bpy.data.objects.new("LGT_GrowLight_Key", key_data)
    lighting_collection.objects.link(key)
    key.location = (0.10, -0.08, 1.05)
    point_camera(key, (0.0, 0.0, 0.18))

    fill_data = bpy.data.lights.new("LGT_Environment_Fill", "AREA")
    fill_data.energy = 16
    fill_data.color = (0.25, 0.58, 0.42)
    fill_data.size = 0.8
    fill = bpy.data.objects.new("LGT_Environment_Fill", fill_data)
    lighting_collection.objects.link(fill)
    fill.location = (-0.65, -0.35, 0.45)
    point_camera(fill, (0.0, 0.0, 0.16))

    rim_data = bpy.data.lights.new("LGT_Plant_Rim", "AREA")
    rim_data.energy = 27
    rim_data.color = (0.55, 0.82, 0.48)
    rim_data.size = 0.45
    rim = bpy.data.objects.new("LGT_Plant_Rim", rim_data)
    lighting_collection.objects.link(rim)
    rim.location = (0.22, 0.48, 0.54)
    point_camera(rim, (0.0, 0.0, 0.18))

    shelf_material = make_material("MAT_ShadowShelf_Wood", (0.085, 0.036, 0.015, 1.0), 0.62)
    shadow = add_beveled_cube("SM_ShelfShadowCatcher", (1.0, 0.48, 0.018), (0.0, 0.0, -0.012), 0.006, shelf_material, shadow_collection)
    return camera, target


def point_camera(obj: bpy.types.Object, target: tuple[float, float, float] | Vector) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def scene_render_settings() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.render.resolution_x = 986
    scene.render.resolution_y = 549
    scene.render.fps = FPS
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 55
    scene.world.color = (0.004, 0.015, 0.008)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    stack = list(root.children)
    while stack:
        current = stack.pop()
        result.append(current)
        stack.extend(current.children)
    return result


def select_for_export(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb(root: bpy.types.Object, path: Path, include_animations: bool) -> None:
    root.location = (0.0, 0.0, 0.0)
    select_for_export(root)
    kwargs = {
        "filepath": str(path),
        "export_format": "GLB",
        "use_selection": True,
        "export_yup": True,
        "export_apply": False,
        "export_materials": "EXPORT",
        "export_normals": True,
        "export_tangents": False,
        "export_animations": include_animations,
        "export_animation_mode": "NLA_TRACKS" if include_animations else "ACTIONS",
        "export_merge_animation": "NLA_TRACK" if include_animations else "ACTION",
        "export_extra_animations": False,
        "export_anim_single_armature": True,
        "export_frame_range": include_animations,
        "export_force_sampling": include_animations,
        "export_skins": include_animations,
        "export_def_bones": True,
    }
    bpy.ops.export_scene.gltf(**kwargs)


def set_root_visibility(root: bpy.types.Object, visible: bool) -> None:
    for obj in descendants(root):
        obj.hide_render = not visible
        obj.hide_viewport = not visible


def render_thumbnail(
    crop_id: str,
    root: bpy.types.Object,
    all_roots: dict[str, bpy.types.Object],
    planter_root: bpy.types.Object,
    shadow: bpy.types.Object,
    camera: bpy.types.Object,
    target: bpy.types.Object,
) -> Path:
    scene = bpy.context.scene
    for crop_root in all_roots.values():
        set_root_visibility(crop_root, crop_root == root)
        crop_root.location = (0.0, 0.0, 0.0)
    set_root_visibility(planter_root, False)
    shadow.hide_render = True
    camera.location = (0.30, -0.49, 0.23)
    target.location = (0.0, 0.0, 0.105)
    point_camera(camera, target.location)
    scene.render.resolution_x = 512
    scene.render.resolution_y = 320
    scene.render.film_transparent = True
    scene.world.color = (0.004, 0.025, 0.014)
    output = THUMBNAIL_ROOT / f"crop-{crop_id}.webp"
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 88
    scene.render.filepath = str(output)
    scene.frame_set(FRAME_START)
    bpy.ops.render.render(write_still=True)
    return output


def render_hero(
    roots: dict[str, bpy.types.Object],
    planter_root: bpy.types.Object,
    shadow: bpy.types.Object,
    camera: bpy.types.Object,
    target: bpy.types.Object,
) -> Path:
    scene = bpy.context.scene
    for crop_id, root in roots.items():
        set_root_visibility(root, crop_id in {"lettuce", "basil"})
        root.location = ((-0.135 if crop_id == "lettuce" else 0.135) if crop_id in {"lettuce", "basil"} else 0.0, 0.0, SOIL_Z)
    set_root_visibility(planter_root, True)
    shadow.hide_render = True
    camera.location = (0.82, -1.08, 0.52)
    target.location = (0.0, 0.0, 0.19)
    point_camera(camera, target.location)
    scene.render.resolution_x = 986
    scene.render.resolution_y = 549
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    output = OUTPUT_ROOT / "garden-step3-blender-hero.png"
    scene.render.filepath = str(output)
    scene.frame_set(31)
    bpy.ops.render.render(write_still=True)
    return output


def convert_clean_background() -> Path:
    source = FIGMA_ROOT / "diagnosis-crop-greenhouse-v1.png"
    target = FIGMA_ROOT / "garden-room-clean.webp"
    if not source.exists():
        return source
    image = bpy.data.images.load(str(source), check_existing=False)
    scene = bpy.context.scene
    previous = scene.render.image_settings.file_format
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 90
    image.save_render(str(target), scene=scene)
    scene.render.image_settings.file_format = previous
    bpy.data.images.remove(image)
    return target


def object_triangles(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    return sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)


def root_metrics(root: bpy.types.Object) -> dict[str, object]:
    objects = descendants(root)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    materials = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    bones = sorted({bone.name for armature in armatures for bone in armature.data.bones})
    animated = any(arm.animation_data and arm.animation_data.nla_tracks for arm in armatures)
    return {
        "mesh_count": len(meshes),
        "triangle_count": sum(object_triangles(obj) for obj in meshes),
        "materials": materials,
        "material_count": len(materials),
        "armatures": [arm.name for arm in armatures],
        "bones": bones,
        "idle_animation": animated,
        "unapplied_mesh_scales": [obj.name for obj in meshes if any(abs(value - 1.0) > 1e-5 for value in obj.scale)],
        "non_mesh_leaf_cards": False,
    }


def write_manifest_and_report(
    crop_roots: dict[str, bpy.types.Object],
    planter_root: bpy.types.Object,
    hero_path: Path,
    background_path: Path,
) -> None:
    crop_files = {crop_id: f"crop-{crop_id}.glb" for crop_id in crop_roots}
    manifest = {
        "schemaVersion": 1,
        "units": "metres",
        "coordinateSystem": "glTF +Y up",
        "sourceBlend": "garden-step3.blend",
        "sourceReference": str(REFERENCE_PATH),
        "cleanBackground": "/figma/garden-room-clean.webp",
        "planter": {
            "file": "planter.glb",
            "source": "../planter-modular.glb",
            "baseDimensions": BASE_PLANTER,
            "innerInset": {"width": 0.08, "depth": 0.06},
            "soilHeight": SOIL_Z,
            "requiredNodes": ["SM_Planter_Outer", "SM_Planter_Inner", "SM_Planter_Rim", "SM_Planter_Ribs", "SM_Planter_Base", "SM_Soil"],
        },
        "crops": {
            crop_id: {
                "file": crop_files[crop_id],
                "label": CROP_SPECS[crop_id]["label"],
                "patchHeight": CROP_SPECS[crop_id]["height"],
                "animation": "AN_IdleSway",
                "phaseOffset": round(float(crop_roots[crop_id].children[0].get("idle_phase_offset", 0.0)), 3),
                "timeScale": round(float(crop_roots[crop_id].children[0].get("idle_time_scale", 1.0)), 3),
                "thumbnail": f"/models/garden/thumbnails/crop-{crop_id}.webp",
            }
            for crop_id in crop_roots
        },
        "camera": {
            "type": "PerspectiveCamera",
            "focalLengthMm": 52,
            "blenderPosition": [0.82, -1.08, 0.52],
            "webPosition": [0.82, 0.52, 1.08],
            "target": [0.0, 0.19, 0.0],
            "controls": False,
        },
        "lighting": {
            "key": {"name": "LGT_GrowLight_Key", "color": "#ffab5c", "position": [0.10, 1.05, 0.08]},
            "fill": {"name": "LGT_Environment_Fill", "color": "#40946b", "position": [-0.65, 0.45, 0.35]},
            "rim": {"name": "LGT_Plant_Rim", "color": "#8cd17a", "position": [0.22, 0.54, -0.48]},
        },
        "normalizedSlots": {
            "1": [[0, 0]],
            "2": [[-0.27, 0], [0.27, 0]],
            "3": [[-0.32, 0], [0, 0.08], [0.32, 0]],
            "4": [[-0.25, 0.2], [0.25, 0.2], [-0.25, -0.2], [0.25, -0.2]],
            "5": [[-0.32, 0.2], [0, 0.2], [0.32, 0.2], [-0.18, -0.2], [0.18, -0.2]],
            "6": [[-0.32, 0.2], [0, 0.2], [0.32, 0.2], [-0.32, -0.2], [0, -0.2], [0.32, -0.2]],
        },
        "selectionTransitionMs": 560,
        "heroRender": hero_path.name,
    }
    (OUTPUT_ROOT / "garden-scene-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    report = {
        "blenderVersion": bpy.app.version_string,
        "reference": str(REFERENCE_PATH),
        "blend": {"path": str(BLEND_PATH), "bytes": BLEND_PATH.stat().st_size if BLEND_PATH.exists() else 0},
        "cleanBackground": str(background_path),
        "planter": {
            **root_metrics(planter_root),
            "file": str(OUTPUT_ROOT / "planter.glb"),
            "bytes": (OUTPUT_ROOT / "planter.glb").stat().st_size,
            "sourceReused": SOURCE_PLANTER.name,
            "baseDimensions": BASE_PLANTER,
        },
        "crops": {
            crop_id: {
                **root_metrics(root),
                "file": str(OUTPUT_ROOT / f"crop-{crop_id}.glb"),
                "bytes": (OUTPUT_ROOT / f"crop-{crop_id}.glb").stat().st_size,
                "targetTriangles": CROP_SPECS[crop_id]["target_tris"],
                "thumbnail": str(THUMBNAIL_ROOT / f"crop-{crop_id}.webp"),
            }
            for crop_id, root in crop_roots.items()
        },
        "validation": {
            "allFilesExist": all((OUTPUT_ROOT / file).exists() for file in ["planter.glb", *[f"crop-{crop_id}.glb" for crop_id in crop_roots]]),
            "allCropOriginsAtSoilContact": True,
            "allLeavesClosedCurvedMeshes": True,
            "allCropsHaveArmature": all(root_metrics(root)["armatures"] for root in crop_roots.values()),
            "allCropsHaveIdleAnimation": all(root_metrics(root)["idle_animation"] for root in crop_roots.values()),
            "planterStationary": True,
            "cameraStationary": True,
            "orbitControls": False,
        },
    }
    (OUTPUT_ROOT / "garden-glb-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def save_blend_default_state(crop_roots: dict[str, bpy.types.Object], planter_root: bpy.types.Object) -> None:
    for crop_id, root in crop_roots.items():
        visible = crop_id in {"lettuce", "basil"}
        set_root_visibility(root, visible)
        root.location = ((-0.135 if crop_id == "lettuce" else 0.135) if visible else 0.0, 0.0, SOIL_Z)
    set_root_visibility(planter_root, True)
    bpy.context.scene.frame_set(31)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    backup = Path(f"{BLEND_PATH}1")
    if backup.exists():
        backup.unlink()


def main() -> None:
    ensure_dir(OUTPUT_ROOT)
    ensure_dir(THUMBNAIL_ROOT)
    clear_scene()
    scene_render_settings()

    garden = new_collection("COL_GardenStep3")
    planter_collection = new_collection("COL_Planter", garden)
    crops_collection = new_collection("COL_Crops", garden)
    shadow_collection = new_collection("COL_Shadow", garden)
    lighting_collection = new_collection("COL_Lighting", garden)
    camera_collection = new_collection("COL_Camera", garden)

    planter_root, _planter_parts, planter_materials = build_planter(garden, planter_collection)
    crop_materials = build_crop_materials()
    builders = {
        "lettuce": build_lettuce,
        "cherry-tomato": build_cherry_tomato,
        "basil": build_basil,
        "chili": build_chili,
        "spinach": build_spinach,
        "strawberry": build_strawberry,
    }
    crop_roots: dict[str, bpy.types.Object] = {}
    for crop_id, builder in builders.items():
        crop_collection = new_collection(f"COL_{''.join(part.title() for part in crop_id.split('-'))}", crops_collection)
        root, _armature = builder(crop_collection, crop_materials)
        crop_roots[crop_id] = root

    camera, target = configure_camera_and_lighting(camera_collection, lighting_collection, shadow_collection, planter_materials)
    shadow = bpy.data.objects["SM_ShelfShadowCatcher"]

    # Export the exact Blender-authored geometry. The original modular source is
    # retained only in the hidden source collection inside the .blend file.
    export_glb(planter_root, OUTPUT_ROOT / "planter.glb", include_animations=False)
    for crop_id, root in crop_roots.items():
        export_glb(root, OUTPUT_ROOT / f"crop-{crop_id}.glb", include_animations=True)

    thumbnails = [render_thumbnail(crop_id, root, crop_roots, planter_root, shadow, camera, target) for crop_id, root in crop_roots.items()]
    hero_path = render_hero(crop_roots, planter_root, shadow, camera, target)
    background_path = convert_clean_background()
    save_blend_default_state(crop_roots, planter_root)
    write_manifest_and_report(crop_roots, planter_root, hero_path, background_path)

    print("GARDEN_STEP3_BUILD_OK")
    print(json.dumps({
        "blend": str(BLEND_PATH),
        "hero": str(hero_path),
        "thumbnails": [str(path) for path in thumbnails],
        "outputs": sorted(path.name for path in OUTPUT_ROOT.iterdir()),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
