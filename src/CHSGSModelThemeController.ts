import * as THREE from 'three';

export type CHSGSModelTheme = 'dark' | 'light';

export const MODEL_THEME_CONFIG = {
  transitionDurationSeconds: 0.9,
  day: {
    directionalColor: '#fffaf0',
    directionalIntensity: 2.8,
    hemisphereSky: '#ffffff',
    hemisphereGround: '#454545',
    hemisphereIntensity: 0.75,
  },
  night: {
    directionalColor: '#a9bfe3',
    directionalIntensity: 1.35,
    hemisphereSky: '#50638a',
    hemisphereGround: '#12151c',
    hemisphereIntensity: 0.28,
    windowEmissiveColor: '#ffd39a',
    windowEmissiveIntensity: 2.0,
    gateLightColor: '#ffc878',
    gateLightIntensity: 5.5,
  },
  gates: [
    { name: 'Hangar gates west', position: [-2.0, 2.1, 22.7], target: [-2.0, 0.15, 17.5] },
    { name: 'Hangar gates centre', position: [-7.7, 2.1, 22.7], target: [-7.7, 0.15, 17.5] },
    { name: 'Hangar gates east', position: [-15.6, 2.1, 22.8], target: [-15.6, 0.15, 17.6] },
  ],
  gateSpot: { distance: 13, angle: 0.62, penumbra: 0.78, decay: 2 },
} as const;

export interface ModelThemeDiagnostics {
  theme: CHSGSModelTheme;
  transitionProgress: number;
  transitionDurationSeconds: number;
  windowEmissiveColor: string;
  windowEmissiveIntensity: number;
  gateLightCount: number;
  gateLightShadows: boolean;
}

export interface ModelLocalLights {
  root: THREE.Group;
  lights: THREE.SpotLight[];
}

export function createModelLocalGateLights(): ModelLocalLights {
  const root = new THREE.Group();
  root.name = 'CHSGS_LocalLightsRoot';
  const color = new THREE.Color(MODEL_THEME_CONFIG.night.gateLightColor);
  const lights = MODEL_THEME_CONFIG.gates.map((gate) => {
    const light = new THREE.SpotLight(
      color,
      0,
      MODEL_THEME_CONFIG.gateSpot.distance,
      MODEL_THEME_CONFIG.gateSpot.angle,
      MODEL_THEME_CONFIG.gateSpot.penumbra,
      MODEL_THEME_CONFIG.gateSpot.decay,
    );
    light.name = `CHSGS_GateLight_${gate.name}`;
    light.position.set(gate.position[0], gate.position[1], gate.position[2]);
    light.castShadow = false;
    light.target.name = `${light.name}_Target`;
    light.target.position.set(gate.target[0], gate.target[1], gate.target[2]);
    root.add(light, light.target);
    return light;
  });
  return { root, lights };
}

export class CHSGSModelThemeController {
  private readonly dayDirectionalColor = new THREE.Color(MODEL_THEME_CONFIG.day.directionalColor);
  private readonly nightDirectionalColor = new THREE.Color(MODEL_THEME_CONFIG.night.directionalColor);
  private readonly dayHemisphereSky = new THREE.Color(MODEL_THEME_CONFIG.day.hemisphereSky);
  private readonly nightHemisphereSky = new THREE.Color(MODEL_THEME_CONFIG.night.hemisphereSky);
  private readonly dayHemisphereGround = new THREE.Color(MODEL_THEME_CONFIG.day.hemisphereGround);
  private readonly nightHemisphereGround = new THREE.Color(MODEL_THEME_CONFIG.night.hemisphereGround);
  private readonly windowEmissiveColor = new THREE.Color(MODEL_THEME_CONFIG.night.windowEmissiveColor);
  private readonly gateLightColor = new THREE.Color(MODEL_THEME_CONFIG.night.gateLightColor);
  private windowEmissiveIntensity: number = MODEL_THEME_CONFIG.night.windowEmissiveIntensity;
  private progress: number;
  private transitionStart = 0;
  private transitionTarget = 0;
  private transitionElapsed = 0;
  private activeTheme: CHSGSModelTheme;

  constructor(
    private readonly hemisphereLight: THREE.HemisphereLight,
    private readonly keyLight: THREE.DirectionalLight,
    private readonly facadeMaterials: readonly THREE.MeshStandardMaterial[],
    private readonly gateLights: readonly THREE.SpotLight[],
    initialTheme: CHSGSModelTheme,
  ) {
    this.activeTheme = initialTheme;
    this.progress = initialTheme === 'light' ? 1 : 0;
    this.transitionStart = this.progress;
    this.transitionTarget = this.progress;
    this.apply();
  }

  get diagnostics(): ModelThemeDiagnostics {
    return {
      theme: this.activeTheme,
      transitionProgress: this.progress,
      transitionDurationSeconds: MODEL_THEME_CONFIG.transitionDurationSeconds,
      windowEmissiveColor: `#${this.windowEmissiveColor.getHexString()}`,
      windowEmissiveIntensity: this.windowEmissiveIntensity,
      gateLightCount: this.gateLights.length,
      gateLightShadows: this.gateLights.some((light) => light.castShadow),
    };
  }

  setTheme(theme: CHSGSModelTheme): void {
    const target = theme === 'light' ? 1 : 0;
    this.activeTheme = theme;
    if (target === this.transitionTarget && this.transitionElapsed > 0) return;
    this.transitionStart = this.progress;
    this.transitionTarget = target;
    this.transitionElapsed = 0;
  }

  setWindowEmissiveColor(color: THREE.ColorRepresentation): void {
    this.windowEmissiveColor.set(color);
    this.apply();
  }

  setWindowEmissiveIntensity(intensity: number): void {
    this.windowEmissiveIntensity = THREE.MathUtils.clamp(intensity, 0, 4);
    this.apply();
  }

  update(deltaSeconds: number): void {
    if (this.progress === this.transitionTarget) return;
    this.transitionElapsed = Math.min(
      this.transitionElapsed + deltaSeconds,
      MODEL_THEME_CONFIG.transitionDurationSeconds,
    );
    const linear = this.transitionElapsed / MODEL_THEME_CONFIG.transitionDurationSeconds;
    const eased = linear * linear * (3 - 2 * linear);
    this.progress = THREE.MathUtils.lerp(this.transitionStart, this.transitionTarget, eased);
    if (linear === 1) this.progress = this.transitionTarget;
    this.apply();
  }

  private apply(): void {
    this.keyLight.color.lerpColors(this.nightDirectionalColor, this.dayDirectionalColor, this.progress);
    this.keyLight.intensity = THREE.MathUtils.lerp(
      MODEL_THEME_CONFIG.night.directionalIntensity,
      MODEL_THEME_CONFIG.day.directionalIntensity,
      this.progress,
    );
    this.hemisphereLight.color.lerpColors(this.nightHemisphereSky, this.dayHemisphereSky, this.progress);
    this.hemisphereLight.groundColor.lerpColors(this.nightHemisphereGround, this.dayHemisphereGround, this.progress);
    this.hemisphereLight.intensity = THREE.MathUtils.lerp(
      MODEL_THEME_CONFIG.night.hemisphereIntensity,
      MODEL_THEME_CONFIG.day.hemisphereIntensity,
      this.progress,
    );
    const windowIntensity = THREE.MathUtils.lerp(this.windowEmissiveIntensity, 0, this.progress);
    for (const material of this.facadeMaterials) {
      material.emissive.copy(this.windowEmissiveColor);
      material.emissiveIntensity = windowIntensity;
    }
    const gateIntensity = THREE.MathUtils.lerp(MODEL_THEME_CONFIG.night.gateLightIntensity, 0, this.progress);
    for (const light of this.gateLights) {
      light.color.copy(this.gateLightColor);
      light.intensity = gateIntensity;
    }
  }
}
