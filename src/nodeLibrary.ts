import type { StepCard, Subject } from './types';

export interface SubjectStepTemplate {
  title: string;
  viewSnapshot: string;
  visibleObjects: string[];
  highlightedObject: string;
  highlightNodes: string[];
  tags: string[];
  narration: string;
  cameraState?: StepCard['cameraState'];
}

export const SUBJECT_NODE_LIBRARY: Record<Subject, string[]> = {
  math: ['坐标轴', '网格', '圆锥', '圆锥母线', '截面平面', '截线', '函数曲线', '顶点标记'],
  biology: ['坐标轴', '细胞壁', '细胞膜', '细胞质', '细胞核', '线粒体', '叶绿体', '液泡'],
  chemistry: ['坐标轴', '中心原子', '外围原子-1', '外围原子-2', '外围原子-3', '外围原子-4', '化学键-1', '化学键-2', '化学键-3', '化学键-4', '构型辅助线', '键角标记']
};

export const SUBJECT_STEP_TEMPLATES: Record<Subject, SubjectStepTemplate[]> = {
  math: [
    {
      title: '整体观察圆锥与坐标系',
      viewSnapshot: '正视图',
      visibleObjects: ['坐标轴', '网格', '圆锥', '圆锥母线'],
      highlightedObject: '圆锥',
      highlightNodes: ['圆锥'],
      tags: ['整体', '空间图形'],
      narration: '先确认圆锥、母线与坐标系的位置关系。'
    },
    {
      title: '放置截面平面',
      viewSnapshot: '侧上方',
      visibleObjects: ['坐标轴', '网格', '圆锥', '圆锥母线', '截面平面'],
      highlightedObject: '截面平面',
      highlightNodes: ['截面平面'],
      tags: ['截面', '平面'],
      narration: '引入截面平面，说明它与圆锥的交会方式。'
    },
    {
      title: '观察截线形态',
      viewSnapshot: '局部聚焦',
      visibleObjects: ['坐标轴', '网格', '圆锥', '截面平面', '截线'],
      highlightedObject: '截线',
      highlightNodes: ['截线'],
      tags: ['截线', '空间关系'],
      narration: '聚焦截线，说明截线如何由平面与立体相交得到。'
    },
    {
      title: '对照函数曲线与顶点',
      viewSnapshot: '函数对照',
      visibleObjects: ['坐标轴', '网格', '函数曲线', '顶点标记'],
      highlightedObject: '函数曲线',
      highlightNodes: ['函数曲线'],
      tags: ['函数图像', '顶点'],
      narration: '把空间截线和函数曲线联系起来，强调顶点位置与形态特征。'
    }
  ],
  biology: [
    {
      title: '识别细胞边界',
      viewSnapshot: '全局视图',
      visibleObjects: ['坐标轴', '细胞壁', '细胞膜', '细胞质'],
      highlightedObject: '细胞壁',
      highlightNodes: ['细胞壁'],
      tags: ['边界', '整体'],
      narration: '先区分细胞壁、细胞膜和细胞质的层次关系。'
    },
    {
      title: '聚焦细胞核',
      viewSnapshot: '核心结构',
      visibleObjects: ['坐标轴', '细胞壁', '细胞膜', '细胞质', '细胞核'],
      highlightedObject: '细胞核',
      highlightNodes: ['细胞核'],
      tags: ['核心结构', '细胞核'],
      narration: '突出细胞核在细胞中的位置与核心调控作用。'
    },
    {
      title: '观察供能与光合作用结构',
      viewSnapshot: '细胞器分区',
      visibleObjects: ['坐标轴', '细胞膜', '细胞质', '线粒体', '叶绿体'],
      highlightedObject: '叶绿体',
      highlightNodes: ['叶绿体'],
      tags: ['细胞器', '功能'],
      narration: '对比线粒体和叶绿体，说明不同细胞器对应的生命活动。'
    },
    {
      title: '说明液泡与内部空间分区',
      viewSnapshot: '内部空间',
      visibleObjects: ['坐标轴', '细胞膜', '细胞质', '液泡', '细胞核'],
      highlightedObject: '液泡',
      highlightNodes: ['液泡'],
      tags: ['液泡', '空间分区'],
      narration: '补充液泡与内部空间分区，帮助教师完成结构层级总结。'
    }
  ],
  chemistry: [
    {
      title: '展示整体构型',
      viewSnapshot: '整体构型',
      visibleObjects: ['坐标轴', '中心原子', '外围原子-1', '外围原子-2', '外围原子-3', '外围原子-4', '化学键-1', '化学键-2', '化学键-3', '化学键-4', '构型辅助线'],
      highlightedObject: '中心原子',
      highlightNodes: ['中心原子'],
      tags: ['整体', '构型'],
      narration: '先确认中心原子与四个外围原子的整体空间构型。'
    },
    {
      title: '聚焦第一根化学键',
      viewSnapshot: '局部聚焦',
      visibleObjects: ['坐标轴', '中心原子', '外围原子-1', '化学键-1', '构型辅助线'],
      highlightedObject: '化学键-1',
      highlightNodes: ['化学键-1'],
      tags: ['化学键', '局部观察'],
      narration: '聚焦第一根化学键，说明键方向如何决定空间分布。'
    },
    {
      title: '说明四面体空间分布',
      viewSnapshot: '空间辅助',
      visibleObjects: ['坐标轴', '中心原子', '外围原子-1', '外围原子-2', '外围原子-3', '外围原子-4', '构型辅助线'],
      highlightedObject: '构型辅助线',
      highlightNodes: ['构型辅助线'],
      tags: ['四面体', '空间关系'],
      narration: '利用辅助线强调四面体构型中各原子的空间分布。'
    },
    {
      title: '标注键角结论',
      viewSnapshot: '键角标注',
      visibleObjects: ['坐标轴', '中心原子', '外围原子-1', '外围原子-2', '化学键-1', '化学键-2', '键角标记'],
      highlightedObject: '键角标记',
      highlightNodes: ['键角标记'],
      tags: ['键角', '结论'],
      narration: '用键角标记收束讲解，给出本节课的结构结论。'
    }
  ]
};

export function getSubjectNodeLibrary(subject: Subject): string[] {
  return SUBJECT_NODE_LIBRARY[subject];
}

export function buildRecommendedSteps(subject: Subject, seed = `step-local-${Date.now()}`): StepCard[] {
  return SUBJECT_STEP_TEMPLATES[subject].map((template, index) => ({
    id: `${seed}-${index + 1}`,
    title: template.title,
    viewSnapshot: template.viewSnapshot,
    visibleObjects: [...template.visibleObjects],
    highlightedObject: template.highlightedObject,
    highlightNodes: [...template.highlightNodes],
    tags: [...template.tags],
    narration: template.narration,
    version: 1,
    cameraState: template.cameraState
  }));
}

export function buildDraftStep(subject: Subject, index: number): StepCard {
  const templates = SUBJECT_STEP_TEMPLATES[subject];
  const selected = templates[Math.min(index - 1, templates.length - 1)];

  return {
    id: `step-local-${Date.now()}-${index}`,
    title: selected?.title ?? `步骤 ${index}`,
    viewSnapshot: selected?.viewSnapshot ?? '当前视角',
    visibleObjects: [...(selected?.visibleObjects ?? SUBJECT_NODE_LIBRARY[subject])],
    highlightedObject: selected?.highlightedObject ?? SUBJECT_NODE_LIBRARY[subject][0] ?? '',
    highlightNodes: [...(selected?.highlightNodes ?? [SUBJECT_NODE_LIBRARY[subject][0] ?? ''])],
    tags: [...(selected?.tags ?? [subject, '教学资源'])],
    narration: selected?.narration ?? '请补充本步骤的讲解目标与课堂提示。',
    version: 1,
    cameraState: selected?.cameraState
  };
}
