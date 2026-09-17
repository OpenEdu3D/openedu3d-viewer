<script setup lang="ts">
// PROTOTYPE: three structurally different layouts at ?variant=A|B|C.
// Question: can teachers place surface annotations and present them while orbiting a model?
import { computed, onBeforeUnmount, ref } from 'vue';
import AnnotationCanvas from './AnnotationCanvas.prototype.vue';
import PrototypeSwitcher from './PrototypeSwitcher.vue';
import type { Annotation, ViewerStatus } from './types';

const variants = ['A', 'B', 'C'];
const requestedVariant = new URLSearchParams(location.search).get('variant') || 'A';
const variant = ref(variants.includes(requestedVariant) ? requestedVariant : 'A');
const viewer = ref<InstanceType<typeof AnnotationCanvas> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const modelName = ref('heart-prototype.glb');
const loading = ref(true);
const adding = ref(false);
const showOccluded = ref(false);
const selectedId = ref<string | null>('left-ventricle');
const status = ref<ViewerStatus>({ camera: [], target: [], visibleIds: [], occludedIds: [], meshes: [] });
const annotations = ref<Annotation[]>([]);
const selected = computed(() => annotations.value.find((item) => item.id === selectedId.value));
const stepIndex = computed(() => Math.max(0, annotations.value.findIndex((item) => item.id === selectedId.value)));
const pending = ref<Pick<Annotation, 'meshName' | 'localPosition' | 'localNormal'> | null>(null);
const draftTitle = ref('');
const draftDescription = ref('');
const jsonOpen = ref(false);
const jsonInput = ref('');
const jsonMessage = ref('');
const state = computed(() => ({
  variant: variant.value, model: modelName.value,
  interaction: pending.value ? '填写说明' : adding.value ? '放置锚点' : '观察模型',
  selectedId: selectedId.value, showOccluded: showOccluded.value,
  anchorSpace: 'mesh-local', pendingAnchor: pending.value,
  viewer: status.value, annotations: annotations.value
}));

function exampleAnnotations(): Annotation[] {
  return [
    { id: 'left-ventricle', meshName: 'Left_ventricle:0', localPosition: [0, -0.28, Math.sqrt(1 - 0.28 ** 2)], localNormal: [0, -0.28, Math.sqrt(1 - 0.28 ** 2)], title: '左心室', description: '观察心室的位置与形态。拖动模型，从不同方向观察这一标注如何跟随模型表面。' },
    { id: 'right-ventricle', meshName: 'Right_ventricle:1', localPosition: [-0.2, 0, Math.sqrt(0.96)], localNormal: [-0.2, 0, Math.sqrt(0.96)], title: '右心室', description: '将左右两侧的结构放在一起观察。旋转模型时，位于背面的标注默认隐藏。' },
    { id: 'left-atrium', meshName: 'Left_atrium:2', localPosition: [0.45, 0.5, Math.sqrt(1 - 0.45 ** 2 - 0.5 ** 2)], localNormal: [0.45, 0.5, Math.sqrt(1 - 0.45 ** 2 - 0.5 ** 2)], title: '左心房', description: '点击标注查看说明；在逐条讲解布局中，切换下一条会自动找到适合观察该锚点的视角。' }
  ];
}

function modelLoaded(name: string) {
  modelName.value = name;
  loading.value = false;
  annotations.value = name === 'heart-prototype.glb' ? exampleAnnotations() : [];
  selectedId.value = annotations.value[0]?.id || null;
  adding.value = false;
  pending.value = null;
}

function changeVariant(direction: number) {
  const next = (variants.indexOf(variant.value) + direction + variants.length) % variants.length;
  variant.value = variants[next];
  const url = new URL(location.href);
  url.searchParams.set('variant', variant.value);
  history.replaceState({}, '', url);
  if (variant.value === 'C' && selectedId.value) viewer.value?.focusAnnotation(selectedId.value);
}

function keydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable], dialog') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    changeVariant(event.key === 'ArrowLeft' ? -1 : 1);
  }
  if (event.key === 'Escape') { adding.value = false; pending.value = null; }
}
window.addEventListener('keydown', keydown);
onBeforeUnmount(() => window.removeEventListener('keydown', keydown));

function placeAnchor(anchor: Pick<Annotation, 'meshName' | 'localPosition' | 'localNormal'>) {
  pending.value = anchor;
  draftTitle.value = '';
  draftDescription.value = '';
  adding.value = false;
}

function saveAnnotation() {
  if (!pending.value || !draftTitle.value.trim()) return;
  const item: Annotation = { ...pending.value, id: crypto.randomUUID(), title: draftTitle.value.trim(), description: draftDescription.value.trim() };
  annotations.value.push(item);
  selectedId.value = item.id;
  pending.value = null;
}

function deleteAnnotation() {
  annotations.value = annotations.value.filter((item) => item.id !== selectedId.value);
  selectedId.value = annotations.value[0]?.id || null;
}

function selectAnnotation(id: string, focus = false) {
  selectedId.value = id;
  if (focus || variant.value === 'C') viewer.value?.focusAnnotation(id);
}

function nextAnnotation(direction: number) {
  if (!annotations.value.length) return;
  const next = (stepIndex.value + direction + annotations.value.length) % annotations.value.length;
  selectAnnotation(annotations.value[next].id, true);
}

async function importModel(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  adding.value = false;
  loading.value = true;
  const url = URL.createObjectURL(file);
  try { await viewer.value?.loadModel(url, file.name); }
  finally { URL.revokeObjectURL(url); input.value = ''; loading.value = false; }
}

function openJson() {
  jsonInput.value = JSON.stringify({ model: modelName.value, annotations: annotations.value }, null, 2);
  jsonMessage.value = '';
  jsonOpen.value = true;
}

function applyJson() {
  try {
    const data = JSON.parse(jsonInput.value);
    if (data.model !== modelName.value) throw new Error('模型名称不匹配，请先导入对应模型。');
    if (!Array.isArray(data.annotations)) throw new Error('annotations 必须为数组。');
    const ids = new Set<string>();
    for (const item of data.annotations) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id) || !item.id ||
          typeof item.title !== 'string' || !item.title.trim() || typeof item.description !== 'string' ||
          !status.value.meshes.includes(item.meshName) ||
          ![item.localPosition, item.localNormal].every((tuple) => Array.isArray(tuple) && tuple.length === 3 && tuple.every((n) => typeof n === 'number' && Number.isFinite(n)))) {
        throw new Error('标注需要唯一 ID、标题、说明、有效网格和三维坐标。');
      }
      ids.add(item.id);
    }
    annotations.value = data.annotations;
    selectedId.value = annotations.value[0]?.id || null;
    pending.value = null;
    adding.value = false;
    jsonOpen.value = false;
  } catch (error) { jsonMessage.value = error instanceof Error ? error.message : '数据格式无效。'; }
}

function downloadJson() {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ model: modelName.value, annotations: annotations.value }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'prototype-annotations.json';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="prototype-page" :class="`variant-${variant}`">
    <header class="prototype-header">
      <a class="wordmark" href="?variant=A">OPEN<span>EDU</span>3D <small>标注实验室</small></a>
      <span class="prototype-badge">交互原型 · 数据仅在内存中</span>
    </header>
    <div class="question-banner">验证问题：教师能否在模型表面添加标注，并在旋转、遮挡与逐条讲解中保持清晰？</div>

    <main class="workspace">
      <section v-if="variant === 'A'" class="editor-panel">
        <span class="eyebrow">准备课程</span><h1>把知识放到<br />模型上。</h1>
        <p class="muted">先选一个部位，再写下想让学生理解的内容。</p>
        <button class="primary full" :disabled="loading" @click="adding = !adding">{{ adding ? '取消添加' : '＋ 添加三维标注' }}</button>
        <h2>模型上的标注 <span>{{ annotations.length }}</span></h2>
        <div class="annotation-list">
          <button v-for="(item, index) in annotations" :key="item.id" :class="{ active: selectedId === item.id }" @click="selectAnnotation(item.id, true)"><span class="number">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ item.title }}</span><small>{{ status.occludedIds.includes(item.id) ? '背面' : '可见' }}</small></button>
        </div>
        <div v-if="selected" class="annotation-editor">
          <label>标注名称<input v-model="selected.title" maxlength="40" /></label>
          <label>课堂说明<textarea v-model="selected.description" rows="4" /></label>
          <button class="text-button danger" @click="deleteAnnotation">删除当前标注</button>
        </div>
        <p v-else class="muted">点击“添加三维标注”，再点击模型表面。</p>
      </section>

      <section v-if="variant === 'C'" class="lesson-rail">
        <span class="eyebrow">逐条讲解</span><h1>认识心脏<br />的空间结构</h1>
        <p class="muted">每次聚焦一个部位，找到适合观察它的视角。</p>
        <ol><li v-for="(item, index) in annotations" :key="item.id"><button :class="{ active: item.id === selectedId }" @click="selectAnnotation(item.id, true)"><span>{{ index + 1 }}</span>{{ item.title }}</button></li></ol>
        <button :disabled="loading" @click="adding = !adding">{{ adding ? '取消添加' : '＋ 补充一个讲解点' }}</button>
      </section>

      <section class="stage">
        <div class="stage-toolbar">
          <div><span class="live-dot"></span><strong>{{ modelName === 'heart-prototype.glb' ? '心脏结构 · 示意模型' : modelName }}</strong><small>{{ annotations.length }} 个标注</small></div>
          <div class="toolbar-actions">
            <button @click="viewer?.resetView()">正面</button><button @click="viewer?.resetView(true)">背面</button>
            <button v-if="variant === 'B'" class="primary" :disabled="loading" @click="adding = !adding">{{ adding ? '取消添加' : '＋ 添加标注' }}</button>
          </div>
        </div>
        <AnnotationCanvas ref="viewer" :annotations="annotations" :selected-id="selectedId" :adding="adding && !loading" :show-occluded="showOccluded" :only-selected="variant === 'C'" @anchor="placeAnchor" @select="selectAnnotation" @loaded="modelLoaded" @status="status = $event" />
        <div v-if="variant === 'B' && selected" class="classroom-caption">
          <span class="eyebrow">正在讲解 · {{ stepIndex + 1 }} / {{ annotations.length }}</span>
          <div><h1>{{ selected.title }}</h1><p>{{ selected.description || '这个标注还没有课堂说明。' }}</p></div>
          <button aria-label="上一条标注" @click="nextAnnotation(-1)">↑</button><button aria-label="下一条标注" @click="nextAnnotation(1)">↓</button>
        </div>
        <div v-if="variant === 'C'" class="guided-caption">
          <span class="eyebrow">{{ annotations.length ? `讲解点 ${stepIndex + 1} / ${annotations.length}` : '还没有讲解点' }}</span>
          <h2>{{ selected?.title || '添加你的第一个标注' }}</h2><p>{{ selected?.description }}</p>
          <div><button :disabled="!annotations.length" @click="nextAnnotation(-1)">上一个</button><button class="primary" :disabled="!annotations.length" @click="nextAnnotation(1)">下一个讲解点 →</button></div>
        </div>
      </section>
    </main>

    <footer class="utility-bar">
      <label class="checkbox-label"><input v-model="showOccluded" type="checkbox" />显示背面标注（淡化）</label>
      <span>当前可见 {{ status.visibleIds.length }} / {{ annotations.length }}</span>
      <div class="utility-actions">
        <button @click="fileInput?.click()">导入 GLB</button>
        <button @click="viewer?.loadModel('/heart-prototype.glb')">恢复示例</button>
        <button @click="openJson">标注数据</button><button @click="downloadJson">导出 JSON</button>
      </div>
    </footer>
    <input ref="fileInput" class="sr-only" type="file" accept=".glb" aria-label="选择 GLB 模型" @change="importModel" />
    <details class="state-inspector"><summary>查看完整交互状态 · {{ variant }} · {{ state.interaction }}</summary><pre>{{ JSON.stringify(state, null, 2) }}</pre></details>
    <PrototypeSwitcher :variant="variant" @change="changeVariant" />

    <div v-if="pending" class="modal-scrim" @click.self="pending = null">
      <form class="prototype-dialog" role="dialog" aria-modal="true" aria-labelledby="annotation-dialog-title" @submit.prevent="saveAnnotation">
        <span class="eyebrow">已选中模型表面</span><h2 id="annotation-dialog-title">给这个部位添加说明</h2>
        <label>标注名称<input v-model="draftTitle" autofocus required maxlength="40" placeholder="例如：主动脉" /></label>
        <label>课堂说明<textarea v-model="draftDescription" rows="4" placeholder="你想让学生在这里观察什么？" /></label>
        <div class="dialog-actions"><button type="button" @click="pending = null">取消</button><button class="primary" type="submit">添加标注</button></div>
      </form>
    </div>
    <div v-if="jsonOpen" class="modal-scrim" @click.self="jsonOpen = false">
      <section class="prototype-dialog json-dialog" role="dialog" aria-modal="true" aria-labelledby="json-dialog-title">
        <h2 id="json-dialog-title">开发者传入 / 获取标注数据</h2><p class="muted">编辑当前模型的标注数组，再应用到画布。锚点使用网格的局部坐标。</p>
        <label>标注 JSON<textarea v-model="jsonInput" rows="16" spellcheck="false" /></label>
        <p v-if="jsonMessage" class="danger" role="alert">{{ jsonMessage }}</p>
        <div class="dialog-actions"><button @click="jsonOpen = false">关闭</button><button class="primary" @click="applyJson">应用数据</button></div>
      </section>
    </div>
  </div>
</template>
