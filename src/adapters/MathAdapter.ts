import {
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  GridHelper,
  MathUtils,
  Mesh,
  MeshPhongMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  ConeGeometry,
  Line,
  LineBasicMaterial,
  Vector3
} from 'three';

import { BaseAdapter, type AdapterContext } from './BaseAdapter';

export class MathAdapter extends BaseAdapter {
  async build(context: AdapterContext): Promise<void> {
    const { root } = context;

    this.addAxes(root);

    const grid = new GridHelper(10, 20, '#6e6e6e', '#b4b4b4');
    grid.name = '网格';
    root.add(grid);

    const cone = new Mesh(
      new ConeGeometry(1.6, 3.2, 48, 1, true),
      new MeshPhongMaterial({ color: '#67afe3', transparent: true, opacity: 0.88, shininess: 80, side: DoubleSide })
    );
    cone.name = '圆锥';
    cone.position.set(0, 1.6, 0);

    const sectionPlane = new Mesh(
      new PlaneGeometry(3.6, 3.6),
      new MeshPhongMaterial({ color: '#ffe500', transparent: true, opacity: 0.22, side: DoubleSide })
    );
    sectionPlane.name = '截面平面';
    sectionPlane.rotation.x = MathUtils.degToRad(-90);
    sectionPlane.position.y = 1;

    const sectionCurve = new Mesh(
      new TorusGeometry(1.1, 0.06, 16, 64),
      new MeshPhongMaterial({ color: '#ff9538' })
    );
    sectionCurve.name = '截线';
    sectionCurve.position.set(0, 1, 0);
    sectionCurve.rotation.x = MathUtils.degToRad(90);

    const curvePoints = [];
    for (let x = -1.8; x <= 1.8; x += 0.08) {
      curvePoints.push(new Vector3(x, 0.28 * x * x + 0.45, -1.65));
    }

    const functionCurveGeometry = new BufferGeometry();
    functionCurveGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(curvePoints.flatMap((point) => [point.x, point.y, point.z]), 3)
    );

    const functionCurve = new Line(
      functionCurveGeometry,
      new LineBasicMaterial({ color: '#2f3134', linewidth: 2 })
    );
    functionCurve.name = '函数曲线';

    const generatrixGeometry = new BufferGeometry();
    generatrixGeometry.setAttribute(
      'position',
      new Float32BufferAttribute([0, 3.2, 0, 1.6, 0, 0], 3)
    );

    const coneGeneratrix = new Line(
      generatrixGeometry,
      new LineBasicMaterial({ color: '#6e6e6e', linewidth: 2 })
    );
    coneGeneratrix.name = '圆锥母线';

    const vertexMarker = new Mesh(
      new SphereGeometry(0.12, 18, 18),
      new MeshPhongMaterial({ color: '#ffe500' })
    );
    vertexMarker.name = '顶点标记';
    vertexMarker.position.set(0, 0.45, -1.65);

    const labelCone = this.createLabel('圆锥');
    labelCone.position.set(1.8, 2.6, 0);

    const labelSection = this.createLabel('z=1 截面');
    labelSection.position.set(-1.7, 1.25, 0.2);

    const labelCurve = this.createLabel('函数曲线');
    labelCurve.position.set(1.1, 1.55, -1.65);

    const labelGeneratrix = this.createLabel('圆锥母线');
    labelGeneratrix.position.set(1.65, 1.8, 0.25);

    root.add(cone);
    root.add(coneGeneratrix);
    root.add(sectionPlane);
    root.add(sectionCurve);
    root.add(functionCurve);
    root.add(vertexMarker);
    root.add(labelCone);
    root.add(labelSection);
    root.add(labelCurve);
    root.add(labelGeneratrix);
  }
}
