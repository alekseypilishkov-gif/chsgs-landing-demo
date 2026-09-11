import * as THREE from 'three';

export type CHSGSAppearanceMode = 'CLAY' | 'ORIGINAL';

export interface ClayAppearanceSettings {
  color: string;
  metalness: 0;
  roughness: number;
  aoIntensity: number;
}

export interface RevealSettings {
  enabled: boolean;
  coreRadiusCssPx: number;
  featherCssPx: number;
  strength: number;
  visibility: number;
}

export type CHSGSProductionMaterial = THREE.MeshStandardMaterial;

interface OriginalMaterialState {
  color: THREE.Color;
  map: THREE.Texture | null;
  roughness: number;
  roughnessMap: THREE.Texture | null;
  metalness: number;
  metalnessMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  normalScale: THREE.Vector2;
  aoMap: THREE.Texture | null;
  aoMapIntensity: number;
  alphaMap: THREE.Texture | null;
  alphaTest: number;
  opacity: number;
  transparent: boolean;
  side: THREE.Side;
  depthWrite: boolean;
  depthTest: boolean;
  emissive: THREE.Color;
  emissiveMap: THREE.Texture | null;
  emissiveIntensity: number;
}

export interface MaterialAppearanceSnapshot {
  name: string;
  color: THREE.Color;
  map: THREE.Texture | null;
  roughness: number;
  roughnessMap: THREE.Texture | null;
  metalness: number;
  metalnessMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  normalScale: THREE.Vector2;
  aoMap: THREE.Texture | null;
  aoMapIntensity: number;
}

export const CLAY_AO_INTENSITY = 1.3;

const CLAY_AO_MATERIALS = new Set(['M_Ground_GLTF', 'M_Facade_GLTF_AO']);
const REVEAL_SHADER_REVISION = 'chsgs-web02b-reveal-v1';
const SHADER_MARKERS = [
  '#include <common>',
  '#include <color_fragment>',
  '#include <roughnessmap_fragment>',
  '#include <metalnessmap_fragment>',
] as const;

const DEFAULT_CLAY: ClayAppearanceSettings = {
  color: '#6e7172',
  metalness: 0,
  roughness: 0.45,
  aoIntensity: CLAY_AO_INTENSITY,
};

const DEFAULT_REVEAL: RevealSettings = {
  enabled: true,
  coreRadiusCssPx: 130,
  featherCssPx: 130,
  strength: 1,
  visibility: 0,
};

function replaceShaderMarker(source: string, marker: string, replacement: string): string {
  const first = source.indexOf(marker);
  if (first < 0) throw new Error(`WEB.02B shader patch failed: missing ${marker}.`);
  if (source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`WEB.02B shader patch failed: ${marker} is not unique.`);
  }
  return source.replace(marker, replacement);
}

export class CHSGSMaterialAppearanceController {
  readonly materials: readonly CHSGSProductionMaterial[];
  private readonly original = new Map<CHSGSProductionMaterial, OriginalMaterialState>();
  private readonly uniforms = {
    uRevealCursorPx: { value: new THREE.Vector2() },
    uRevealCoreRadiusPx: { value: DEFAULT_REVEAL.coreRadiusCssPx },
    uRevealOuterRadiusPx: { value: DEFAULT_REVEAL.coreRadiusCssPx + DEFAULT_REVEAL.featherCssPx },
    uRevealStrength: { value: DEFAULT_REVEAL.strength },
    uRevealVisibility: { value: DEFAULT_REVEAL.visibility },
    uForceOriginal: { value: 1 },
    uClayColor: { value: new THREE.Color(DEFAULT_CLAY.color) },
    uClayRoughness: { value: DEFAULT_CLAY.roughness },
    uClayMetalness: { value: DEFAULT_CLAY.metalness },
  };
  private clay: ClayAppearanceSettings = { ...DEFAULT_CLAY };
  private reveal: RevealSettings = { ...DEFAULT_REVEAL };
  private mode: CHSGSAppearanceMode = 'ORIGINAL';
  private aoEnabled = true;
  private normalMapsEnabled = true;
  private pointerInside = false;
  private framebufferScale = 1;
  private pointerCssX = 0;
  private pointerCssYFromBottom = 0;

  constructor(materials: Iterable<CHSGSProductionMaterial>) {
    this.materials = [...new Set(materials)];
    for (const marker of SHADER_MARKERS) {
      if (!THREE.ShaderLib.standard.fragmentShader.includes(marker)) {
        throw new Error(`WEB.02B requires Three.js standard shader marker ${marker}.`);
      }
    }
    for (const material of this.materials) {
      this.original.set(material, {
        color: material.color.clone(), map: material.map,
        roughness: material.roughness, roughnessMap: material.roughnessMap,
        metalness: material.metalness, metalnessMap: material.metalnessMap,
        normalMap: material.normalMap, normalScale: material.normalScale.clone(),
        aoMap: material.aoMap, aoMapIntensity: material.aoMapIntensity,
        alphaMap: material.alphaMap, alphaTest: material.alphaTest,
        opacity: material.opacity, transparent: material.transparent,
        side: material.side, depthWrite: material.depthWrite, depthTest: material.depthTest,
        emissive: material.emissive.clone(), emissiveMap: material.emissiveMap,
        emissiveIntensity: material.emissiveIntensity,
      });
      this.patchMaterial(material);
    }
  }

  get currentMode(): CHSGSAppearanceMode { return this.mode; }
  get claySettings(): Readonly<ClayAppearanceSettings> { return { ...this.clay }; }
  get revealSettings(): Readonly<RevealSettings> { return { ...this.reveal }; }
  get isAoEnabled(): boolean { return this.aoEnabled; }
  get areNormalMapsEnabled(): boolean { return this.normalMapsEnabled; }

  getOriginalState(material: CHSGSProductionMaterial): MaterialAppearanceSnapshot | undefined {
    const state = this.original.get(material);
    if (!state) return undefined;
    return {
      name: material.name, color: state.color.clone(), map: state.map,
      roughness: state.roughness, roughnessMap: state.roughnessMap,
      metalness: state.metalness, metalnessMap: state.metalnessMap,
      normalMap: state.normalMap, normalScale: state.normalScale.clone(),
      aoMap: state.aoMap, aoMapIntensity: state.aoMapIntensity,
    };
  }

  setMode(mode: CHSGSAppearanceMode): void {
    this.mode = mode;
    this.uniforms.uForceOriginal.value = mode === 'ORIGINAL' ? 1 : 0;
    this.applyPreservedDetailMaps();
  }

  setClayColor(color: THREE.ColorRepresentation): void {
    const converted = new THREE.Color(color);
    this.clay.color = `#${converted.getHexString()}`;
    this.uniforms.uClayColor.value.copy(converted);
  }

  setClayRoughness(roughness: number): void {
    this.clay.roughness = THREE.MathUtils.clamp(roughness, 0, 1);
    this.uniforms.uClayRoughness.value = this.clay.roughness;
  }

  setClayAoIntensity(intensity: number): void {
    this.clay.aoIntensity = THREE.MathUtils.clamp(intensity, 0, 3);
    this.applyPreservedDetailMaps();
  }

  setAoEnabled(enabled: boolean): void {
    this.aoEnabled = enabled;
    this.applyPreservedDetailMaps();
  }

  setNormalMapsEnabled(enabled: boolean): void {
    this.normalMapsEnabled = enabled;
    this.applyPreservedDetailMaps();
  }

  setRevealEnabled(enabled: boolean): void { this.reveal.enabled = enabled; }

  setRevealCoreRadiusCssPx(radius: number): void {
    this.reveal.coreRadiusCssPx = THREE.MathUtils.clamp(radius, 20, 400);
    this.syncFramebufferUniforms();
  }

  setRevealFeatherCssPx(feather: number): void {
    this.reveal.featherCssPx = THREE.MathUtils.clamp(feather, 0, 400);
    this.syncFramebufferUniforms();
  }

  setRevealStrength(strength: number): void {
    this.reveal.strength = THREE.MathUtils.clamp(strength, 0, 1);
    this.uniforms.uRevealStrength.value = this.reveal.strength;
  }

  setPointerFromCanvasCss(x: number, yFromTop: number, canvasCssHeight: number): void {
    this.pointerCssX = x;
    this.pointerCssYFromBottom = canvasCssHeight - yFromTop;
    this.pointerInside = true;
    this.syncFramebufferUniforms();
  }

  setPointerInside(inside: boolean): void { this.pointerInside = inside; }

  setFramebufferScale(pixelRatio: number): void {
    this.framebufferScale = Math.max(pixelRatio, Number.EPSILON);
    this.syncFramebufferUniforms();
  }

  update(deltaSeconds: number): void {
    const target = this.reveal.enabled && this.pointerInside ? 1 : 0;
    this.reveal.visibility = THREE.MathUtils.damp(this.reveal.visibility, target, 20, deltaSeconds);
    if (Math.abs(this.reveal.visibility - target) < 0.0001) this.reveal.visibility = target;
    this.uniforms.uRevealVisibility.value = this.reveal.visibility;
  }

  private syncFramebufferUniforms(): void {
    this.uniforms.uRevealCursorPx.value.set(
      this.pointerCssX * this.framebufferScale,
      this.pointerCssYFromBottom * this.framebufferScale,
    );
    this.uniforms.uRevealCoreRadiusPx.value = this.reveal.coreRadiusCssPx * this.framebufferScale;
    this.uniforms.uRevealOuterRadiusPx.value = (this.reveal.coreRadiusCssPx + this.reveal.featherCssPx) * this.framebufferScale;
  }

  private patchMaterial(material: CHSGSProductionMaterial): void {
    const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
    const previousCacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile(shader, renderer);
      for (const marker of SHADER_MARKERS) {
        if (!shader.fragmentShader.includes(marker)) {
          throw new Error(`WEB.02B shader patch failed for ${material.name}: missing ${marker}.`);
        }
      }
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = replaceShaderMarker(shader.fragmentShader, '#include <common>', `#include <common>
uniform vec2 uRevealCursorPx;
uniform float uRevealCoreRadiusPx;
uniform float uRevealOuterRadiusPx;
uniform float uRevealStrength;
uniform float uRevealVisibility;
uniform float uForceOriginal;
uniform vec3 uClayColor;
uniform float uClayRoughness;
uniform float uClayMetalness;

float chsgsRevealMask() {
  float featherWidth = max(uRevealOuterRadiusPx - uRevealCoreRadiusPx, 0.0001);
  float distancePx = distance(gl_FragCoord.xy, uRevealCursorPx);
  float localReveal = 1.0 - smoothstep(uRevealCoreRadiusPx, uRevealCoreRadiusPx + featherWidth, distancePx);
  return mix(localReveal * uRevealStrength * uRevealVisibility, 1.0, uForceOriginal);
}`);
      shader.fragmentShader = replaceShaderMarker(shader.fragmentShader, '#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(uClayColor, diffuseColor.rgb, chsgsRevealMask());`);
      shader.fragmentShader = replaceShaderMarker(shader.fragmentShader, '#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(uClayRoughness, roughnessFactor, chsgsRevealMask());`);
      shader.fragmentShader = replaceShaderMarker(shader.fragmentShader, '#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(uClayMetalness, metalnessFactor, chsgsRevealMask());`);
    };
    material.customProgramCacheKey = () => `${previousCacheKey()}|${REVEAL_SHADER_REVISION}`;
    material.needsUpdate = true;
  }

  private applyPreservedDetailMaps(): void {
    for (const material of this.materials) {
      const state = this.original.get(material);
      if (!state) continue;
      this.restoreMaterial(material, state);
      material.aoMap = this.aoEnabled ? state.aoMap : null;
      material.aoMapIntensity = this.mode === 'CLAY' && state.aoMap && CLAY_AO_MATERIALS.has(material.name)
        ? this.clay.aoIntensity
        : state.aoMapIntensity;
      material.normalMap = this.normalMapsEnabled ? state.normalMap : null;
      material.normalScale.copy(state.normalScale);
      material.needsUpdate = true;
    }
  }

  private restoreMaterial(material: CHSGSProductionMaterial, state: OriginalMaterialState): void {
    material.color.copy(state.color); material.map = state.map;
    material.roughness = state.roughness; material.roughnessMap = state.roughnessMap;
    material.metalness = state.metalness; material.metalnessMap = state.metalnessMap;
    material.normalMap = state.normalMap; material.normalScale.copy(state.normalScale);
    material.aoMap = state.aoMap; material.aoMapIntensity = state.aoMapIntensity;
    material.alphaMap = state.alphaMap; material.alphaTest = state.alphaTest;
    material.opacity = state.opacity; material.transparent = state.transparent;
    material.side = state.side; material.depthWrite = state.depthWrite; material.depthTest = state.depthTest;
    material.emissive.copy(state.emissive); material.emissiveMap = state.emissiveMap;
    material.emissiveIntensity = state.emissiveIntensity;
  }
}
