import * as THREE from 'three';
import type { CHSGSMaterialAppearanceController } from '../CHSGSMaterialAppearanceController';
import type { DebugModelSettings } from '../debugDock';
import { applyKeyIntensity } from './scene';

export function applyDebugModel(
  settings: DebugModelSettings,
  keyLight: THREE.DirectionalLight,
  hemisphereLight: THREE.HemisphereLight,
  accentLight: THREE.PointLight,
  appearance: CHSGSMaterialAppearanceController | null,
): void {
  applyKeyIntensity(settings.keyIntensity, keyLight, hemisphereLight);
  if (!settings.accent) accentLight.intensity = 0;
  if (!appearance) return;
  appearance.setMode(settings.original ? 'ORIGINAL' : 'CLAY');
  appearance.setAoEnabled(settings.ao);
  appearance.setNormalMapsEnabled(settings.normals);
  appearance.setRevealEnabled(settings.reveal);
}
