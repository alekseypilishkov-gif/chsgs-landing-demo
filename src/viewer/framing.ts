import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA, CAMERA_AZIMUTH_DEG, PREVIOUS_CAMERA_AZIMUTH_DEG, VERTICAL_FRAMING_OFFSET } from './config';
import type { QaResult } from './qa';

export function normalizeAzimuthDeg(value: number): number {
  return THREE.MathUtils.euclideanModulo(value + 180, 360) - 180;
}

export function cameraRollDeg(camera: THREE.Camera): number {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const worldUp = new THREE.Vector3(0, 1, 0);
  const projectedWorldUp = worldUp.addScaledVector(forward, -worldUp.dot(forward)).normalize();
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const sine = new THREE.Vector3().crossVectors(projectedWorldUp, cameraUp).dot(forward);
  return THREE.MathUtils.radToDeg(Math.atan2(sine, projectedWorldUp.dot(cameraUp)));
}

export class ModelFramer {
  elevationFactor: number = CAMERA.elevationFactor;
  azimuthDeg: number = CAMERA_AZIMUTH_DEG;
  verticalOffset: number = VERTICAL_FRAMING_OFFSET;
  framedModel: THREE.Object3D | null = null;
  neutralBounds: THREE.Box3 | null = null;
  controls: OrbitControls | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly qa: QaResult,
    private readonly onFrame: (bounds: THREE.Box3) => void,
  ) {}

  frame(root: THREE.Object3D): void {
    this.framedModel = root;
    const bounds = this.neutralBounds?.clone() ?? new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const compositionTarget = center.clone();
    compositionTarget.y -= this.verticalOffset;
    const size = bounds.getSize(new THREE.Vector3());
    const radius = size.length() * 0.5;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const azimuthRad = THREE.MathUtils.degToRad(this.azimuthDeg);
    const viewDirection = new THREE.Vector3(
      Math.cos(azimuthRad),
      this.elevationFactor / Math.SQRT2,
      Math.sin(azimuthRad),
    ).normalize();
    this.camera.position.copy(compositionTarget).add(viewDirection);
    this.camera.lookAt(compositionTarget);
    this.camera.updateMatrixWorld(true);
    const worldToCameraRotation = this.camera.quaternion.clone().invert();
    const targetNdcExtent = 0.92;
    let distance = 0;
    const corners: THREE.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z);
          corners.push(corner);
          const local = corner.clone().sub(compositionTarget).applyQuaternion(worldToCameraRotation);
          distance = Math.max(
            distance,
            local.z + Math.abs(local.x) / (targetNdcExtent * Math.tan(horizontalFov / 2)),
            local.z + Math.abs(local.y) / (targetNdcExtent * Math.tan(verticalFov / 2)),
          );
        }
      }
    }
    distance = Math.max(distance, radius * 0.25);
    this.camera.position.copy(compositionTarget).addScaledVector(viewDirection, distance);
    this.camera.near = Math.max(0.05, distance - radius * 1.5);
    this.camera.far = distance * 2 + radius * 3;
    this.camera.lookAt(compositionTarget);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    const projectedCorners = corners.map((corner) => corner.clone().project(this.camera));
    const maxNdcExtent = Math.max(...projectedCorners.flatMap((corner) => [Math.abs(corner.x), Math.abs(corner.y)]));
    const minNdcY = Math.min(...projectedCorners.map((corner) => corner.y));
    const maxNdcY = Math.max(...projectedCorners.map((corner) => corner.y));
    this.qa.camera = {
      type: this.camera.type,
      fov: this.camera.fov,
      elevationFactor: this.elevationFactor,
      azimuthDeg: this.azimuthDeg,
      verticalFramingOffset: this.verticalOffset,
      projectedCenterNdcY: (minNdcY + maxNdcY) * 0.5,
      previousAzimuthDeg: PREVIOUS_CAMERA_AZIMUTH_DEG,
      autoFraming: true,
      contained: maxNdcExtent <= 1,
      maxNdcExtent,
      orbitControls: this.controls !== null,
      position: this.camera.position.toArray(),
      target: compositionTarget.toArray(),
    };
    if (this.controls) {
      this.controls.target.copy(compositionTarget);
      this.controls.update();
    }
    this.onFrame(bounds);
  }

  stateText(): string {
    const target = this.controls?.target ?? new THREE.Vector3(...this.qa.camera.target);
    const formatVector = (vector: THREE.Vector3) => vector.toArray().map((value) => value.toFixed(4)).join(', ');
    return [
      'CAMERA STATE',
      '',
      `FOV: ${this.camera.fov.toFixed(0)}`,
      `Elevation: ${this.elevationFactor.toFixed(2)}`,
      `Azimuth: ${this.azimuthDeg.toFixed(1)}`,
      `Vertical Framing Offset: ${this.verticalOffset.toFixed(1)} (positive moves model up)`,
      `Position: ${formatVector(this.camera.position)}`,
      `Target: ${formatVector(target)}`,
    ].join('\n');
  }
}
