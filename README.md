# OpenEdu3D Viewer

Vue 3 + Three.js 三维教学展示组件。通过 `ModelAnnotationViewer` 在网页中嵌入交互画布，让教师导入模型、点击具体部位添加三维标注，再切换为课堂展示模式。

标注由模型表面的锚点、引线和正向可读的文字组成。模型旋转时锚点仍关联原来的部位；名称和说明以文本显示。默认提供标注侧栏，也可隐藏侧栏，嵌入自己的页面布局。

## 先运行示例

需要 Node.js 20.19+、npm，以及支持 WebGL 2 的现代浏览器。

```bash
git clone https://github.com/OpenEdu3D/openedu3d-viewer.git
cd openedu3d-viewer
npm ci
npm run dev
```

打开终端打印的地址。默认加载仓库原创的 MIT 心脏示意模型；点击“加载真实心脏模型”可体验 HuBMAP 的真实心脏参考模型。示例支持 URL、本地 GLB、创建/修改/删除标注、JSON 保存恢复、课堂展示模式和隐藏侧栏。

### 看图体验备课与课堂展示

编辑模式：点击模型表面创建观察点，通过侧栏修改名称和课堂说明。

![真实心脏模型的标注编辑界面](https://raw.githubusercontent.com/OpenEdu3D/openedu3d-viewer/main/docs/images/03-annotation-edit.png)

课堂展示模式：保留旋转、缩放、定位和说明，隐藏组件内编辑操作。

![真实心脏模型的课堂展示界面](https://raw.githubusercontent.com/OpenEdu3D/openedu3d-viewer/main/docs/images/04-classroom-present.png)

按 [截图操作教程](./docs/usage-guide.md) 体验导入、创建、编辑、JSON 恢复、隐藏侧栏与 390px 窄屏；也可查看 [真实模型验收记录](./docs/course-model-acceptance.md)。图片来自实际浏览器操作。

截图模型署名：Kristen Browne; Heidi Schlehlein (2022). *3D Reference Organ for Heart, Male v1.2.* HuBMAP，[模型来源](https://doi.org/10.48539/HBM373.VSTV.568)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。模型原始字节未修改；截图和观察标注用于展示组件操作，具体课程内容需由课程作者审核。原创示意模型不具备医学解剖精度。完整资产说明见 [public/README.md](./public/README.md)。

## 安装到 Vue 项目

本轮交付可安装的产物，尚未执行 npm 发布。正式发布前，可先在仓库打包：

```bash
npm run build
npm pack
```

当前版本会在仓库根目录生成 `openedu3d-viewer-0.1.0.tgz`，`npm pack` 的终端输出是实际文件名；版本变化时使用输出中的名称。tarball 不含示例模型，需要消费项目自行提供 GLB。

然后在已有的 Vue 3 / Vite 项目中安装生成的 tarball 和运行依赖（替换为实际文件路径）：

```bash
npm install /absolute/path/openedu3d-viewer/openedu3d-viewer-0.1.0.tgz vue@^3.5.18 three@^0.176.0
```

TypeScript 消费项目也需 Three.js 类型声明（独立接入验证使用以下版本）：

```bash
npm install -D @types/three@^0.183.1
```

将自己的静态 GLB 放到消费项目的 `public/models/heart.glb`。以下可直接用作 `App.vue`：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  ModelAnnotationViewer,
  type AnnotationModelSource,
  type ModelAnnotation,
  type AnnotationViewerError
} from '@openedu3d/viewer';
import '@openedu3d/viewer/style.css';

const model = ref<AnnotationModelSource | null>({
  id: 'heart-v1',
  source: '/models/heart.glb'
});
const annotations = ref<ModelAnnotation[]>([]);
function onError(error: AnnotationViewerError) {
  console.error(error.code, error.message);
}
</script>

<template>
  <ModelAnnotationViewer
    v-model:model="model"
    v-model:annotations="annotations"
    @error="onError"
  />
</template>
```

**必须导入 `@openedu3d/viewer/style.css`**。组件不依赖原产品的全局 CSS 变量。画布高度默认 520px，随容器宽度调整；窄容器使用纵向布局。

## 教师操作

1. 点击“导入 GLB”，或由宿主指定模型 URL。导入后自动完整取景。
2. 拖动旋转、滚轮缩放，或使用“重置视角”。触屏支持旋转和双指观察操作。
3. 点击“添加三维标注”，再点击模型表面，填写名称、课堂说明并确认；可点击取消，在填写表单时也可按 Escape。拖动与点击空白不会创建标注。
4. 在侧栏选择条目定位部位，修改名称、说明，或删除标注。
5. 使用 `mode="present"` 进行课堂展示：保留观察和选择，禁止组件内的导入、创建、修改和删除；切换模式会取消未完成的创建。

## 组件 API

| 输入 | 类型 | 默认值 | 用途 |
| --- | --- | --- | --- |
| `model` / `v-model:model` | `AnnotationModelSource \| null` | `null` | 稳定模型 ID 与 URL / File；`null` 清空场景 |
| `annotations` / `v-model:annotations` | `ModelAnnotation[]` | `[]` | 当前模型的标注集合；组件以新集合通知变化 |
| `mode` | `'edit' \| 'present'` | `'edit'` | 编辑或只读课堂展示 |
| `showSidebar` | `boolean` | `true` | 显示标注侧栏；隐藏后选择画布文字可查看说明 |
| `occluded` | `'hide' \| 'fade'` | `'hide'` | 被模型几何遮挡的标签隐藏或淡化 |
| `minHeight` | `number` | `520` | 画布最小高度，单位 px，最低 160 |

模板中的输入可使用短横线形式，例如 `:show-sidebar="false"`。允许编辑时，建议同时绑定 `v-model:model` 和 `v-model:annotations`，由宿主接收导入和标注变化；也可分别监听 `update:model` / `update:annotations` 并更新对应输入。仅传入 `:model` / `:annotations` 是单向输入，组件发出的变化需要宿主接收后回传。完全不传这两个输入时，组件也可在内存中导入、编辑，卸载后这些数据丢失。

`:show-sidebar="false"` 保留导入、创建和画布标签选择，选中后在画布下方显示说明；组件内修改、删除和列表定位入口位于侧栏。隐藏侧栏时，可由宿主修改 `annotations` 或使用公开 ref 方法定位。

```vue
<ModelAnnotationViewer
  :model="model"
  :annotations="annotations"
  mode="present"
  :show-sidebar="false"
  occluded="fade"
/>
```

| 事件 | 载荷 | 时机 |
| --- | --- | --- |
| `update:model` | `AnnotationModelSource \| null` | 组件内本地导入产生新的来源和 ID |
| `update:annotations` | `ModelAnnotation[]` | 创建、修改、删除，或组件内导入清空标注；命名 v-model 自动接收 |
| `load` | `{ modelId: string; nodePaths: string[] }` | 最新模型加载、取景完成 |
| `error` | `{ code: string; message: string; modelId?: string }` | 加载失败、格式不支持、数据无效等 |
| `select-annotation` | `string \| null` | 选择标注，或删除、移除选中标注、更换模型、关闭说明时清空选择 |

通过组件 ref 调用 `resetView()`、`focusAnnotation(id)`；公开 ref 类型是 `ModelAnnotationViewerExpose`。定位不存在的标注不会操作场景。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  ModelAnnotationViewer,
  type AnnotationModelSource,
  type ModelAnnotation,
  type ModelAnnotationViewerExpose
} from '@openedu3d/viewer';
import '@openedu3d/viewer/style.css';

const viewer = ref<ModelAnnotationViewerExpose | null>(null);
const model = ref<AnnotationModelSource | null>({ id: 'heart-v1', source: '/models/heart.glb' });
const annotations = ref<ModelAnnotation[]>([]);
</script>

<template>
  <button @click="viewer?.resetView()">重置</button>
  <button v-if="annotations[0]" @click="viewer?.focusAnnotation(annotations[0].id)">定位第一个标注</button>
  <ModelAnnotationViewer ref="viewer" v-model:model="model" v-model:annotations="annotations" />
</template>
```

### 模型身份与标注数据

```ts
interface AnnotationModelSource {
  id: string;          // 调用方为同一模型版本提供稳定 ID
  source: string | File;
}

interface ModelAnnotation {
  id: string;
  modelId: string;
  anchor: {
    nodePath: string;   // 场景中的确定性子节点路径，不使用名称或运行时 UUID
    position: [number, number, number]; // 网格局部坐标
    normal: [number, number, number];   // 网格局部法向量
  };
  title: string;
  description: string;
}
```

使用点击创建得到的锚点数据。相同模型仅更换下载地址时保持 `model.id`，可以继续恢复标注；网格结构、几何或导出版本变化时更换 ID，首版不迁移不同模型版本的锚点。法向量变换会处理非均匀缩放。

组件不直接修改输入的数组或对象。展示时会忽略重复 ID、跨模型数据、无效路径、非有限坐标、零法向量或空名称，并发出 `invalid-annotations`。过滤不会改写宿主输入；后续主动编辑会回传当前有效的集合。更换或清空模型会取消创建、清空当前显示与选择；组件内导入新文件还会回传空标注集合和新的模型 ID。

### 保存与恢复

存储由宿主管理，组件不连接后端，也不自动保存到浏览器。下面的函数配合第一个接入示例中的 `model` / `annotations` 使用，将模型的稳定 ID、可重载 URL 和标注一起序列化：

```ts
function saveLesson() {
  if (!model.value || typeof model.value.source !== 'string') return;
  localStorage.setItem('lesson', JSON.stringify({
    model: model.value,
    annotations: annotations.value
  }));
}

function restoreLesson() {
  const raw = localStorage.getItem('lesson');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    model.value = saved.model;
    annotations.value = saved.annotations;
  } catch {
    console.error('课程存档不是有效 JSON');
  }
}
```

上述函数在客户端用户操作时调用。实际应用应验证自己的存档格式。`File` 不能靠 JSON 保存并重载：需要宿主上传文件并保存 URL，或要求用户重新选择同一文件且复用原模型 ID。组件内再次导入文件视为新模型，会生成新 ID；恢复旧课程请通过公开输入设置来源和原 ID。

## 支持范围与错误处理

首版支持 **GLB 2.0 的静态、未压缩模型**。不支持 glTF 多文件目录、OBJ/FBX/STL、Draco、Meshopt、KTX2/BasisU、模型动画、骨骼及 morph targets。本地 GLB 必须内嵌所需 buffer 和纹理，包含外链资源时返回 `unsupported-model`；URL 模型及其关联资源需允许浏览器访问，跨域部署由资源服务器正确设置 CORS。

| 错误 code | 含义与处理 |
| --- | --- |
| `load-failed` | 网络/HTTP/解析失败，检查 URL、资源内容和 CORS |
| `unsupported-model` | 格式、动画或压缩扩展不支持；重新导出为支持的 GLB |
| `invalid-model` | ID、文件结构或有效网格不正确 |
| `webgl-unavailable` | 无法初始化 WebGL，检查浏览器和硬件加速 |
| `invalid-annotations` | 忽略无效标注，检查模型 ID、结构和保存的数据 |

加载失败时显示原因，不会替换成示例模型。快速更换来源时只采用最新结果，卸载后释放渲染资源。标签在画布/相机裁剪范围之外时不显示；文字会尽量分散，选中的标签优先。首版不保证任意复杂模型或任意标注密度下的性能和完全避让，可通过侧栏定位查看单个部位。

包可在服务端导入，Three.js 初始化在客户端挂载时进行；SSR/Nuxt 中建议放在客户端组件或 `<ClientOnly>` 内。URL 加载和 File 导入需要浏览器环境。需要支持 WebGL 2、ResizeObserver 和 CSS 容器查询的现代 Chrome/Edge/Firefox/Safari。

## 本地检查与贡献

```bash
npm run type-check
npm run build
npx playwright install chromium
npm test
npm run check:package
```

`check:package` 会构建并打包，在临时目录创建独立 Vue 项目、安装 tarball 和依赖，验证 ESM/CJS 导入、消费者类型、生产构建、CSS、WebGL、标注绑定和展示模式；需要网络与 Chromium，结束后清理临时消费者目录。

详细开发流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)，实现结构见 [docs/architecture.md](./docs/architecture.md)。已保留 `CardViewer`、`DetailViewer`、`LessonDemoViewer`、`ViewerCore`、`LessonDemoViewerCore` 及原有领域类型导出：Card/Detail 面向原有学科示例场景，LessonDemoViewer 按 `LessonDemoResource` 渲染几何、步骤和动画；它们不提供本文的表面标注交互，接入新功能请使用 `ModelAnnotationViewer`。

## License

[MIT](./LICENSE)。第三方模型及包含该模型的截图遵循其 CC BY 4.0 署名要求，见 [public/README.md](./public/README.md)。原型与 A 方案决策保留在 [prototype/model-annotations](https://github.com/OpenEdu3D/openedu3d-viewer/tree/prototype/model-annotations) 分支，未进入正式发布入口。
