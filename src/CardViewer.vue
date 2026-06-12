<script setup lang="ts">
import type { CardViewerProps } from './types';
import ViewerBase from './ViewerBase.vue';

const props = withDefaults(defineProps<CardViewerProps>(), {
  title: '3D 预览',
  subtitle: '轻量预览视图',
  minHeight: 220,
  subject: 'math',
  autoRotate: false,
  showLabels: true,
  highlightNodes: () => []
});
</script>

<template>
  <ViewerBase
    class="card-viewer panel"
    :style="{ minHeight: `${minHeight}px` }"
    :auto-rotate="autoRotate"
    :highlight-nodes="highlightNodes"
    :highlighted-object="highlightedObject"
    mode="preview"
    :model-url="modelUrl"
    :show-labels="showLabels"
    :subject="subject"
  >
    <div class="card-viewer__content">
      <span class="card-viewer__badge">Preview</span>
      <div class="card-viewer__copy">
        <h3 class="card-viewer__title">{{ title }}</h3>
        <p class="card-viewer__subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </ViewerBase>
</template>

<style scoped>
.card-viewer {
  min-height: 220px;
}

.card-viewer__content {
  min-height: inherit;
  display: grid;
  align-content: end;
  gap: var(--space-8);
  padding: var(--space-8);
}

.card-viewer__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border: var(--border-fine);
  background: rgba(255, 255, 255, 0.72);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-viewer__copy {
  display: grid;
  gap: 4px;
  max-width: 260px;
}

.card-viewer__title {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  line-height: 1.15;
}

.card-viewer__subtitle {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: 1.4;
  color: var(--color-ink-strong);
  background: rgba(244, 239, 234, 0.7);
  width: fit-content;
  max-width: 100%;
  padding: 4px 6px;
}
</style>
