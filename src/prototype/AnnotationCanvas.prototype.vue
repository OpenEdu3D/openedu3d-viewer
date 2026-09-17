<script setup lang="ts">
// PROTOTYPE: evaluate model-surface anchors, readable labels and occlusion.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  AmbientLight, Box3, Color, DirectionalLight, Group, Matrix3, Mesh, PerspectiveCamera,
  Raycaster, Scene, Texture, Vector2, Vector3, WebGLRenderer, type Object3D
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Annotation, ViewerStatus } from './types';

const props = defineProps<{
  annotations: Annotation[];
  selectedId: string | null;
  adding: boolean;
  showOccluded: boolean;
  onlySelected: boolean;
}>();
const emit = defineEmits<{
  anchor: [anchor: Pick<Annotation, 'meshName' | 'localPosition' | 'localNormal'>];
  select: [id: string];
  loaded: [name: string];
  status: [status: ViewerStatus];
}>();
const host = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const message = ref('正在加载心脏示意模型…');
const labels = ref<Array<{ id: string; title: string; ax: number; ay: number; x: number; y: number; hidden: boolean }>>([]);
let renderer: WebGLRenderer;
let camera: PerspectiveCamera;
let controls: OrbitControls;
let observer: ResizeObserver;
let frame = 0;
let loadVersion = 0;
let destroyed = false;
let previousStatus = '';
const scene = new Scene();
const modelRoot = new Group();
const meshMap = new Map<string, Mesh>();
const raycaster = new Raycaster();
const occlusionRay = new Raycaster();
let modelSize = 3;
let down = { x: 0, y: 0 };

function release(root: Object3D) {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

async function loadModel(url: string, name = 'heart-prototype.glb') {
  const version = ++loadVersion;
  message.value = '正在导入模型…';
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    if (destroyed || version !== loadVersion) { release(gltf.scene); return; }
    release(modelRoot);
    modelRoot.clear();
    meshMap.clear();
    const box = new Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new Vector3());
    modelSize = Math.max(box.getSize(new Vector3()).length(), 0.1);
    gltf.scene.position.sub(center);
    modelRoot.add(gltf.scene);
    gltf.scene.traverse((node) => {
      if (node instanceof Mesh) {
        // Assign deterministic keys even when an imported file has unnamed meshes.
        const key = `${node.name || 'mesh'}:${meshMap.size}`;
        node.userData.annotationKey = key;
        meshMap.set(key, node);
      }
    });
    modelRoot.updateMatrixWorld(true);
    camera.near = modelSize / 1000;
    camera.far = modelSize * 100;
    camera.updateProjectionMatrix();
    controls.minDistance = modelSize * 0.18;
    controls.maxDistance = modelSize * 3;
    resetView();
    message.value = '';
    emit('loaded', name);
  } catch {
    if (!destroyed && version === loadVersion) message.value = '模型导入失败，请选择未压缩的 GLB 文件。';
  }
}

function resetView(back = false) {
  const halfFov = camera.fov * Math.PI / 360;
  const limitingAngle = Math.atan(Math.tan(halfFov) * Math.min(camera.aspect, 1));
  const distance = modelSize / 2 / Math.sin(limitingAngle) * 1.07;
  camera.position.set(back ? -distance * 0.1 : distance * 0.1, distance * 0.12, back ? -distance : distance);
  controls.target.set(0, 0, 0);
  controls.update();
}

function focusAnnotation(id: string) {
  const item = props.annotations.find((annotation) => annotation.id === id);
  const mesh = item && meshMap.get(item.meshName);
  if (!mesh || !item) return;
  const point = mesh.localToWorld(new Vector3(...item.localPosition));
  const normal = new Vector3(...item.localNormal).applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld));
  camera.position.copy(point).addScaledVector(normal, modelSize * 0.7);
  controls.target.copy(point).multiplyScalar(0.5);
  controls.update();
}

function pick(event: PointerEvent) {
  if (!props.adding || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
  const rect = canvas.value!.getBoundingClientRect();
  raycaster.setFromCamera(new Vector2(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    -(event.clientY - rect.top) / rect.height * 2 + 1
  ), camera);
  const hit = raycaster.intersectObjects([...meshMap.values()], false)[0];
  if (!hit || !hit.face) return;
  const mesh = hit.object as Mesh;
  emit('anchor', {
    meshName: mesh.userData.annotationKey,
    localPosition: mesh.worldToLocal(hit.point.clone()).toArray() as [number, number, number],
    localNormal: hit.face.normal.toArray() as [number, number, number]
  });
}

function animate() {
  if (destroyed) return;
  frame = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  const width = host.value!.clientWidth;
  const height = host.value!.clientHeight;
  const visibleIds: string[] = [];
  const occludedIds: string[] = [];
  const placed: Array<{ x: number; y: number }> = [];
  labels.value = props.annotations.flatMap((item) => {
    const mesh = meshMap.get(item.meshName);
    if (!mesh) return [];
    const point = mesh.localToWorld(new Vector3(...item.localPosition));
    const distance = camera.position.distanceTo(point);
    occlusionRay.set(camera.position, point.clone().sub(camera.position).normalize());
    const first = occlusionRay.intersectObjects([...meshMap.values()], false)[0];
    const hidden = !!first && first.distance < distance - modelSize * 0.006;
    if (hidden) occludedIds.push(item.id);
    if (hidden && !props.showOccluded) return [];
    if (props.onlySelected && item.id !== props.selectedId) return [];
    const projected = point.clone().project(camera);
    if (projected.z < -1 || projected.z > 1 || distance < camera.near) return [];
    const ax = (projected.x + 1) * width / 2;
    const ay = (1 - projected.y) * height / 2;
    if (ax < 0 || ax > width || ay < 0 || ay > height) return [];
    // Labels are readable HTML; their anchor and leader endpoint are in world space.
    const normal = new Vector3(...item.localNormal).applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld));
    const end = point.clone().addScaledVector(normal, modelSize * 0.16).project(camera);
    let x = Math.max(64, Math.min(width - 64, (end.x + 1) * width / 2));
    let y = Math.max(30, Math.min(height - 32, (1 - end.y) * height / 2 - 24));
    for (const other of placed) {
      if (Math.abs(other.x - x) < 135 && Math.abs(other.y - y) < 42) y = Math.min(height - 32, other.y + 46);
    }
    placed.push({ x, y });
    visibleIds.push(item.id);
    return [{ id: item.id, title: item.title, ax, ay, x, y, hidden }];
  });
  const status = {
    camera: camera.position.toArray().map((n) => Number(n.toFixed(3))),
    target: controls.target.toArray().map((n) => Number(n.toFixed(3))),
    visibleIds, occludedIds, meshes: [...meshMap.keys()]
  };
  const encoded = JSON.stringify(status);
  if (encoded !== previousStatus) { previousStatus = encoded; emit('status', status); }
}

onMounted(() => {
  try {
    renderer = new WebGLRenderer({ canvas: canvas.value!, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  } catch { message.value = '当前浏览器无法初始化 WebGL，请使用支持 WebGL 的浏览器。'; return; }
  scene.background = new Color('#edf2ef');
  camera = new PerspectiveCamera(38, 1, 0.01, 100);
  controls = new OrbitControls(camera, canvas.value!);
  controls.enableDamping = true;
  const light = new DirectionalLight('#fff3e9', 3);
  light.position.set(4, 6, 8);
  const fill = new DirectionalLight('#dceeff', 2);
  fill.position.set(-5, 2, -4);
  scene.add(new AmbientLight('#ffffff', 1.5), light, fill, modelRoot);
  observer = new ResizeObserver(() => {
    const width = Math.max(host.value!.clientWidth, 1);
    const height = Math.max(host.value!.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(host.value!);
  void loadModel('/heart-prototype.glb');
  animate();
});
onBeforeUnmount(() => {
  destroyed = true;
  ++loadVersion;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  controls?.dispose();
  release(modelRoot);
  renderer?.dispose();
});
defineExpose({ loadModel, resetView, focusAnnotation });
</script>

<template>
  <div ref="host" class="annotation-canvas" :class="{ 'is-adding': adding }">
    <canvas ref="canvas" aria-label="三维模型交互画布" @pointerdown="down = { x: $event.clientX, y: $event.clientY }" @pointerup="pick" />
    <svg class="annotation-lines" aria-hidden="true">
      <g v-for="label in labels" :key="label.id" :opacity="label.hidden ? 0.35 : 1">
        <path :d="`M${label.ax},${label.ay} L${label.x},${label.y + 14}`" :class="{ selected: label.id === selectedId }" />
        <circle :cx="label.ax" :cy="label.ay" :r="label.id === selectedId ? 6 : 4" />
      </g>
    </svg>
    <button v-for="label in labels" :key="label.id" class="model-label" :class="{ selected: label.id === selectedId, occluded: label.hidden }" :style="{ left: `${label.x}px`, top: `${label.y}px` }" @click="emit('select', label.id)">
      {{ label.title }}<span v-if="label.hidden"> · 背面</span>
    </button>
    <div v-if="message" class="canvas-message" role="status">{{ message }}</div>
    <div class="canvas-hint">{{ adding ? '点击模型表面，放置标注锚点' : '拖动旋转 · 滚轮缩放 · 点击标注查看说明' }}</div>
  </div>
</template>
