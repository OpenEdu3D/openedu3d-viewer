import {
  AmbientLight, Box3, Color, DirectionalLight, Group, Mesh, PerspectiveCamera,
  Scene, Texture, Vector3, Vector2, Raycaster, Matrix3, WebGLRenderer, Line, Points, type Material, type Object3D
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnnotationAnchor, ModelAnnotation, AnnotationModelSource, AnnotationViewerErrorCode, ModelLoadEvent } from './types';

export interface ProjectedAnnotation { id: string; title: string; x: number; y: number; ax: number; ay: number; faded: boolean }

export class ViewerFailure extends Error {
  constructor(readonly code: AnnotationViewerErrorCode, message: string) {
    super(message);
  }
}

function disposeObjects(root: Object3D) {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse((node) => {
    if (!(node instanceof Mesh || node instanceof Line || node instanceof Points)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  const bitmaps = new Set<ImageBitmap>();
  textures.forEach((value) => {
    if (typeof ImageBitmap !== 'undefined' && value.image instanceof ImageBitmap) bitmaps.add(value.image);
    value.dispose();
  });
  bitmaps.forEach((value) => value.close());
  materials.forEach((value) => value.dispose());
  geometries.forEach((value) => value.dispose());
}

function checkGlb(buffer: ArrayBuffer, local: boolean) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new ViewerFailure('unsupported-model', '仅支持静态、未压缩的 GLB 2.0 模型。');
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a || 20 + jsonLength > buffer.byteLength) {
    throw new ViewerFailure('invalid-model', 'GLB 文件结构不完整。');
  }
  const invalid = () => new ViewerFailure('invalid-model', 'GLB JSON 结构无效。');
  let data: Record<string, any>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buffer, 20, jsonLength)));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalid();
    data = parsed as Record<string, any>;
  } catch { throw invalid(); }
  for (const key of ['extensionsUsed', 'extensionsRequired', 'animations', 'skins', 'meshes', 'buffers', 'images']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw invalid();
  }
  if ([...(data.extensionsUsed || []), ...(data.extensionsRequired || [])].some((extension) => typeof extension !== 'string')) throw invalid();
  const resources = [...(data.buffers || []), ...(data.images || [])];
  if (resources.some((resource) => !resource || typeof resource !== 'object' || Array.isArray(resource) ||
      (resource.uri !== undefined && typeof resource.uri !== 'string'))) throw invalid();
  if (local && resources.some((resource) => typeof resource.uri === 'string' && !/^data:/i.test(resource.uri))) {
    throw new ViewerFailure('unsupported-model', '本地 GLB 需要内嵌全部缓冲区和纹理资源，请导出资源内嵌的 GLB。');
  }
  if (data.meshes?.some((mesh: any) => !mesh || typeof mesh !== 'object' || !Array.isArray(mesh.primitives) ||
      mesh.primitives.some((primitive: any) => !primitive || typeof primitive !== 'object' ||
        (primitive.targets !== undefined && !Array.isArray(primitive.targets))))) throw invalid();
  const compressed = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];
  if ([...(data.extensionsUsed || []), ...(data.extensionsRequired || [])].some((extension: string) => compressed.includes(extension)) ||
      data.animations?.length || data.skins?.length ||
      data.meshes?.some((mesh: { primitives?: Array<{ targets?: unknown[] }> }) => mesh.primitives?.some((primitive) => primitive.targets?.length))) {
    throw new ViewerFailure('unsupported-model', '首版支持静态、未压缩 GLB，不支持动画、骨骼、变形或压缩扩展。');
  }
}

/** Internal renderer. Consumers use the Vue component, not this class. */
export class ModelScene {
  private readonly scene = new Scene();
  private readonly root = new Group();
  private readonly camera = new PerspectiveCamera(38, 1, 0.01, 100);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly observer: ResizeObserver;
  private readonly meshes = new Map<string, Mesh>();
  private frame = 0;
  private dirty = true;
  private destroyed = false;
  private version = 0;
  private request: AbortController | null = null;
  private size = 1;
  private annotations: ModelAnnotation[] = [];
  private occluded: 'hide' | 'fade' = 'hide';
  private selected: string | null = null;
  private readonly raycaster = new Raycaster();

  constructor(private readonly canvas: HTMLCanvasElement, private readonly project: (values: ProjectedAnnotation[]) => void) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', this.invalidate);
    this.scene.background = new Color('#edf2ef');
    const key = new DirectionalLight('#fff3e9', 3);
    key.position.set(4, 6, 8);
    const fill = new DirectionalLight('#dceeff', 2);
    fill.position.set(-5, 2, -4);
    this.scene.add(new AmbientLight('#ffffff', 1.5), key, fill, this.root);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas.parentElement!);
    this.resize();
    this.animate();
  }

  private invalidate = () => { this.dirty = true; };

  clear() {
    ++this.version;
    this.request?.abort();
    this.request = null;
    disposeObjects(this.root);
    this.root.clear();
    this.meshes.clear();
    this.annotations = [];
    this.project([]);
    this.invalidate();
  }

  async load(model: AnnotationModelSource): Promise<ModelLoadEvent | null> {
    this.clear();
    const version = this.version;
    this.request = new AbortController();
    let loaded: Object3D | undefined;
    try {
      if (typeof model.id !== 'string' || !model.id.trim()) throw new ViewerFailure('invalid-model', '请提供有效模型 ID。');
      let buffer: ArrayBuffer;
      let resourcePath = '';
      if (typeof model.source === 'string') {
        if (!model.source.trim()) throw new ViewerFailure('invalid-model', '请提供有效模型 URL。');
        const url = new URL(model.source, document.baseURI);
        const response = await fetch(url, { signal: this.request.signal });
        if (!response.ok) throw new ViewerFailure('load-failed', `模型加载失败（HTTP ${response.status}）。`);
        buffer = await response.arrayBuffer();
        resourcePath = new URL('.', url).href;
      } else if (model.source instanceof File) {
        buffer = await model.source.arrayBuffer();
      } else throw new ViewerFailure('invalid-model', '模型来源应为 URL 或 File。');
      if (this.destroyed || version !== this.version) return null;
      checkGlb(buffer, model.source instanceof File);
      const gltf = await new GLTFLoader().parseAsync(buffer, resourcePath);
      loaded = gltf.scene;
      if (this.destroyed || version !== this.version) { disposeObjects(loaded); return null; }
      const box = new Box3().setFromObject(loaded);
      const dimensions = box.getSize(new Vector3());
      if (box.isEmpty() || !dimensions.toArray().every(Number.isFinite) || !Number.isFinite(dimensions.length()) || !dimensions.length()) {
        throw new ViewerFailure('invalid-model', '模型没有可展示的有效网格。');
      }
      const visit = (node: Object3D, path: string) => {
        if (node instanceof Mesh) this.meshes.set(path, node);
        node.children.forEach((child, index) => visit(child, path ? `${path}/${index}` : String(index)));
      };
      visit(loaded, '');
      if (!this.meshes.size) throw new ViewerFailure('invalid-model', '模型没有可展示的有效网格。');
      this.size = dimensions.length();
      loaded.position.sub(box.getCenter(new Vector3()));
      this.root.add(loaded);
      this.root.updateMatrixWorld(true);
      this.camera.near = this.size / 1000;
      this.camera.far = this.size * 100;
      this.controls.minDistance = this.size * 0.15;
      this.controls.maxDistance = this.size * 50;
      this.resetView();
      return { modelId: model.id, nodePaths: [...this.meshes.keys()] };
    } catch (error) {
      if (loaded && loaded.parent !== this.root) disposeObjects(loaded);
      if (this.destroyed || version !== this.version) return null;
      this.meshes.clear();
      throw error;
    }
  }

  resetView() {
    const halfFov = this.camera.fov * Math.PI / 360;
    const angle = Math.atan(Math.tan(halfFov) * Math.min(this.camera.aspect, 1));
    const distance = this.size / 2 / Math.sin(angle) * 1.07;
    this.camera.position.set(distance * 0.1, distance * 0.12, distance);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.invalidate();
  }

  setAnnotations(values: ModelAnnotation[]) { this.annotations = values; this.invalidate(); }
  setDisplay(occluded: 'hide' | 'fade', selected: string | null) { this.occluded = occluded; this.selected = selected; this.invalidate(); }

  pick(clientX: number, clientY: number): AnnotationAnchor | null {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    this.camera.updateMatrixWorld();
    this.root.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), this.camera);
    const hit = this.raycaster.intersectObjects([...this.meshes.values()], false).find((entry) => this.visible(entry.object, entry.face?.materialIndex));
    if (!hit?.face) return null;
    const nodePath = [...this.meshes].find(([, mesh]) => mesh === hit.object)?.[0];
    if (nodePath === undefined) return null;
    return { nodePath, position: hit.object.worldToLocal(hit.point.clone()).toArray(), normal: hit.face.normal.clone().normalize().toArray() };
  }

  private visible(node: Object3D, materialIndex?: number) {
    for (let parent: Object3D | null = node; parent; parent = parent.parent) if (!parent.visible) return false;
    if (node instanceof Mesh) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (materialIndex !== undefined && Array.isArray(node.material)) {
        const material = materials[materialIndex];
        return Boolean(material?.visible && material.opacity > 0);
      }
      return materials.some((material) => material.visible && material.opacity > 0);
    }
    return true;
  }

  focus(anchor: AnnotationAnchor) {
    const mesh = this.meshes.get(anchor.nodePath);
    if (!mesh) return;
    const point = mesh.localToWorld(new Vector3(...anchor.position));
    const normal = new Vector3(...anchor.normal).applyMatrix3(new Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
    if (!point.toArray().every(Number.isFinite) || !normal.toArray().every(Number.isFinite) || !normal.lengthSq()) return;
    this.camera.position.copy(point).addScaledVector(normal, this.size * 1.7);
    this.controls.target.copy(point);
    this.controls.update();
    this.invalidate();
  }

  private projectAnnotations() {
    const rect = this.canvas.getBoundingClientRect();
    const values: ProjectedAnnotation[] = [];
    if (!rect.width || !rect.height) { this.project(values); return; }
    const ordered = [...this.annotations].sort((a, b) => Number(b.id === this.selected) - Number(a.id === this.selected));
    for (const annotation of ordered) {
      const mesh = this.meshes.get(annotation.anchor.nodePath);
      if (!mesh || !this.visible(mesh)) continue;
      const world = mesh.localToWorld(new Vector3(...annotation.anchor.position));
      const direction = world.clone().sub(this.camera.position);
      const distance = direction.length();
      if (!world.toArray().every(Number.isFinite) || !Number.isFinite(distance) || distance === 0) continue;
      this.raycaster.set(this.camera.position, direction.normalize());
      this.raycaster.near = 0;
      this.raycaster.far = Math.max(0, distance - this.size * 0.0005);
      const faded = this.raycaster.intersectObjects([...this.meshes.values()], false).some((hit) => this.visible(hit.object, hit.face?.materialIndex));
      this.raycaster.far = Infinity;
      if (faded && this.occluded === 'hide') continue;
      const point = world.project(this.camera);
      if (!point.toArray().every(Number.isFinite) || Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1) continue;
      const ax = (point.x + 1) * rect.width / 2;
      const ay = (1 - point.y) * rect.height / 2;
      const x = Math.min(Math.max(ax + 45, 12), Math.max(12, rect.width - 170));
      const desiredY = Math.min(Math.max(ay - 50, 12), rect.height - 40);
      let y = desiredY;
      for (let attempt = 0; attempt < Math.ceil(rect.height / 40); attempt++) {
        const candidate = 12 + ((desiredY - 12 + attempt * 40) % Math.max(1, rect.height - 52));
        if (!values.some((label) => Math.abs(label.x - x) < 170 && Math.abs(label.y - candidate) < 38)) { y = candidate; break; }
      }
      values.push({ id: annotation.id, title: annotation.title, ax, ay, x, y, faded });
    }
    this.project(values);
  }

  private resize = () => {
    const width = Math.max(this.canvas.parentElement?.clientWidth || 1, 1);
    const height = Math.max(this.canvas.parentElement?.clientHeight || 1, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  };

  private animate = () => {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.projectAnnotations();
      this.dirty = false;
    }
  };

  destroy() {
    this.destroyed = true;
    this.clear();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.removeEventListener('change', this.invalidate);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
