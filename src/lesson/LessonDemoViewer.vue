<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { LessonDemoResource } from '../types';
import { LessonDemoViewerCore } from './LessonDemoViewerCore';

const props = withDefaults(
  defineProps<{
    resource?: LessonDemoResource | null;
      activeStepIndex?: number;
      playing?: boolean;
      hideLabelObjects?: boolean;
      minHeight?: number;
    }>(),
  {
    resource: null,
    activeStepIndex: 0,
    playing: false,
    hideLabelObjects: false,
    minHeight: 420
  }
);

const emit = defineEmits<{
  (event: 'select-object', objectId: string): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let core: LessonDemoViewerCore | null = null;

function resourceForPreview() {
  if (!props.resource) {
    return null;
  }

  if (!props.hideLabelObjects) {
    return props.resource;
  }

  const labelIds = new Set(
    props.resource.scene.objects
      .filter((item) => item.shape === 'label')
      .map((item) => item.id)
  );

  return {
    ...props.resource,
    steps: props.resource.steps.map((step) => ({
      ...step,
      visibleObjectIds: step.visibleObjectIds.filter((objectId) => !labelIds.has(objectId)),
      highlightedObjectIds: step.highlightedObjectIds.filter((objectId) => !labelIds.has(objectId))
    }))
  };
}

async function syncScene() {
  const resource = resourceForPreview();
  if (!core || !resource) {
    return;
  }

  core.load(resource, props.activeStepIndex);
  core.setPlaying(props.playing);
}

onMounted(async () => {
  if (!canvasRef.value) {
    return;
  }

  core = new LessonDemoViewerCore(canvasRef.value);
  core.setObjectSelectHandler((objectId) => {
    emit('select-object', objectId);
  });
  await nextTick();
  await syncScene();
});

onBeforeUnmount(() => {
  core?.destroy();
  core = null;
});

watch(
  () => [props.resource, props.hideLabelObjects],
  () => {
    void syncScene();
  },
  { deep: true }
);

watch(
  () => props.activeStepIndex,
  (value) => {
    core?.applyStep(value);
  }
);

watch(
  () => props.playing,
  (value) => {
    core?.setPlaying(value);
  }
);
</script>

<template>
  <section class="lesson-demo-viewer panel" :style="{ minHeight: `${minHeight}px` }">
    <canvas ref="canvasRef" class="lesson-demo-viewer__canvas" />
    <div class="lesson-demo-viewer__overlay">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.lesson-demo-viewer {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 229, 0, 0.24), transparent 24%),
    linear-gradient(140deg, rgba(103, 175, 227, 0.22), rgba(255, 149, 56, 0.12));
}

.lesson-demo-viewer__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.lesson-demo-viewer__overlay {
  position: relative;
  z-index: 1;
  pointer-events: none;
  min-height: inherit;
}
</style>
