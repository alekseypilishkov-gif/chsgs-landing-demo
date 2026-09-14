import * as THREE from 'three';
import { LIGHTING, SHADOWS } from './config';
import type { QaResult } from './qa';

export function configureModelShadows(
  root: THREE.Object3D,
  keyLight: THREE.DirectionalLight,
  qa: QaResult,
): void {
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 1);
  const lightDirection = LIGHTING.directionalPosition.clone().normalize();
  keyLight.position.copy(center).addScaledVector(lightDirection, radius * 2.5);
  keyLight.target.position.copy(center);
  keyLight.target.updateMatrixWorld(true);

  const shadowCamera = keyLight.shadow.camera;
  shadowCamera.position.copy(keyLight.position);
  shadowCamera.lookAt(center);
  shadowCamera.updateMatrixWorld(true);

  const corners: THREE.Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(shadowCamera.matrixWorldInverse));
    }
  }
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const minZ = Math.min(...corners.map((corner) => corner.z));
  const maxZ = Math.max(...corners.map((corner) => corner.z));
  const padX = Math.max((maxX - minX) * SHADOWS.boundsPadding, 0.1);
  const padY = Math.max((maxY - minY) * SHADOWS.boundsPadding, 0.1);
  const padZ = Math.max((maxZ - minZ) * SHADOWS.boundsPadding, 0.1);
  shadowCamera.left = minX - padX;
  shadowCamera.right = maxX + padX;
  shadowCamera.bottom = minY - padY;
  shadowCamera.top = maxY + padY;
  shadowCamera.near = Math.max(0.05, -maxZ - padZ);
  shadowCamera.far = Math.max(shadowCamera.near + 1, -minZ + padZ);
  shadowCamera.updateProjectionMatrix();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    qa.shadows.castMeshes += 1;
    qa.shadows.receiveMeshes += 1;
  });
}
