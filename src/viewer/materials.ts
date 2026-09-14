import * as THREE from 'three';
import { computeMikkTSpaceTangents } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
import { AO_MATERIALS, MATERIAL_NAMES } from './config';
import type { QaResult } from './qa';

export type PbrMaterial = THREE.MeshStandardMaterial & {
  aoMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
};

export function materialsOf(mesh: THREE.Mesh): PbrMaterial[] {
  const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return source.filter((m): m is PbrMaterial => m instanceof THREE.MeshStandardMaterial);
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
}

export function validateAndGenerateTangents(root: THREE.Object3D, qa: QaResult): {
  materialMap: Map<string, PbrMaterial>;
  materialInstances: Set<PbrMaterial>;
} {
  const materialMap = new Map<string, PbrMaterial>();
  const materialInstances = new Set<PbrMaterial>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    qa.meshes += 1;
    qa.triangles += triangleCount(object.geometry);
    const materials = materialsOf(object);
    for (const material of materials) {
      materialMap.set(material.name, material);
      materialInstances.add(material);
    }
    const normalMapped = materials.filter((material) => material.normalMap !== null);
    if (normalMapped.length === 0) return;
    qa.normalMappedPrimitives += normalMapped.length;
    const hasTangent = object.geometry.hasAttribute('tangent');
    if (hasTangent) {
      qa.tangentsAlreadyPresent += normalMapped.length;
      return;
    }
    const missing = ['position', 'normal', 'uv'].filter((name) => !object.geometry.hasAttribute(name));
    if (missing.length > 0) {
      qa.missingTangentPrerequisites.push(`${object.name}: ${missing.join(', ')}`);
      return;
    }
    computeMikkTSpaceTangents(object.geometry, MikkTSpace, true);
    qa.tangentsGenerated += normalMapped.length;
  });
  qa.triangles = Math.round(qa.triangles);
  return { materialMap, materialInstances };
}

export function validateMaterials(root: THREE.Object3D, materialMap: Map<string, PbrMaterial>, qa: QaResult): void {
  qa.materials = [...materialMap.keys()].sort();
  for (const name of MATERIAL_NAMES) {
    const material = materialMap.get(name);
    if (!material) { qa.errors.push(`Missing material ${name}.`); continue; }
    qa.normalChannels[name] = material.normalMap?.channel ?? null;
    if (!material.normalMap || material.normalMap.channel !== 0) qa.errors.push(`${name} normal map is not TEXCOORD_0/channel 0.`);
    if ((material.roughnessMap?.channel ?? 0) !== 0 || (material.metalnessMap?.channel ?? 0) !== 0) qa.errors.push(`${name} MR map is not TEXCOORD_0/channel 0.`);
    if (AO_MATERIALS.has(name)) {
      let hasUv1 = true;
      root.traverse((object) => {
        if (object instanceof THREE.Mesh && materialsOf(object).includes(material) && (!object.geometry.hasAttribute('uv') || !object.geometry.hasAttribute('uv1'))) hasUv1 = false;
      });
      qa.ao[name] = { present: material.aoMap !== null, active: material.aoMap !== null, channel: material.aoMap?.channel ?? null, uv1: hasUv1, intensity: material.aoMapIntensity };
      if (!material.aoMap || material.aoMap.channel !== 1 || !hasUv1) qa.errors.push(`${name} AO is not preserved on TEXCOORD_1/uv1.`);
      const mr = material.roughnessMap ?? material.metalnessMap;
      qa.packedAoMr[name] = {
        sharedImage: Boolean(material.aoMap && mr && material.aoMap.image === mr.image),
        aoChannel: material.aoMap?.channel ?? null,
        mrChannel: mr?.channel ?? null,
      };
    } else {
      qa.ao[name] = { present: material.aoMap !== null, active: material.aoMap !== null, channel: material.aoMap?.channel ?? null, uv1: false, intensity: material.aoMapIntensity };
      if (material.aoMap) qa.errors.push(`${name} unexpectedly has AO.`);
    }
  }
}
