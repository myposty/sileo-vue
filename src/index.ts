import './styles.css';
import type { App } from 'vue';

export { default as SileoToaster } from './components/SileoToaster.vue';
export { default as SileoToast } from './components/SileoToast.vue';
export { useSileo } from './composable';

export type {
  ToastState,
  ToastPosition,
  ToastOptions,
  ToastButton,
  ToastStyles,
  ToastItem,
  ToastPromiseOptions,
  PillAlign,
  ExpandDir,
  SileoOffsetValue,
  SileoOffsetConfig,
} from './types';

export {
  createToast,
  dismissToast,
  clearToasts,
  promiseToast,
  toasts,
} from './store';

/* ---- Plugin ---- */
import SileoToaster from './components/SileoToaster.vue';

export const SileoPlugin = {
  install(app: App): void {
    app.component('SileoToaster', SileoToaster);
  },
};
