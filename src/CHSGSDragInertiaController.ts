import * as THREE from 'three';

export type DragInteractionState = 'IDLE' | 'PENDING' | 'DRAGGING' | 'INERTIA';

export interface DragInertiaSettings {
  enabled: boolean;
  sensitivityDegPerCssPx: number;
  verticalSensitivityDegPerCssPx: number;
  response: number;
  thresholdCssPx: number;
  inertiaEnabled: boolean;
  inertiaDamping: number;
  maximumReleaseVelocityDegPerSec: number;
  minimumInertiaVelocityDegPerSec: number;
}

export interface DragInertiaDiagnostics extends DragInertiaSettings {
  interactionState: DragInteractionState;
  dragYawDeg: number;
  targetDragYawDeg: number;
  angularVelocityDegPerSec: number;
  horizontalDeltaCssPx: number;
  verticalDeltaCssPx: number;
  effectiveYawDeltaCssPx: number;
  hoverWeight: number;
  dragPitchDeg: 0;
  dragRollDeg: 0;
  pointerCaptured: boolean;
  reducedMotion: boolean;
}

const DEFAULTS: DragInertiaSettings = {
  enabled: true,
  sensitivityDegPerCssPx: 0.18,
  verticalSensitivityDegPerCssPx: 0.18,
  response: 18,
  thresholdCssPx: 3,
  inertiaEnabled: true,
  inertiaDamping: 5.5,
  maximumReleaseVelocityDegPerSec: 120,
  minimumInertiaVelocityDegPerSec: 1,
};

const RELEASE_VELOCITY_STALE_MS = 100;
const SETTLED_YAW_EPSILON_DEG = 0.001;

export class CHSGSDragInertiaController {
  readonly root: THREE.Group;
  readonly element: HTMLElement;
  private settings: DragInertiaSettings = { ...DEFAULTS };
  private readonly applyHoverWeight: (weight: number) => void;
  private readonly neutralizeHover: () => void;
  private readonly restoreHoverPointer: () => void;
  private readonly onPointerInteractionChange: (active: boolean) => void;
  private interactionState: DragInteractionState = 'IDLE';
  private activePointerId: number | null = null;
  private startClientX = 0;
  private startClientY = 0;
  private lastClientX = 0;
  private lastClientY = 0;
  private lastMoveTimestampMs = 0;
  private dragYawDeg = 0;
  private targetDragYawDeg = 0;
  private angularVelocityDegPerSec = 0;
  private horizontalDeltaCssPx = 0;
  private verticalDeltaCssPx = 0;
  private effectiveYawDeltaCssPx = 0;
  private currentHoverWeight = 1;
  private targetHoverWeight = 1;
  private reducedMotion = false;

  constructor(
    root: THREE.Group,
    element: HTMLElement,
    applyHoverWeight: (weight: number) => void,
    neutralizeHover: () => void,
    restoreHoverPointer: () => void,
    onPointerInteractionChange: (active: boolean) => void = () => undefined,
  ) {
    this.root = root;
    this.element = element;
    this.applyHoverWeight = applyHoverWeight;
    this.neutralizeHover = neutralizeHover;
    this.restoreHoverPointer = restoreHoverPointer;
    this.onPointerInteractionChange = onPointerInteractionChange;
    this.root.rotation.set(0, 0, 0);
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
    this.element.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.updateCursorState();
  }

  get diagnostics(): DragInertiaDiagnostics {
    return {
      ...this.settings,
      interactionState: this.interactionState,
      dragYawDeg: this.dragYawDeg,
      targetDragYawDeg: this.targetDragYawDeg,
      angularVelocityDegPerSec: this.angularVelocityDegPerSec,
      horizontalDeltaCssPx: this.horizontalDeltaCssPx,
      verticalDeltaCssPx: this.verticalDeltaCssPx,
      effectiveYawDeltaCssPx: this.effectiveYawDeltaCssPx,
      hoverWeight: this.currentHoverWeight,
      dragPitchDeg: 0,
      dragRollDeg: 0,
      pointerCaptured: this.activePointerId !== null && this.element.hasPointerCapture(this.activePointerId),
      reducedMotion: this.reducedMotion,
    };
  }

  get suppressesHover(): boolean { return this.interactionState !== 'IDLE'; }
  get isPointerActive(): boolean { return this.interactionState === 'PENDING' || this.interactionState === 'DRAGGING'; }

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    if (!enabled) this.cancelActiveInteraction();
    this.updateCursorState();
  }

  setSensitivityDegPerCssPx(value: number): void {
    this.settings.sensitivityDegPerCssPx = THREE.MathUtils.clamp(value, 0.02, 0.5);
  }
  setVerticalSensitivityDegPerCssPx(value: number): void {
    this.settings.verticalSensitivityDegPerCssPx = THREE.MathUtils.clamp(value, 0.02, 0.5);
  }

  setResponse(value: number): void { this.settings.response = THREE.MathUtils.clamp(value, 1, 40); }
  setThresholdCssPx(value: number): void { this.settings.thresholdCssPx = THREE.MathUtils.clamp(value, 0, 10); }

  setInertiaEnabled(enabled: boolean): void {
    this.settings.inertiaEnabled = enabled;
    if (!enabled && this.interactionState === 'INERTIA') this.angularVelocityDegPerSec = 0;
  }

  setInertiaDamping(value: number): void { this.settings.inertiaDamping = THREE.MathUtils.clamp(value, 1, 15); }

  setMaximumReleaseVelocityDegPerSec(value: number): void {
    this.settings.maximumReleaseVelocityDegPerSec = THREE.MathUtils.clamp(value, 20, 360);
    this.angularVelocityDegPerSec = THREE.MathUtils.clamp(
      this.angularVelocityDegPerSec,
      -this.settings.maximumReleaseVelocityDegPerSec,
      this.settings.maximumReleaseVelocityDegPerSec,
    );
  }

  setMinimumInertiaVelocityDegPerSec(value: number): void {
    this.settings.minimumInertiaVelocityDegPerSec = THREE.MathUtils.clamp(value, 0, 10);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced && this.interactionState === 'INERTIA') this.angularVelocityDegPerSec = 0;
  }

  resetDragYaw(): void {
    this.releaseActivePointerCapture();
    this.activePointerId = null;
    this.interactionState = 'IDLE';
    this.dragYawDeg = 0;
    this.targetDragYawDeg = 0;
    this.angularVelocityDegPerSec = 0;
    this.horizontalDeltaCssPx = 0;
    this.verticalDeltaCssPx = 0;
    this.effectiveYawDeltaCssPx = 0;
    this.targetHoverWeight = 1;
    this.root.rotation.y = 0;
    this.onPointerInteractionChange(false);
    this.restoreHoverPointer();
    this.updateCursorState();
  }

  update(deltaSeconds: number): void {
    const dt = Math.max(0, deltaSeconds);
    const responseAlpha = 1 - Math.exp(-this.settings.response * dt);

    if (this.interactionState === 'DRAGGING') {
      this.dragYawDeg += (this.targetDragYawDeg - this.dragYawDeg) * responseAlpha;
    } else if (this.interactionState === 'INERTIA') {
      if (this.angularVelocityDegPerSec !== 0) {
        const stopVelocity = Math.max(this.settings.minimumInertiaVelocityDegPerSec, 1e-3);
        const speed = Math.abs(this.angularVelocityDegPerSec);
        const secondsToStop = speed > stopVelocity
          ? Math.log(speed / stopVelocity) / this.settings.inertiaDamping
          : 0;
        const integrationSeconds = Math.min(dt, secondsToStop);
        this.targetDragYawDeg += this.angularVelocityDegPerSec
          * (1 - Math.exp(-this.settings.inertiaDamping * integrationSeconds))
          / this.settings.inertiaDamping;
        if (secondsToStop <= dt) {
          this.angularVelocityDegPerSec = 0;
        } else {
          this.angularVelocityDegPerSec *= Math.exp(-this.settings.inertiaDamping * dt);
        }
      }
      this.dragYawDeg += (this.targetDragYawDeg - this.dragYawDeg) * responseAlpha;
      if (this.angularVelocityDegPerSec === 0
        && Math.abs(this.targetDragYawDeg - this.dragYawDeg) < SETTLED_YAW_EPSILON_DEG) {
        this.dragYawDeg = this.targetDragYawDeg;
        this.interactionState = 'IDLE';
        this.targetHoverWeight = 1;
        this.restoreHoverPointer();
        this.updateCursorState();
      }
    }

    this.currentHoverWeight += (this.targetHoverWeight - this.currentHoverWeight) * responseAlpha;
    if (Math.abs(this.currentHoverWeight - this.targetHoverWeight) < 1e-5) {
      this.currentHoverWeight = this.targetHoverWeight;
    }
    this.applyHoverWeight(this.currentHoverWeight);
    this.root.rotation.y = THREE.MathUtils.degToRad(this.dragYawDeg);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.settings.enabled || !event.isPrimary || event.button !== 0 || this.activePointerId !== null) return;
    if (event.pointerType !== 'touch') event.preventDefault();
    this.activePointerId = event.pointerId;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.lastMoveTimestampMs = event.timeStamp;
    this.horizontalDeltaCssPx = 0;
    this.targetDragYawDeg = this.dragYawDeg;
    this.angularVelocityDegPerSec = 0;
    this.interactionState = 'PENDING';
    this.targetHoverWeight = 0;
    this.neutralizeHover();
    // Touch retains native vertical pan until a horizontal intent is established.
    if (event.pointerType !== 'touch') this.element.setPointerCapture(event.pointerId);
    this.onPointerInteractionChange(true);
    this.updateCursorState();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    const totalX = event.clientX - this.startClientX;
    const totalY = event.clientY - this.startClientY;

    if (this.interactionState === 'PENDING') {
      this.horizontalDeltaCssPx = totalX;
      this.verticalDeltaCssPx = totalY;
      if (event.pointerType === 'touch') {
        if (Math.abs(totalY) > 6 && Math.abs(totalY) > Math.abs(totalX)) {
          this.cancelActiveInteraction();
          return;
        }
        if (Math.abs(totalX) < 6 || Math.abs(totalX) <= Math.abs(totalY)) return;
        this.element.setPointerCapture(event.pointerId);
      }
      if (Math.hypot(totalX, totalY) < this.settings.thresholdCssPx) return;
      this.interactionState = 'DRAGGING';
      this.applyDragDelta(totalX, totalY, Math.max((event.timeStamp - this.lastMoveTimestampMs) / 1000, 1 / 240));
    } else if (this.interactionState === 'DRAGGING') {
      const deltaX = event.clientX - this.lastClientX;
      const deltaY = event.clientY - this.lastClientY;
      this.applyDragDelta(deltaX, deltaY, Math.max((event.timeStamp - this.lastMoveTimestampMs) / 1000, 1 / 240));
    }

    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    this.lastMoveTimestampMs = event.timeStamp;
    this.neutralizeHover();
    this.updateCursorState();
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.finishPointerInteraction(event, false);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.finishPointerInteraction(event, true);
  };

  private readonly handleLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.finishPointerInteraction(event, true);
  };

  private applyDragDelta(deltaXCssPx: number, deltaYCssPx: number, deltaSeconds: number): void {
    this.horizontalDeltaCssPx = deltaXCssPx;
    this.verticalDeltaCssPx = deltaYCssPx;
    // Right and down share the same yaw sign. Pure X and pure Y retain their
    // independent 0.18°/CSS-px response. Matching diagonal directions use the
    // yaw-vector length, so a 45° path is not ~2× faster; opposing directions
    // deliberately cancel because they request opposite yaw signs.
    const horizontalYawDeg = deltaXCssPx * this.settings.sensitivityDegPerCssPx;
    const verticalYawDeg = deltaYCssPx * this.settings.verticalSensitivityDegPerCssPx;
    const yawDeltaDeg = horizontalYawDeg === 0 || verticalYawDeg === 0
      ? horizontalYawDeg + verticalYawDeg
      : Math.sign(horizontalYawDeg) === Math.sign(verticalYawDeg)
        ? Math.sign(horizontalYawDeg) * Math.hypot(horizontalYawDeg, verticalYawDeg)
        : horizontalYawDeg + verticalYawDeg;
    this.effectiveYawDeltaCssPx = yawDeltaDeg / this.settings.sensitivityDegPerCssPx;
    this.targetDragYawDeg += yawDeltaDeg;
    const instantaneousVelocity = THREE.MathUtils.clamp(
      yawDeltaDeg / deltaSeconds,
      -this.settings.maximumReleaseVelocityDegPerSec,
      this.settings.maximumReleaseVelocityDegPerSec,
    );
    const velocityAlpha = 1 - Math.exp(-this.settings.response * deltaSeconds);
    this.angularVelocityDegPerSec += (instantaneousVelocity - this.angularVelocityDegPerSec) * velocityAlpha;
  }

  private finishPointerInteraction(event: PointerEvent, cancelled: boolean): void {
    const wasDragging = this.interactionState === 'DRAGGING';
    if (!wasDragging || cancelled || event.timeStamp - this.lastMoveTimestampMs > RELEASE_VELOCITY_STALE_MS
      || !this.settings.inertiaEnabled || this.reducedMotion) {
      this.angularVelocityDegPerSec = 0;
    }
    this.releaseActivePointerCapture();
    this.activePointerId = null;
    this.onPointerInteractionChange(false);
    this.interactionState = wasDragging ? 'INERTIA' : 'IDLE';
    this.targetHoverWeight = wasDragging ? 0 : 1;
    if (!wasDragging) this.restoreHoverPointer();
    this.horizontalDeltaCssPx = 0;
    this.verticalDeltaCssPx = 0;
    this.effectiveYawDeltaCssPx = 0;
    this.updateCursorState();
  }

  private cancelActiveInteraction(): void {
    this.releaseActivePointerCapture();
    this.activePointerId = null;
    this.angularVelocityDegPerSec = 0;
    this.targetDragYawDeg = this.dragYawDeg;
    this.interactionState = 'IDLE';
    this.targetHoverWeight = 1;
    this.horizontalDeltaCssPx = 0;
    this.verticalDeltaCssPx = 0;
    this.effectiveYawDeltaCssPx = 0;
    this.onPointerInteractionChange(false);
    this.restoreHoverPointer();
  }

  private releaseActivePointerCapture(): void {
    if (this.activePointerId !== null && this.element.hasPointerCapture(this.activePointerId)) {
      this.element.releasePointerCapture(this.activePointerId);
    }
  }

  private updateCursorState(): void {
    this.element.classList.toggle('chsgs-drag-enabled', this.settings.enabled);
    this.element.classList.toggle('chsgs-drag-active', this.isPointerActive);
  }
}
