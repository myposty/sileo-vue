<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type PropType,
} from 'vue';
import type {
  ToastItem,
  ToastPosition,
  ToastOptions,
  SileoOffsetValue,
  SileoOffsetConfig,
} from '../types';
import { THEME_FILLS } from '../constants';
import {
  toasts,
  setStorePosition,
  setStoreGlobalOptions,
  scheduleTimers,
  clearAllTimers,
  pruneTimers,
  dismissToast,
} from '../store';
import SileoToast from './SileoToast.vue';

/* ---- Props ---- */
const props = defineProps({
  position: {
    type: String as PropType<ToastPosition>,
    default: 'top-right',
  },
  theme: {
    type: String as PropType<'light' | 'dark' | 'system'>,
    default: undefined,
  },
  offset: {
    type: [Number, String, Object] as PropType<SileoOffsetValue | SileoOffsetConfig>,
    default: undefined,
  },
  options: {
    type: Object as PropType<Partial<ToastOptions>>,
    default: undefined,
  },
});

/* ---- State ---- */
const activeId = ref<string | undefined>(undefined);
const resolvedTheme = ref<'light' | 'dark' | undefined>(undefined);
let hovered = false;
let mqCleanup: (() => void) | null = null;

/* ---- Helper functions ---- */
function pillAlign(pos: string): 'left' | 'center' | 'right' {
  if (pos.includes('right')) return 'right';
  if (pos.includes('center')) return 'center';
  return 'left';
}

function expandDir(pos: string): 'top' | 'bottom' {
  return pos.startsWith('top') ? 'bottom' : 'top';
}

/* ---- Theme resolution ---- */
function resolveTheme(): void {
  cleanupMq();
  const theme = props.theme;
  if (!theme) {
    resolvedTheme.value = undefined;
    return;
  }
  if (theme === 'light' || theme === 'dark') {
    resolvedTheme.value = theme;
    return;
  }
  // system
  if (typeof window === 'undefined') {
    resolvedTheme.value = 'light';
    return;
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  resolvedTheme.value = mq.matches ? 'dark' : 'light';
  const handler = (e: MediaQueryListEvent) => {
    resolvedTheme.value = e.matches ? 'dark' : 'light';
  };
  mq.addEventListener('change', handler);
  mqCleanup = () => mq.removeEventListener('change', handler);
}

function cleanupMq(): void {
  if (mqCleanup) {
    mqCleanup();
    mqCleanup = null;
  }
}

/* ---- Computed: group toasts by position and apply theme fill ---- */
const activePositions = computed(() => {
  const items = toasts.value;
  const defaultPos = props.position;
  const theme = props.theme;
  const resolved = resolvedTheme.value;
  const map = new Map<string, ToastItem[]>();

  for (const t of items) {
    let item = t;
    if (!t.fill && theme && resolved) {
      item = { ...t, fill: THEME_FILLS[resolved] };
    }
    const pos = item.position ?? defaultPos;
    const arr = map.get(pos);
    if (arr) arr.push(item);
    else map.set(pos, [item]);
  }

  return Array.from(map.entries()).map(([position, toasts]) => ({ position, toasts }));
});

/* ---- Viewport offset style ---- */
function getViewportStyle(pos: string): Record<string, string> {
  const o = props.offset;
  if (o === undefined || o === null) return {};
  const offset = typeof o === 'object'
    ? o as SileoOffsetConfig
    : { top: o, right: o, bottom: o, left: o } as SileoOffsetConfig;
  const s: Record<string, string> = {};
  const px = (v?: SileoOffsetValue) => {
    if (v == null) return '';
    return typeof v === 'number' ? `${v}px` : v;
  };
  if (pos.startsWith('top') && offset?.top) s['top'] = px(offset.top);
  if (pos.startsWith('bottom') && offset?.bottom) s['bottom'] = px(offset.bottom);
  if (pos.endsWith('left') && offset?.left) s['left'] = px(offset.left);
  if (pos.endsWith('right') && offset?.right) s['right'] = px(offset.right);
  return s;
}

/* ---- Event handlers ---- */
function onToastEnter(id: string, _e: MouseEvent): void {
  activeId.value = id;
  if (!hovered) {
    hovered = true;
    clearAllTimers();
  }
}

function onToastLeave(_e: MouseEvent): void {
  if (hovered) {
    hovered = false;
    scheduleTimers(toasts.value, false);
  }
  // Reset activeId to latest non-exiting
  const items = toasts.value;
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i].exiting) {
      activeId.value = items[i].id;
      return;
    }
  }
  activeId.value = undefined;
}

function onToastDismiss(id: string): void {
  dismissToast(id);
}

/* ---- Sync props to store ---- */
watch(
  () => props.position,
  (pos) => setStorePosition(pos),
  { immediate: true },
);

watch(
  () => props.options,
  (opts) => setStoreGlobalOptions(opts),
  { immediate: true },
);

watch(
  () => props.theme,
  () => resolveTheme(),
  { immediate: true },
);

/* ---- Watch toasts for timer management ---- */
watch(
  toasts,
  (items) => {
    pruneTimers(items);
    scheduleTimers(items, hovered);

    // Track latest active toast
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].exiting) {
        activeId.value = items[i].id;
        return;
      }
    }
    activeId.value = undefined;
  },
  { deep: true },
);

/* ---- Lifecycle ---- */
onMounted(() => {
  resolveTheme();
});

onUnmounted(() => {
  cleanupMq();
  clearAllTimers();
});
</script>

<template>
  <slot />
  <section
    v-for="entry in activePositions"
    :key="entry.position"
    data-sileo-viewport
    :data-position="entry.position"
    :data-theme="resolvedTheme"
    aria-live="polite"
    :style="getViewportStyle(entry.position)"
  >
    <SileoToast
      v-for="item in entry.toasts"
      :key="item.id"
      :toast="item"
      :pill-align="pillAlign(entry.position)"
      :expand-dir="expandDir(entry.position)"
      :can-expand="activeId === undefined || activeId === item.id"
      :refresh-key="item.instanceId"
      @mouse-enter="onToastEnter(item.id, $event)"
      @mouse-leave="onToastLeave($event)"
      @dismiss="onToastDismiss(item.id)"
    />
  </section>
</template>
