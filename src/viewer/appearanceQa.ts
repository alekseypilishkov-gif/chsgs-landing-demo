import {
  CHSGSMaterialAppearanceController,
  type CHSGSAppearanceMode,
} from '../CHSGSMaterialAppearanceController';
import { AO_MATERIALS } from './config';
import type { QaResult } from './qa';

export function updateAppearanceQa(qa: QaResult, controller: CHSGSMaterialAppearanceController): void {
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

export function runAppearanceSwitchingQa(qa: QaResult, controller: CHSGSMaterialAppearanceController): void {
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
  updateAppearanceQa(qa, controller);
}
