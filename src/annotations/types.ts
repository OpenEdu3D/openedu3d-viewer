/** The ID identifies an unchanged model structure, independently of its URL. */
export interface AnnotationModelSource {
  id: string;
  source: string | File;
}

export interface ModelLoadEvent {
  modelId: string;
  nodePaths: string[];
}

export type AnnotationViewerErrorCode =
  | 'load-failed'
  | 'unsupported-model'
  | 'invalid-model'
  | 'webgl-unavailable'
  | 'invalid-annotations';

export interface AnnotationViewerError {
  code: AnnotationViewerErrorCode;
  message: string;
  modelId?: string;
}

export interface ModelAnnotationViewerExpose {
  resetView(): void;
  focusAnnotation(id: string): void;
}

export interface AnnotationAnchor {
  nodePath: string;
  position: [number, number, number];
  normal: [number, number, number];
}

export interface ModelAnnotation {
  id: string;
  modelId: string;
  anchor: AnnotationAnchor;
  title: string;
  description: string;
}
