import { ref } from 'vue';
import type {
  ToastItem,
  ToastOptions,
  ToastPromiseOptions,
  ToastState,
  ToastPosition,
} from './types';
import {
  DEFAULT_TOAST_DURATION,
  EXIT_DURATION,
  AUTO_EXPAND_DELAY,
  AUTO_COLLAPSE_DELAY,
} from './constants';

/* ------------------------------ ID generation ----------------------------- */

let idCounter = 0;

function generateId(): string {
  return `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function timeoutKey(t: ToastItem): string {
  return `${t.id}:${t.instanceId}`;
}

/* ------------------------------ Autopilot --------------------------------- */

function resolveAutopilot(
  opts: ToastOptions,
  duration: number | null | undefined,
): { expandDelayMs?: number; collapseDelayMs?: number } {
  if (opts.autopilot === false || !duration || duration <= 0) return {};
  const cfg = typeof opts.autopilot === 'object' ? opts.autopilot : undefined;
  const clamp = (v: number) => Math.min(duration, Math.max(0, v));
  return {
    expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
    collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
  };
}

/* ------------------------------ Reactive store ---------------------------- */

export const toasts = ref<ToastItem[]>([]);
export let storePosition: ToastPosition = 'top-right';
export let storeGlobalOptions: Partial<ToastOptions> | undefined = undefined;

export const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function setStorePosition(pos: ToastPosition): void {
  storePosition = pos;
}

export function setStoreGlobalOptions(opts: Partial<ToastOptions> | undefined): void {
  storeGlobalOptions = opts;
}

/* ------------------------------ Internal helpers -------------------------- */

function mergeOptions(options: ToastOptions): ToastOptions {
  return {
    ...storeGlobalOptions,
    ...options,
    styles: { ...storeGlobalOptions?.styles, ...options.styles },
  };
}

function buildItem(merged: ToastOptions, id: string, fallbackPosition?: string): ToastItem {
  const duration = merged.duration !== undefined ? merged.duration : DEFAULT_TOAST_DURATION;
  const auto = resolveAutopilot(merged, duration);
  return {
    ...merged,
    id,
    instanceId: generateId(),
    state: merged.state as ToastState,
    position: (merged.position ?? fallbackPosition ?? storePosition) as ToastPosition,
    exiting: false,
    autoExpandDelayMs: auto.expandDelayMs,
    autoCollapseDelayMs: auto.collapseDelayMs,
  };
}

/* ------------------------------ Public API -------------------------------- */

export function createToast(options: ToastOptions & { state: ToastState }): string {
  const live = toasts.value.filter((t) => !t.exiting);
  const merged = mergeOptions(options);
  const id = merged.id ?? 'sileo-default';
  const prev = live.find((t) => t.id === id);
  const item = buildItem(merged, id, prev?.position);
  if (prev) {
    toasts.value = toasts.value.map((t) => (t.id === id ? item : t));
  } else {
    toasts.value = [...toasts.value.filter((t) => t.id !== id), item];
  }
  return id;
}

export function updateToast(id: string, options: ToastOptions & { state: ToastState }): void {
  const existing = toasts.value.find((t) => t.id === id);
  if (!existing) return;
  const merged = mergeOptions(options);
  const item = buildItem(merged, id, existing.position);
  toasts.value = toasts.value.map((t) => (t.id === id ? item : t));
}

export function dismissToast(id: string): void {
  const item = toasts.value.find((t) => t.id === id);
  if (!item || item.exiting) return;
  // Immediate removal (same as Angular port -- no exit animation)
  toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, exiting: true } : t));
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, EXIT_DURATION);
}

export function clearToasts(position?: ToastPosition): void {
  clearAllTimers();
  toasts.value = position ? toasts.value.filter((t) => t.position !== position) : [];
}

/* ------------------------------ Timer management -------------------------- */

export function scheduleTimers(items: ToastItem[], hovered: boolean): void {
  if (hovered) return;
  for (const item of items) {
    if (item.exiting) continue;
    const key = timeoutKey(item);
    if (timers.has(key)) continue;
    if (item.duration === null) continue;
    const dur = item.duration ?? DEFAULT_TOAST_DURATION;
    if (dur <= 0) continue;
    timers.set(key, setTimeout(() => dismissToast(item.id), dur));
  }
}

export function clearAllTimers(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export function pruneTimers(currentToasts: ToastItem[]): void {
  const keys = new Set(currentToasts.map(timeoutKey));
  for (const [key, timer] of timers) {
    if (!keys.has(key)) {
      clearTimeout(timer);
      timers.delete(key);
    }
  }
}

/* ------------------------------ Promise toast ----------------------------- */

export function promiseToast<T>(
  promise: Promise<T> | (() => Promise<T>),
  opts: ToastPromiseOptions<T>,
): Promise<T> {
  const id = createToast({
    ...opts.loading,
    state: 'loading',
    duration: null,
    position: opts.position,
  });

  const p = typeof promise === 'function' ? promise() : promise;

  p.then((data) => {
    if (opts.action) {
      const actionOpts = typeof opts.action === 'function' ? opts.action(data) : opts.action;
      updateToast(id, { ...actionOpts, state: 'action' });
    } else {
      const successOpts = typeof opts.success === 'function' ? opts.success(data) : opts.success;
      updateToast(id, { ...successOpts, state: 'success' });
    }
  }).catch((err) => {
    const errorOpts = typeof opts.error === 'function' ? opts.error(err) : opts.error;
    updateToast(id, { ...errorOpts, state: 'error' });
  });

  return p;
}
