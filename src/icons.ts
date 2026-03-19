import type { ToastState } from './types';

const iconBase = 'xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const STATE_ICON: Record<ToastState, string> = {
  success: `<svg ${iconBase}><title>Check</title><path d="M20 6 9 17l-5-5"/></svg>`,
  error: `<svg ${iconBase}><title>X</title><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  warning: `<svg ${iconBase}><title>Circle Alert</title><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  info: `<svg ${iconBase}><title>Life Buoy</title><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
  action: `<svg ${iconBase}><title>Arrow Right</title><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  loading: `<svg ${iconBase} data-sileo-icon="spin" aria-hidden="true" style="animation: sileo-spin 1s linear infinite"><title>Loader Circle</title><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
};
