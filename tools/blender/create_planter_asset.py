from __future__ import annotations

import json
import math
import re
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(r"C:\Users\YJ\Documents\GitHub\vegetable-garden-planner")
BLEND_PATH = REPO_ROOT / "assets" / "blender" / "planter-modular.blend"
GLB_PATH = REPO_ROOT / "frontend" / "public" / "models" / "planter-modular.glb"
VALIDATION_PATH = REPO_ROOT / "frontend" / "public" / "models" / "planter-modular.validation.json"
EVIDENCE_DIR = REPO_ROOT / ".superloopy" / "evidence" / "frontend" / "20260814-blender-planter"

BASE_WIDTH = 0.60
BASE_DEPTH = 0.20
BASE_HEIGHT = 0.25
BODY_TOP_WIDTH = 0.57
BODY_TOP_DEPTH = 0.17
BODY_BOTTOM_WIDTH = 0.53
BODY_BOTTOM_DEPTH = 0.145
BODY_Z0 = 0.045
BODY_Z1 = 0.225
WALL = 0.004
CORNER = 0.035
RIM_HEIGHT = 0.025
RIM_THICKNESS = 0.030
RIB_SPACING = 0.018

ROOT_COLLECTION = "COL_Planter_Modular"
EXPORT_COLLECTION = "COL_Export"
LOOKDEV_COLLECTION = "COL_Lookdev"
LIGHT_COLLECTION = "COL_Lights"
CAMERA_COLLECTION = "COL_Cameras"


def remove_collection_tree(name: str) -> None:
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for child in list(collection.children):
        remove_collection_tree(child.name)
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def new_child_collection(parent: bpy.types.Collection, name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    parent.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)


def hex_rgb(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    srgb = tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))
    linear = tuple(channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in srgb)
    return (*linear, 1.0)


def principled_input(node: bpy.types.ShaderNodeBsdfPrincipled, *names: str):
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            return socket
    return None


def create_materials() -> tuple[bpy.types.Material, bpy.types.Material]:
    for name in ("MAT_Plastic_ForestGreen", "MAT_Plastic_Cavity"):
        material = bpy.data.materials.get(name)
        if material and material.users == 0:
            bpy.data.materials.remove(material)

    plastic = bpy.data.materials.new("MAT_Plastic_ForestGreen")
    plastic.use_nodes = True
    nodes = plastic.node_tree.nodes
    links = plastic.node_tree.links
    principled = nodes.get("Principled BSDF")
    principled_input(principled, "Base Color").default_value = hex_rgb("#233B31")
    principled_input(principled, "Metallic").default_value = 0.0
    principled_input(principled, "Roughness").default_value = 0.46
    principled_input(principled, "Coat Weight", "Clearcoat").default_value = 0.08
    principled_input(principled, "Coat Roughness", "Clearcoat Roughness").default_value = 0.58

    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "T_Plastic_Grain"
    noise.inputs["Scale"].default_value = 360.0
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.72
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.07
    bump.inputs["Distance"].default_value = 0.00035
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled_input(principled, "Normal"))

    cavity = bpy.data.materials.new("MAT_Plastic_Cavity")
    cavity.use_nodes = True
    cavity_principled = cavity.node_tree.nodes.get("Principled BSDF")
    principled_input(cavity_principled, "Base Color").default_value = hex_rgb("#081812")
    principled_input(cavity_principled, "Metallic").default_value = 0.0
    principled_input(cavity_principled, "Roughness").default_value = 0.64
    return plastic, cavity


def add_bevel(obj: bpy.types.Object, width: float, segments: int = 3) -> None:
    bevel = obj.modifiers.new("Bevel_Manufactured", "BEVEL")
    bevel.width = min(width, min(obj.dimensions) * 0.22)
    bevel.segments = segments
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(22)
    bevel.harden_normals = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)


def apply_scale(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)


def add_rounded_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    bevel: float,
    role: str,
    segments: int = 3,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    obj.dimensions = dimensions
    apply_scale(obj)
    add_bevel(obj, bevel, segments)
    obj.data.materials.append(material)
    obj["module_role"] = role
    move_to_collection(obj, collection)
    return obj


def add_tapered_prism(
    name: str,
    bottom_bounds: tuple[float, float, float, float],
    top_bounds: tuple[float, float, float, float],
    z0: float,
    z1: float,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    role: str,
    bevel: float = 0.0015,
) -> bpy.types.Object:
    bx0, bx1, by0, by1 = bottom_bounds
    tx0, tx1, ty0, ty1 = top_bounds
    vertices = [
        (bx0, by0, z0), (bx1, by0, z0), (bx1, by1, z0), (bx0, by1, z0),
        (tx0, ty0, z1), (tx1, ty0, z1), (tx1, ty1, z1), (tx0, ty1, z1),
    ]
    faces = [
        (3, 2, 1, 0), (4, 5, 6, 7),
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    obj["module_role"] = role
    add_bevel(obj, bevel, 3)
    return obj


def set_parent(obj: bpy.types.Object, root: bpy.types.Object) -> None:
    world = obj.matrix_world.copy()
    obj.parent = root
    obj.matrix_world = world


def setup_scene() -> dict:
    scene = bpy.context.scene
    remove_collection_tree(ROOT_COLLECTION)

    backup = bpy.data.collections.get("COL_Backup_Default")
    if backup is None:
        backup = bpy.data.collections.new("COL_Backup_Default")
        scene.collection.children.link(backup)
    backup.hide_render = True
    backup.hide_viewport = True
    for obj in list(scene.objects):
        if obj.name in {"Cube", "Camera", "Light"}:
            move_to_collection(obj, backup)

    root_collection = bpy.data.collections.new(ROOT_COLLECTION)
    scene.collection.children.link(root_collection)
    export_collection = new_child_collection(root_collection, EXPORT_COLLECTION)
    new_child_collection(root_collection, LOOKDEV_COLLECTION)
    new_child_collection(root_collection, LIGHT_COLLECTION)
    new_child_collection(root_collection, CAMERA_COLLECTION)

    root = bpy.data.objects.new("ROOT_Planter", None)
    export_collection.objects.link(root)
    root["base_width_m"] = BASE_WIDTH
    root["base_depth_m"] = BASE_DEPTH
    root["base_height_m"] = BASE_HEIGHT
    root["rib_spacing_m"] = RIB_SPACING
    root["wall_thickness_m"] = WALL

    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = next(
        (look for look in ("AgX - Medium High Contrast", "AgX - Medium High Contrast") if look in [item.name for item in scene.bl_rna.properties["view_settings"].fixed_type.properties["look"].enum_items]),
        scene.view_settings.look,
    ) if False else scene.view_settings.look
    scene.view_settings.look = "AgX - Medium High Contrast" if "AgX" in scene.view_settings.view_transform else scene.view_settings.look
    return {"scene": scene.name, "root": root.name}


def build_geometry() -> dict:
    export_collection = bpy.data.collections[EXPORT_COLLECTION]
    root = bpy.data.objects["ROOT_Planter"]
    plastic, cavity = create_materials()
    created: list[bpy.types.Object] = []

    top_x = BODY_TOP_WIDTH / 2
    top_y = BODY_TOP_DEPTH / 2
    bottom_x = BODY_BOTTOM_WIDTH / 2
    bottom_y = BODY_BOTTOM_DEPTH / 2
    half_corner = CORNER / 2

    created.extend([
        add_tapered_prism(
            "SM_Body_Front_Center",
            (-bottom_x + CORNER, bottom_x - CORNER, -bottom_y, -bottom_y + WALL),
            (-top_x + CORNER, top_x - CORNER, -top_y, -top_y + WALL),
            BODY_Z0, BODY_Z1, export_collection, plastic, "body_front_center",
        ),
        add_tapered_prism(
            "SM_Body_Back_Center",
            (-bottom_x + CORNER, bottom_x - CORNER, bottom_y - WALL, bottom_y),
            (-top_x + CORNER, top_x - CORNER, top_y - WALL, top_y),
            BODY_Z0, BODY_Z1, export_collection, plastic, "body_back_center",
        ),
        add_tapered_prism(
            "SM_Body_Left_Center",
            (-bottom_x, -bottom_x + WALL, -bottom_y + CORNER, bottom_y - CORNER),
            (-top_x, -top_x + WALL, -top_y + CORNER, top_y - CORNER),
            BODY_Z0, BODY_Z1, export_collection, plastic, "body_left_center",
        ),
        add_tapered_prism(
            "SM_Body_Right_Center",
            (bottom_x - WALL, bottom_x, -bottom_y + CORNER, bottom_y - CORNER),
            (top_x - WALL, top_x, -top_y + CORNER, top_y - CORNER),
            BODY_Z0, BODY_Z1, export_collection, plastic, "body_right_center",
        ),
    ])

    corner_specs = (
        ("FL", -1, -1), ("FR", 1, -1), ("BL", -1, 1), ("BR", 1, 1),
    )
    for suffix, sx, sy in corner_specs:
        bcx, bcy = sx * (bottom_x - half_corner), sy * (bottom_y - half_corner)
        tcx, tcy = sx * (top_x - half_corner), sy * (top_y - half_corner)
        created.append(add_tapered_prism(
            f"SM_Body_Corner_{suffix}",
            (bcx - half_corner, bcx + half_corner, bcy - half_corner, bcy + half_corner),
            (tcx - half_corner, tcx + half_corner, tcy - half_corner, tcy + half_corner),
            BODY_Z0, BODY_Z1, export_collection, plastic, f"body_corner_{suffix.lower()}", 0.003,
        ))

    rim_z = BASE_HEIGHT - RIM_HEIGHT / 2
    created.extend([
        add_rounded_box("SM_Rim_Edge_X_Front", (BASE_WIDTH - RIM_THICKNESS * 2, RIM_THICKNESS, RIM_HEIGHT), (0, -(BASE_DEPTH - RIM_THICKNESS) / 2, rim_z), export_collection, plastic, 0.006, "rim_x_front", 4),
        add_rounded_box("SM_Rim_Edge_X_Back", (BASE_WIDTH - RIM_THICKNESS * 2, RIM_THICKNESS, RIM_HEIGHT), (0, (BASE_DEPTH - RIM_THICKNESS) / 2, rim_z), export_collection, plastic, 0.006, "rim_x_back", 4),
        add_rounded_box("SM_Rim_Edge_Y_Left", (RIM_THICKNESS, BASE_DEPTH - RIM_THICKNESS * 2, RIM_HEIGHT), (-(BASE_WIDTH - RIM_THICKNESS) / 2, 0, rim_z), export_collection, plastic, 0.006, "rim_y_left", 4),
        add_rounded_box("SM_Rim_Edge_Y_Right", (RIM_THICKNESS, BASE_DEPTH - RIM_THICKNESS * 2, RIM_HEIGHT), ((BASE_WIDTH - RIM_THICKNESS) / 2, 0, rim_z), export_collection, plastic, 0.006, "rim_y_right", 4),
    ])
    for suffix, sx, sy in corner_specs:
        created.append(add_rounded_box(
            f"SM_Rim_Corner_{suffix}",
            (RIM_THICKNESS, RIM_THICKNESS, RIM_HEIGHT),
            (sx * (BASE_WIDTH - RIM_THICKNESS) / 2, sy * (BASE_DEPTH - RIM_THICKNESS) / 2, rim_z),
            export_collection, plastic, 0.007, f"rim_corner_{suffix.lower()}", 4,
        ))

    created.extend([
        add_rounded_box("SM_InnerShell", (BODY_BOTTOM_WIDTH - WALL * 5, BODY_BOTTOM_DEPTH - WALL * 5, 0.010), (0, 0, BODY_Z0 + 0.003), export_collection, cavity, 0.002, "inner_bottom"),
        add_rounded_box("SM_Base", (BODY_BOTTOM_WIDTH - 0.02, BODY_BOTTOM_DEPTH - 0.012, 0.018), (0, 0, 0.035), export_collection, plastic, 0.005, "base"),
        add_rounded_box("SM_Skirt_X_Front", (BODY_BOTTOM_WIDTH - 0.045, 0.018, 0.026), (0, -(BODY_BOTTOM_DEPTH - 0.025) / 2, 0.034), export_collection, plastic, 0.004, "skirt_x_front"),
        add_rounded_box("SM_Skirt_X_Back", (BODY_BOTTOM_WIDTH - 0.045, 0.018, 0.026), (0, (BODY_BOTTOM_DEPTH - 0.025) / 2, 0.034), export_collection, plastic, 0.004, "skirt_x_back"),
        add_rounded_box("SM_Skirt_Y_Left", (0.018, BODY_BOTTOM_DEPTH - 0.045, 0.026), (-(BODY_BOTTOM_WIDTH - 0.035) / 2, 0, 0.034), export_collection, plastic, 0.004, "skirt_y_left"),
        add_rounded_box("SM_Skirt_Y_Right", (0.018, BODY_BOTTOM_DEPTH - 0.045, 0.026), ((BODY_BOTTOM_WIDTH - 0.035) / 2, 0, 0.034), export_collection, plastic, 0.004, "skirt_y_right"),
    ])

    for suffix, sx, sy in corner_specs:
        created.append(add_rounded_box(
            f"SM_Feet_{suffix}", (0.074, 0.042, 0.022),
            (sx * (BODY_BOTTOM_WIDTH / 2 - 0.064), sy * (BODY_BOTTOM_DEPTH / 2 - 0.036), 0.011),
            export_collection, plastic, 0.005, f"feet_{suffix.lower()}", 4,
        ))

    created.extend([
        add_rounded_box("SM_Band_Top_X_Front", (BODY_TOP_WIDTH - 0.035, 0.012, 0.020), (0, -BODY_TOP_DEPTH / 2 - 0.003, BODY_Z1 - 0.012), export_collection, plastic, 0.003, "band_top_x_front"),
        add_rounded_box("SM_Band_Top_X_Back", (BODY_TOP_WIDTH - 0.035, 0.012, 0.020), (0, BODY_TOP_DEPTH / 2 + 0.003, BODY_Z1 - 0.012), export_collection, plastic, 0.003, "band_top_x_back"),
        add_rounded_box("SM_Band_Bottom_X_Front", (BODY_BOTTOM_WIDTH - 0.040, 0.010, 0.018), (0, -BODY_BOTTOM_DEPTH / 2 - 0.003, BODY_Z0 + 0.008), export_collection, plastic, 0.003, "band_bottom_x_front"),
        add_rounded_box("SM_Band_Bottom_X_Back", (BODY_BOTTOM_WIDTH - 0.040, 0.010, 0.018), (0, BODY_BOTTOM_DEPTH / 2 + 0.003, BODY_Z0 + 0.008), export_collection, plastic, 0.003, "band_bottom_x_back"),
    ])

    rib_height = 0.148
    rib_z = BODY_Z0 + 0.025 + rib_height / 2
    front_count = max(1, int((BODY_TOP_WIDTH - CORNER * 2 - 0.030) / RIB_SPACING) + 1)
    side_count = max(1, int((BODY_TOP_DEPTH - CORNER * 2 - 0.018) / RIB_SPACING) + 1)
    front_span = (front_count - 1) * RIB_SPACING
    side_span = (side_count - 1) * RIB_SPACING
    for side, sy in (("Front", -1), ("Back", 1)):
        for index in range(front_count):
            x = -front_span / 2 + index * RIB_SPACING
            created.append(add_rounded_box(
                f"SM_Rib_{side}_{index + 1:02d}", (0.010, 0.008, rib_height),
                (x, sy * (BODY_TOP_DEPTH / 2 + 0.005), rib_z),
                export_collection, plastic, 0.0022, f"rib_{side.lower()}", 3,
            ))
    for side, sx in (("Left", -1), ("Right", 1)):
        for index in range(side_count):
            y = -side_span / 2 + index * RIB_SPACING
            created.append(add_rounded_box(
                f"SM_Rib_{side}_{index + 1:02d}", (0.008, 0.010, rib_height),
                (sx * (BODY_TOP_WIDTH / 2 + 0.005), y, rib_z),
                export_collection, plastic, 0.0022, f"rib_{side.lower()}", 3,
            ))

    for obj in created:
        set_parent(obj, root)
        obj["base_location"] = list(obj.location)
        obj["base_dimensions"] = list(obj.dimensions)

    bpy.context.view_layer.objects.active = root
    root.select_set(True)
    return {
        "objects": len(created),
        "front_ribs": front_count,
        "side_ribs": side_count,
        "materials": [plastic.name, cavity.name],
    }


def aim_object(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_lookdev() -> dict:
    scene = bpy.context.scene
    lookdev = bpy.data.collections[LOOKDEV_COLLECTION]
    lights = bpy.data.collections[LIGHT_COLLECTION]
    cameras = bpy.data.collections[CAMERA_COLLECTION]
    plastic = bpy.data.materials["MAT_Plastic_ForestGreen"]

    for collection in (lookdev, lights, cameras):
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)

    pedestal = add_rounded_box("SM_Lookdev_Pedestal_Base", (0.78, 0.52, 0.075), (0, 0, -0.045), lookdev, plastic, 0.028, "lookdev_pedestal", 6)
    pedestal["export_exclude"] = True
    bpy.ops.mesh.primitive_plane_add(size=5.0, location=(0, 0, -0.083))
    ground = bpy.context.object
    ground.name = "SM_Lookdev_Ground"
    move_to_collection(ground, lookdev)
    ground.data.materials.append(bpy.data.materials["MAT_Plastic_Cavity"])
    ground["export_exclude"] = True

    light_specs = [
        ("LGT_Key_Main", "AREA", (-0.70, -0.68, 1.15), 92.0, (0.82, 1.0, 0.91), 0.58),
        ("LGT_Fill_Soft", "AREA", (0.78, -0.20, 0.62), 28.0, (0.42, 0.76, 0.58), 0.45),
        ("LGT_Rim_Back", "AREA", (0.18, 0.72, 0.92), 125.0, (0.70, 1.0, 0.84), 0.36),
    ]
    for name, light_type, position, energy, color, size in light_specs:
        data = bpy.data.lights.new(name, light_type)
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = position
        aim_object(obj, (0, 0, 0.13))
        lights.objects.link(obj)

    camera_data = bpy.data.cameras.new("CAM_Planter_Hero")
    camera_data.lens = 36
    camera_data.sensor_width = 36
    camera = bpy.data.objects.new("CAM_Planter_Hero", camera_data)
    camera.location = (0.78, -0.86, 0.52)
    aim_object(camera, (0, 0, 0.13))
    cameras.objects.link(camera)
    scene.camera = camera

    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = hex_rgb("#071F17")
    background.inputs["Strength"].default_value = 0.08
    scene.view_settings.exposure = -0.35
    return {"camera": camera.name, "lights": [item[0] for item in light_specs]}


def render_views() -> list[str]:
    scene = bpy.context.scene
    camera = bpy.data.objects["CAM_Planter_Hero"]
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    views = [
        ("blender-hero.png", (0.78, -0.86, 0.52), (0, 0, 0.13), 36),
        ("blender-front.png", (0, -1.10, 0.28), (0, 0, 0.13), 42),
        ("blender-top.png", (0.56, -0.58, 0.92), (0, 0, 0.10), 38),
    ]
    output = []
    for filename, position, target, lens in views:
        camera.location = position
        camera.data.lens = lens
        aim_object(camera, target)
        path = EVIDENCE_DIR / filename
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        output.append(str(path))
    camera.location = (0.78, -0.86, 0.52)
    camera.data.lens = 36
    aim_object(camera, (0, 0, 0.13))
    return output


def export_and_validate() -> dict:
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    bpy.ops.object.select_all(action="DESELECT")
    export_collection = bpy.data.collections[EXPORT_COLLECTION]
    export_objects = [obj for obj in export_collection.all_objects if obj.type in {"MESH", "EMPTY"}]
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["ROOT_Planter"]

    export_kwargs = dict(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_normals=True,
        export_tangents=True,
    )
    # Keep decoding completely local in the web app. Drei's default Draco path
    # points at a remote CDN, which is not acceptable for this self-contained
    # product viewport and can leave the Canvas suspended on restricted networks.
    bpy.ops.export_scene.gltf(export_draco_mesh_compression_enable=False, **export_kwargs)
    compression = "uncompressed (self-contained runtime)"

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    imported_meshes = [obj for obj in imported if obj.type == "MESH"]
    corners = []
    triangle_count = 0
    material_names = set()
    for obj in imported_meshes:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
        triangle_count += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
        material_names.update(re.sub(r"\.\d{3}$", "", slot.material.name) for slot in obj.material_slots if slot.material)
    minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
    maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
    dimensions = maximum - minimum
    sorted_dimensions = sorted((dimensions.x, dimensions.y, dimensions.z), reverse=True)
    expected_sorted = sorted((BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH), reverse=True)
    errors_cm = [abs(actual - expected) * 100 for actual, expected in zip(sorted_dimensions, expected_sorted)]
    result = {
        "blender_version": bpy.app.version_string,
        "glb_path": str(GLB_PATH),
        "glb_bytes": GLB_PATH.stat().st_size,
        "compression": compression,
        "mesh_count": len(imported_meshes),
        "triangle_count": triangle_count,
        "materials": sorted(material_names),
        "bounding_box_m": [round(dimensions.x, 6), round(dimensions.y, 6), round(dimensions.z, 6)],
        "dimension_errors_cm_sorted": [round(error, 4) for error in errors_cm],
        "within_half_centimeter": all(error <= 0.5 for error in errors_cm),
        "required_nodes_present": all(any(obj.name.startswith(prefix) for obj in imported_meshes) for prefix in (
            "SM_Body_Front_Center", "SM_Body_Corner_FL", "SM_Rim_Edge_X_Front",
            "SM_InnerShell", "SM_Rib_Front_01", "SM_Base", "SM_Feet_FL",
        )),
    }
    VALIDATION_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    return result


def audit_source() -> dict:
    export_collection = bpy.data.collections.get(EXPORT_COLLECTION)
    meshes = [obj for obj in export_collection.all_objects if obj.type == "MESH"] if export_collection else []
    triangle_count = sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes)
    materials = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
    invalid_names = [obj.name for obj in meshes if not obj.name.startswith("SM_")]
    unapplied = [obj.name for obj in meshes if any(abs(value - 1) > 1e-6 for value in obj.scale)]
    return {
        "mesh_count": len(meshes),
        "triangle_count": triangle_count,
        "materials": materials,
        "invalid_names": invalid_names,
        "unapplied_scale": unapplied,
    }
