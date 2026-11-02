import { useEffect, useRef } from 'react';

/**
 * The layers a screen holds open over itself that Esc closes before it
 * reaches the game, from the lowest to the highest. This is also the order
 * they sit on the page: a confirm is part of its overlay, and the header's
 * audio panel sits above every overlay.
 *
 * Esc is a stack. The keyboard adapter (`attachKeyboard`, the one Esc
 * listener) closes the top layer here and stops; only when none is open does
 * the Esc go to the game, which closes or pauses the screen. One Esc never
 * closes two things.
 */
const LAYERS = ['confirm', 'audio-panel'] as const;
export type EscLayerName = (typeof LAYERS)[number];

interface OpenLayer {
  name: EscLayerName;
  close: () => void;
}

const open: OpenLayer[] = [];

/**
 * Close the top layer, if one is open. Returns whether it did, so the caller
 * knows the Esc was taken. The layer leaves the stack as it closes, so a
 * second call can't reach the same one.
 */
export function closeTopEscLayer(): boolean {
  let top: OpenLayer | undefined;
  for (const layer of open) {
    if (!top || LAYERS.indexOf(layer.name) >= LAYERS.indexOf(top.name)) {
      top = layer;
    }
  }
  if (!top) return false;
  open.splice(open.indexOf(top), 1);
  top.close();
  return true;
}

/**
 * Hold the layer `name` open on the stack while `onClose` is set and the
 * component is mounted. Pass null while the layer is shut. `onClose` may
 * change on every render.
 */
export function useEscLayer(
  name: EscLayerName,
  onClose: (() => void) | null,
): void {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  const isOpen = onClose !== null;

  useEffect(() => {
    if (!isOpen) return;
    const layer: OpenLayer = { name, close: () => latest.current?.() };
    open.push(layer);
    return () => {
      const at = open.indexOf(layer);
      if (at >= 0) open.splice(at, 1);
    };
  }, [name, isOpen]);
}
