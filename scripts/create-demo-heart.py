"""Original stylized heart demo asset, MIT like this repository.

Interaction reference only; deliberately simplified shapes. No external assets.
Run with Python 3 to regenerate the repository's public/heart.glb.
Uses only the Python standard library and works from any working directory.
"""
import json
import math
from pathlib import Path
import struct

binary = bytearray()
gltf = {
    "asset": {"version": "2.0", "generator": "OpenEdu3D model annotation demo", "copyright": "2026 OpenEdu3D; MIT"},
    "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [],
    "materials": [], "buffers": [], "bufferViews": [], "accessors": [],
}


def accessor(values, kind, components, index=False):
    while len(binary) % 4:
        binary.append(0)
    raw = struct.pack("<" + ("H" if index else "f") * len(values), *values)
    view = len(gltf["bufferViews"])
    gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(raw), "target": 34963 if index else 34962})
    binary.extend(raw)
    result = {"bufferView": view, "componentType": 5123 if index else 5126, "count": len(values) // components, "type": kind}
    if not index:
        result["min"] = [min(values[i::components]) for i in range(components)]
        result["max"] = [max(values[i::components]) for i in range(components)]
    gltf["accessors"].append(result)
    return len(gltf["accessors"]) - 1


def material(color):
    gltf["materials"].append({"pbrMetallicRoughness": {"baseColorFactor": [*color, 1], "metallicFactor": 0, "roughnessFactor": 0.48}, "doubleSided": False})
    return len(gltf["materials"]) - 1


def mesh(name, positions, normals, indices, color, translation=None, scale=None, angle=0):
    p = accessor(positions, "VEC3", 3)
    n = accessor(normals, "VEC3", 3)
    i = accessor(indices, "SCALAR", 1, True)
    gltf["meshes"].append({"name": name, "primitives": [{"attributes": {"POSITION": p, "NORMAL": n}, "indices": i, "material": material(color)}]})
    node = {"name": name, "mesh": len(gltf["meshes"]) - 1}
    if translation:
        node["translation"] = translation
    if scale:
        node["scale"] = scale
    if angle:
        node["rotation"] = [0, 0, math.sin(angle / 2), math.cos(angle / 2)]
    gltf["nodes"].append(node)
    gltf["scenes"][0]["nodes"].append(len(gltf["nodes"]) - 1)


def sphere(name, center, scale, color, angle=0):
    positions, indices = [], []
    rings, segments = 24, 40
    for ring in range(rings + 1):
        theta = math.pi * ring / rings
        for segment in range(segments + 1):
            phi = math.tau * segment / segments
            positions.extend([math.sin(theta) * math.cos(phi), math.cos(theta), math.sin(theta) * math.sin(phi)])
    for ring in range(rings):
        for segment in range(segments):
            a = ring * (segments + 1) + segment
            b = a + segments + 1
            indices.extend([a, a + 1, b, a + 1, b + 1, b])
    mesh(name, positions, positions, indices, color, center, scale, angle)


def tube(name, path, radius, color):
    positions, normals, indices = [], [], []
    segments = 20
    for ring, point in enumerate(path):
        for segment in range(segments + 1):
            theta = math.tau * segment / segments
            nx, nz = math.cos(theta), math.sin(theta)
            positions.extend([point[0] + radius * nx, point[1], point[2] + radius * nz])
            normals.extend([nx, 0, nz])
    for ring in range(len(path) - 1):
        for segment in range(segments):
            a = ring * (segments + 1) + segment
            b = a + segments + 1
            indices.extend([a, b, a + 1, a + 1, b, b + 1])
    mesh(name, positions, normals, indices, color)


sphere("Left_ventricle", [0.25, -0.35, 0], [0.65, 1.0, 0.65], [0.64, 0.22, 0.22], 0.20)
sphere("Right_ventricle", [-0.4, -0.15, 0.05], [0.65, 0.82, 0.56], [0.72, 0.31, 0.29], -0.25)
sphere("Left_atrium", [0.37, 0.53, -0.1], [0.48, 0.47, 0.5], [0.75, 0.39, 0.36], -0.1)
sphere("Right_atrium", [-0.53, 0.48, 0.0], [0.48, 0.50, 0.49], [0.62, 0.28, 0.25], 0.25)
tube("Aorta", [[0.05, 0.5, -0.18], [0.05, 0.9, -0.18], [0.03, 1.2, -0.18], [0.17, 1.43, -0.18], [0.45, 1.50, -0.18], [0.70, 1.37, -0.18]], 0.20, [0.69, 0.23, 0.21])
tube("Pulmonary_artery", [[-0.1, 0.32, 0.34], [-0.15, 0.65, 0.34], [-0.28, 0.92, 0.34], [-0.49, 1.12, 0.34]], 0.17, [0.29, 0.48, 0.58])
tube("Vena_cava", [[-0.67, 0.38, -0.07], [-0.70, 0.80, -0.07], [-0.72, 1.20, -0.07]], 0.16, [0.36, 0.52, 0.62])
tube("Aortic_branch_1", [[0.14, 1.25, -0.18], [0.12, 1.60, -0.18], [0.13, 1.76, -0.18]], 0.075, [0.69, 0.23, 0.21])
tube("Aortic_branch_2", [[0.35, 1.40, -0.18], [0.36, 1.62, -0.18], [0.40, 1.78, -0.18]], 0.075, [0.69, 0.23, 0.21])
tube("Aortic_branch_3", [[0.53, 1.41, -0.18], [0.61, 1.62, -0.18], [0.66, 1.74, -0.18]], 0.065, [0.69, 0.23, 0.21])

while len(binary) % 4:
    binary.append(0)
gltf["buffers"].append({"byteLength": len(binary)})
encoded = json.dumps(gltf, separators=(",", ":")).encode()
encoded += b" " * (-len(encoded) % 4)
length = 12 + 8 + len(encoded) + 8 + len(binary)
glb = struct.pack("<III", 0x46546C67, 2, length)
glb += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
glb += struct.pack("<II", len(binary), 0x004E4942) + binary
output = Path(__file__).resolve().parent.parent / "public" / "heart.glb"
output.parent.mkdir(exist_ok=True)
output.write_bytes(glb)
print(f"Generated {output}: {length:,} bytes")
