<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type PropType,
} from 'vue';
import type { ToastItem, ToastState, ToastButton, ToastStyles } from '../types';
import { STATE_ICON } from '../icons';
import {
  HEIGHT,
  WIDTH,
  DEFAULT_ROUNDNESS,
  DURATION_MS,
  BLUR_RATIO,
  PILL_PADDING,
  MIN_EXPAND_RATIO,
  HEADER_EXIT_MS,
  SWAP_COLLAPSE_MS,
} from '../constants';

/* ---- Swipe constants ---- */
const SWIPE_DISMISS = 30;
const SWIPE_MAX = 20;

/* ---- View snapshot ---- */
interface ViewSnapshot {
  title: string;
  description?: string;
  state: ToastState;
  icon?: string;
  styles?: ToastStyles;
  button?: ToastButton;
  fill?: string;
}

interface HeaderLayer {
  current: { key: string; view: ViewSnapshot };
  prev: { key: string; view: ViewSnapshot } | null;
}

/* ---- Props ---- */
const props = defineProps({
  toast: { type: Object as PropType<ToastItem>, required: true },
  pillAlign: { type: String as PropType<'left' | 'center' | 'right'>, default: 'left' },
  expandDir: { type: String as PropType<'top' | 'bottom'>, default: 'top' },
  canExpand: { type: Boolean, default: true },
  refreshKey: { type: String, default: undefined },
});

const emit = defineEmits<{
  (e: 'mouseEnter', event: MouseEvent): void;
  (e: 'mouseLeave', event: MouseEvent): void;
  (e: 'dismiss'): void;
}>();

/* ---- Template refs ---- */
const toastEl = ref<HTMLButtonElement | null>(null);
const innerEl = ref<HTMLElement | null>(null);
const headerEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);

/* ---- State ---- */
const ready = ref(false);
const isExpanded = ref(false);
const pillWidth = ref(0);
const contentHeight = ref(0);

const view = ref<ViewSnapshot>({
  title: props.toast.title,
  description: props.toast.description,
  state: props.toast.state,
  icon: props.toast.icon,
  styles: props.toast.styles,
  button: props.toast.button,
  fill: props.toast.fill,
});

const headerLayer = ref<HeaderLayer>({
  current: { key: `${props.toast.state}-${props.toast.title}`, view: view.value },
  prev: null,
});

let appliedRefreshKey: string | undefined = undefined;
let lastRefreshKey: string | undefined = undefined;
let pendingSwap: { key: string; payload: ViewSnapshot } | null = null;

/* ---- Timers ---- */
let headerExitTimer: ReturnType<typeof setTimeout> | null = null;
let autoExpandTimer: ReturnType<typeof setTimeout> | null = null;
let autoCollapseTimer: ReturnType<typeof setTimeout> | null = null;
let swapTimer: ReturnType<typeof setTimeout> | null = null;
let pillRo: ResizeObserver | null = null;
let pillRafId = 0;
let contentRo: ResizeObserver | null = null;
let contentRafId = 0;
let headerPad: number | null = null;
let frozenExpanded = HEIGHT * MIN_EXPAND_RATIO;

/* Swipe state */
let pointerStartY: number | null = null;

/* ---- Computed ---- */
const filterId = computed(() => `sileo-gooey-${props.toast.id}`);
const resolvedRoundness = computed(() => Math.max(0, props.toast.roundness ?? DEFAULT_ROUNDNESS));
const blur = computed(() => resolvedRoundness.value * BLUR_RATIO);

const hasDesc = computed(() => {
  const v = view.value;
  return Boolean(v.description) || Boolean(v.button);
});

const allowExpand = computed(() => {
  const v = view.value;
  if (v.state === 'loading') return false;
  return props.canExpand;
});

const open = computed(() => {
  return hasDesc.value && isExpanded.value && view.value.state !== 'loading';
});

const minExpanded = HEIGHT * MIN_EXPAND_RATIO;

const rawExpanded = computed(() => {
  return hasDesc.value
    ? Math.max(minExpanded, HEIGHT + contentHeight.value)
    : minExpanded;
});

const expanded = computed(() => {
  if (open.value) {
    frozenExpanded = rawExpanded.value;
    return rawExpanded.value;
  }
  return frozenExpanded;
});

const svgHeight = computed(() => {
  return hasDesc.value ? Math.max(expanded.value, minExpanded) : HEIGHT;
});

const expandedContent = computed(() => Math.max(0, expanded.value - HEIGHT));
const resolvedPillWidth = computed(() => Math.max(pillWidth.value || HEIGHT, HEIGHT));
const pillHeight = computed(() => HEIGHT + blur.value * 3);

const pillX = computed(() => {
  const pos = props.pillAlign;
  const pw = resolvedPillWidth.value;
  return pos === 'right' ? WIDTH - pw : pos === 'center' ? (WIDTH - pw) / 2 : 0;
});

const viewBox = computed(() => `0 0 ${WIDTH} ${svgHeight.value}`);

/* ---- CSS transition strings for SVG ---- */
const pillTransitionStr = computed(() => {
  if (!ready.value) return 'none';
  const dur = `${DURATION_MS}ms`;
  const ease = 'var(--sileo-spring-easing)';
  return `transform ${dur} ${ease}, width ${dur} ${ease}, height ${dur} ${ease}`;
});

const bodyStyleStr = computed(() => {
  const o = open.value;
  const dur = `${DURATION_MS}ms`;
  const easing = o ? 'var(--sileo-spring-easing)' : 'ease';
  const transition = ready.value
    ? `height ${dur} ${easing}, opacity ${dur} ${easing}`
    : 'none';
  return `transition: ${transition}`;
});

const pillStyleStr = computed(() => {
  const px = pillX.value;
  const transition = pillTransitionStr.value;
  return `transform: translateX(${px}px); transition: ${transition}`;
});

const rootStyleStr = computed(() => {
  const o = open.value;
  const exp = expanded.value;
  const pw = resolvedPillWidth.value;
  const px = pillX.value;
  const ed = props.expandDir;
  return `--_h: ${o ? exp : HEIGHT}px; --_pw: ${pw}px; --_px: ${px}px; --_ht: translateY(${o ? (ed === 'bottom' ? 3 : -3) : 0}px) scale(${o ? 0.9 : 1}); --_co: ${o ? 1 : 0}`;
});

/* ---- Header morphing helper ---- */
function syncHeaderLayer(next: ViewSnapshot): void {
  const headerKey = `${next.state}-${next.title}`;
  const state = headerLayer.value;
  if (state.current.key === headerKey) {
    if (state.current.view !== next) {
      headerLayer.value = { ...state, current: { key: headerKey, view: next } };
    }
  } else {
    headerLayer.value = {
      prev: state.current,
      current: { key: headerKey, view: next },
    };
  }

  // Schedule prev layer removal
  if (headerLayer.value.prev) {
    if (headerExitTimer) clearTimeout(headerExitTimer);
    headerExitTimer = setTimeout(() => {
      headerExitTimer = null;
      headerLayer.value = { ...headerLayer.value, prev: null };
    }, HEADER_EXIT_MS);
  }
}

/* ---- Measurement functions ---- */
function measurePillWidth(): void {
  const el = innerEl.value;
  const header = headerEl.value;
  if (!el || !header) return;

  if (headerPad === null) {
    const cs = getComputedStyle(header);
    headerPad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  }
  const px = headerPad;

  const measure = () => {
    const w = el.scrollWidth + px + PILL_PADDING;
    if (w > PILL_PADDING && pillWidth.value !== w) {
      pillWidth.value = w;
    }
  };

  measure();

  pillRo = new ResizeObserver(() => {
    cancelAnimationFrame(pillRafId);
    pillRafId = requestAnimationFrame(() => {
      const inner = innerEl.value;
      const pad = headerPad ?? 0;
      if (!inner) return;
      const w = inner.scrollWidth + pad + PILL_PADDING;
      if (w > PILL_PADDING && pillWidth.value !== w) {
        pillWidth.value = w;
      }
    });
  });
  pillRo.observe(el);
}

function measureContent(): void {
  const el = contentEl.value;
  if (!el) return;

  const measure = () => {
    const h = el.scrollHeight;
    if (contentHeight.value !== h) {
      contentHeight.value = h;
    }
  };

  measure();
  contentRo = new ResizeObserver(() => {
    cancelAnimationFrame(contentRafId);
    contentRafId = requestAnimationFrame(measure);
  });
  contentRo.observe(el);
}

/* ---- Lifecycle ---- */
onMounted(() => {
  requestAnimationFrame(() => {
    ready.value = true;
  });
  measurePillWidth();
  measureContent();
});

onUnmounted(() => {
  pillRo?.disconnect();
  cancelAnimationFrame(pillRafId);
  contentRo?.disconnect();
  cancelAnimationFrame(contentRafId);
  if (headerExitTimer) clearTimeout(headerExitTimer);
  if (autoExpandTimer) clearTimeout(autoExpandTimer);
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
  if (swapTimer) clearTimeout(swapTimer);
});

/* ---- Watch toast changes (refresh logic) ---- */
watch(
  () => ({ ...props.toast }),
  (t) => {
    const next: ViewSnapshot = {
      title: t.title,
      description: t.description,
      state: t.state,
      icon: t.icon,
      styles: t.styles,
      button: t.button,
      fill: t.fill,
    };

    const rk = props.refreshKey;

    if (rk === undefined) {
      view.value = next;
      appliedRefreshKey = undefined;
      pendingSwap = null;
      lastRefreshKey = rk;
      syncHeaderLayer(next);
      return;
    }

    if (lastRefreshKey === rk) return;
    lastRefreshKey = rk;

    if (swapTimer) {
      clearTimeout(swapTimer);
      swapTimer = null;
    }

    if (open.value) {
      pendingSwap = { key: rk, payload: next };
      isExpanded.value = false;
      swapTimer = setTimeout(() => {
        swapTimer = null;
        const pending = pendingSwap;
        if (!pending) return;
        view.value = pending.payload;
        appliedRefreshKey = pending.key;
        pendingSwap = null;
        syncHeaderLayer(pending.payload);
      }, SWAP_COLLAPSE_MS);
    } else {
      pendingSwap = null;
      view.value = next;
      appliedRefreshKey = rk;
      syncHeaderLayer(next);
    }

    // After view update, re-measure
    nextTick(() => {
      measurePillWidth();
      measureContent();
    });
  },
  { deep: true },
);

/* ---- Watch for auto expand/collapse ---- */
watch(
  [
    hasDesc,
    () => props.toast.exiting,
    allowExpand,
    ready,
    () => props.toast.autoExpandDelayMs,
    () => props.toast.autoCollapseDelayMs,
    () => props.refreshKey,
  ],
  () => {
    if (!hasDesc.value) return;

    if (autoExpandTimer) { clearTimeout(autoExpandTimer); autoExpandTimer = null; }
    if (autoCollapseTimer) { clearTimeout(autoCollapseTimer); autoCollapseTimer = null; }

    if (props.toast.exiting) return;
    if (!allowExpand.value || !ready.value) {
      isExpanded.value = false;
      return;
    }

    const expandDelay = props.toast.autoExpandDelayMs;
    const collapseDelay = props.toast.autoCollapseDelayMs;

    if (expandDelay == null && collapseDelay == null) return;

    const ed = expandDelay ?? 0;
    const cd = collapseDelay ?? 0;

    if (ed > 0) {
      autoExpandTimer = setTimeout(() => { isExpanded.value = true; }, ed);
    } else {
      isExpanded.value = true;
    }

    if (cd > 0) {
      autoCollapseTimer = setTimeout(() => { isExpanded.value = false; }, cd);
    }
  },
  { immediate: true },
);

/* ---- Event handlers ---- */
function onEnter(e: MouseEvent): void {
  emit('mouseEnter', e);
  if (hasDesc.value && allowExpand.value) {
    isExpanded.value = true;
  }
}

function onLeave(e: MouseEvent): void {
  emit('mouseLeave', e);
  isExpanded.value = false;
}

function onTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName !== 'height' && e.propertyName !== 'transform') return;
  if (open.value) return;
  const pending = pendingSwap;
  if (!pending) return;
  if (swapTimer) {
    clearTimeout(swapTimer);
    swapTimer = null;
  }
  view.value = pending.payload;
  appliedRefreshKey = pending.key;
  pendingSwap = null;
  syncHeaderLayer(pending.payload);
}

function onPointerDown(e: PointerEvent): void {
  if (props.toast.exiting) return;
  const target = e.target as HTMLElement;
  if (target.closest('[data-sileo-button]')) return;
  pointerStartY = e.clientY;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

  const el = toastEl.value;
  if (!el) return;

  const onMove = (me: PointerEvent) => {
    if (pointerStartY === null) return;
    const dy = me.clientY - pointerStartY;
    const sign = dy > 0 ? 1 : -1;
    const clamped = Math.min(Math.abs(dy), SWIPE_MAX) * sign;
    el.style.transform = `translateY(${clamped}px)`;
  };

  const onUp = (ue: PointerEvent) => {
    if (pointerStartY === null) return;
    const dy = ue.clientY - pointerStartY;
    pointerStartY = null;
    el.style.transform = '';
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    if (Math.abs(dy) > SWIPE_DISMISS) {
      emit('dismiss');
    }
  };

  el.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerup', onUp, { passive: true });
}

function onButtonClick(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
  view.value.button?.onClick();
}

function getIconHtml(state: ToastState): string {
  return STATE_ICON[state] || '';
}
</script>

<template>
  <button
    ref="toastEl"
    type="button"
    data-sileo-toast
    :data-ready="ready"
    :data-expanded="open"
    :data-exiting="toast.exiting"
    :data-edge="expandDir"
    :data-position="pillAlign"
    :data-state="view.state"
    :style="rootStyleStr"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @transitionend="onTransitionEnd"
    @pointerdown="onPointerDown"
  >
    <!-- SVG Canvas with gooey filter -->
    <div
      data-sileo-canvas
      :data-edge="expandDir"
      :style="{ filter: `url(#${filterId})` }"
    >
      <svg
        data-sileo-svg
        :width="WIDTH"
        :height="svgHeight"
        :viewBox="viewBox"
        style="overflow: visible"
      >
        <title>Sileo Notification</title>
        <defs>
          <filter
            :id="filterId"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" :stdDeviation="blur" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
        <rect
          data-sileo-pill
          :rx="resolvedRoundness"
          :ry="resolvedRoundness"
          :fill="view.fill || '#1a1a1a'"
          :width="resolvedPillWidth"
          :height="open ? pillHeight : HEIGHT"
          :style="pillStyleStr"
        />
        <rect
          data-sileo-body
          :y="HEIGHT"
          :width="WIDTH"
          :rx="resolvedRoundness"
          :ry="resolvedRoundness"
          :fill="view.fill || '#1a1a1a'"
          :height="open ? expandedContent : 0"
          :opacity="open ? 1 : 0"
          :style="bodyStyleStr"
        />
      </svg>
    </div>

    <!-- Header -->
    <div ref="headerEl" data-sileo-header :data-edge="expandDir">
      <div data-sileo-header-stack>
        <!-- Current header layer -->
        <div
          ref="innerEl"
          :key="headerLayer.current.key"
          data-sileo-header-inner
          data-layer="current"
        >
          <div
            data-sileo-badge
            :data-state="headerLayer.current.view.state"
            :class="headerLayer.current.view.styles?.badge || ''"
            v-html="getIconHtml(headerLayer.current.view.state)"
          />
          <span
            data-sileo-title
            :data-state="headerLayer.current.view.state"
            :class="headerLayer.current.view.styles?.title || ''"
          >{{ headerLayer.current.view.title }}</span>
        </div>

        <!-- Previous header layer (exiting) -->
        <div
          v-if="headerLayer.prev"
          :key="headerLayer.prev.key"
          data-sileo-header-inner
          data-layer="prev"
          data-exiting="true"
        >
          <div
            data-sileo-badge
            :data-state="headerLayer.prev.view.state"
            :class="headerLayer.prev.view.styles?.badge || ''"
            v-html="getIconHtml(headerLayer.prev.view.state)"
          />
          <span
            data-sileo-title
            :data-state="headerLayer.prev.view.state"
            :class="headerLayer.prev.view.styles?.title || ''"
          >{{ headerLayer.prev.view.title }}</span>
        </div>
      </div>
    </div>

    <!-- Content (description + button) -->
    <div
      v-if="hasDesc"
      data-sileo-content
      :data-edge="expandDir"
      :data-visible="open"
    >
      <div
        ref="contentEl"
        data-sileo-description
        :class="view.styles?.description || ''"
      >
        {{ view.description }}
        <a
          v-if="view.button"
          href="#"
          data-sileo-button
          :data-state="view.state"
          :class="view.styles?.button || ''"
          @click="onButtonClick"
        >{{ view.button.title }}</a>
      </div>
    </div>
  </button>
</template>
