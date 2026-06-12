import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { LibraryAdapter } from './adapters/LibraryAdapter';
import { MathAdapter } from './adapters/MathAdapter';
import type { BaseAdapter } from './adapters/BaseAdapter';
import type { ViewSnapshotResult, ViewerSceneInput, ViewerState } from './types';

export class ViewerCore {
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private controls: OrbitControls;
  private resizeObserver: ResizeObserver;
  private root = new Group();
  private animationFrame = 0;
  private adapter: BaseAdapter | null = null;

  readonly state: ViewerState = {
    mode: 'preview',
    autoRotate: false,
    showLabels: true
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(4, 3, 5);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.background = new Color('#f7f9fc');
    this.scene.add(this.root);

    const ambient = new AmbientLight('#ffffff', 0.72);
    const directional = new DirectionalLight('#ffffff', 1.05);
    directional.position.set(6, 8, 5);
    const fill = new DirectionalLight('#f4fbff', 0.42);
    fill.position.set(-5, 4, 6);
    this.scene.add(ambient, directional, fill);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(canvas);
    this.resize();

    this.animate();
  }

  async load(input: ViewerSceneInput): Promise<void> {
    this.state.mode = input.mode;

    this.root.clear();

    this.adapter = input.subject === 'math' ? new MathAdapter() : new LibraryAdapter(input.subject);

    await this.adapter.build({
      scene: this.scene,
      root: this.root
    }, input.modelUrl);

    this.applyVisibleNodes(input.visibleNodes);
    this.applyHighlightNodes(input.highlightNodes);
    this.adapter.applyLabelVisibility(this.state.showLabels);

    this.resetView();
  }

  setAutoRotate(value: boolean) {
    this.state.autoRotate = value;
    this.controls.autoRotate = value;
    this.controls.autoRotateSpeed = 0.9;
  }

  setShowLabels(value: boolean) {
    this.state.showLabels = value;
    this.adapter?.applyLabelVisibility(value);
  }

  applyVisibleNodes(visibleNodes?: string[]) {
    this.adapter?.applyVisibility(this.root, visibleNodes ?? []);
  }

  applyHighlightNodes(highlightNodes?: string[]) {
    this.adapter?.applyHighlight(this.root, highlightNodes ?? []);
  }

  resetView(camera?: ViewSnapshotResult['camera']) {
    if (camera) {
      this.setCamera(camera);
      return;
    }

    this.camera.position.set(4, 3, 5);
    this.controls.target.set(0, 1, 0);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setCamera(camera?: ViewSnapshotResult['camera']) {
    if (!camera) {
      return;
    }

    this.camera.position.set(...camera.position);
    this.controls.target.set(...camera.target);
    this.camera.zoom = camera.zoom || 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  captureViewSnapshot(): ViewSnapshotResult {
    const position = this.camera.position;
    const target = this.controls.target;

    const label = `视角(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`;

    return {
      label,
      camera: {
        position: [position.x, position.y, position.z],
        target: [target.x, target.y, target.z],
        zoom: this.camera.zoom
      }
    };
  }

  captureImage(type: string = 'image/png', quality?: number) {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL(type, quality);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.root.clear();
  }

  private animate = () => {
    this.animationFrame = window.requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    const width = this.canvas.clientWidth || 640;
    const height = this.canvas.clientHeight || 360;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
