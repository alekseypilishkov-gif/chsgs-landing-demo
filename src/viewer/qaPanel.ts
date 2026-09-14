import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CLAY_AO_INTENSITY, CHSGSMaterialAppearanceController, type CHSGSAppearanceMode } from '../CHSGSMaterialAppearanceController';
import type { CHSGSDragInertiaController } from '../CHSGSDragInertiaController';
import type { CHSGSPassiveHoverController } from '../CHSGSPassiveHoverController';
import { SHADOWS } from './config';
import { ModelFramer, normalizeAzimuthDeg } from './framing';
import { updateAppearanceQa } from './appearanceQa';
import type { CHSGSModelThemeController } from '../CHSGSModelThemeController';
import type { QaResult } from './qa';

export interface QaPanelContext {
  debug: boolean;
  qa: QaResult;
  camera: THREE.PerspectiveCamera;
  framing: ModelFramer;
  hover: CHSGSPassiveHoverController;
  drag: CHSGSDragInertiaController;
  hemisphereLight: THREE.HemisphereLight;
  keyLight: THREE.DirectionalLight;
  controls: OrbitControls | null;
  appearance?: CHSGSMaterialAppearanceController;
  modelTheme?: CHSGSModelThemeController | null;
}

export interface QaPanelHandles {
  refreshHover: () => void;
  refreshDrag: () => void;
}

export function createQaPanel(ctx: QaPanelContext): QaPanelHandles | null {
  if (!ctx.debug) return null;
  const { qa, camera, framing, hover, drag, hemisphereLight, keyLight, controls, appearance: controller, modelTheme } = ctx;
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
        updateAppearanceQa(qa, controller);
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
      if (controller) updateAppearanceQa(qa, controller);
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
    if (controller) updateAppearanceQa(qa, controller);
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
    if (controller) updateAppearanceQa(qa, controller);
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
    if (controller) updateAppearanceQa(qa, controller);
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
      updateAppearanceQa(qa, controller);
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
        updateAppearanceQa(qa, controller);
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
    if (framing.framedModel) framing.frame(framing.framedModel);
    refresh();
  });
  const elevationLabel = document.createElement('label');
  const elevationValue = document.createElement('output');
  const elevationInput = document.createElement('input');
  elevationInput.type = 'range';
  elevationInput.min = '0.25';
  elevationInput.max = '0.95';
  elevationInput.step = '0.01';
  elevationInput.value = String(framing.elevationFactor);
  elevationValue.value = framing.elevationFactor.toFixed(2);
  elevationLabel.append('Camera Elevation ', elevationValue, elevationInput);
  elevationInput.addEventListener('input', () => {
    framing.elevationFactor = Number(elevationInput.value);
    elevationValue.value = framing.elevationFactor.toFixed(2);
    if (framing.framedModel) framing.frame(framing.framedModel);
    refresh();
  });
  const azimuthLabel = document.createElement('label');
  const azimuthValue = document.createElement('output');
  const azimuthInput = document.createElement('input');
  azimuthInput.type = 'range';
  azimuthInput.min = '-180';
  azimuthInput.max = '180';
  azimuthInput.step = '0.1';
  azimuthInput.value = String(framing.azimuthDeg);
  azimuthValue.value = `${framing.azimuthDeg.toFixed(0)}°`;
  azimuthLabel.append('Camera Azimuth ', azimuthValue, azimuthInput);
  azimuthInput.addEventListener('input', () => {
    framing.azimuthDeg = normalizeAzimuthDeg(Number(azimuthInput.value));
    azimuthValue.value = `${framing.azimuthDeg.toFixed(0)}°`;
    if (framing.framedModel) framing.frame(framing.framedModel);
    refresh();
  });
  const verticalOffsetLabel = document.createElement('label');
  const verticalOffsetValue = document.createElement('output');
  const verticalOffsetInput = document.createElement('input');
  verticalOffsetInput.type = 'range';
  verticalOffsetInput.min = '-10';
  verticalOffsetInput.max = '10';
  verticalOffsetInput.step = '0.1';
  verticalOffsetInput.value = String(framing.verticalOffset);
  verticalOffsetValue.value = framing.verticalOffset.toFixed(1);
  verticalOffsetLabel.append('Vertical Framing Offset (+ moves model up) ', verticalOffsetValue, verticalOffsetInput);
  verticalOffsetInput.addEventListener('input', () => {
    framing.verticalOffset = Number(verticalOffsetInput.value);
    verticalOffsetValue.value = framing.verticalOffset.toFixed(1);
    if (framing.framedModel) framing.frame(framing.framedModel);
    refresh();
  });
  const copyCameraButton = document.createElement('button');
  copyCameraButton.type = 'button';
  copyCameraButton.className = 'copy-camera-state';
  copyCameraButton.textContent = 'COPY CAMERA STATE';
  copyCameraButton.addEventListener('click', async () => {
    const text = framing.stateText();
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
  hoverControls.append(makeToggle('Hover Enabled', (enabled) => hover.setEnabled(enabled)));
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
  const hoverDefaults = hover.diagnostics;
  addHoverSlider('Passive Yaw ', hoverDefaults.passiveYawDeg, 0, 5, 0.1, (value) => hover.setPassiveYawDeg(value));
  addHoverSlider('Passive Pitch ', hoverDefaults.passivePitchDeg, 0, 5, 0.1, (value) => hover.setPassivePitchDeg(value));
  addHoverSlider('Response ', hoverDefaults.response, 1, 20, 0.1, (value) => hover.setResponse(value));
  addHoverSlider('Hover Weight ', hoverDefaults.hoverWeight, 0, 1, 0.05, (value) => hover.setHoverWeight(value));
  const hoverDiagnostics = document.createElement('div');
  hoverDiagnostics.className = 'hover-diagnostics';
  const refreshHover = () => {
    const state = hover.diagnostics;
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
  refreshHover();

  const dragHeading = document.createElement('h2');
  dragHeading.textContent = 'DRAG / INERTIA';
  const dragControls = document.createElement('div');
  dragControls.className = 'controls';
  dragControls.append(
    makeToggle('Drag Enabled', (enabled) => drag.setEnabled(enabled)),
    makeToggle('Inertia Enabled', (enabled) => drag.setInertiaEnabled(enabled)),
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
  const dragDefaults = drag.diagnostics;
  addDragSlider('Drag Sensitivity ', dragDefaults.sensitivityDegPerCssPx, 0.02, 0.5, 0.01, '°/px', (value) => drag.setSensitivityDegPerCssPx(value));
  addDragSlider('Drag Response ', dragDefaults.response, 1, 40, 0.5, '', (value) => drag.setResponse(value));
  addDragSlider('Drag Threshold ', dragDefaults.thresholdCssPx, 0, 10, 0.5, ' px', (value) => drag.setThresholdCssPx(value));
  addDragSlider('Inertia Damping ', dragDefaults.inertiaDamping, 1, 15, 0.5, '/s', (value) => drag.setInertiaDamping(value));
  addDragSlider('Maximum Release Velocity ', dragDefaults.maximumReleaseVelocityDegPerSec, 20, 360, 5, '°/s', (value) => drag.setMaximumReleaseVelocityDegPerSec(value));
  addDragSlider('Minimum Inertia Velocity ', dragDefaults.minimumInertiaVelocityDegPerSec, 0, 10, 0.5, '°/s', (value) => drag.setMinimumInertiaVelocityDegPerSec(value));
  const resetDragButton = document.createElement('button');
  resetDragButton.type = 'button';
  resetDragButton.textContent = 'RESET DRAG YAW';
  resetDragButton.addEventListener('click', () => {
    drag.resetDragYaw();
    refresh();
  });
  dragTuning.append(resetDragButton);
  const dragDiagnostics = document.createElement('div');
  dragDiagnostics.className = 'drag-diagnostics';
  const refreshDrag = () => {
    const state = drag.diagnostics;
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
  refreshDrag();

  if (controls) {
    controls.addEventListener('change', () => {
      const offset = camera.position.clone().sub(controls.target);
      const horizontalDistance = Math.hypot(offset.x, offset.z);
      framing.azimuthDeg = normalizeAzimuthDeg(THREE.MathUtils.radToDeg(Math.atan2(offset.z, offset.x)));
      framing.elevationFactor = horizontalDistance > 1e-6
        ? Math.SQRT2 * offset.y / horizontalDistance
        : framing.elevationFactor;
      azimuthInput.value = String(framing.azimuthDeg);
      azimuthValue.value = `${framing.azimuthDeg.toFixed(1)}°`;
      elevationInput.value = String(framing.elevationFactor);
      elevationValue.value = framing.elevationFactor.toFixed(2);
      qa.camera.azimuthDeg = framing.azimuthDeg;
      qa.camera.elevationFactor = framing.elevationFactor;
      qa.camera.position = camera.position.toArray();
      qa.camera.target = controls.target.toArray();
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
    lightingSummary.textContent = `Hemisphere ${hemisphereLight.intensity.toFixed(2)} · Directional ${keyLight.intensity.toFixed(2)} · Shadows ON · ${SHADOWS.mapSize}px PCF`;
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

  const emissiveHeading = document.createElement('h2');
  emissiveHeading.textContent = 'WINDOW EMISSIVE';
  const emissiveTuning = document.createElement('div');
  emissiveTuning.className = 'tuning';
  const emissiveColor = document.createElement('input');
  emissiveColor.type = 'color';
  emissiveColor.value = modelTheme?.diagnostics.windowEmissiveColor ?? '#ffd39a';
  const emissiveColorLabel = document.createElement('label');
  emissiveColorLabel.append('Emissive Color ', emissiveColor);
  emissiveColor.addEventListener('input', () => { modelTheme?.setWindowEmissiveColor(emissiveColor.value); refresh(); });
  const emissiveIntensity = document.createElement('input');
  emissiveIntensity.type = 'range'; emissiveIntensity.min = '0'; emissiveIntensity.max = '4'; emissiveIntensity.step = '0.05';
  emissiveIntensity.value = String(modelTheme?.diagnostics.windowEmissiveIntensity ?? 2);
  const emissiveIntensityLabel = document.createElement('label');
  const emissiveIntensityValue = document.createElement('output');
  emissiveIntensityValue.value = Number(emissiveIntensity.value).toFixed(2);
  emissiveIntensityLabel.append('Night Intensity ', emissiveIntensityValue, emissiveIntensity);
  emissiveIntensity.addEventListener('input', () => { const value = Number(emissiveIntensity.value); modelTheme?.setWindowEmissiveIntensity(value); emissiveIntensityValue.value = value.toFixed(2); refresh(); });
  emissiveTuning.append(emissiveColorLabel, emissiveIntensityLabel);

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
    emissiveHeading, emissiveTuning,
    diagnostics,
  );
  document.body.append(panel);
  refresh();
  return { refreshHover, refreshDrag };
}
