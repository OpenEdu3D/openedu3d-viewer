import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhongMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { Subject } from '../types';

import { BaseAdapter, type AdapterContext } from './BaseAdapter';

function buildMethane(root: Group) {
  const center = new Mesh(new SphereGeometry(0.32, 28, 28), new MeshPhongMaterial({ color: '#1f2937', emissive: '#556170', emissiveIntensity: 0.2 }));
  center.name = '中心原子';
  root.add(center);

  const points = [
    new Vector3(1, 1, 1),
    new Vector3(-1, -1, 1),
    new Vector3(1, -1, -1),
    new Vector3(-1, 1, -1)
  ].map((v) => v.normalize().multiplyScalar(1.2));

  points.forEach((point, index) => {
    const hydrogen = new Mesh(new SphereGeometry(0.24, 20, 20), new MeshPhongMaterial({ color: '#38bdf8', emissive: '#8bdcff', emissiveIntensity: 0.18 }));
    hydrogen.position.copy(point);
    hydrogen.name = `外围原子-${index + 1}`;

    const bond = new Mesh(new CylinderGeometry(0.07, 0.07, point.length(), 20), new MeshPhongMaterial({ color: '#ff7a1a', emissive: '#ffb37a', emissiveIntensity: 0.16 }));
    bond.name = `化学键-${index + 1}`;
    bond.position.copy(point.clone().multiplyScalar(0.5));
    bond.lookAt(point);
    bond.rotateX(Math.PI / 2);

    root.add(hydrogen);
    root.add(bond);
  });

  const guideGeometry = new BufferGeometry();
  guideGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      points.flatMap((point) => [0, 0, 0, point.x, point.y, point.z]),
      3
    )
  );

  const guideLines = new LineSegments(
    guideGeometry,
    new LineBasicMaterial({ color: '#94a3b8', linewidth: 2 })
  );
  guideLines.name = '构型辅助线';
  root.add(guideLines);

  const angleMarker = new Mesh(
    new TorusGeometry(0.46, 0.055, 12, 36, Math.PI / 2.8),
    new MeshPhongMaterial({ color: '#ffd43b', emissive: '#ffe48a', emissiveIntensity: 0.2 })
  );
  angleMarker.name = '键角标记';
  angleMarker.position.set(0.18, 0.22, 0.18);
  angleMarker.rotation.set(0.8, 0.3, 0.5);
  root.add(angleMarker);
}

function buildCell(root: Group) {
  const cellWall = new Mesh(new SphereGeometry(1.72, 42, 42), new MeshPhongMaterial({ color: '#84cc16', emissive: '#c5f26b', emissiveIntensity: 0.12, transparent: true, opacity: 0.16 }));
  cellWall.name = '细胞壁';

  const membrane = new Mesh(new SphereGeometry(1.5, 42, 42), new MeshPhongMaterial({ color: '#22c55e', emissive: '#86efac', emissiveIntensity: 0.12, transparent: true, opacity: 0.22 }));
  membrane.name = '细胞膜';

  const nucleus = new Mesh(new SphereGeometry(0.6, 24, 24), new MeshPhongMaterial({ color: '#ff7a1a', emissive: '#ffbc8a', emissiveIntensity: 0.18 }));
  nucleus.name = '细胞核';
  nucleus.position.set(0.4, 0.15, 0.25);

  const organelleA = new Mesh(new SphereGeometry(0.26, 20, 20), new MeshPhongMaterial({ color: '#f97316', emissive: '#fdba74', emissiveIntensity: 0.18 }));
  organelleA.name = '线粒体';
  organelleA.position.set(-0.7, -0.2, 0.2);

  const organelleB = new Mesh(new SphereGeometry(0.23, 20, 20), new MeshPhongMaterial({ color: '#16a34a', emissive: '#86efac', emissiveIntensity: 0.16 }));
  organelleB.name = '叶绿体';
  organelleB.position.set(0.6, -0.45, -0.4);

  const cytoplasm = new Mesh(
    new SphereGeometry(1.18, 38, 38),
    new MeshPhongMaterial({ color: '#e7f7df', transparent: true, opacity: 0.74 })
  );
  cytoplasm.name = '细胞质';

  const vacuole = new Mesh(
    new SphereGeometry(0.34, 20, 20),
    new MeshPhongMaterial({ color: '#60a5fa', emissive: '#93c5fd', emissiveIntensity: 0.16, transparent: true, opacity: 0.54 })
  );
  vacuole.name = '液泡';
  vacuole.position.set(-0.15, 0.52, -0.2);

  root.add(cellWall, membrane, cytoplasm, nucleus, organelleA, organelleB, vacuole);
}

export class LibraryAdapter extends BaseAdapter {
  private loader = new GLTFLoader();

  constructor(private readonly subject: Subject) {
    super();
  }

  async build(context: AdapterContext, modelUrl?: string): Promise<void> {
    const { root } = context;

    this.addAxes(root);

    if (modelUrl) {
      try {
        const gltf = await this.loader.loadAsync(modelUrl);
        gltf.scene.name = '外部模型';
        root.add(gltf.scene);
      } catch {
        this.buildFallback(root);
      }
    } else {
      this.buildFallback(root);
    }

    const labelA = this.createLabel(this.subject === 'chemistry' ? '分子构型' : '结构分层');
    labelA.position.set(1.8, 1.8, 0);

    const labelB = this.createLabel(this.subject === 'chemistry' ? '球棍视图' : '可讲解节点');
    labelB.position.set(-1.7, -0.2, 0);

    root.add(labelA, labelB);
  }

  private buildFallback(root: Group) {
    if (this.subject === 'chemistry') {
      buildMethane(root);
      return;
    }

    buildCell(root);
  }
}
