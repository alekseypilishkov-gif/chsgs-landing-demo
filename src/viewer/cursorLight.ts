import * as THREE from 'three';
import { LIGHTING } from './config';

export class CursorLight {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly hit = new THREE.Vector3();
  private readonly targetPos = new THREE.Vector3();
  private readonly centerLocal = new THREE.Vector3();
  private readonly worldCenter = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly plane = new THREE.Plane();
  private target: THREE.Object3D | null = null;
  private height = 8;

  constructor(
    private readonly light: THREE.PointLight,
    private readonly camera: THREE.Camera,
  ) {}

  configure(root: THREE.Object3D): void {
    this.target = root;
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(this.hit);
    bounds.getCenter(this.centerLocal);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    this.height = Math.max(3, size.y * 0.45 + 1.5);
    this.light.distance = Math.max(24, maxDim * 0.42);
    this.targetPos.set(this.centerLocal.x, this.centerLocal.y + this.height, this.centerLocal.z);
    this.light.position.copy(this.targetPos);
  }

  update(options: {
    enabled: boolean;
    intensity: number;
    pointerInside: boolean;
    pointer: THREE.Vector2 | null;
    canvas: HTMLCanvasElement;
  }): void {
    const active = options.enabled && options.pointerInside && options.pointer !== null && this.target !== null;
    const targetIntensity = active ? options.intensity : 0;
    this.light.intensity += (targetIntensity - this.light.intensity) * LIGHTING.accentIntensityLerp;
    if (Math.abs(this.light.intensity - targetIntensity) < 0.05) this.light.intensity = targetIntensity;
    if (!active || !this.target || !options.pointer) return;
    const rect = options.canvas.getBoundingClientRect();
    const width = Math.max(rect.width, Number.EPSILON);
    const height = Math.max(rect.height, Number.EPSILON);
    this.ndc.set(((options.pointer.x - rect.left) / width) * 2 - 1, -((options.pointer.y - rect.top) / height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.worldCenter.copy(this.centerLocal);
    this.target.localToWorld(this.worldCenter);
    this.target.getWorldScale(this.scale);
    const planeY = this.worldCenter.y + this.height * this.scale.y;
    this.plane.setFromNormalAndCoplanarPoint(this.up, this.hit.set(this.worldCenter.x, planeY, this.worldCenter.z));
    if (!this.raycaster.ray.intersectPlane(this.plane, this.hit)) return;
    this.targetPos.set(this.hit.x, planeY, this.hit.z);
    this.light.position.lerp(this.targetPos, LIGHTING.accentLerp);
  }
}
