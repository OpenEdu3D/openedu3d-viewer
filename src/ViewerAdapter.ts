import type { CameraSnapshot, ViewerMode, ViewerState } from './types';

export type { ViewerMode, ViewerState } from './types';

export interface ViewerAdapter {
  readonly state: ViewerState;
  setMode(mode: ViewerMode): void;
  setAutoRotate(value: boolean): void;
  setShowLabels(value: boolean): void;
  resetView(): void;
  captureView(): CameraSnapshot;
}

export class LocalViewerAdapter implements ViewerAdapter {
  state: ViewerState;
  private camera: CameraSnapshot = {
    position: [4, 3, 5],
    target: [0, 1, 0],
    zoom: 1
  };

  constructor(mode: ViewerMode) {
    this.state = {
      mode,
      autoRotate: false,
      showLabels: true
    };
  }

  setMode(mode: ViewerMode): void {
    this.state.mode = mode;
  }

  setAutoRotate(value: boolean): void {
    this.state.autoRotate = value;
  }

  setShowLabels(value: boolean): void {
    this.state.showLabels = value;
  }

  resetView(): void {
    this.camera = {
      position: [4, 3, 5],
      target: [0, 1, 0],
      zoom: 1
    };
  }

  captureView(): CameraSnapshot {
    return this.camera;
  }
}
