<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, useId, computed } from 'vue';
import { ModelScene, ViewerFailure, type ProjectedAnnotation } from './ModelScene';
import { createId, validAnnotations } from './data';
import type { AnnotationAnchor, ModelAnnotation, AnnotationModelSource, AnnotationViewerError, ModelLoadEvent } from './types';

const props = withDefaults(defineProps<{ minHeight?: number; mode?: 'edit' | 'present'; showSidebar?: boolean; occluded?: 'hide' | 'fade' }>(), { minHeight: 520, mode: 'edit', showSidebar: true, occluded: 'hide' });
const model = defineModel<AnnotationModelSource | null>('model', { default: null });
const annotations = defineModel<ModelAnnotation[]>('annotations', { default: () => [] });
const emit = defineEmits<{ load: [event: ModelLoadEvent]; error: [error: AnnotationViewerError]; 'select-annotation': [id: string | null] }>();
const projected = ref<ProjectedAnnotation[]>([]);
const rendered = ref<ModelAnnotation[]>([]);
const selected = ref<string | null>(null);
const adding = ref(false);
const selectedAnnotation = computed(() => rendered.value.find((entry) => entry.id === selected.value));
const pending = ref<AnnotationAnchor | null>(null);
const title = ref('');
const description = ref('');
const formId = useId();
const titleInput = ref<HTMLInputElement | null>(null);
const addButton = ref<HTMLButtonElement | null>(null);
let paths: string[] = [];
let invalidReported = false;
let pointerStart: { x: number; y: number; id: number; dragged: boolean } | null = null;
function cancelAdd() { adding.value = false; pending.value = null; pointerStart = null; }
watch(pending, (value, previous) => {
  if (value) titleInput.value?.focus();
  else if (previous && props.mode === 'edit') addButton.value?.focus();
}, { flush: 'post' });
function dialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); cancelAdd(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)')];
  const first = controls[0], last = controls[controls.length - 1];
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault(); (event.shiftKey ? last : first)?.focus();
  }
}
function syncAnnotations() {
  if (!ready.value || !model.value) return;
  const result = validAnnotations(annotations.value, model.value.id, paths);
  rendered.value = result.values;
  scene?.setAnnotations(result.values);
  if (result.rejected && !invalidReported) emit('error', { code: 'invalid-annotations', message: '已忽略重复、无效或不属于当前模型的标注。', modelId: model.value.id });
  invalidReported = result.rejected;
  if (selected.value && !result.values.some((entry) => entry.id === selected.value)) select(null);
}
function select(id: string | null) { selected.value = id; emit('select-annotation', id); }
watch(() => [props.occluded, selected.value] as const, () => scene?.setDisplay(props.occluded, selected.value));
function pointerDown(event: PointerEvent) {
  if (pointerStart) { pointerStart.dragged = true; return; }
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId, dragged: false };
}
function pointerMove(event: PointerEvent) {
  if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.dragged = true;
}
function pointerUp(event: PointerEvent) {
  const start = pointerStart;
  pointerStart = null;
  if (props.mode !== 'edit' || !adding.value || !ready.value || !start || start.dragged || start.id !== event.pointerId || event.button !== 0 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
  pending.value = scene?.pick(event.clientX, event.clientY) ?? null;
  title.value = ''; description.value = '';
}
function saveAnnotation() {
  if (props.mode !== 'edit' || !ready.value || !pending.value || !model.value || !title.value.trim()) return;
  const value: ModelAnnotation = { id: createId(), modelId: model.value.id, anchor: pending.value, title: title.value.trim(), description: description.value };
  annotations.value = [...rendered.value, value];
  select(value.id);
  cancelAdd();
}
function focusAnnotation(id: string) { const value = rendered.value.find((entry) => entry.id === id); if (value) { select(id); scene?.focus(value.anchor); } }
watch(annotations, syncAnnotations, { deep: true });
const canvas = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const status = ref('请导入静态 GLB 模型');
const ready = ref(false);
let scene: ModelScene | null = null;
let version = 0;

async function syncModel() {
  const current = ++version;
  ready.value = false;
  cancelAdd();
  rendered.value = [];
  select(null);
  invalidReported = false;
  if (!scene) return;
  if (!model.value) { scene.clear(); status.value = '请导入静态 GLB 模型'; return; }
  status.value = '正在加载模型…';
  try {
    const loaded = await scene.load(model.value);
    if (!loaded || current !== version) return;
    ready.value = true;
    status.value = '';
    paths = loaded.nodePaths;
    syncAnnotations();
    emit('load', loaded);
  } catch (error) {
    if (current !== version) return;
    const failure: AnnotationViewerError = {
      code: error instanceof ViewerFailure ? error.code : 'load-failed',
      message: error instanceof ViewerFailure ? error.message : '模型加载失败，请检查文件内容、资源地址和跨域设置。',
      modelId: model.value?.id
    };
    status.value = failure.message;
    emit('error', failure);
  }
}

function editAnnotation(field: 'title' | 'description', event: Event) {
  if (props.mode !== 'edit' || !selectedAnnotation.value) return;
  const value = (event.target as HTMLInputElement).value;
  if (field === 'title' && !value.trim()) return;
  annotations.value = rendered.value.map((entry) => entry.id === selected.value ? { ...entry, [field]: value } : entry);
}
function deleteAnnotation() { if (props.mode === 'edit') annotations.value = rendered.value.filter((entry) => entry.id !== selected.value); }
watch(() => props.mode, cancelAdd);
function resetView() { scene?.resetView(); }
function importFile(event: Event) {
  if (props.mode !== 'edit') return;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) { annotations.value = []; model.value = { id: createId(), source: file }; }
  input.value = '';
}
defineExpose({ resetView, focusAnnotation });
watch(() => [model.value?.id, model.value?.source], () => { void syncModel(); });
onMounted(() => {
  try { scene = new ModelScene(canvas.value!, (values) => { projected.value = values; }); }
  catch {
    status.value = '当前浏览器无法初始化 WebGL。';
    emit('error', { code: 'webgl-unavailable', message: status.value });
    return;
  }
  scene.setDisplay(props.occluded, selected.value);
  void syncModel();
});
onBeforeUnmount(() => { ++version; scene?.destroy(); scene = null; });
</script>

<template>
  <section class="oe3d-viewer" aria-label="三维教学展示">
    <div class="oe3d-toolbar"><strong>三维模型</strong><div><button type="button" v-if="props.mode === 'edit'" @click="fileInput?.click()">导入 GLB</button> <button type="button" ref="addButton" v-if="props.mode === 'edit'" :disabled="!ready" @click="adding ? cancelAdd() : adding = true">{{ adding ? '取消添加' : '添加三维标注' }}</button> <button type="button" :disabled="!ready" @click="resetView">重置视角</button></div></div>
    <input v-if="props.mode === 'edit'" ref="fileInput" class="oe3d-file-input" type="file" accept=".glb" aria-label="选择 GLB 模型" @change="importFile" />
    <div class="oe3d-body" :class="{ 'oe3d-with-sidebar': props.showSidebar }"><div class="oe3d-viewport" :style="{ minHeight: `${Math.max(160, props.minHeight)}px` }">
      <canvas ref="canvas" aria-label="三维模型交互画布" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerStart = null" />
      <svg class="oe3d-lines" aria-hidden="true"><g v-for="label in projected" :key="label.id" :opacity="label.faded ? .3 : 1"><line :x1="label.ax" :y1="label.ay" :x2="label.x + 10" :y2="label.y + 16" /><circle :cx="label.ax" :cy="label.ay" r="4" /></g></svg>
      <button type="button" v-for="label in projected" :key="label.id" class="oe3d-label" :aria-pressed="selected === label.id" :title="label.title" :style="{ left: `${label.x}px`, top: `${label.y}px`, opacity: label.faded ? .3 : 1, zIndex: selected === label.id ? 2 : 1 }" @click="select(label.id)">{{ label.title }}</button>
      <div v-if="pending" class="oe3d-modal"><form role="dialog" aria-modal="true" :aria-labelledby="`${formId}-heading`" @submit.prevent="saveAnnotation" @keydown="dialogKeydown">
        <h3 :id="`${formId}-heading`">添加三维标注</h3>
        <label :for="`${formId}-title`">标注名称</label><input ref="titleInput" :id="`${formId}-title`" v-model="title" required maxlength="120" />
        <label :for="`${formId}-description`">课堂说明</label><textarea :id="`${formId}-description`" v-model="description" rows="4" />
        <div><button type="button" @click="cancelAdd">取消</button> <button :disabled="!title.trim()">确认添加</button></div>
      </form></div>
      <div v-if="status" class="oe3d-status" role="status">{{ status }}</div>
      <p v-if="ready" class="oe3d-hint">{{ adding ? '点击模型表面选择标注位置' : '拖动旋转 · 滚轮缩放' }}</p>
    </div>
    <aside v-if="props.showSidebar" aria-label="标注侧栏" class="oe3d-sidebar">
      <h3>课程标注 <small>{{ rendered.length }}</small></h3>
      <p v-if="!rendered.length" class="oe3d-empty">{{ props.mode === 'edit' ? '点击添加，再选择模型上的讲解部位。' : '当前模型暂无标注。' }}</p>
      <ul><li v-for="annotation in rendered" :key="annotation.id"><button type="button" :aria-label="`定位：${annotation.title}`" :aria-pressed="selected === annotation.id" @click="focusAnnotation(annotation.id)">{{ annotation.title }}</button></li></ul>
      <div v-if="selectedAnnotation" class="oe3d-editor">
        <template v-if="props.mode === 'edit'">
          <label :for="`${formId}-edit-title`">标注名称</label><input :id="`${formId}-edit-title`" :value="selectedAnnotation.title" maxlength="120" @input="editAnnotation('title', $event)" />
          <label :for="`${formId}-edit-description`">课堂说明</label><textarea :id="`${formId}-edit-description`" :value="selectedAnnotation.description" rows="5" @input="editAnnotation('description', $event)" />
          <button type="button" @click="deleteAnnotation">删除标注</button>
        </template>
        <template v-else><h4>{{ selectedAnnotation.title }}</h4><p class="oe3d-description">{{ selectedAnnotation.description || '暂无课堂说明。' }}</p></template>
      </div>
    </aside></div>
    <div v-if="!props.showSidebar && selectedAnnotation" class="oe3d-detail" role="region" aria-label="标注详情"><strong>{{ selectedAnnotation.title }}</strong><p class="oe3d-description">{{ selectedAnnotation.description || '暂无课堂说明。' }}</p><button type="button" @click="select(null)">关闭说明</button></div>
  </section>
</template>

<style scoped>
.oe3d-viewer { container-type: inline-size; color: #20382f; font-family: system-ui, sans-serif; border: 1px solid #d5dfd7; border-radius: 12px; overflow: hidden; background: #f7f9f4; min-width: 0; }
.oe3d-toolbar { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
.oe3d-toolbar button { font: inherit; background: white; border: 1px solid #ccd7ce; border-radius: 6px; padding: 7px 10px; cursor: pointer; color: inherit; }
.oe3d-toolbar button:disabled { opacity: .5; cursor: default; }
.oe3d-file-input { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; }
.oe3d-viewport { position: relative; background: #edf2ef; }
.oe3d-viewport canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
.oe3d-status { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: #edf2efe8; text-align: center; }
.oe3d-hint { position: absolute; bottom: 16px; left: 16px; margin: 0; color: #78877d; font-size: 11px; pointer-events: none; }
.oe3d-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; }
.oe3d-lines line { stroke: #39634e; stroke-width: 1.5; }.oe3d-lines circle { fill: #39634e; stroke: white; stroke-width: 2; }
.oe3d-label { position: absolute; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #fff; border: 1px solid #b6cdbd; border-radius: 6px; padding: 7px 10px; color: inherit; cursor: pointer; }
.oe3d-modal { position: absolute; inset: 0; z-index: 5; background: #20382f44; display: grid; place-items: center; padding: 16px; }
.oe3d-modal form { background: white; border-radius: 12px; padding: 24px; width: min(320px, 100%); box-sizing: border-box; display: grid; gap: 10px; }.oe3d-modal h3 { margin: 0 0 10px; }
.oe3d-modal input, .oe3d-modal textarea { box-sizing: border-box; width: 100%; font: inherit; padding: 8px; border: 1px solid #ccd7ce; border-radius: 5px; }
.oe3d-body { display: grid; min-width: 0; }.oe3d-with-sidebar { grid-template-columns: minmax(0, 1fr) 260px; }
.oe3d-sidebar { padding: 18px; border-left: 1px solid #d5dfd7; min-width: 0; max-height: 650px; overflow: auto; }
.oe3d-sidebar h3 { margin: 0 0 16px; font-size: 15px; }.oe3d-sidebar small { color: #78877d; }
.oe3d-sidebar ul { list-style: none; padding: 0; margin: 0 0 24px; display: grid; gap: 6px; }
.oe3d-sidebar button { font: inherit; color: inherit; border: 1px solid #ccd7ce; padding: 9px; border-radius: 6px; background: white; cursor: pointer; overflow-wrap: anywhere; }
.oe3d-sidebar li button { width: 100%; text-align: left; }.oe3d-sidebar button[aria-pressed=true] { background: #e1eddf; border-color: #86ad8e; }
.oe3d-empty { font-size: 13px; color: #78877d; }.oe3d-editor { display: grid; gap: 10px; font-size: 13px; }
.oe3d-editor input, .oe3d-editor textarea { width: 100%; box-sizing: border-box; font: inherit; padding: 8px; border: 1px solid #ccd7ce; border-radius: 5px; background: white; color: inherit; }
.oe3d-description { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }.oe3d-detail { padding: 16px; border-top: 1px solid #d5dfd7; }
@container (max-width: 640px) { .oe3d-with-sidebar { grid-template-columns: minmax(0, 1fr); }.oe3d-sidebar { border-left: 0; border-top: 1px solid #d5dfd7; max-height: none; }.oe3d-toolbar { flex-wrap: wrap; }.oe3d-toolbar > div { display: flex; gap: 6px; flex-wrap: wrap; } }
</style>
