"""Write a strict topology audit for the authored Blender LOD meshes."""

from __future__ import annotations

import json
from pathlib import Path

import bmesh
import bpy


GARDEN_ROOT = Path(__file__).resolve().parents[2] / "public" / "models" / "garden"
OUTPUT = GARDEN_ROOT / "garden-authoring-topology-validation.json"
DISPLAYS = ("Planter", "Lettuce", "CherryTomato", "Basil", "Chili", "Spinach", "Strawberry")


def inspect(name: str) -> dict[str, object]:
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != "MESH":
        return {"object": name, "present": False, "pass": False}
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    boundary = sum(1 for edge in mesh.edges if edge.is_boundary)
    non_manifold = sum(1 for edge in mesh.edges if not edge.is_manifold)
    result = {
        "object": name,
        "present": True,
        "vertices": len(mesh.verts),
        "faces": len(mesh.faces),
        "triangles": sum(max(0, len(face.verts) - 2) for face in mesh.faces),
        "boundaryEdgeCount": boundary,
        "nonManifoldEdgeCount": non_manifold,
        "materialCount": len([slot for slot in obj.material_slots if slot.material]),
        "uvLayerCount": len(obj.data.uv_layers),
        "scaleApplied": all(abs(component - 1.0) < 0.00001 for component in obj.scale),
    }
    result["pass"] = bool(
        result["boundaryEdgeCount"] == 0
        and result["nonManifoldEdgeCount"] == 0
        and result["materialCount"]
        and result["uvLayerCount"]
        and result["scaleApplied"]
    )
    mesh.free()
    return result


files = [inspect(f"GEO-{display}-LOD{level}") for display in DISPLAYS for level in (0, 1, 2)]
report = {
    "blenderVersion": bpy.app.version_string,
    "sourceBlend": bpy.data.filepath,
    "validationMethod": "strict authored BMesh edge-manifold audit before glTF attribute splitting",
    "files": files,
    "allPassed": all(bool(item["pass"]) for item in files),
}
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("GARDEN_AUTHORING_TOPOLOGY_AUDIT")
print(json.dumps(report, ensure_ascii=False, indent=2))
if not report["allPassed"]:
    raise SystemExit(2)
