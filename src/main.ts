import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeMikkTSpaceTangents } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
import {
  CLAY_AO_INTENSITY,
  CHSGSMaterialAppearanceController,
  type CHSGSAppearanceMode,
} from './CHSGSMaterialAppearanceController';
import { CHSGSPassiveHoverController, type PassiveHoverDiagnostics } from './CHSGSPassiveHoverController';
import { CHSGSDragInertiaController, type DragInertiaDiagnostics } from './CHSGSDragInertiaController';
import { mountLanding } from './landing';
import { LandingMotion } from './LandingMotion';
import { SmoothPageScroll } from './SmoothPageScroll';
import './landing.css';

mountLanding();
new SmoothPageScroll();

const MODEL_URL = `${import.meta.env.BASE_URL}models/CHSGS_Plan_WebGL_PC03.glb`;
const EXPECTED = { meshes: 153, triangles: 60746, materials: 5, generatedTangents: 37 } as const;
const MATERIAL_NAMES = [
  'M_Ground_GLTF',
  'M_Facade_GLTF',
  'M_Facade_GLTF_AO',
  'M_Roof_GLTF',
  'M_Small_Details_GLTF',
] as const;
const AO_MATERIALS = new Set(['M_Ground_GLTF', 'M_Facade_GLTF_AO']);
const LIGHTING = {
  hemisphereSky: 0xffffff,
  hemisphereGround: 0x454545,
  hemisphereIntensity: 0.75,
  directionalColor: 0xffffff,
  directionalIntensity: 2.8,
  directionalPosition: new THREE.Vector3(32, 48, 28),
} as const;
const CAMERA = {
  fov: 45,
  previousFov: 35,
  elevationFactor: 0.79,
  previousElevationFactor: 0.52,
} as const;
const PREVIOUS_CAMERA_AZIMUTH_DEG = 45;
const CAMERA_AZIMUTH_DEG = -117.1;
// Positive values move the visible model upward on screen without transforming it.
const VERTICAL_FRAMING_OFFSET = 10.0;
const SHADOWS = {
  mapSize: 2048,
  bias: -0.00015,
  normalBias: 0.03,
  radius: 2,
  boundsPadding: 0.12,
} as const;

type PbrMaterial = THREE.MeshStandardMaterial & {
  aoMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
};

interface QaResult {
  status: 'loading' | 'pass' | 'fail';
  renderer: string;
  webglVersion: string;
  meshes: number;
  triangles: number;
  materials: string[];
  normalMappedPrimitives: number;
  tangentsAlreadyPresent: number;
  tangentsGenerated: number;
  missingTangentPrerequisites: string[];
  ao: Record<string, { present: boolean; active: boolean; channel: number | null; uv1: boolean; intensity: number }>;
  packedAoMr: Record<string, { sharedImage: boolean; aoChannel: number | null; mrChannel: number | null }>;
  normalChannels: Record<string, number | null>;
  pixelRatio: number;
  appearance: {
    mode: CHSGSAppearanceMode;
    color: string;
    metalness: number;
    roughness: number;
    aoIntensity: number;
    aoEnabled: boolean;
    normalMapsEnabled: boolean;
    runtimeMaterialInstances: number;
    materialInstancesByName: Record<string, number>;
    clayValid: boolean;
    originalValid: boolean;
    repeatedSwitchingValid: boolean;
  };
  reveal: {
    enabled: boolean;
    space: 'SCREEN';
    coreRadiusCssPx: number;
    featherCssPx: number;
    outerRadiusCssPx: number;
    strength: number;
    visibility: number;
    patchedMaterials: string[];
    additionalDrawCalls: 0;
  };
  hierarchy: { entryRoot: boolean; heroIdleRoot: boolean; dragRoot: boolean; hoverRoot: boolean; neutralHoverRotation: boolean };
  hover: PassiveHoverDiagnostics;
  drag: DragInertiaDiagnostics;
  camera: {
    type: string;
    fov: number;
    elevationFactor: number;
    azimuthDeg: number;
    verticalFramingOffset: number;
    projectedCenterNdcY: number;
    previousAzimuthDeg: number;
    autoFraming: boolean;
    contained: boolean;
    maxNdcExtent: number;
    orbitControls: boolean;
    position: [number, number, number];
    target: [number, number, number];
  };
  lighting: { hemisphereIntensity: number; directionalIntensity: number };
  shadows: { enabled: boolean; type: string; mapSize: number; castMeshes: number; receiveMeshes: number };
  performance: { programs: number; drawCalls: number; frameTriangles: number };
  errors: string[];
}

declare global {
  interface Window {
    __CHSGS_QA__: QaResult;
    __CHSGS_APPEARANCE__?: CHSGSMaterialAppearanceController;
    __CHSGS_HOVER__?: CHSGSPassiveHoverController;
    __CHSGS_DRAG__?: CHSGSDragInertiaController;
  }
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Required element is missing: ${selector}`);
  return element;
}
const host = requiredElement('#viewer');
const status = requiredElement('#status');
const debug = new URLSearchParams(location.search).get('debug') === '1';
const smokeQa = new URLSearchParams(location.search).get('qa') === '1';

const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.05, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.prepend(renderer.domElement);

const hemisphereLight = new THREE.HemisphereLight(LIGHTING.hemisphereSky, LIGHTING.hemisphereGround, LIGHTING.hemisphereIntensity);
scene.add(hemisphereLight);
const keyLight = new THREE.DirectionalLight(LIGHTING.directionalColor, LIGHTING.directionalIntensity);
keyLight.position.copy(LIGHTING.directionalPosition);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(SHADOWS.mapSize, SHADOWS.mapSize);
keyLight.shadow.bias = SHADOWS.bias;
keyLight.shadow.normalBias = SHADOWS.normalBias;
keyLight.shadow.radius = SHADOWS.radius;
scene.add(keyLight, keyLight.target);

const entryRoot = new THREE.Group();
entryRoot.name = 'CHSGS_EntryRoot';
const heroIdleRoot = new THREE.Group();
heroIdleRoot.name = 'CHSGS_HeroIdleRoot';
const dragRoot = new THREE.Group();
dragRoot.name = 'CHSGS_DragRoot';
const hoverRoot = new THREE.Group();
hoverRoot.name = 'CHSGS_HoverRoot';
const scrollRoot = new THREE.Group();
scrollRoot.name = 'CHSGS_ScrollRoot';
entryRoot.add(scrollRoot);
scrollRoot.add(heroIdleRoot);
heroIdleRoot.add(dragRoot);
dragRoot.add(hoverRoot);
scene.add(entryRoot);

let controls: OrbitControls | null = null;
let cameraElevationFactor: number = CAMERA.elevationFactor;
let cameraAzimuthDeg: number = CAMERA_AZIMUTH_DEG;
let verticalFramingOffset: number = VERTICAL_FRAMING_OFFSET;
let framedModel: THREE.Object3D | null = null;
let appearanceController: CHSGSMaterialAppearanceController | null = null;
let lastPointerClient: THREE.Vector2 | null = null;
let pointerInsideRenderer = false;
const hoverController = new CHSGSPassiveHoverController(hoverRoot, camera);
window.__CHSGS_HOVER__ = hoverController;
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const hoverCapabilityQuery = matchMedia('(hover: hover) and (pointer: fine)');
const dragController = new CHSGSDragInertiaController(
  dragRoot,
  renderer.domElement,
  (weight) => hoverController.setInteractionWeight(weight),
  () => hoverController.setPointerInside(false),
  () => {
    if (pointerInsideRenderer && lastPointerClient) {
      updateHoverPointerFromClient(lastPointerClient.x, lastPointerClient.y);
    }
  },
  (active) => { if (controls) controls.enabled = !active; },
);
window.__CHSGS_DRAG__ = dragController;
dragController.setEnabled(false);
const landingMotion = new LandingMotion(entryRoot, scrollRoot, heroIdleRoot, camera, (active) => {
  dragController.setEnabled(active);
  hoverController.setEnabled(active);
  if (!active) { hoverController.setPointerInside(false); appearanceController?.setPointerInside(false); }
});
let neutralModelBounds: THREE.Box3 | null = null;
// Transparent WebGL composes against the current theme without changing approved materials.
document.addEventListener('chsgs-theme', () => {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', document.documentElement.dataset.theme === 'light' ? '#f2f1ec' : '#262626');
});
const syncMotionPreference = () => {
  hoverController.setReducedMotion(reducedMotionQuery.matches || !hoverCapabilityQuery.matches);
  dragController.setReducedMotion(reducedMotionQuery.matches);
};
reducedMotionQuery.addEventListener('change', syncMotionPreference);
hoverCapabilityQuery.addEventListener('change', syncMotionPreference);
syncMotionPreference();
let refreshHoverDebug: (() => void) | null = null;
let refreshDragDebug: (() => void) | null = null;
const qa: QaResult = {
  status: 'loading', renderer: 'THREE.WebGLRenderer', webglVersion: 'unknown', meshes: 0, triangles: 0,
  materials: [], normalMappedPrimitives: 0, tangentsAlreadyPresent: 0, tangentsGenerated: 0,
  missingTangentPrerequisites: [], ao: {}, packedAoMr: {}, normalChannels: {}, pixelRatio: 1, errors: [],
  appearance: {
    mode: 'ORIGINAL', color: '#6e7172', metalness: 0, roughness: 0.45, aoIntensity: CLAY_AO_INTENSITY,
    aoEnabled: true, normalMapsEnabled: true,
    runtimeMaterialInstances: 0, materialInstancesByName: {},
    clayValid: false, originalValid: false, repeatedSwitchingValid: false,
  },
  reveal: {
    enabled: true, space: 'SCREEN', coreRadiusCssPx: 130, featherCssPx: 130, outerRadiusCssPx: 260,
    strength: 1, visibility: 0, patchedMaterials: [], additionalDrawCalls: 0,
  },
  hierarchy: { entryRoot: true, heroIdleRoot: true, dragRoot: true, hoverRoot: true, neutralHoverRotation: true },
  hover: hoverController.diagnostics,
  drag: dragController.diagnostics,
  camera: {
    type: camera.type,
    fov: camera.fov,
    elevationFactor: cameraElevationFactor,
    azimuthDeg: cameraAzimuthDeg,
    verticalFramingOffset,
    projectedCenterNdcY: 0,
    previousAzimuthDeg: PREVIOUS_CAMERA_AZIMUTH_DEG,
    autoFraming: false,
    contained: false,
    maxNdcExtent: 0,
    orbitControls: false,
    position: [0, 0, 0],
    target: [0, 0, 0],
  },
  lighting: { hemisphereIntensity: hemisphereLight.intensity, directionalIntensity: keyLight.intensity },
  shadows: {
    enabled: renderer.shadowMap.enabled,
    type: 'PCFSoftShadowMap',
    mapSize: SHADOWS.mapSize,
    castMeshes: 0,
    receiveMeshes: 0,
  },
  performance: { programs: 0, drawCalls: 0, frameTriangles: 0 },
};
window.__CHSGS_QA__ = qa;

function resize(): void {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (framedModel) frameModel(framedModel);
  qa.pixelRatio = renderer.getPixelRatio();
  appearanceController?.setFramebufferScale(qa.pixelRatio);
  if (pointerInsideRenderer && lastPointerClient && appearanceController) {
    const rect = renderer.domElement.getBoundingClientRect();
    appearanceController.setPointerFromCanvasCss(
      lastPointerClient.x - rect.left,
      lastPointerClient.y - rect.top,
      rect.height,
    );
  }
}
window.addEventListener('resize', resize);
resize();

function updateHoverPointerFromClient(clientX: number, clientY: number): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const halfWidth = Math.max(rect.width * 0.5, Number.EPSILON);
  const halfHeight = Math.max(rect.height * 0.5, Number.EPSILON);
  hoverController.setPointerNormalized(
    (clientX - (rect.left + halfWidth)) / halfWidth,
    ((rect.top + halfHeight) - clientY) / halfHeight,
  );
}

function updateRevealPointer(event: PointerEvent): void {
  lastPointerClient ??= new THREE.Vector2();
  lastPointerClient.set(event.clientX, event.clientY);
  const rect = renderer.domElement.getBoundingClientRect();
  pointerInsideRenderer = event.clientX >= rect.left && event.clientX <= rect.right
    && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (pointerInsideRenderer) {
    appearanceController?.setPointerFromCanvasCss(event.clientX - rect.left, event.clientY - rect.top, rect.height);
    if (!dragController.suppressesHover) updateHoverPointerFromClient(event.clientX, event.clientY);
  } else {
    appearanceController?.setPointerInside(false);
  }
}
renderer.domElement.addEventListener('pointerenter', updateRevealPointer);
renderer.domElement.addEventListener('pointermove', updateRevealPointer);
renderer.domElement.addEventListener('pointerleave', () => {
  lastPointerClient = null;
  pointerInsideRenderer = false;
  appearanceController?.setPointerInside(false);
  hoverController.setPointerInside(false);
});

function materialsOf(mesh: THREE.Mesh): PbrMaterial[] {
  const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return source.filter((m): m is PbrMaterial => m instanceof THREE.MeshStandardMaterial);
}

function triangleCount(geometry: THREE.BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
}

function validateAndGenerateTangents(root: THREE.Object3D): {
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

function validateMaterials(root: THREE.Object3D, materialMap: Map<string, PbrMaterial>): void {
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

function frameModel(root: THREE.Object3D): void {
  framedModel = root;
  const bounds = neutralModelBounds?.clone() ?? new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const compositionTarget = center.clone();
  compositionTarget.y -= verticalFramingOffset;
  const size = bounds.getSize(new THREE.Vector3());
  const radius = size.length() * 0.5;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const azimuthRad = THREE.MathUtils.degToRad(cameraAzimuthDeg);
  const viewDirection = new THREE.Vector3(
    Math.cos(azimuthRad),
    cameraElevationFactor / Math.SQRT2,
    Math.sin(azimuthRad),
  ).normalize();
  camera.position.copy(compositionTarget).add(viewDirection);
  camera.lookAt(compositionTarget);
  camera.updateMatrixWorld(true);
  const worldToCameraRotation = camera.quaternion.clone().invert();
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
  camera.position.copy(compositionTarget).addScaledVector(viewDirection, distance);
  camera.near = Math.max(0.05, distance - radius * 1.5);
  camera.far = distance * 2 + radius * 3;
  camera.lookAt(compositionTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const projectedCorners = corners.map((corner) => corner.clone().project(camera));
  const maxNdcExtent = Math.max(...projectedCorners.flatMap((corner) => [Math.abs(corner.x), Math.abs(corner.y)]));
  const minNdcY = Math.min(...projectedCorners.map((corner) => corner.y));
  const maxNdcY = Math.max(...projectedCorners.map((corner) => corner.y));
  qa.camera = {
    type: camera.type,
    fov: camera.fov,
    elevationFactor: cameraElevationFactor,
    azimuthDeg: cameraAzimuthDeg,
    verticalFramingOffset,
    projectedCenterNdcY: (minNdcY + maxNdcY) * 0.5,
    previousAzimuthDeg: PREVIOUS_CAMERA_AZIMUTH_DEG,
    autoFraming: true,
    contained: maxNdcExtent <= 1,
    maxNdcExtent,
    orbitControls: controls !== null,
    position: camera.position.toArray(),
    target: compositionTarget.toArray(),
  };
  if (controls) {
    controls.target.copy(compositionTarget);
    controls.update();
  }
  landingMotion.setFrame(bounds);
}

function configureModelShadows(root: THREE.Object3D): void {
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

function updateAppearanceQa(controller: CHSGSMaterialAppearanceController): void {
  const clay = controller.claySettings;
  const reveal = controller.revealSettings;
  const materialInstancesByName: Record<string, number> = {};
  for (const material of controller.materials) {
    materialInstancesByName[material.name] = (materialInstancesByName[material.name] ?? 0) + 1;
    if (qa.ao[material.name]) {
      qa.ao[material.name].active = material.aoMap !== null;
      qa.ao[material.name].intensity = material.aoMapIntensity;
    }
  }
  qa.appearance = {
    mode: controller.currentMode,
    color: clay.color,
    metalness: clay.metalness,
    roughness: clay.roughness,
    aoIntensity: clay.aoIntensity,
    aoEnabled: controller.isAoEnabled,
    normalMapsEnabled: controller.areNormalMapsEnabled,
    runtimeMaterialInstances: controller.materials.length,
    materialInstancesByName,
    clayValid: qa.appearance.clayValid,
    originalValid: qa.appearance.originalValid,
    repeatedSwitchingValid: qa.appearance.repeatedSwitchingValid,
  };
  qa.reveal = {
    enabled: reveal.enabled,
    space: 'SCREEN',
    coreRadiusCssPx: reveal.coreRadiusCssPx,
    featherCssPx: reveal.featherCssPx,
    outerRadiusCssPx: reveal.coreRadiusCssPx + reveal.featherCssPx,
    strength: reveal.strength,
    visibility: reveal.visibility,
    patchedMaterials: [...new Set(controller.materials.map((material) => material.name))].sort(),
    additionalDrawCalls: 0,
  };
}

function validateAppearanceState(controller: CHSGSMaterialAppearanceController, mode: CHSGSAppearanceMode): boolean {
  const clay = controller.claySettings;
  return controller.materials.every((material) => {
    const original = controller.getOriginalState(material);
    if (!original) return false;
    const expectedAoIntensity = mode === 'CLAY' && original.aoMap && AO_MATERIALS.has(material.name)
      ? clay.aoIntensity
      : original.aoMapIntensity;
    const detailsPreserved = material.normalMap === original.normalMap
      && material.normalScale.equals(original.normalScale)
      && material.aoMap === original.aoMap
      && material.aoMapIntensity === expectedAoIntensity;
    if (!detailsPreserved) return false;
    return controller.currentMode === mode
      && material.map === original.map
      && material.color.equals(original.color)
      && material.roughness === original.roughness
      && material.roughnessMap === original.roughnessMap
      && material.metalness === original.metalness
      && material.metalnessMap === original.metalnessMap;
  });
}

function runAppearanceSwitchingQa(controller: CHSGSMaterialAppearanceController): void {
  controller.setMode('CLAY');
  const clayFirst = validateAppearanceState(controller, 'CLAY');
  controller.setMode('ORIGINAL');
  const originalFirst = validateAppearanceState(controller, 'ORIGINAL');
  controller.setMode('CLAY');
  const claySecond = validateAppearanceState(controller, 'CLAY');
  controller.setMode('ORIGINAL');
  const originalSecond = validateAppearanceState(controller, 'ORIGINAL');
  qa.appearance.clayValid = clayFirst && claySecond;
  qa.appearance.originalValid = originalFirst && originalSecond;
  qa.appearance.repeatedSwitchingValid = clayFirst && originalFirst && claySecond && originalSecond;
  if (!qa.appearance.repeatedSwitchingValid) qa.errors.push('CLAY/ORIGINAL appearance switching validation failed.');
  controller.setMode('CLAY');
  updateAppearanceQa(controller);
}

function normalizeAzimuthDeg(value: number): number {
  return THREE.MathUtils.euclideanModulo(value + 180, 360) - 180;
}

function cameraRollDeg(): number {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const worldUp = new THREE.Vector3(0, 1, 0);
  const projectedWorldUp = worldUp.addScaledVector(forward, -worldUp.dot(forward)).normalize();
  const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const sine = new THREE.Vector3().crossVectors(projectedWorldUp, cameraUp).dot(forward);
  return THREE.MathUtils.radToDeg(Math.atan2(sine, projectedWorldUp.dot(cameraUp)));
}

function cameraStateText(): string {
  const target = controls?.target ?? new THREE.Vector3(...qa.camera.target);
  const formatVector = (vector: THREE.Vector3) => vector.toArray().map((value) => value.toFixed(4)).join(', ');
  return [
    'CAMERA STATE',
    '',
    `FOV: ${camera.fov.toFixed(0)}`,
    `Elevation: ${cameraElevationFactor.toFixed(2)}`,
    `Azimuth: ${cameraAzimuthDeg.toFixed(1)}`,
    `Vertical Framing Offset: ${verticalFramingOffset.toFixed(1)} (positive moves model up)`,
    `Position: ${formatVector(camera.position)}`,
    `Target: ${formatVector(target)}`,
  ].join('\n');
}

function createDebugPanel(controller?: CHSGSMaterialAppearanceController): void {
  if (!debug) return;
  const panel = document.createElement('aside');
  panel.className = 'qa-panel';
  const output = document.createElement('pre');
  output.className = 'qa-output';
  const refresh = () => { output.textContent = JSON.stringify(qa, null, 2); };
  const heading = document.createElement('h2');
  heading.textContent = 'APPEARANCE';
  const appearanceRow = document.createElement('div');
  appearanceRow.className = 'controls';
  const controlsRow = document.createElement('div');
  controlsRow.className = 'controls';
  if (controller) {
    const makeModeButton = (mode: CHSGSAppearanceMode) => {
      const button = document.createElement('button');
      button.textContent = mode;
      button.dataset.appearance = mode;
      button.addEventListener('click', () => {
        controller.setMode(mode);
        updateAppearanceQa(controller);
        for (const peer of appearanceRow.querySelectorAll('button')) peer.classList.toggle('active', peer === button);
        refresh();
      });
      button.classList.toggle('active', controller.currentMode === mode);
      return button;
    };
    appearanceRow.append(makeModeButton('CLAY'), makeModeButton('ORIGINAL'));
  }
  const makeToggle = (label: string, apply: (enabled: boolean) => void) => {
    let enabled = true;
    const button = document.createElement('button');
    const update = () => { button.textContent = `${label}: ${enabled ? 'ON' : 'OFF'}`; };
    button.addEventListener('click', () => {
      enabled = !enabled;
      apply(enabled);
      update();
      if (controller) updateAppearanceQa(controller);
      refresh();
    });
    update();
    return button;
  };
  controlsRow.append(
    makeToggle('AO', (enabled) => controller?.setAoEnabled(enabled)),
    makeToggle('Normal Maps', (enabled) => controller?.setNormalMapsEnabled(enabled)),
  );
  const tuning = document.createElement('div');
  tuning.className = 'tuning';
  const colorLabel = document.createElement('label');
  colorLabel.textContent = 'Clay Color';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = controller?.claySettings.color ?? '#6e7172';
  colorInput.addEventListener('input', () => {
    controller?.setClayColor(colorInput.value);
    if (controller) updateAppearanceQa(controller);
    refresh();
  });
  colorLabel.append(colorInput);
  const roughnessLabel = document.createElement('label');
  const roughnessValue = document.createElement('output');
  const roughnessInput = document.createElement('input');
  roughnessInput.type = 'range';
  roughnessInput.min = '0.3';
  roughnessInput.max = '1';
  roughnessInput.step = '0.01';
  roughnessInput.value = String(controller?.claySettings.roughness ?? 0.45);
  roughnessValue.value = Number(roughnessInput.value).toFixed(2);
  roughnessLabel.append('Clay Roughness ', roughnessValue, roughnessInput);
  roughnessInput.addEventListener('input', () => {
    controller?.setClayRoughness(Number(roughnessInput.value));
    roughnessValue.value = Number(roughnessInput.value).toFixed(2);
    if (controller) updateAppearanceQa(controller);
    refresh();
  });
  const aoIntensityLabel = document.createElement('label');
  const aoIntensityValue = document.createElement('output');
  const aoIntensityInput = document.createElement('input');
  aoIntensityInput.type = 'range';
  aoIntensityInput.min = '0';
  aoIntensityInput.max = '3';
  aoIntensityInput.step = '0.05';
  aoIntensityInput.value = String(controller?.claySettings.aoIntensity ?? CLAY_AO_INTENSITY);
  aoIntensityValue.value = Number(aoIntensityInput.value).toFixed(2);
  aoIntensityLabel.append('Clay AO Intensity ', aoIntensityValue, aoIntensityInput);
  aoIntensityInput.addEventListener('input', () => {
    controller?.setClayAoIntensity(Number(aoIntensityInput.value));
    aoIntensityValue.value = Number(aoIntensityInput.value).toFixed(2);
    if (controller) updateAppearanceQa(controller);
    refresh();
  });
  tuning.append(colorLabel, roughnessLabel, aoIntensityLabel);

  const revealHeading = document.createElement('h2');
  revealHeading.textContent = 'MATERIAL REVEAL';
  const revealControls = document.createElement('div');
  revealControls.className = 'controls';
  const revealTuning = document.createElement('div');
  revealTuning.className = 'tuning';
  if (controller) {
    revealControls.append(makeToggle('Reveal Enabled', (enabled) => {
      controller.setRevealEnabled(enabled);
      updateAppearanceQa(controller);
    }));
    const addRevealSlider = (
      labelText: string,
      value: number,
      min: number,
      max: number,
      step: number,
      format: (value: number) => string,
      apply: (value: number) => void,
    ) => {
      const label = document.createElement('label');
      const valueOutput = document.createElement('output');
      const input = document.createElement('input');
      input.type = 'range'; input.min = String(min); input.max = String(max);
      input.step = String(step); input.value = String(value);
      valueOutput.value = format(value);
      label.append(labelText, valueOutput, input);
      input.addEventListener('input', () => {
        const next = Number(input.value);
        apply(next);
        valueOutput.value = format(next);
        updateAppearanceQa(controller);
        refresh();
      });
      revealTuning.append(label);
    };
    const reveal = controller.revealSettings;
    addRevealSlider('Core Radius ', reveal.coreRadiusCssPx, 20, 400, 1, (value) => `${value.toFixed(0)} px`, (value) => controller.setRevealCoreRadiusCssPx(value));
    addRevealSlider('Feather ', reveal.featherCssPx, 0, 400, 1, (value) => `${value.toFixed(0)} px`, (value) => controller.setRevealFeatherCssPx(value));
    addRevealSlider('Reveal Strength ', reveal.strength, 0, 1, 0.01, (value) => value.toFixed(2), (value) => controller.setRevealStrength(value));
  }

  const cameraHeading = document.createElement('h2');
  cameraHeading.textContent = 'CAMERA';
  const cameraTuning = document.createElement('div');
  cameraTuning.className = 'tuning';
  const fovLabel = document.createElement('label');
  const fovValue = document.createElement('output');
  const fovInput = document.createElement('input');
  fovInput.type = 'range';
  fovInput.min = '30';
  fovInput.max = '60';
  fovInput.step = '1';
  fovInput.value = String(camera.fov);
  fovValue.value = `${camera.fov.toFixed(0)}°`;
  fovLabel.append('Camera FOV ', fovValue, fovInput);
  fovInput.addEventListener('input', () => {
    camera.fov = Number(fovInput.value);
    fovValue.value = `${camera.fov.toFixed(0)}°`;
    if (framedModel) frameModel(framedModel);
    refresh();
  });
  const elevationLabel = document.createElement('label');
  const elevationValue = document.createElement('output');
  const elevationInput = document.createElement('input');
  elevationInput.type = 'range';
  elevationInput.min = '0.25';
  elevationInput.max = '0.95';
  elevationInput.step = '0.01';
  elevationInput.value = String(cameraElevationFactor);
  elevationValue.value = cameraElevationFactor.toFixed(2);
  elevationLabel.append('Camera Elevation ', elevationValue, elevationInput);
  elevationInput.addEventListener('input', () => {
    cameraElevationFactor = Number(elevationInput.value);
    elevationValue.value = cameraElevationFactor.toFixed(2);
    if (framedModel) frameModel(framedModel);
    refresh();
  });
  const azimuthLabel = document.createElement('label');
  const azimuthValue = document.createElement('output');
  const azimuthInput = document.createElement('input');
  azimuthInput.type = 'range';
  azimuthInput.min = '-180';
  azimuthInput.max = '180';
  azimuthInput.step = '0.1';
  azimuthInput.value = String(cameraAzimuthDeg);
  azimuthValue.value = `${cameraAzimuthDeg.toFixed(0)}°`;
  azimuthLabel.append('Camera Azimuth ', azimuthValue, azimuthInput);
  azimuthInput.addEventListener('input', () => {
    cameraAzimuthDeg = normalizeAzimuthDeg(Number(azimuthInput.value));
    azimuthValue.value = `${cameraAzimuthDeg.toFixed(0)}°`;
    if (framedModel) frameModel(framedModel);
    refresh();
  });
  const verticalOffsetLabel = document.createElement('label');
  const verticalOffsetValue = document.createElement('output');
  const verticalOffsetInput = document.createElement('input');
  verticalOffsetInput.type = 'range';
  verticalOffsetInput.min = '-10';
  verticalOffsetInput.max = '10';
  verticalOffsetInput.step = '0.1';
  verticalOffsetInput.value = String(verticalFramingOffset);
  verticalOffsetValue.value = verticalFramingOffset.toFixed(1);
  verticalOffsetLabel.append('Vertical Framing Offset (+ moves model up) ', verticalOffsetValue, verticalOffsetInput);
  verticalOffsetInput.addEventListener('input', () => {
    verticalFramingOffset = Number(verticalOffsetInput.value);
    verticalOffsetValue.value = verticalFramingOffset.toFixed(1);
    if (framedModel) frameModel(framedModel);
    refresh();
  });
  const copyCameraButton = document.createElement('button');
  copyCameraButton.type = 'button';
  copyCameraButton.className = 'copy-camera-state';
  copyCameraButton.textContent = 'COPY CAMERA STATE';
  copyCameraButton.addEventListener('click', async () => {
    const text = cameraStateText();
    console.info(text);
    try {
      await navigator.clipboard.writeText(text);
      copyCameraButton.textContent = 'CAMERA STATE COPIED';
    } catch (error) {
      copyCameraButton.textContent = 'CAMERA COPY FAILED';
      console.warn('Unable to copy camera state:', error);
    }
  });
  cameraTuning.append(fovLabel, elevationLabel, azimuthLabel, verticalOffsetLabel, copyCameraButton);

  const hoverHeading = document.createElement('h2');
  hoverHeading.textContent = 'PASSIVE HOVER';
  const hoverControls = document.createElement('div');
  hoverControls.className = 'controls';
  const hoverTuning = document.createElement('div');
  hoverTuning.className = 'tuning';
  hoverControls.append(makeToggle('Hover Enabled', (enabled) => hoverController.setEnabled(enabled)));
  const addHoverSlider = (
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    apply: (value: number) => void,
  ) => {
    const label = document.createElement('label');
    const valueOutput = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max);
    input.step = String(step); input.value = String(value);
    valueOutput.value = value.toFixed(step < 1 ? 1 : 0);
    label.append(labelText, valueOutput, input);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      apply(next);
      valueOutput.value = next.toFixed(step < 1 ? 1 : 0);
    });
    hoverTuning.append(label);
  };
  const hoverDefaults = hoverController.diagnostics;
  addHoverSlider('Passive Yaw ', hoverDefaults.passiveYawDeg, 0, 5, 0.1, (value) => hoverController.setPassiveYawDeg(value));
  addHoverSlider('Passive Pitch ', hoverDefaults.passivePitchDeg, 0, 5, 0.1, (value) => hoverController.setPassivePitchDeg(value));
  addHoverSlider('Response ', hoverDefaults.response, 1, 20, 0.1, (value) => hoverController.setResponse(value));
  addHoverSlider('Hover Weight ', hoverDefaults.hoverWeight, 0, 1, 0.05, (value) => hoverController.setHoverWeight(value));
  const hoverDiagnostics = document.createElement('div');
  hoverDiagnostics.className = 'hover-diagnostics';
  refreshHoverDebug = () => {
    const state = hoverController.diagnostics;
    hoverDiagnostics.textContent = [
      `Pointer X: ${state.pointerX.toFixed(3)}`,
      `Pointer Y: ${state.pointerY.toFixed(3)}`,
      `Target Passive Yaw: ${state.targetPassiveYawDeg.toFixed(3)}°`,
      `Current Passive Yaw: ${state.currentPassiveYawDeg.toFixed(3)}°`,
      `Target Passive Pitch: ${state.targetPassivePitchDeg.toFixed(3)}°`,
      `Current Passive Pitch: ${state.currentPassivePitchDeg.toFixed(3)}°`,
      `Current Roll: ${state.currentRollDeg.toFixed(3)}°`,
    ].join('\n');
  };
  refreshHoverDebug();

  const dragHeading = document.createElement('h2');
  dragHeading.textContent = 'DRAG / INERTIA';
  const dragControls = document.createElement('div');
  dragControls.className = 'controls';
  dragControls.append(
    makeToggle('Drag Enabled', (enabled) => dragController.setEnabled(enabled)),
    makeToggle('Inertia Enabled', (enabled) => dragController.setInertiaEnabled(enabled)),
  );
  const dragTuning = document.createElement('div');
  dragTuning.className = 'tuning';
  const addDragSlider = (
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    apply: (value: number) => void,
  ) => {
    const label = document.createElement('label');
    const valueOutput = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max);
    input.step = String(step); input.value = String(value);
    const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    valueOutput.value = `${value.toFixed(decimals)}${unit}`;
    label.append(labelText, valueOutput, input);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      apply(next);
      valueOutput.value = `${next.toFixed(decimals)}${unit}`;
    });
    dragTuning.append(label);
  };
  const dragDefaults = dragController.diagnostics;
  addDragSlider('Drag Sensitivity ', dragDefaults.sensitivityDegPerCssPx, 0.02, 0.5, 0.01, '°/px', (value) => dragController.setSensitivityDegPerCssPx(value));
  addDragSlider('Drag Response ', dragDefaults.response, 1, 40, 0.5, '', (value) => dragController.setResponse(value));
  addDragSlider('Drag Threshold ', dragDefaults.thresholdCssPx, 0, 10, 0.5, ' px', (value) => dragController.setThresholdCssPx(value));
  addDragSlider('Inertia Damping ', dragDefaults.inertiaDamping, 1, 15, 0.5, '/s', (value) => dragController.setInertiaDamping(value));
  addDragSlider('Maximum Release Velocity ', dragDefaults.maximumReleaseVelocityDegPerSec, 20, 360, 5, '°/s', (value) => dragController.setMaximumReleaseVelocityDegPerSec(value));
  addDragSlider('Minimum Inertia Velocity ', dragDefaults.minimumInertiaVelocityDegPerSec, 0, 10, 0.5, '°/s', (value) => dragController.setMinimumInertiaVelocityDegPerSec(value));
  const resetDragButton = document.createElement('button');
  resetDragButton.type = 'button';
  resetDragButton.textContent = 'RESET DRAG YAW';
  resetDragButton.addEventListener('click', () => {
    dragController.resetDragYaw();
    refresh();
  });
  dragTuning.append(resetDragButton);
  const dragDiagnostics = document.createElement('div');
  dragDiagnostics.className = 'drag-diagnostics';
  refreshDragDebug = () => {
    const state = dragController.diagnostics;
    dragDiagnostics.textContent = [
      `Interaction State: ${state.interactionState}`,
      `Drag Yaw: ${state.dragYawDeg.toFixed(3)}°`,
      `Target Drag Yaw: ${state.targetDragYawDeg.toFixed(3)}°`,
      `Angular Velocity: ${state.angularVelocityDegPerSec.toFixed(3)}°/s`,
      `Horizontal Delta: ${state.horizontalDeltaCssPx.toFixed(3)} CSS px`,
      `Hover Weight: ${state.hoverWeight.toFixed(3)}`,
      `Drag Pitch: ${state.dragPitchDeg.toFixed(3)}°`,
      `Drag Roll: ${state.dragRollDeg.toFixed(3)}°`,
      `Pointer Captured: ${state.pointerCaptured ? 'YES' : 'NO'}`,
    ].join('\n');
  };
  refreshDragDebug();

  if (controls) {
    controls.addEventListener('change', () => {
      const offset = camera.position.clone().sub(controls!.target);
      const horizontalDistance = Math.hypot(offset.x, offset.z);
      cameraAzimuthDeg = normalizeAzimuthDeg(THREE.MathUtils.radToDeg(Math.atan2(offset.z, offset.x)));
      cameraElevationFactor = horizontalDistance > 1e-6
        ? Math.SQRT2 * offset.y / horizontalDistance
        : cameraElevationFactor;
      azimuthInput.value = String(cameraAzimuthDeg);
      azimuthValue.value = `${cameraAzimuthDeg.toFixed(1)}°`;
      elevationInput.value = String(cameraElevationFactor);
      elevationValue.value = cameraElevationFactor.toFixed(2);
      qa.camera.azimuthDeg = cameraAzimuthDeg;
      qa.camera.elevationFactor = cameraElevationFactor;
      qa.camera.position = camera.position.toArray();
      qa.camera.target = controls!.target.toArray();
      refresh();
    });
  }

  const lightingHeading = document.createElement('h2');
  lightingHeading.textContent = 'LIGHTING';
  const lightingTuning = document.createElement('div');
  lightingTuning.className = 'tuning';
  const lightingSummary = document.createElement('div');
  lightingSummary.className = 'lighting-summary';
  const updateLightingDisplay = () => {
    qa.lighting.hemisphereIntensity = hemisphereLight.intensity;
    qa.lighting.directionalIntensity = keyLight.intensity;
    lightingSummary.textContent = `Hemisphere ${hemisphereLight.intensity.toFixed(2)} · Directional ${keyLight.intensity.toFixed(2)} · Shadows ON · ${SHADOWS.mapSize}px PCFSoft`;
    refresh();
  };
  const hemisphereLabel = document.createElement('label');
  const hemisphereValue = document.createElement('output');
  const hemisphereInput = document.createElement('input');
  hemisphereInput.type = 'range';
  hemisphereInput.min = '0';
  hemisphereInput.max = '2';
  hemisphereInput.step = '0.05';
  hemisphereInput.value = String(hemisphereLight.intensity);
  hemisphereValue.value = hemisphereLight.intensity.toFixed(2);
  hemisphereLabel.append('Hemisphere Intensity ', hemisphereValue, hemisphereInput);
  hemisphereInput.addEventListener('input', () => {
    hemisphereLight.intensity = Number(hemisphereInput.value);
    hemisphereValue.value = hemisphereLight.intensity.toFixed(2);
    updateLightingDisplay();
  });
  const directionalLabel = document.createElement('label');
  const directionalValue = document.createElement('output');
  const directionalInput = document.createElement('input');
  directionalInput.type = 'range';
  directionalInput.min = '0';
  directionalInput.max = '5';
  directionalInput.step = '0.05';
  directionalInput.value = String(keyLight.intensity);
  directionalValue.value = keyLight.intensity.toFixed(2);
  directionalLabel.append('Directional Intensity ', directionalValue, directionalInput);
  directionalInput.addEventListener('input', () => {
    keyLight.intensity = Number(directionalInput.value);
    directionalValue.value = keyLight.intensity.toFixed(2);
    updateLightingDisplay();
  });
  lightingTuning.append(hemisphereLabel, directionalLabel);
  updateLightingDisplay();

  const diagnostics = document.createElement('details');
  const diagnosticsSummary = document.createElement('summary');
  diagnosticsSummary.textContent = 'QA diagnostics';
  diagnostics.append(diagnosticsSummary, output);
  panel.append(
    heading, appearanceRow, tuning, controlsRow,
    revealHeading, revealControls, revealTuning,
    cameraHeading, cameraTuning,
    hoverHeading, hoverControls, hoverTuning, hoverDiagnostics,
    dragHeading, dragControls, dragTuning, dragDiagnostics,
    lightingHeading, lightingTuning, lightingSummary,
    diagnostics,
  );
  document.body.append(panel);
  refresh();
}

async function start(): Promise<void> {
  try {
    qa.webglVersion = renderer.capabilities.isWebGL2 ? 'WebGL 2' : 'WebGL 1';
    await MikkTSpace.ready;
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL, (event) => {
      const total = event.total || 22864088;
      const progress = Math.min(event.loaded / total, 1);
      requiredElement('#load-bar').style.transform = `scaleX(${progress})`;
      requiredElement('#load-label').textContent = progress < 1 ? `Загружаем завод · ${Math.round(progress * 100)}%` : 'Готовим материалы и освещение';
    });
    hoverRoot.add(gltf.scene);
    const { materialMap, materialInstances } = validateAndGenerateTangents(gltf.scene);
    const appearance = new CHSGSMaterialAppearanceController(materialInstances);
    appearanceController = appearance;
    appearance.setFramebufferScale(renderer.getPixelRatio());
    window.__CHSGS_APPEARANCE__ = appearance;
    validateMaterials(gltf.scene, materialMap);
    if (qa.meshes !== EXPECTED.meshes) qa.errors.push(`Mesh count ${qa.meshes}, expected ${EXPECTED.meshes}.`);
    if (qa.triangles !== EXPECTED.triangles) qa.errors.push(`Triangle count ${qa.triangles}, expected ${EXPECTED.triangles}.`);
    if (qa.materials.length !== EXPECTED.materials || qa.materials.some((name) => !MATERIAL_NAMES.includes(name as typeof MATERIAL_NAMES[number]))) qa.errors.push(`Material family mismatch: ${qa.materials.join(', ')}.`);
    if (qa.tangentsGenerated !== EXPECTED.generatedTangents) qa.errors.push(`Generated ${qa.tangentsGenerated} tangent sets, expected ${EXPECTED.generatedTangents}.`);
    if (qa.missingTangentPrerequisites.length) qa.errors.push('One or more tangent prerequisites are missing.');
    runAppearanceSwitchingQa(appearance);
    configureModelShadows(entryRoot);
    neutralModelBounds = new THREE.Box3().setFromObject(entryRoot);
    frameModel(entryRoot);
    // Lighting shares the scroll/entry layout transform, retaining the approved
    // model-relative lighting while drag/hover still rotate beneath that rig.
    scrollRoot.add(keyLight, keyLight.target);
    if (debug) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(new THREE.Vector3(...qa.camera.target));
      controls.enableDamping = true;
      controls.enableZoom = false;
      controls.minPolarAngle = Math.atan2(1, 0.95 / Math.SQRT2);
      controls.maxPolarAngle = Math.atan2(1, 0.25 / Math.SQRT2);
      controls.update();
      qa.camera.orbitControls = true;
      qa.camera.target = controls.target.toArray();
    }
    qa.status = qa.errors.length ? 'fail' : 'pass';
    if (qa.status === 'fail') throw new Error(qa.errors.join(' '));
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    await landingMotion.begin();
    createDebugPanel(appearance);
    console.info('CHSGS LAND.01 PC03 QA', qa);
  } catch (error) {
    qa.status = 'fail';
    const message = error instanceof Error ? error.message : String(error);
    if (!qa.errors.includes(message)) qa.errors.push(message);
    status.innerHTML = `<div><p>Не удалось загрузить интерактивный завод.</p><p><a href="${import.meta.env.BASE_URL}">Повторить загрузку</a> · <a href="https://xn--d1an.xn--p1ai/info_ld_plants/chsgs/">Информация о ЧСГС</a></p></div>`;
    document.body.classList.remove('is-loading');
    status.classList.add('error');
    createDebugPanel();
    console.error('CHSGS WEB.02D failed:', error);
  }
}

const animationTimer = new THREE.Timer();
animationTimer.connect(document);
renderer.setAnimationLoop(() => {
  if (document.hidden) return;
  animationTimer.update();
  const deltaSeconds = Math.min(animationTimer.getDelta(), 0.1);
  landingMotion.update(performance.now(), deltaSeconds, dragController.diagnostics.interactionState);
  appearanceController?.update(deltaSeconds);
  dragController.update(deltaSeconds);
  hoverController.update(deltaSeconds);
  qa.hover = hoverController.diagnostics;
  qa.drag = dragController.diagnostics;
  qa.hierarchy.neutralHoverRotation = Math.abs(qa.hover.currentPassiveYawDeg) < 1e-6
    && Math.abs(qa.hover.currentPassivePitchDeg) < 1e-6
    && qa.hover.currentRollDeg === 0;
  refreshHoverDebug?.();
  refreshDragDebug?.();
  controls?.update();
  if (landingMotion.diagnostics.modelVisible || qa.status === 'loading') renderer.render(scene, camera);
  qa.performance.programs = renderer.info.programs?.length ?? 0;
  qa.performance.drawCalls = renderer.info.render.calls;
  qa.performance.frameTriangles = renderer.info.render.triangles;
  if (appearanceController) {
    qa.reveal.visibility = appearanceController.revealSettings.visibility;
  }
  if (debug || smokeQa) requiredElement('#viewer').dataset.qa = JSON.stringify({
    status: qa.status, meshes: qa.meshes, triangles: qa.triangles, materials: qa.materials.length,
    tangentsGenerated: qa.tangentsGenerated, ao: qa.ao, normalChannels: qa.normalChannels,
    appearance: qa.appearance, shadows: qa.shadows, camera: {...qa.camera, position: camera.position.toArray()},
    hierarchy: [entryRoot.name, scrollRoot.name, heroIdleRoot.name, dragRoot.name, hoverRoot.name],
    transforms: {
      entry: { position: entryRoot.position.toArray(), rotation: entryRoot.rotation.toArray(), scale: entryRoot.scale.toArray() },
      scroll: { position: scrollRoot.position.toArray(), rotation: scrollRoot.rotation.toArray(), scale: scrollRoot.scale.toArray() },
      heroIdle: { position: heroIdleRoot.position.toArray(), rotation: heroIdleRoot.rotation.toArray(), scale: heroIdleRoot.scale.toArray() },
      drag: { position: dragRoot.position.toArray(), rotation: dragRoot.rotation.toArray(), scale: dragRoot.scale.toArray() },
      hover: { position: hoverRoot.position.toArray(), rotation: hoverRoot.rotation.toArray(), scale: hoverRoot.scale.toArray() },
      cameraRollDeg: cameraRollDeg(),
    },
    hover: qa.hover, drag: qa.drag, reveal: qa.reveal, landing: landingMotion.diagnostics,
  });
});

void start();
