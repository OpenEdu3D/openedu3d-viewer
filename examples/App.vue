<script setup lang="ts">
import { ref } from 'vue';
import { ModelAnnotationViewer, type ModelAnnotation, type ModelLoadEvent } from '../src/index';

const model = ref<{ id: string; source: string | File } | null>({ id: 'heart-demo', source: '/heart.glb' });
const loaded = ref<unknown>(null);
const error = ref<unknown>(null);
const loadHistory = ref<ModelLoadEvent[]>([]);
const annotations = ref<ModelAnnotation[]>([]);
const present = ref(false);
const mounted = ref(true);
const sourceUrl = ref('/heart.glb');
const modelId = ref('heart-demo');
const showSidebar = ref(true);
const occluded = ref<'hide' | 'fade'>('hide');
const saved = ref('[]');
function onLoad(event: ModelLoadEvent) {
  loaded.value = event;
  loadHistory.value.push(event);
}
function restore() {
  try {
    const input = JSON.parse(saved.value);
    // Freeze restored input so accidental component mutations fail visibly in this demo.
    if (Array.isArray(input)) input.forEach((entry) => { if (entry?.anchor) { Object.freeze(entry.anchor.position); Object.freeze(entry.anchor.normal); Object.freeze(entry.anchor); } if (entry && typeof entry === 'object') Object.freeze(entry); });
    annotations.value = input;
  } catch { error.value = { code: 'invalid-json', message: '请填入有效 JSON。' }; }
}
function setModel(source: string | null, id = 'heart-demo') {
  loaded.value = null;
  error.value = null;
  model.value = source ? { id, source } : null;
}
</script>

<template>
  <main class="demo">
    <h1>OpenEdu3D · 模型教学标注</h1>
    <p>默认是原创心脏示意模型，也可加载真实心脏参考模型，体验模型导入与三维标注。</p>
    <p v-if="model?.id === 'hra-heart-male-v1.2'" class="demo-credit">课程模型：Kristen Browne; Heidi Schlehlein (2022) · HuBMAP Heart, Male v1.2 · <a href="https://doi.org/10.48539/HBM373.VSTV.568">模型来源</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p>
    <div><button @click="setModel('/models/hra-heart-male-v1.2.glb', 'hra-heart-male-v1.2')">加载真实心脏模型</button> <button @click="setModel(null)">清空模型</button> <button @click="setModel('/missing.glb', 'missing')">加载不存在的模型</button> <button @click="setModel('/heart.glb')">重新载入心脏</button></div>
    <form class="demo-source" @submit.prevent="setModel(sourceUrl, modelId)"><label>模型 URL<input v-model="sourceUrl" /></label> <label>稳定模型 ID<input v-model="modelId" /></label> <button>加载 URL</button></form>
    <div class="demo-controls"><label><input v-model="mounted" type="checkbox" />挂载组件</label> <label>遮挡标注 <select v-model="occluded" aria-label="遮挡标注"><option value="hide">隐藏</option><option value="fade">淡化</option></select></label> <label><input v-model="present" type="checkbox" />课堂展示模式</label> <label><input v-model="showSidebar" type="checkbox" />显示标注侧栏</label> <button @click="saved = JSON.stringify(annotations)">保存 JSON</button> <button @click="restore">恢复 JSON</button></div>
    <ModelAnnotationViewer v-if="mounted" :occluded="occluded" :mode="present ? 'present' : 'edit'" :show-sidebar="showSidebar" v-model:model="model" v-model:annotations="annotations" @load="onLoad" @error="error = $event" />
    <label class="demo-json">标注 JSON<textarea v-model="saved" aria-label="标注 JSON" rows="5" /></label>
    <pre id="annotation-data">{{ JSON.stringify(annotations, null, 2) }}</pre>
    <details open><summary>开发者事件</summary><pre id="event-log">{{ JSON.stringify({ loaded, error }, null, 2) }}</pre><pre id="event-history">{{ JSON.stringify(loadHistory, null, 2) }}</pre></details>
  </main>
</template>

<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #f6f8f5; color: #20382f; }
.demo { max-width: 1250px; padding: 24px; margin: auto; }
.demo h1 { font-size: 24px; }.demo > p { color: #718477; }
.demo-source { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }.demo-source label { display: grid; gap: 5px; }.demo-controls { margin: 16px 0; display: flex; flex-wrap: wrap; gap: 12px; }.demo-json { display: grid; gap: 8px; margin-top: 20px; }.demo-json textarea { width: 100%; box-sizing: border-box; }.demo details { margin-top: 20px; }.demo pre { font-size: 12px; overflow: auto; max-height: 320px; }
</style>
