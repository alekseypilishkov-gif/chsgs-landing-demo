import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
import { CHSGSMaterialAppearanceController } from './CHSGSMaterialAppearanceController';
import { CHSGSModelThemeController, createModelLocalGateLights, type CHSGSModelTheme } from './CHSGSModelThemeController';
import { CHSGSPassiveHoverController } from './CHSGSPassiveHoverController';
import { CHSGSDragInertiaController } from './CHSGSDragInertiaController';
import { getDebugModelSettings, getDebugThemeSettings, type DebugModelSettings, type DebugThemeSettings } from './debugDock';
import { mountLanding } from './landing/index';
import { LandingMotion } from './LandingMotion';
import { SmoothPageScroll } from './SmoothPageScroll';
import { EXPECTED, MATERIAL_NAMES, MODEL_URL } from './viewer/config';
import { requiredElement } from './viewer/dom';
import { createInitialQa } from './viewer/qa';
import { createViewer } from './viewer/scene';
import { CursorLight } from './viewer/cursorLight';
import { cameraRollDeg, ModelFramer } from './viewer/framing';
import { validateAndGenerateTangents, validateMaterials } from './viewer/materials';
import { configureModelShadows } from './viewer/shadows';
import { applyDebugModel } from './viewer/debugModel';
import { bindViewerPointer, updateHoverPointerFromClient, type PointerState } from './viewer/pointer';
import './landing.css';

mountLanding();
new SmoothPageScroll();

const host = requiredElement('#viewer');
const status = requiredElement('#status');
const debug = new URLSearchParams(location.search).get('debug') === '1';
const smokeQa = new URLSearchParams(location.search).get('qa') === '1';
const {
  scene, camera, renderer, hemisphereLight, keyLight, accentLight,
  entryRoot, scrollRoot, heroIdleRoot, dragRoot, hoverRoot,
} = createViewer(host);

let appearanceController: CHSGSMaterialAppearanceController | null = null;
let modelThemeController: CHSGSModelThemeController | null = null;
const pointer: PointerState = { client: null, inside: false };
const orbit = { controls: null as InstanceType<typeof OrbitControls> | null };
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
    if (pointer.inside && pointer.client) {
      updateHoverPointerFromClient(hoverController, renderer.domElement, pointer.client.x, pointer.client.y);
    }
  },
  (active) => { if (orbit.controls) orbit.controls.enabled = !active; },
);
window.__CHSGS_DRAG__ = dragController;
const landingMotion = new LandingMotion(entryRoot, scrollRoot, heroIdleRoot, camera, (active) => {
  dragController.setEnabled(active);
  hoverController.setEnabled(active);
  if (!active) { hoverController.setPointerInside(false); appearanceController?.setPointerInside(false); }
});
const qa = createInitialQa({
  camera,
  hover: hoverController.diagnostics,
  drag: dragController.diagnostics,
  hemisphereIntensity: hemisphereLight.intensity,
  directionalIntensity: keyLight.intensity,
  shadowsEnabled: renderer.shadowMap.enabled,
});
window.__CHSGS_QA__ = qa;
const framing = new ModelFramer(camera, qa, (bounds) => landingMotion.setFrame(bounds));
dragController.setEnabled(false);
const cursorLight = new CursorLight(accentLight, camera);
// Transparent WebGL composes against the current theme without changing approved materials.
document.addEventListener('chsgs-theme', () => {
  const theme: CHSGSModelTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f2f1ec' : '#262626');
  modelThemeController?.setTheme(theme);
});
let debugModel: DebugModelSettings = getDebugModelSettings();
const applyCurrentDebugModel = () => {
  applyDebugModel(debugModel, keyLight, hemisphereLight, accentLight, appearanceController);
  modelThemeController?.setSuppressWindows(!debugModel.original);
};
document.addEventListener('chsgs-debug-model', (event: Event) => {
  const detail = (event as CustomEvent<Partial<DebugModelSettings>>).detail ?? {};
  debugModel = { ...debugModel, ...detail };
  applyCurrentDebugModel();
});
document.addEventListener('chsgs-debug-theme', (event: Event) => {
  const detail = (event as CustomEvent<Partial<DebugThemeSettings>>).detail ?? {};
  if (detail.windowEmissiveColor) modelThemeController?.setWindowEmissiveColor(detail.windowEmissiveColor);
  if (typeof detail.windowEmissiveIntensity === 'number') modelThemeController?.setWindowEmissiveIntensity(detail.windowEmissiveIntensity);
});
applyCurrentDebugModel();
const syncMotionPreference = () => {
  hoverController.setReducedMotion(reducedMotionQuery.matches || !hoverCapabilityQuery.matches);
  dragController.setReducedMotion(reducedMotionQuery.matches);
};
reducedMotionQuery.addEventListener('change', syncMotionPreference);
hoverCapabilityQuery.addEventListener('change', syncMotionPreference);
syncMotionPreference();

function resize(): void {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (framing.framedModel) framing.frame(framing.framedModel);
  qa.pixelRatio = renderer.getPixelRatio();
  appearanceController?.setFramebufferScale(qa.pixelRatio);
}
window.addEventListener('resize', resize);
resize();
bindViewerPointer({
  canvas: renderer.domElement,
  hover: hoverController,
  drag: dragController,
  pointer,
  getAppearance: () => appearanceController,
});

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
    const { materialMap, materialInstances } = validateAndGenerateTangents(gltf.scene, qa);
    validateMaterials(gltf.scene, materialMap, qa);
    if (qa.meshes !== EXPECTED.meshes) qa.errors.push(`Mesh count ${qa.meshes}, expected ${EXPECTED.meshes}.`);
    if (qa.triangles !== EXPECTED.triangles) qa.errors.push(`Triangle count ${qa.triangles}, expected ${EXPECTED.triangles}.`);
    if (qa.materials.length !== EXPECTED.materials || qa.materials.some((name) => !MATERIAL_NAMES.includes(name as typeof MATERIAL_NAMES[number]))) qa.errors.push(`Material family mismatch: ${qa.materials.join(', ')}.`);
    if (qa.tangentsGenerated !== EXPECTED.generatedTangents) qa.errors.push(`Generated ${qa.tangentsGenerated} tangent sets, expected ${EXPECTED.generatedTangents}.`);
    if (qa.missingTangentPrerequisites.length) qa.errors.push('One or more tangent prerequisites are missing.');
    const facadeNames = new Set(['M_Facade_GLTF', 'M_Facade_GLTF_AO']);
    const facadeMaterials = [...materialInstances].filter((material) => facadeNames.has(material.name));
    if (facadeMaterials.length === 0) throw new Error('No facade material instances were found for the external emissive texture.');
    const emissiveTexture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}textures/model/emission/T_CHSGS_Facade_Emissive.png`);
    emissiveTexture.flipY = false;
    emissiveTexture.colorSpace = THREE.SRGBColorSpace;
    emissiveTexture.channel = 0;
    emissiveTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const material of facadeMaterials) { material.emissiveMap = emissiveTexture; material.needsUpdate = true; }
    const appearance = new CHSGSMaterialAppearanceController(materialInstances);
    appearanceController = appearance;
    appearance.setFramebufferScale(renderer.getPixelRatio());
    window.__CHSGS_APPEARANCE__ = appearance;
    const localLights = createModelLocalGateLights();
    hoverRoot.add(localLights.root);
    const initialTheme: CHSGSModelTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    modelThemeController = new CHSGSModelThemeController(hemisphereLight, keyLight, facadeMaterials, localLights.lights, initialTheme);
    const debugTheme = getDebugThemeSettings();
    modelThemeController.setWindowEmissiveColor(debugTheme.windowEmissiveColor);
    modelThemeController.setWindowEmissiveIntensity(debugTheme.windowEmissiveIntensity);
    configureModelShadows(entryRoot, keyLight, qa);
    framing.neutralBounds = new THREE.Box3().setFromObject(entryRoot);
    framing.frame(entryRoot);
    cursorLight.configure(gltf.scene);
    applyCurrentDebugModel();
    // Lighting shares the scroll/entry layout transform, retaining the approved
    // model-relative lighting while drag/hover still rotate beneath that rig.
    scrollRoot.add(keyLight, keyLight.target);
    if (debug) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(new THREE.Vector3(...qa.camera.target));
      controls.enableDamping = true;
      controls.enableZoom = false;
      controls.minPolarAngle = Math.atan2(1, 0.95 / Math.SQRT2);
      controls.maxPolarAngle = Math.atan2(1, 0.25 / Math.SQRT2);
      controls.update();
      framing.controls = controls;
      orbit.controls = controls;
      qa.camera.orbitControls = true;
      qa.camera.target = controls.target.toArray();
    }
    qa.status = qa.errors.length ? 'fail' : 'pass';
    if (qa.status === 'fail') throw new Error(qa.errors.join(' '));
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    await landingMotion.begin();
    console.info('CHSGS LAND.01 PC03 QA', qa);
  } catch (error) {
    qa.status = 'fail';
    const message = error instanceof Error ? error.message : String(error);
    if (!qa.errors.includes(message)) qa.errors.push(message);
    status.innerHTML = `<div><p>Не удалось загрузить интерактивный завод.</p><p><a href="${import.meta.env.BASE_URL}">Повторить загрузку</a> · <a href="https://xn--d1an.xn--p1ai/info_ld_plants/chsgs/">Информация о ЧСГС</a></p></div>`;
    document.body.classList.remove('is-loading');
    status.classList.add('error');
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
  modelThemeController?.update(deltaSeconds);
  appearanceController?.update(deltaSeconds);
  dragController.update(deltaSeconds);
  hoverController.update(deltaSeconds);
  cursorLight.update({
    enabled: debugModel.accent,
    intensity: debugModel.accentIntensity,
    pointerInside: pointer.inside,
    pointer: pointer.client,
    canvas: renderer.domElement,
  });
  qa.hover = hoverController.diagnostics;
  qa.drag = dragController.diagnostics;
  qa.hierarchy.neutralHoverRotation = Math.abs(qa.hover.currentPassiveYawDeg) < 1e-6
    && Math.abs(qa.hover.currentPassivePitchDeg) < 1e-6
    && qa.hover.currentRollDeg === 0;
  framing.controls?.update();
  if (landingMotion.diagnostics.modelVisible || qa.status === 'loading') renderer.render(scene, camera);
  qa.performance.programs = renderer.info.programs?.length ?? 0;
  qa.performance.drawCalls = renderer.info.render.calls;
  qa.performance.frameTriangles = renderer.info.render.triangles;
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
      cameraRollDeg: cameraRollDeg(camera),
    },
    hover: qa.hover, drag: qa.drag, reveal: qa.reveal, landing: landingMotion.diagnostics,
  });
});

void start();
