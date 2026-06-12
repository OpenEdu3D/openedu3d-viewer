import {
  AxesHelper,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture
} from 'three';

export interface AdapterContext {
  scene: Scene;
  root: Group;
}

export abstract class BaseAdapter {
  protected labels: Object3D[] = [];

  abstract build(context: AdapterContext, modelUrl?: string): Promise<void>;

  applyVisibility(root: Group, visibleNodes: string[] = []) {
    if (!visibleNodes.length) {
      root.traverse((node) => {
        if (node !== root) {
          node.visible = true;
        }
      });
      return;
    }

    const visibleSet = new Set(visibleNodes);
    root.traverse((node) => {
      if (node === root) return;
      if (node.name.startsWith('label-')) {
        return;
      }

      node.visible = visibleSet.has(node.name) || node.type === 'AxesHelper';
    });
  }

  applyHighlight(root: Group, highlightNodes: string[] = []) {
    const highlightSet = new Set(highlightNodes);

    root.traverse((node) => {
      if (node instanceof Mesh) {
        const material = node.material as MeshPhongMaterial;
        if (!material) {
          return;
        }

        if (highlightSet.has(node.name)) {
          material.emissive = new Color('#ff9538');
          material.emissiveIntensity = 0.8;
        } else {
          material.emissive = new Color('#000000');
          material.emissiveIntensity = 0;
        }
        return;
      }

      if (node instanceof Line) {
        const material = node.material as LineBasicMaterial & { userData?: Record<string, unknown> };
        if (!material?.color) {
          return;
        }

        const originalColor = typeof material.userData?.originalColor === 'string'
          ? String(material.userData.originalColor)
          : `#${material.color.getHexString()}`;

        material.userData = {
          ...(material.userData ?? {}),
          originalColor
        };

        material.color = new Color(highlightSet.has(node.name) ? '#ff9538' : originalColor);
      }
    });
  }

  applyLabelVisibility(showLabels: boolean) {
    this.labels.forEach((item) => {
      item.visible = showLabels;
    });
  }

  protected addAxes(root: Group) {
    const axes = new AxesHelper(3);
    axes.name = '坐标轴';
    const material = axes.material as LineBasicMaterial;
    material.transparent = true;
    material.opacity = 0.64;
    material.depthWrite = false;
    root.add(axes);
  }

  protected createLabel(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) {
      return new Sprite();
    }

    context.fillStyle = 'rgba(244, 239, 234, 0.94)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#383838';
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = '#2f3134';
    context.font = '26px "IBM Plex Mono", monospace';
    context.fillText(text, 16, 42);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    const material = new SpriteMaterial({ map: texture, depthWrite: false });
    const sprite = new Sprite(material);
    sprite.scale.set(1.8, 0.45, 1);
    sprite.name = `label-${text}`;
    this.labels.push(sprite);
    return sprite;
  }
}
