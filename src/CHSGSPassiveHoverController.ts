import * as THREE from 'three';

export interface PassiveHoverSettings {
  enabled: boolean;
  passiveYawDeg: number;
  passivePitchDeg: number;
  response: number;
  hoverWeight: number;
}

export interface PassiveHoverDiagnostics extends PassiveHoverSettings {
  pointerX: number;
  pointerY: number;
  targetPassiveYawDeg: number;
  currentPassiveYawDeg: number;
  targetPassivePitchDeg: number;
  currentPassivePitchDeg: number;
  currentRollDeg: 0;
  reducedMotion: boolean;
  pointerInside: boolean;
}

const DEFAULTS: PassiveHoverSettings = {
  enabled: true,
  passiveYawDeg: 2,
  passivePitchDeg: 1.5,
  response: 6,
  hoverWeight: 1,
};

const RUNTIME_UP = new THREE.Vector3(0, 1, 0);
const CAMERA_RIGHT = new THREE.Vector3(1, 0, 0);

export class CHSGSPassiveHoverController {
  readonly root: THREE.Group;
  private readonly camera: THREE.Camera;
  private readonly cameraWorldQuaternion = new THREE.Quaternion();
  private readonly parentWorldQuaternion = new THREE.Quaternion();
  private readonly passiveYawQuaternion = new THREE.Quaternion();
  private readonly passivePitchQuaternion = new THREE.Quaternion();
  private readonly pitchAxisInParent = new THREE.Vector3();
  private settings: PassiveHoverSettings = { ...DEFAULTS };
  private pointerX = 0;
  private pointerY = 0;
  private pointerInside = false;
  private reducedMotion = false;
  private interactionWeight = 1;
  private currentYaw = 0;
  private targetYaw = 0;
  private currentPitch = 0;
  private targetPitch = 0;

  constructor(root: THREE.Group, camera: THREE.Camera) {
    this.root = root;
    this.camera = camera;
    this.root.quaternion.identity();
  }

  get diagnostics(): PassiveHoverDiagnostics {
    return {
      ...this.settings,
      pointerX: this.pointerX,
      pointerY: this.pointerY,
      targetPassiveYawDeg: THREE.MathUtils.radToDeg(this.targetYaw),
      currentPassiveYawDeg: THREE.MathUtils.radToDeg(this.currentYaw),
      targetPassivePitchDeg: THREE.MathUtils.radToDeg(this.targetPitch),
      currentPassivePitchDeg: THREE.MathUtils.radToDeg(this.currentPitch),
      currentRollDeg: 0,
      reducedMotion: this.reducedMotion,
      pointerInside: this.pointerInside,
    };
  }

  setEnabled(enabled: boolean): void { this.settings.enabled = enabled; this.updateTargets(); }
  setPassiveYawDeg(value: number): void { this.settings.passiveYawDeg = THREE.MathUtils.clamp(value, 0, 5); this.updateTargets(); }
  setPassivePitchDeg(value: number): void { this.settings.passivePitchDeg = THREE.MathUtils.clamp(value, 0, 5); this.updateTargets(); }
  setResponse(value: number): void { this.settings.response = THREE.MathUtils.clamp(value, 1, 20); }
  setHoverWeight(value: number): void { this.settings.hoverWeight = THREE.MathUtils.clamp(value, 0, 1); this.updateTargets(); }
  setInteractionWeight(value: number): void { this.interactionWeight = THREE.MathUtils.clamp(value, 0, 1); this.updateTargets(); }
  setReducedMotion(reduced: boolean): void { this.reducedMotion = reduced; this.updateTargets(); }

  setPointerNormalized(x: number, y: number): void {
    this.pointerX = THREE.MathUtils.clamp(x, -1, 1);
    this.pointerY = THREE.MathUtils.clamp(y, -1, 1);
    this.pointerInside = true;
    this.updateTargets();
  }

  setPointerInside(inside: boolean): void {
    this.pointerInside = inside;
    if (!inside) {
      this.pointerX = 0;
      this.pointerY = 0;
    }
    this.updateTargets();
  }

  update(deltaSeconds: number): void {
    const alpha = 1 - Math.exp(-this.settings.response * Math.max(0, deltaSeconds));
    this.currentYaw += (this.targetYaw - this.currentYaw) * alpha;
    this.currentPitch += (this.targetPitch - this.currentPitch) * alpha;
    if (Math.abs(this.currentYaw - this.targetYaw) < 1e-7) this.currentYaw = this.targetYaw;
    if (Math.abs(this.currentPitch - this.targetPitch) < 1e-7) this.currentPitch = this.targetPitch;
    this.applyDeterministicOrientation();
  }

  private updateTargets(): void {
    const activeWeight = this.settings.enabled && this.pointerInside && !this.reducedMotion
      ? this.settings.hoverWeight * this.interactionWeight
      : 0;
    this.targetYaw = THREE.MathUtils.degToRad(-this.pointerX * this.settings.passiveYawDeg * activeWeight);
    this.targetPitch = THREE.MathUtils.degToRad(-this.pointerY * this.settings.passivePitchDeg * activeWeight);
  }

  private applyDeterministicOrientation(): void {
    this.camera.getWorldQuaternion(this.cameraWorldQuaternion);
    this.pitchAxisInParent.copy(CAMERA_RIGHT).applyQuaternion(this.cameraWorldQuaternion);
    if (this.root.parent) {
      this.root.parent.getWorldQuaternion(this.parentWorldQuaternion).invert();
      this.pitchAxisInParent.applyQuaternion(this.parentWorldQuaternion);
    }
    this.pitchAxisInParent.normalize();

    this.passiveYawQuaternion.setFromAxisAngle(RUNTIME_UP, this.currentYaw);
    this.passivePitchQuaternion.setFromAxisAngle(this.pitchAxisInParent, this.currentPitch);
    // Apply parent-space camera-right pitch after local physical-up yaw. This keeps pitch
    // screen-relative even when the future DragRoot has an arbitrary persistent Y yaw.
    this.root.quaternion.copy(this.passivePitchQuaternion).multiply(this.passiveYawQuaternion).normalize();
  }
}
