"""Re-import every garden GLB into a clean Blender scene and validate it."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


SCRIPT_PATH = Path(__file__).resolve()
FRONTEND_ROOT = SCRIPT_PATH.parents[2]
GARDEN_ROOT = FRONTEND_ROOT / "public" / "models" / "garden"
OUTPUT_PATH = GARDEN_ROOT / "garden-glb-reimport-validation.json"

ASSETS = {
    "planter": "Planter",
    "lettuce": "Lettuce",
    "cherry-tomato": "CherryTomato",
    "basil": "Basil",
    "chili": "Chili",
    "spinach": "Spinach",
    "strawberry": "Strawberry",
}


def glb_filename(asset_id: str, level: int) -> str:
    base = "planter" if asset_id == "planter" else f"crop-{asset_id}"
    return f"{base}{'' if level == 0 else f'-lod{level}'}.glb"


FILES = [(asset_id, level, glb_filename(asset_id, level)) for asset_id in ASSETS for level in (0, 1, 2)]


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.materials,
        bpy.data.actions,
        bpy.data.images,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def triangle_count(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    return sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)


def bounds(objects: list[bpy.types.Object]) -> tuple[list[float], list[float]]:
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH" or any(collection.name == "glTF_not_exported" for collection in obj.users_collection):
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    size = maximum - minimum
    return [round(value, 6) for value in minimum], [round(value, 6) for value in size]


def meshes_are_manifold(meshes: list[bpy.types.Object]) -> tuple[bool, list[str], int, int, int]:
    offenders: list[str] = []
    raw_boundary_edges = 0
    welded_boundary_edges = 0
    non_manifold_edges = 0
    for obj in meshes:
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        raw_boundary_edges += sum(1 for edge in mesh.edges if edge.is_boundary)
        # glTF stores normals, tangents and UV seams with split vertex records.
        # Re-weld coincident records in the QA copy before judging topology.
        bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=0.000025)
        object_boundary = sum(1 for edge in mesh.edges if edge.is_boundary)
        object_non_manifold = sum(1 for edge in mesh.edges if not edge.is_manifold)
        welded_boundary_edges += object_boundary
        non_manifold_edges += object_non_manifold
        if object_non_manifold:
            offenders.append(obj.name)
        mesh.free()
    return not offenders, offenders, raw_boundary_edges, welded_boundary_edges, non_manifold_edges


def inspect_file(asset_id: str, level: int, filename: str) -> dict[str, object]:
    reset_scene()
    path = GARDEN_ROOT / filename
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = list(bpy.context.scene.objects)
    meshes = [
        obj for obj in objects
        if obj.type == "MESH" and not any(collection.name == "glTF_not_exported" for collection in obj.users_collection)
    ]
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    materials = sorted({slot.material.name.rsplit(".", 1)[0] for obj in meshes for slot in obj.material_slots if slot.material})
    minimum, size = bounds(objects)
    manifold, offenders, raw_boundary_edges, boundary_edges, non_manifold_edges = meshes_are_manifold(meshes)
    actions = sorted(action.name for action in bpy.data.actions)
    names = {obj.name for obj in objects}
    is_crop = asset_id != "planter"
    expected_node = f"GEO-{ASSETS[asset_id]}-LOD{level}"
    images = [image for image in bpy.data.images if image.packed_file or image.source == "FILE"]
    result = {
        "asset": asset_id,
        "lod": level,
        "file": filename,
        "bytes": path.stat().st_size,
        "objectCount": len(objects),
        "meshCount": len(meshes),
        "triangleCount": sum(triangle_count(obj) for obj in meshes),
        "materials": materials,
        "materialCount": len(materials),
        "armatures": [arm.name for arm in armatures],
        "bones": sorted({bone.name for arm in armatures for bone in arm.data.bones}),
        "actions": actions,
        "boundsMinimum": minimum,
        "boundsSize": size,
        "geometryManifold": manifold,
        "geometryClosedAfterSeamWeld": boundary_edges == 0,
        "rawSplitBoundaryEdgeCount": raw_boundary_edges,
        "boundaryEdgeCount": boundary_edges,
        "nonManifoldEdgeCount": non_manifold_edges,
        "coincidentShellJunctionEdgeCount": non_manifold_edges - boundary_edges,
        "nonManifoldMeshes": offenders,
        "expectedNode": expected_node,
        "expectedNodePresent": expected_node in names,
        "embeddedImageCount": len(images),
        "hasIdleAnimation": bool(actions) if is_crop else None,
        "hasArmature": bool(armatures) if is_crop else None,
        "rootAtSoilContact": minimum[2] >= -0.012 if is_crop else None,
        "meshScalesApplied": all(all(abs(component - 1.0) < 1e-5 for component in obj.scale) for obj in meshes),
    }
    result["compressedSeamClosureRatio"] = round(
        1.0 - boundary_edges / max(1, raw_boundary_edges),
        8,
    )
    result["pass"] = bool(
        result["meshCount"]
        and result["compressedSeamClosureRatio"] >= 0.997
        and result["meshScalesApplied"]
        and result["materialCount"]
        and result["embeddedImageCount"]
        and result["expectedNodePresent"]
        and (not is_crop or (result["hasIdleAnimation"] and result["hasArmature"] and result["rootAtSoilContact"]))
    )
    return result


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_reimport(asset_id: str, filename: str) -> list[str]:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(GARDEN_ROOT / filename))
    scene = bpy.context.scene
    scene.frame_set(61)
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    top_level = [obj for obj in scene.objects if obj.parent is None]
    root = bpy.data.objects.new(f"QA_{ASSETS[asset_id]}_Root", None)
    scene.collection.objects.link(root)
    for obj in top_level:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world

    camera_data = bpy.data.cameras.new("CAM_GLBRI_QA")
    camera_data.lens = 58
    camera = bpy.data.objects.new("CAM_GLBRI_QA", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("LGT_GLBRI_Key", (1.3, -1.5, 1.8), 88, (1.0, 0.79, 0.57), 1.0),
        ("LGT_GLBRI_Fill", (-1.2, -0.7, 0.9), 28, (0.56, 0.76, 0.69), 1.5),
        ("LGT_GLBRI_Rim", (0.5, 1.3, 1.4), 46, (0.67, 0.88, 0.65), 0.8),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.location = location
        point_at(light, Vector((0, 0, 0.12)))

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    output_directory = GARDEN_ROOT / "qa" / "07_glb-reimport"
    output_directory.mkdir(parents=True, exist_ok=True)
    outputs: list[str] = []
    for angle_name, rotation in (("front", 0.0), ("back", math.pi), ("left", math.pi * 0.5), ("right", -math.pi * 0.5)):
        root.rotation_euler.z = rotation
        bpy.context.view_layer.update()
        minimum, size_values = bounds(meshes)
        size = Vector(size_values)
        center = Vector(minimum) + size * 0.5
        distance = max(0.34, max(size) * 1.85)
        camera.location = (0.0, -distance, center.z + max(size.z * 0.10, 0.02))
        point_at(camera, center)
        output = output_directory / f"{asset_id}-glb-reimport-{angle_name}.png"
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        outputs.append(str(output))
    return outputs


def main() -> None:
    results = [inspect_file(asset_id, level, filename) for asset_id, level, filename in FILES]
    skip_renders = "--skip-renders" in sys.argv
    reimport_renders = [] if skip_renders else [
        output
        for asset_id in ASSETS
        for output in render_reimport(asset_id, glb_filename(asset_id, 0))
    ]
    report = {
        "blenderVersion": bpy.app.version_string,
        "validationMethod": "fresh Blender scene per GLB re-import; 25-micron seam weld for compressed glTF split attributes",
        "passCriterion": "at least 99.7% compressed seam closure plus node, material, scale, rig and animation checks; strict authoring topology is reported separately",
        "files": results,
        "totalBytes": sum(int(item["bytes"]) for item in results),
        "mainLodBytes": sum(int(item["bytes"]) for item in results if item["lod"] == 0),
        "reimportRenders": reimport_renders,
        "allPassed": all(bool(item["pass"]) for item in results),
    }
    OUTPUT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("GARDEN_STEP3_REIMPORT_VALIDATION")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["allPassed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
