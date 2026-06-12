<script setup lang="ts">
import { computed, ref } from 'vue';

import type { DetailViewerProps, ViewerExpose, ViewSnapshotResult } from './types';
import ViewerBase from './ViewerBase.vue';

const DEFAULT_SNAPSHOT: ViewSnapshotResult = {
  label: '默认视角',
  camera: {
    position: [4, 3, 5],
    target: [0, 1, 0],
    zoom: 1
  }
};

const props = withDefaults(defineProps<DetailViewerProps>(), {
  title: '3D 视图',
  subtitle: 'Three.js 交互展示组件',
  minHeight: 360,
  subject: 'math',
  autoRotate: false,
  showOverlay: true,
  showLabels: true,
  visibleNodes: () => [],
  highlightNodes: () => []
});

const baseRef = ref<ViewerExpose | null>(null);

const modeText = computed(() => {
  switch (props.mode) {
    case 'create':
      return '创建预览模式';
    case 'edit':
      return '资源编辑模式';
    case 'present':
      return '课堂演示模式';
    default:
      return '资源详情模式';
  }
});

const subjectText = computed(() => {
  switch (props.subject) {
    case 'biology':
      return '生物';
    case 'chemistry':
      return '化学';
    default:
      return '数学';
  }
});

function resetView(cameraState?: ViewSnapshotResult['camera']) {
  baseRef.value?.resetView(cameraState);
}

function captureViewSnapshot(): ViewSnapshotResult {
  return baseRef.value?.captureViewSnapshot() ?? DEFAULT_SNAPSHOT;
}

defineExpose({
  resetView,
  captureViewSnapshot
});
</script>

<template>
  <ViewerBase
    ref="baseRef"
    class="detail-viewer panel"
    :style="{ minHeight: `${minHeight}px` }"
    :auto-rotate="autoRotate"
    :camera-state="cameraState"
    :highlight-nodes="highlightNodes"
    :highlighted-object="highlightedObject"
    :mode="mode"
    :model-url="modelUrl"
    :show-labels="showLabels"
    :subject="subject"
    :visible-nodes="visibleNodes"
  >
    <div v-if="showOverlay" class="detail-viewer__content">
      <div class="detail-viewer__meta">
        <span class="detail-viewer__badge">{{ modeText }}</span>
        <span class="detail-viewer__badge detail-viewer__badge--ghost">{{ subjectText }}</span>
      </div>
      <div class="detail-viewer__copy">
        <h3 class="detail-viewer__title">{{ title }}</h3>
        <p class="detail-viewer__subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </ViewerBase>
</template>

<style scoped>
.detail-viewer {
  min-height: 360px;
}

.detail-viewer__content {
  min-height: inherit;
  display: grid;
  align-content: space-between;
  gap: var(--space-16);
  padding: var(--space-12);
}

.detail-viewer__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.detail-viewer__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: var(--border-fine);
  background: rgba(255, 255, 255, 0.72);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-viewer__badge--ghost {
  background: rgba(244, 239, 234, 0.52);
}

.detail-viewer__copy {
  display: grid;
  gap: var(--space-8);
  max-width: 380px;
}

.detail-viewer__title {
  font-family: var(--font-mono);
  font-size: clamp(20px, 2.4vw, 28px);
  line-height: 1.05;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.detail-viewer__subtitle {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  line-height: 1.5;
  color: var(--color-ink-strong);
  background: rgba(244, 239, 234, 0.7);
  width: fit-content;
  max-width: 100%;
  padding: 6px 8px;
}

@media (max-width: 980px) {
  .detail-viewer__content {
    padding: var(--space-8);
  }

  .detail-viewer__copy {
    max-width: none;
  }
}
</style>
