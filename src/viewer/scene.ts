import * as THREE from 'three';
import { CAMERA, LIGHTING, SHADOWS } from './config';

export function createViewer(host: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.05, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  const accentLight = new THREE.PointLight(LIGHTING.accentColor, 0, 40, 2);
  accentLight.name = 'CHSGS_CursorLight';
  scene.add(accentLight);

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

  return {
    scene, camera, renderer, hemisphereLight, keyLight, accentLight,
    entryRoot, scrollRoot, heroIdleRoot, dragRoot, hoverRoot,
  };
}

export function applyKeyIntensity(
  intensity: number,
  keyLight: THREE.DirectionalLight,
  hemisphereLight: THREE.HemisphereLight,
): void {
  const scale = LIGHTING.directionalIntensity > 0 ? intensity / LIGHTING.directionalIntensity : 1;
  keyLight.intensity = intensity;
  hemisphereLight.intensity = LIGHTING.hemisphereIntensity * scale;
}
