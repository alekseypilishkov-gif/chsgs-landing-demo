import * as THREE from 'three';

export const MODEL_URL = `${import.meta.env.BASE_URL}models/CHSGS_Plan_WebGL_PC03.glb`;
export const EXPECTED = { meshes: 153, triangles: 60746, materials: 5, generatedTangents: 37 } as const;
export const MATERIAL_NAMES = [
  'M_Ground_GLTF',
  'M_Facade_GLTF',
  'M_Facade_GLTF_AO',
  'M_Roof_GLTF',
  'M_Small_Details_GLTF',
] as const;
export const AO_MATERIALS = new Set(['M_Ground_GLTF', 'M_Facade_GLTF_AO']);
export const LIGHTING = {
  hemisphereSky: 0xffffff,
  hemisphereGround: 0x454545,
  hemisphereIntensity: 0.75,
  directionalColor: 0xffffff,
  directionalIntensity: 2.8,
  directionalPosition: new THREE.Vector3(32, 48, 28),
  accentColor: 0xffec00,
  accentIntensity: 140,
  accentLerp: 0.22,
  accentIntensityLerp: 0.16,
} as const;
export const CAMERA = {
  fov: 45,
  previousFov: 35,
  elevationFactor: 0.79,
  previousElevationFactor: 0.52,
} as const;
export const PREVIOUS_CAMERA_AZIMUTH_DEG = 45;
export const CAMERA_AZIMUTH_DEG = -117.1;
// Positive values move the visible model upward on screen without transforming it.
export const VERTICAL_FRAMING_OFFSET = 10.0;
export const SHADOWS = {
  mapSize: 2048,
  bias: -0.00015,
  normalBias: 0.03,
  radius: 2,
  boundsPadding: 0.12,
} as const;
