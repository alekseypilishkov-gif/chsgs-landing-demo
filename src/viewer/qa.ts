import * as THREE from 'three';
import {
  CLAY_AO_INTENSITY,
  CHSGSMaterialAppearanceController,
  type CHSGSAppearanceMode,
} from '../CHSGSMaterialAppearanceController';
import { CHSGSPassiveHoverController, type PassiveHoverDiagnostics } from '../CHSGSPassiveHoverController';
import { CHSGSDragInertiaController, type DragInertiaDiagnostics } from '../CHSGSDragInertiaController';
import { CAMERA, CAMERA_AZIMUTH_DEG, PREVIOUS_CAMERA_AZIMUTH_DEG, SHADOWS, VERTICAL_FRAMING_OFFSET } from './config';

export interface QaResult {
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

export function createInitialQa(options: {
  camera: THREE.PerspectiveCamera;
  hover: PassiveHoverDiagnostics;
  drag: DragInertiaDiagnostics;
  hemisphereIntensity: number;
  directionalIntensity: number;
  shadowsEnabled: boolean;
}): QaResult {
  return {
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
    hover: options.hover,
    drag: options.drag,
    camera: {
      type: options.camera.type,
      fov: options.camera.fov,
      elevationFactor: CAMERA.elevationFactor,
      azimuthDeg: CAMERA_AZIMUTH_DEG,
      verticalFramingOffset: VERTICAL_FRAMING_OFFSET,
      projectedCenterNdcY: 0,
      previousAzimuthDeg: PREVIOUS_CAMERA_AZIMUTH_DEG,
      autoFraming: false,
      contained: false,
      maxNdcExtent: 0,
      orbitControls: false,
      position: [0, 0, 0],
      target: [0, 0, 0],
    },
    lighting: { hemisphereIntensity: options.hemisphereIntensity, directionalIntensity: options.directionalIntensity },
    shadows: {
      enabled: options.shadowsEnabled,
      type: 'PCFShadowMap',
      mapSize: SHADOWS.mapSize,
      castMeshes: 0,
      receiveMeshes: 0,
    },
    performance: { programs: 0, drawCalls: 0, frameTriangles: 0 },
  };
}
