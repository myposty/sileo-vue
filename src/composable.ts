import type { ToastOptions, ToastPosition, ToastPromiseOptions } from './types';
import { createToast, dismissToast, clearToasts, promiseToast } from './store';

export function useSileo() {
  return {
    success: (opts: ToastOptions) => createToast({ ...opts, state: 'success' }),
    error: (opts: ToastOptions) => createToast({ ...opts, state: 'error' }),
    warning: (opts: ToastOptions) => createToast({ ...opts, state: 'warning' }),
    info: (opts: ToastOptions) => createToast({ ...opts, state: 'info' }),
    action: (opts: ToastOptions) => createToast({ ...opts, state: 'action' }),
    show: (opts: ToastOptions) => createToast({ ...opts, state: opts.type ?? opts.state ?? 'success' }),

    promise: <T,>(
      promise: Promise<T> | (() => Promise<T>),
      opts: ToastPromiseOptions<T>,
    ): Promise<T> => promiseToast(promise, opts),

    dismiss: (id: string) => dismissToast(id),
    clear: (position?: ToastPosition) => clearToasts(position),
  };
}
