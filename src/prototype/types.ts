// PROTOTYPE data shape; not a committed public API.
export interface Annotation {
  id: string;
  meshName: string;
  localPosition: [number, number, number];
  localNormal: [number, number, number];
  title: string;
  description: string;
}

export interface ViewerStatus {
  camera: number[];
  target: number[];
  visibleIds: string[];
  occludedIds: string[];
  meshes: string[];
}
