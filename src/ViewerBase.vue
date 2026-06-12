<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { ViewerCore } from './ViewerCore';
import type { ViewSnapshotResult, ViewerBaseProps } from './types';

const props = withDefaults(defineProps<ViewerBaseProps>(), {
  subject: 'math',
  autoRotate: false,
  showLabels: true,
  visibleNodes: () => [],
  highlightNodes: () => []
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let core: ViewerCore | null = null;

function mergedHighlightNodes() {
  if (props.highlightNodes?.length) {
    return props.highlightNodes;
  }

  if (props.highlightedObject) {
    return [props.highlightedObject];
  }

  return [];
}

async function loadScene() {
  if (!core) {
    return;
  }

  await core.load({
    mode: props.mode,
    subject: props.subject,
    modelUrl: props.modelUrl,
    visibleNodes: props.visibleNodes,
    highlightNodes: mergedHighlightNodes()
  });

  core.setAutoRotate(!!props.autoRotate);
  core.setShowLabels(!!props.showLabels);

  if (props.cameraState) {
    core.setCamera(props.cameraState);
  }
}

function resetView(cameraState?: ViewSnapshotResult['camera']) {
  core?.resetView(cameraState);
}

function captureViewSnapshot(): ViewSnapshotResult {
  if (!core) {
    return {
      label: '默认视角',
      camera: {
        position: [4, 3, 5],
        target: [0, 1, 0],
        zoom: 1
      }
    };
  }

  return core.captureViewSnapshot();
}

defineExpose({
  resetView,
  captureViewSnapshot
});

onMounted(async () => {
  if (!canvasRef.value) {
    return;
  }

  core = new ViewerCore(canvasRef.value);
  await nextTick();
  await loadScene();
});

onBeforeUnmount(() => {
  core?.destroy();
  core = null;
});

watch(
  () => [props.mode, props.subject, props.modelUrl],
  () => {
    void loadScene();
  }
);

watch(
  () => props.autoRotate,
  (value) => {
    core?.setAutoRotate(!!value);
  }
);

watch(
  () => props.showLabels,
  (value) => {
    core?.setShowLabels(!!value);
  }
);

watch(
  () => props.visibleNodes,
  (value) => {
    core?.applyVisibleNodes(value ?? []);
  },
  { deep: true }
);

watch(
  () => [props.highlightNodes, props.highlightedObject],
  () => {
    core?.applyHighlightNodes(mergedHighlightNodes());
  },
  { deep: true }
);

watch(
  () => props.cameraState,
  (value) => {
    core?.setCamera(value);
  },
  { deep: true }
);
</script>

<template>
  <section class="viewer-base">
    <canvas ref="canvasRef" class="viewer-base__canvas" />
    <div v-if="$slots.default" class="viewer-base__overlay">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.viewer-base {
  position: relative;
  overflow: hidden;
  display: block;
  background:
    radial-gradient(circle at top right, rgba(255, 229, 0, 0.22), transparent 28%),
    linear-gradient(140deg, rgba(103, 175, 227, 0.24), rgba(255, 149, 56, 0.12));
}

.viewer-base__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-base__overlay {
  position: relative;
  z-index: 1;
  pointer-events: none;
  min-height: inherit;
}
</style>
