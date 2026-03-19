# sileo-vue

An opinionated toast component for Vue 3 with SVG morphing, spring physics, and a minimal API. Based on [Sileo](https://github.com/hiaaryan/sileo).

**[Live Demo](https://myposty.github.io/sileo-vue/)** | **[Documentation](https://github.com/myposty/sileo-vue)**

## Installation

```sh
$ npm install sileo-vue
```

## Quick Start

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { SileoToaster, useSileo } from 'sileo-vue';

const sileo = useSileo();
</script>

<template>
  <button @click="sileo.success({ title: 'Saved', description: 'Changes applied.' })">
    Success
  </button>
  <SileoToaster position="top-right" theme="light" />
</template>
```

## Toast Types

```typescript
const sileo = useSileo();

sileo.success({ title: 'Saved', description: 'Your changes are live.' });
sileo.error({ title: 'Failed', description: 'Something went wrong.' });
sileo.warning({ title: 'Careful', description: 'Storage almost full.' });
sileo.info({ title: 'Update', description: 'New version available.' });
sileo.action({ title: 'Deleted', button: { title: 'Undo', onClick: () => {} } });
sileo.promise(asyncFn(), {
  loading: { title: 'Saving...' },
  success: () => ({ title: 'Saved' }),
  error: () => ({ title: 'Failed' }),
});
```

## Features

- Success, Error, Warning, Info, Action, Promise toasts
- SVG gooey morphing animation
- Spring physics easing
- 6 position options
- Light / Dark / System themes
- Auto-expand with description
- Swipe to dismiss
- Zero config — just works

## Also Available

- **React**: [Sileo](https://github.com/hiaaryan/sileo) (original)
- **Angular**: [sileo-angular](https://github.com/myposty/sileo-angular)

## License

MIT
