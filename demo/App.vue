<script setup lang="ts">
import { ref } from 'vue';
import { SileoToaster, useSileo, type ToastPosition } from '../src';

const sileo = useSileo();
const position = ref<ToastPosition>('top-right');

const positions: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

function setPosition(pos: ToastPosition) {
  position.value = pos;
}

function showSuccess() {
  sileo.success({ title: 'Event Created', description: 'Your event has been created successfully.' });
}

function showError() {
  sileo.error({ title: 'Error', description: 'There was an error with your request.' });
}

function showWarning() {
  sileo.warning({ title: 'Storage Almost Full', description: "You've used 95% of your available storage. Please upgrade your plan to continue." });
}

function showInfo() {
  sileo.info({ title: 'New Update Available', description: 'Version 2.0 is now available. Please update your app to continue using the latest features.' });
}

function showAction() {
  sileo.action({
    title: 'File Deleted',
    description: 'The file has been permanently removed from your workspace.',
    button: { title: 'Undo', onClick: () => sileo.success({ title: 'File Restored' }) },
  });
}

function showPromise() {
  sileo.promise(new Promise(r => setTimeout(() => r('Done'), 2000)), {
    loading: { title: 'Saving Changes', description: 'Please wait while we save your changes...' },
    success: () => ({ title: 'Changes Saved', description: 'All your changes have been saved successfully.' }),
    error: () => ({ title: 'Save Failed', description: 'Could not save changes. Please try again.' }),
  });
}

function copyInstall() {
  navigator.clipboard.writeText('npm install sileo-vue');
  sileo.success({ title: 'Copied to clipboard' });
}
</script>

<template>
  <div class="page">
    <div class="hero">
      <h1>sileo-vue</h1>
      <p class="subtitle">Toast notifications for Vue 3 with gooey SVG animations and spring physics. Zero config, just works.</p>
      <p class="credit">Based on <a href="https://sileo.aaryan.design/" target="_blank">Sileo</a></p>

      <div class="install-box">
        <span class="install-prompt">$</span>
        <span class="install-cmd">npm install sileo-vue</span>
        <button class="install-copy" @click="copyInstall">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>

      <div class="hero-links">
        <a href="https://github.com/myposty/sileo-vue" target="_blank">Documentation</a>
      </div>
    </div>

    <div class="playground">
      <div class="section">
        <h2>Position</h2>
        <p class="hint">Pick a position, click any type to fire it live.</p>
        <div class="pill-group">
          <button
            v-for="pos in positions"
            :key="pos"
            class="pill"
            :class="{ active: position === pos }"
            @click="setPosition(pos)"
          >{{ pos }}</button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>Types</h2>
        <div class="pill-group">
          <button class="pill type success" @click="showSuccess">Success</button>
          <button class="pill type error" @click="showError">Error</button>
          <button class="pill type warning" @click="showWarning">Warning</button>
          <button class="pill type info" @click="showInfo">Info</button>
          <button class="pill type action" @click="showAction">Action</button>
          <button class="pill type promise" @click="showPromise">Promise</button>
        </div>
      </div>
    </div>

    <div class="footer">
      <a href="https://github.com/myposty/sileo-vue" target="_blank">GitHub</a>
      <span class="dot"></span>
      <a href="https://github.com/hiaaryan/sileo" target="_blank">Original Sileo</a>
      <span class="dot"></span>
      <span>MIT License</span>
    </div>
  </div>

  <SileoToaster :position="position" theme="light" />
</template>

<style>
body {
  margin: 0;
}
</style>

<style scoped>
:host {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #fafafa;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page {
  text-align: center;
  max-width: 680px;
  padding: 40px 24px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #1a1a1a;
}

.hero {
  margin-bottom: 48px;
}

.hero h1 {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
  color: #111;
}

.subtitle {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #6b7280;
  max-width: 480px;
  margin: 0 auto 8px;
}

.credit {
  font-size: 0.85rem;
  color: #9ca3af;
}

.credit a {
  color: #6b7280;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s;
}

.credit a:hover {
  color: #111;
}

.install-box {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 18px;
  margin-top: 20px;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.85rem;
}

.install-prompt {
  color: #a1a1aa;
  user-select: none;
}

.install-cmd {
  color: #27272a;
  font-weight: 500;
}

.install-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e4e4e7;
  background: #fff;
  color: #71717a;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.install-copy:hover {
  background: #f4f4f5;
  color: #27272a;
}

.hero-links {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.hero-links a {
  font-size: 0.85rem;
  font-weight: 600;
  color: #18181b;
  text-decoration: none;
  transition: color 0.15s;
}

.hero-links a:hover {
  color: #6366f1;
}

.playground {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
}

.section h2 {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin-bottom: 6px;
}

.hint {
  font-size: 0.85rem;
  color: #b0b0b0;
  margin-bottom: 16px;
}

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 24px 0;
}

.pill-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.pill {
  padding: 8px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  color: #374151;
  transition: all 0.15s ease;
}

.pill:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.pill.active {
  background: #111;
  color: #fff;
  border-color: #111;
}

.pill.type:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pill.type:active {
  transform: translateY(0);
}

.pill.type.success { border-color: #bbf7d0; color: #16a34a; }
.pill.type.success:hover { background: #f0fdf4; }
.pill.type.error { border-color: #fecaca; color: #dc2626; }
.pill.type.error:hover { background: #fef2f2; }
.pill.type.warning { border-color: #fed7aa; color: #ea580c; }
.pill.type.warning:hover { background: #fff7ed; }
.pill.type.info { border-color: #bfdbfe; color: #2563eb; }
.pill.type.info:hover { background: #eff6ff; }
.pill.type.action { border-color: #ddd6fe; color: #7c3aed; }
.pill.type.action:hover { background: #f5f3ff; }
.pill.type.promise { border-color: #a5f3fc; color: #0891b2; }
.pill.type.promise:hover { background: #ecfeff; }

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 0.8rem;
  color: #9ca3af;
}

.footer a {
  color: #6b7280;
  text-decoration: none;
  transition: color 0.15s;
}

.footer a:hover {
  color: #111;
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #d1d5db;
}
</style>
