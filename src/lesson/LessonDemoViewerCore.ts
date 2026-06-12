import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Clock,
  Color,
  ConeGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TubeGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type {
  LessonDemoResource,
  SceneAnimation,
  SceneCamera,
  SceneLight,
  SceneMaterial,
  SceneObject,
  Vector3Tuple
} from '../types';

type TransformSnapshot = {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
};

function cloneCamera(camera: SceneCamera): SceneCamera {
  return {
    position: [...camera.position] as [number, number, number],
    target: [...camera.target] as [number, number, number],
    fov: camera.fov,
    zoom: camera.zoom
  };
}

function toHex(color: string): string {
  return color.startsWith('#') ? color : `#${color}`;
}

export class LessonDemoViewerCore {
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly root = new Group();
  private readonly lightRoot = new Group();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly clock = new Clock();

  private readonly objectMap = new Map<string, Mesh | Line | Sprite | AxesHelper | GridHelper>();
  private readonly animationMap = new Map<string, SceneAnimation>();
  private readonly transformMap = new Map<string, TransformSnapshot>();
  private readonly interactiveObjects: Array<Mesh | Line> = [];
  private readonly defaultLineColors = new Map<string, string>();
  private readonly defaultMeshEmissive = new Map<string, string>();

  private animationFrame = 0;
  private animationTime = 0;
  private playing = false;
  private activeAnimationIds = new Set<string>();
  private activeResource: LessonDemoResource | null = null;
  private activeStepIndex = 0;
  private onObjectSelect?: (objectId: string) => void;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(5, 4, 6);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.2, 0);

    this.scene.background = new Color('#f7f9fc');
    this.scene.add(this.root);
    this.scene.add(this.lightRoot);

    this.canvas.addEventListener('click', this.handleClick);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(canvas);
    this.resize();

    this.animate();
  }

  load(resource: LessonDemoResource, stepIndex = 0) {
    this.activeResource = resource;
    this.activeStepIndex = Math.max(0, Math.min(stepIndex, resource.steps.length - 1));
    this.objectMap.clear();
    this.animationMap.clear();
    this.transformMap.clear();
    this.interactiveObjects.length = 0;
    this.defaultLineColors.clear();
    this.defaultMeshEmissive.clear();

    this.root.clear();
    this.lightRoot.clear();

    resource.scene.lights.forEach((light) => {
      this.lightRoot.add(this.createLight(light));
    });

    const materialMap = new Map(resource.scene.materials.map((item) => [item.id, item]));
    resource.animations.forEach((animation) => {
      this.animationMap.set(animation.id, animation);
    });

    resource.scene.objects.forEach((object) => {
      const built = this.buildObject(object, materialMap.get(object.materialId || ''));

      if (!built) {
        return;
      }

      this.root.add(built);
      this.objectMap.set(object.id, built);
      this.transformMap.set(object.id, {
        position: [built.position.x, built.position.y, built.position.z],
        rotation: [built.rotation.x, built.rotation.y, built.rotation.z],
        scale: [built.scale.x, built.scale.y, built.scale.z]
      });

      if ((built instanceof Mesh || built instanceof Line) && object.clickable) {
        built.userData.objectId = object.id;
        built.traverse((node) => {
          if (node !== built && (node instanceof Mesh || node instanceof Line)) {
            node.userData.objectId = object.id;
          }
        });
        this.interactiveObjects.push(built);
      }
    });

    this.applyStep(this.activeStepIndex);
  }

  setPlaying(value: boolean) {
    this.playing = value;
  }

  setObjectSelectHandler(handler?: (objectId: string) => void) {
    this.onObjectSelect = handler;
  }

  captureImage(type: string = 'image/png', quality?: number) {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL(type, quality);
  }

  applyStep(stepIndex: number) {
    if (!this.activeResource) {
      return;
    }

    const step = this.activeResource.steps[stepIndex];
    if (!step) {
      return;
    }

    this.activeStepIndex = stepIndex;
    const visibleSet = new Set(step.visibleObjectIds);
    const highlightSet = new Set(step.highlightedObjectIds);

    this.objectMap.forEach((object, objectId) => {
      object.visible = visibleSet.has(objectId) || object instanceof AxesHelper || object instanceof GridHelper;
      this.resetObjectAppearance(object, objectId);
      this.applyHighlight(object, objectId, highlightSet.has(objectId));
      this.resetObjectTransform(object, objectId);
    });

    this.activeAnimationIds = new Set(step.animationIds);
    this.setCamera(step.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.canvas.removeEventListener('click', this.handleClick);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.root.clear();
    this.lightRoot.clear();
  }

  private animate = () => {
    this.animationFrame = window.requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    if (this.playing) {
      this.animationTime += delta;
      this.updateAnimations();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateAnimations() {
    this.activeAnimationIds.forEach((animationId) => {
      const animation = this.animationMap.get(animationId);
      const object = animation ? this.objectMap.get(animation.objectId) : null;
      const base = animation ? this.transformMap.get(animation.objectId) : null;

      if (!animation || !object || !base) {
        return;
      }

      const speed = animation.speed || 1;
      const amplitude = animation.amplitude || 0.1;
      const t = this.animationTime * speed;

      if (animation.kind === 'spin') {
        const axisY = animation.axis?.[1] ?? 1;
        object.rotation.y = base.rotation[1] + t * axisY;
        return;
      }

      if (animation.kind === 'pulse') {
        const factor = 1 + Math.sin(t * 2) * amplitude;
        object.scale.set(base.scale[0] * factor, base.scale[1] * factor, base.scale[2] * factor);
        return;
      }

      if (animation.kind === 'float') {
        object.position.y = base.position[1] + Math.sin(t * 1.8) * amplitude;
        return;
      }

      if (animation.kind === 'orbit' && animation.center && animation.radius) {
        object.position.x = animation.center[0] + Math.cos(t) * animation.radius;
        object.position.z = animation.center[2] + Math.sin(t) * animation.radius;
        object.position.y = animation.center[1];
        return;
      }

      if (animation.kind === 'parabola-travel') {
        const range = animation.xRange || [-3, 3];
        const cycle = Math.PI * 2;
        const progress = ((t % cycle) + cycle) % cycle / cycle;
        const x = range[0] + progress * (range[1] - range[0]);
        const [a, b, c] = animation.quadratic || [0.22, 0, 0.65];
        object.position.x = x;
        object.position.y = a * x * x + b * x + c;
        object.position.z = base.position[2];
        return;
      }

      if (animation.kind === 'sine-wave-travel') {
        const bounds = animation.xRange || [-(animation.amplitude || 6), animation.amplitude || 6];
        const cycle = Math.PI * 2;
        const progress = ((t % cycle) + cycle) % cycle / cycle;
        const x = bounds[0] + progress * (bounds[1] - bounds[0]);
        object.position.x = x;
        object.position.y = (animation.amplitude || 1) * Math.sin((animation.frequency || 1) * x + (animation.phaseShift || 0)) + (animation.verticalShift || 0);
        object.position.z = base.position[2];
        return;
      }

      if (animation.kind === 'curve-travel' && animation.pathPoints?.length) {
        const points = animation.pathPoints;
        const cycle = Math.max(points.length - 1, 1);
        const progress = ((t % cycle) + cycle) % cycle;
        const leftIndex = Math.floor(progress);
        const rightIndex = Math.min(leftIndex + 1, points.length - 1);
        const blend = progress - leftIndex;
        const left = points[leftIndex];
        const right = points[rightIndex];
        object.position.x = MathUtils.lerp(left[0], right[0], blend);
        object.position.y = MathUtils.lerp(left[1], right[1], blend);
        object.position.z = MathUtils.lerp(left[2], right[2], blend);
      }
    });
  }

  private resetObjectTransform(object: Mesh | Line | Sprite | AxesHelper | GridHelper, objectId: string) {
    const base = this.transformMap.get(objectId);
    if (!base) {
      return;
    }

    object.position.set(...base.position);
    object.rotation.set(...base.rotation);
    object.scale.set(...base.scale);
  }

  private createLight(light: SceneLight) {
    if (light.type === 'ambient') {
      return new AmbientLight(light.color, light.intensity);
    }

    if (light.type === 'point') {
      const point = new PointLight(light.color, light.intensity);
      if (light.position) {
        point.position.set(...light.position);
      }
      return point;
    }

    const directional = new DirectionalLight(light.color, light.intensity);
    if (light.position) {
      directional.position.set(...light.position);
    }
    return directional;
  }

  private buildObject(object: SceneObject, material?: SceneMaterial) {
    if (object.shape === 'axes') {
      const axes = new AxesHelper(object.dimensions?.size || 3);
      axes.position.set(...(object.position || [0, 0, 0]));
      const material = axes.material as LineBasicMaterial;
      material.transparent = true;
      material.opacity = 0.64;
      material.depthWrite = false;
      return axes;
    }

    if (object.shape === 'grid') {
      const grid = new GridHelper(
        object.dimensions?.size || 10,
        object.dimensions?.divisions || 20,
        '#a7b2bd',
        '#dbe3ea'
      );
      grid.position.set(...(object.position || [0, 0, 0]));
      const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
      materials.forEach((item) => {
        item.transparent = true;
        item.opacity = 0.42;
        item.depthWrite = false;
      });
      return grid;
    }

    if (object.shape === 'label') {
      const sprite = this.createLabelSprite(object.text || object.name);
      sprite.position.set(...(object.position || [0, 0, 0]));
      return sprite;
    }

    if (object.shape === 'line') {
      const geometry = new BufferGeometry();
      const lineColor = toHex(material?.color || '#2f3134');
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute((object.points || []).flatMap((point) => point), 3)
      );
      const lineMaterial = new LineBasicMaterial({ color: lineColor });
      const line = new Line(geometry, lineMaterial);
      line.position.set(...(object.position || [0, 0, 0]));
      line.rotation.set(...(object.rotation || [0, 0, 0]));
      line.scale.set(...(object.scale || [1, 1, 1]));
      this.attachLineTube(line, object, material, lineColor);
      this.defaultLineColors.set(object.id, lineColor);
      return line;
    }

    const meshMaterial = new MeshPhongMaterial({
      color: toHex(material?.color || '#67afe3'),
      transparent: !!material?.transparent || typeof material?.opacity === 'number',
      opacity: typeof material?.opacity === 'number' ? material.opacity : 1,
      wireframe: !!material?.wireframe
    });
    if (material?.emissive) {
      meshMaterial.emissive = new Color(material.emissive);
      meshMaterial.emissiveIntensity = 0.2;
      this.defaultMeshEmissive.set(object.id, material.emissive);
    }

    let mesh: Mesh | null = null;

    if (object.shape === 'sphere') {
      mesh = new Mesh(
        new SphereGeometry(
          object.dimensions?.radius || 0.5,
          object.dimensions?.widthSegments || 20,
          object.dimensions?.heightSegments || 20
        ),
        meshMaterial
      );
    } else if (object.shape === 'box') {
      mesh = new Mesh(
        new BoxGeometry(
          object.dimensions?.width || 1,
          object.dimensions?.height || 1,
          object.dimensions?.depth || 1
        ),
        meshMaterial
      );
    } else if (object.shape === 'plane') {
      mesh = new Mesh(
        new PlaneGeometry(object.dimensions?.width || 1, object.dimensions?.height || 1),
        meshMaterial
      );
    } else if (object.shape === 'cone') {
      mesh = new Mesh(
        new ConeGeometry(
          object.dimensions?.radius || 1,
          object.dimensions?.height || 2,
          object.dimensions?.radialSegments || 24,
          1,
          !!object.dimensions?.openEnded
        ),
        meshMaterial
      );
    } else if (object.shape === 'cylinder') {
      mesh = new Mesh(
        new ConeGeometry(
          object.dimensions?.radiusTop || object.dimensions?.radius || 0.5,
          object.dimensions?.height || 2,
          object.dimensions?.radialSegments || 24
        ),
        meshMaterial
      );
    } else if (object.shape === 'torus') {
      mesh = new Mesh(
        new TorusGeometry(
          object.dimensions?.radius || 0.8,
          object.dimensions?.tube || 0.08,
          object.dimensions?.radialSegments || 12,
          object.dimensions?.tubularSegments || 48,
          object.dimensions?.arc || Math.PI * 2
        ),
        meshMaterial
      );
    }

    if (!mesh) {
      return null;
    }

    mesh.position.set(...(object.position || [0, 0, 0]));
    mesh.rotation.set(...(object.rotation || [0, 0, 0]));
    mesh.scale.set(...(object.scale || [1, 1, 1]));
    return mesh;
  }

  private createLabelSprite(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const context = canvas.getContext('2d');

    if (!context) {
      return new Sprite();
    }

    context.fillStyle = 'rgba(244, 239, 234, 0.96)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#2f3134';
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = '#2f3134';
    context.font = '28px "IBM Plex Mono", monospace';
    context.fillText(text, 18, 48);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    const material = new SpriteMaterial({ map: texture, depthWrite: false });
    const sprite = new Sprite(material);
    sprite.scale.set(2.4, 0.62, 1);
    return sprite;
  }

  private attachLineTube(line: Line, object: SceneObject, material: SceneMaterial | undefined, fallbackColor: string) {
    const renderStyle = object.metadata?.renderStyle;
    const radiusValue = Number(object.metadata?.tubeRadius ?? 0);
    const points = object.points || [];

    if (renderStyle !== 'tube' || !Number.isFinite(radiusValue) || radiusValue <= 0 || points.length < 2) {
      return;
    }

    const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
    const tubularSegments = Math.max(24, Math.min(180, Math.round(points.length * 2.4)));
    const tubeMaterial = new MeshPhongMaterial({
      color: fallbackColor,
      transparent: !!material?.transparent || typeof material?.opacity === 'number',
      opacity: typeof material?.opacity === 'number' ? material.opacity : 1
    });

    if (material?.emissive) {
      tubeMaterial.emissive = new Color(material.emissive);
      tubeMaterial.emissiveIntensity = 0.22;
    }

    const tube = new Mesh(
      new TubeGeometry(path, tubularSegments, radiusValue, 14, false),
      tubeMaterial
    );
    tube.userData.isLineTube = true;
    tube.userData.baseColor = fallbackColor;
    tube.userData.baseEmissive = material?.emissive || '#000000';
    line.add(tube);
  }

  private getLineTubeMesh(line: Line) {
    const tube = line.children.find((child) => child instanceof Mesh && child.userData?.isLineTube);
    return tube instanceof Mesh ? tube : null;
  }

  private resetObjectAppearance(object: Mesh | Line | Sprite | AxesHelper | GridHelper, objectId: string) {
    if (object instanceof Mesh) {
      const material = object.material as MeshPhongMaterial;
      material.emissive = new Color(this.defaultMeshEmissive.get(objectId) || '#000000');
      material.emissiveIntensity = this.defaultMeshEmissive.has(objectId) ? 0.2 : 0;
      return;
    }

    if (object instanceof Line) {
      const material = object.material as LineBasicMaterial;
      material.color = new Color(this.defaultLineColors.get(objectId) || '#2f3134');

      const tube = this.getLineTubeMesh(object);
      if (tube) {
        const tubeMaterial = tube.material as MeshPhongMaterial;
        tubeMaterial.color = new Color(String(tube.userData.baseColor || this.defaultLineColors.get(objectId) || '#2f3134'));
        tubeMaterial.emissive = new Color(String(tube.userData.baseEmissive || '#000000'));
        tubeMaterial.emissiveIntensity = tube.userData.baseEmissive && tube.userData.baseEmissive !== '#000000' ? 0.22 : 0;
      }
    }
  }

  private applyHighlight(object: Mesh | Line | Sprite | AxesHelper | GridHelper, objectId: string, active: boolean) {
    if (!active) {
      return;
    }

    if (object instanceof Mesh) {
      const material = object.material as MeshPhongMaterial;
      material.emissive = new Color('#ff9538');
      material.emissiveIntensity = 0.82;
      return;
    }

    if (object instanceof Line) {
      const material = object.material as LineBasicMaterial;
      material.color = new Color('#ff9538');

      const tube = this.getLineTubeMesh(object);
      if (tube) {
        const tubeMaterial = tube.material as MeshPhongMaterial;
        tubeMaterial.color = new Color('#ff8e45');
        tubeMaterial.emissive = new Color('#ffbc78');
        tubeMaterial.emissiveIntensity = 0.48;
      }
      return;
    }

    if (objectId) {
      object.scale.multiplyScalar(1.08);
    }
  }

  private setCamera(cameraState: SceneCamera) {
    const next = cloneCamera(cameraState);
    this.camera.position.set(...next.position);
    this.camera.fov = next.fov;
    this.camera.zoom = next.zoom || 1;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(...next.target);
    this.controls.update();
  }

  private handleClick = (event: MouseEvent) => {
    if (!this.interactiveObjects.length) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.params.Line.threshold = 0.15;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (!intersections.length) {
      return;
    }

    const objectId = intersections[0]?.object?.userData?.objectId;
    if (typeof objectId === 'string' && objectId) {
      this.onObjectSelect?.(objectId);
    }
  };

  private resize() {
    const width = this.canvas.clientWidth || 640;
    const height = this.canvas.clientHeight || 420;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
