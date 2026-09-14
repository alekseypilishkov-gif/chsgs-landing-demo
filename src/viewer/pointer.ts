import * as THREE from 'three';
import type { CHSGSMaterialAppearanceController } from '../CHSGSMaterialAppearanceController';
import type { CHSGSDragInertiaController } from '../CHSGSDragInertiaController';
import type { CHSGSPassiveHoverController } from '../CHSGSPassiveHoverController';

export interface PointerState {
  client: THREE.Vector2 | null;
  inside: boolean;
}

export function updateHoverPointerFromClient(
  hover: CHSGSPassiveHoverController,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): void {
  const rect = canvas.getBoundingClientRect();
  const halfWidth = Math.max(rect.width * 0.5, Number.EPSILON);
  const halfHeight = Math.max(rect.height * 0.5, Number.EPSILON);
  hover.setPointerNormalized(
    (clientX - (rect.left + halfWidth)) / halfWidth,
    ((rect.top + halfHeight) - clientY) / halfHeight,
  );
}

export function bindViewerPointer(options: {
  canvas: HTMLCanvasElement;
  hover: CHSGSPassiveHoverController;
  drag: CHSGSDragInertiaController;
  pointer: PointerState;
  getAppearance: () => CHSGSMaterialAppearanceController | null;
}): void {
  const { canvas, hover, drag, pointer, getAppearance } = options;
  const updateRevealPointer = (event: PointerEvent): void => {
    pointer.client ??= new THREE.Vector2();
    pointer.client.set(event.clientX, event.clientY);
    const rect = canvas.getBoundingClientRect();
    pointer.inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    const appearance = getAppearance();
    if (pointer.inside) {
      appearance?.setPointerFromCanvasCss(event.clientX - rect.left, event.clientY - rect.top, rect.height);
      if (!drag.suppressesHover) updateHoverPointerFromClient(hover, canvas, event.clientX, event.clientY);
    } else {
      appearance?.setPointerInside(false);
    }
  };
  canvas.addEventListener('pointerenter', updateRevealPointer);
  canvas.addEventListener('pointermove', updateRevealPointer);
  canvas.addEventListener('pointerleave', () => {
    pointer.client = null;
    pointer.inside = false;
    getAppearance()?.setPointerInside(false);
    hover.setPointerInside(false);
  });
}
