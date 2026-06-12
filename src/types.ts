export type Subject = 'math' | 'biology' | 'chemistry';
export type ViewerMode = 'create' | 'preview' | 'edit' | 'present';

export interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface ViewerSceneInput {
  mode: ViewerMode;
  subject: Subject;
  title?: string;
  summary?: string;
  modelUrl?: string;
  visibleNodes?: string[];
  highlightNodes?: string[];
}

export interface ViewerState {
  mode: ViewerMode;
  autoRotate: boolean;
  showLabels: boolean;
}

export interface ViewSnapshotResult {
  label: string;
  camera: CameraSnapshot;
}

export interface ViewerExpose {
  resetView(camera?: CameraSnapshot): void;
  captureViewSnapshot(): ViewSnapshotResult;
}

export interface ViewerBaseProps {
  mode: ViewerMode;
  subject?: Subject;
  modelUrl?: string;
  autoRotate?: boolean;
  showLabels?: boolean;
  visibleNodes?: string[];
  highlightNodes?: string[];
  highlightedObject?: string;
  cameraState?: CameraSnapshot;
}

export interface DetailViewerProps extends ViewerBaseProps {
  title?: string;
  subtitle?: string;
  minHeight?: number;
  showOverlay?: boolean;
}

export interface CardViewerProps {
  subject?: Subject;
  modelUrl?: string;
  title?: string;
  subtitle?: string;
  minHeight?: number;
  autoRotate?: boolean;
  showLabels?: boolean;
  highlightNodes?: string[];
  highlightedObject?: string;
}

export interface ViewerPlaygroundPreset {
  id: string;
  label: string;
  subject: Subject;
  title: string;
  subtitle: string;
  cardTitle?: string;
  cardSubtitle?: string;
  availableNodes: string[];
  visibleNodes: string[];
  highlightNodes: string[];
  cameraState: CameraSnapshot;
  modelUrl?: string;
}

export interface StepCard {
  id: string;
  title: string;
  viewSnapshot: string;
  visibleObjects: string[];
  highlightedObject: string;
  highlightNodes?: string[];
  tags: string[];
  narration: string;
  version: number;
  cameraState?: CameraSnapshot;
}

export interface SceneMaterial {
  id: string;
  label: string;
  color: string;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  emissive?: string;
}

export type SceneObjectShape =
  | 'axes'
  | 'grid'
  | 'sphere'
  | 'box'
  | 'plane'
  | 'cone'
  | 'cylinder'
  | 'torus'
  | 'line'
  | 'label';

export type Vector3Tuple = [number, number, number];

export interface SceneObject {
  id: string;
  name: string;
  shape: SceneObjectShape;
  materialId?: string;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: Vector3Tuple;
  visible?: boolean;
  clickable?: boolean;
  teachingNote?: string;
  points?: Vector3Tuple[];
  dimensions?: Record<string, number>;
  text?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SceneLight {
  id: string;
  type: 'ambient' | 'directional' | 'point';
  color: string;
  intensity: number;
  position?: Vector3Tuple;
}

export interface SceneCamera {
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  zoom: number;
}

export type SceneAnimationKind =
  | 'spin'
  | 'pulse'
  | 'float'
  | 'orbit'
  | 'parabola-travel'
  | 'sine-wave-travel'
  | 'curve-travel';

export interface SceneAnimation {
  id: string;
  objectId: string;
  kind: SceneAnimationKind;
  speed: number;
  amplitude?: number;
  frequency?: number;
  phaseShift?: number;
  verticalShift?: number;
  axis?: Vector3Tuple;
  center?: Vector3Tuple;
  radius?: number;
  quadratic?: [number, number, number];
  xRange?: [number, number];
  pathPoints?: Vector3Tuple[];
  activeStepIds?: string[];
}

export interface SceneStepState {
  stepId: string;
  visibleObjectIds: string[];
  highlightedObjectIds: string[];
  camera: SceneCamera;
  animationIds: string[];
}

export interface SceneBlueprint {
  materials: SceneMaterial[];
  objects: SceneObject[];
  lights: SceneLight[];
  camera: SceneCamera;
  animations: SceneAnimation[];
  stepStates: SceneStepState[];
}

export interface InteractionConfig {
  id: string;
  type: 'play' | 'pause' | 'next-step' | 'previous-step' | 'select-object' | 'jump-to-step';
  label: string;
  description: string;
  targetId?: string;
}

export interface NarrationTrack {
  stepId: string;
  text: string;
}

export interface ExportMeta {
  generator: 'local-rule-based' | 'backend-llm-assisted';
  generatedAt: string;
  runtimeComponent: string;
  schemaVersion: string;
  dslVersion?: string;
  mathFamily?: string;
  supportLevel?: string;
  builderNotes: string[];
  supportedExtensions: string[];
}

export interface ReviewSummary {
  ready: boolean;
  overallScore: number;
  dimensionScores: {
    pedagogy: number;
    runtime: number;
    performance: number;
    structure: number;
  };
  strengths: string[];
  warnings: string[];
}

export interface LessonStep {
  id: string;
  title: string;
  teachingFocus: string;
  narration: string;
  durationMs: number;
  visibleObjectIds: string[];
  highlightedObjectIds: string[];
  animationIds: string[];
  camera: SceneCamera;
}

export interface LessonDemoResource {
  id: string;
  lessonTitle: string;
  subject: Subject;
  gradeLevel: string;
  teachingGoals: string[];
  steps: LessonStep[];
  scene: {
    materials: SceneMaterial[];
    objects: SceneObject[];
    lights: SceneLight[];
    camera: SceneCamera;
  };
  animations: SceneAnimation[];
  interactions: InteractionConfig[];
  narration: NarrationTrack[];
  exportMeta: ExportMeta;
  review: ReviewSummary;
}
