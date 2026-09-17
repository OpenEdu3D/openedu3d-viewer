# 真实课程模型验收

2026-09-17，使用本仓库 Vue 示例页面，在 macOS 的真实 Chromium 浏览器中通过公开界面和画布完成以下验收。桌面视口为 1280 × 1000，窄屏视口为 390 × 1000；窄屏截图中的组件宽度为 342px（宿主左右各留 24px）。使用 Playwright CLI 采集组件区域截图，未替换画布或模拟模型图像。

## 模型与可复现数据

模型：Kristen Browne; Heidi Schlehlein (2022). *3D Reference Organ for Heart, Male v1.2.* HuBMAP，[DOI 来源](https://doi.org/10.48539/HBM373.VSTV.568)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。模型原始字节未修改，仅重命名。来源、许可依据和 SHA-256 见 [资产说明](../public/README.md)。

- URL：`/models/hra-heart-male-v1.2.glb`；稳定模型 ID：`hra-heart-male-v1.2`。
- GLB 2.0，4,071,500 字节，14 个有效网格，静态、未压缩、无外部资源。
- [两条观察标注](../public/lessons/hra-heart-annotations.json) 由界面点击模型表面产生，节点路径为 `0/2/2` 和 `0/2/4`。恢复步骤见 [截图教程](usage-guide.md#恢复仓库中的两条观察标注)。

## 实际操作结果

| 操作 | 结果与证据 |
| --- | --- |
| 按钮加载真实模型 | 自动完整取景；公开 `load` 事件返回正确模型 ID 和 14 条节点路径，`error` 为 null；[导入截图](images/01-model-import.png) |
| 创建两条表面标注 | 表单填写名称与说明，确认后侧栏计数为 2；宿主收到局部锚点、法向量与模型身份；[创建截图](images/02-annotation-create.png) |
| 侧栏定位及修改说明 | 选择观察点 A 定位、修改说明；宿主数组更新，画布文字和侧栏一致；[编辑截图](images/03-annotation-edit.png) |
| 保存、删除、恢复 | 保存 JSON 后删除一条，计数变 1；恢复后为 2，完整数组与保存前一致 |
| 旋转和遮挡 | 实际拖动画布到模型背面；fade 时观察点 B 文字透明度为 0.3，hide 时该画布标签隐藏；重置后重新出现 |
| 缩放与锚点稳定 | 实际滚轮缩放后标签投影位置变化；重置后恢复，观察操作没有改变宿主保存的锚点数据 |
| 课堂展示 | 组件内没有导入、创建和编辑控件；画布标签仍可选择，说明以文本展示；[展示截图](images/04-classroom-present.png) |
| 隐藏侧栏 | 选中标注后在画布下方显示说明；[无侧栏截图](images/05-canvas-only.png) |
| 390px 视口 | 画布与侧栏纵向排列，能显示两条条目及选中说明；[窄屏截图](images/06-mobile.png) |
| 本地文件导入 | 导入相同 GLB 文件成功，返回新模型 ID 和 14 条路径；清空原标注，计数为 0 |
| 从仓库 JSON 恢复 | 重新加载上述稳定 ID 的 URL 模型，粘贴公开 JSON 数组后恢复两条观察标注，没有错误事件 |

截图中的观察说明用于交互示范，没有据此验收医学课程知识或解剖内容。其他浏览器、真实移动设备及任意复杂模型的性能仍需对应课程单独验证。

## 回归与独立接入

新增示例入口与 README 后，`npm run type-check`、`npm test`（15 项 Chromium 测试）和 `npm run check:package` 均通过。独立接入检查使用实际 tarball 安装到临时 Vue / Vite 项目，覆盖 ESM/CJS 无 DOM 导入、消费类型、README Vue 示例、生产构建、CSS、WebGL、标注绑定及课堂展示。

浏览器截图会话出现一次 `/favicon.ico` 的 404，与模型加载无关；本次模型交互没有出现组件错误事件。消费者生产构建仍提示 Three.js bundle 超过默认 500kB 阈值，构建成功。

六张原始 PNG 位于 [docs/images](images)。重新采集时按 [截图教程](usage-guide.md) 恢复模型和标注、设置上述视口，再截取“ 三维教学展示 ”组件区域；标题、说明及模式应与图注相符。包含模型的截图再分发时保留模型署名、来源及许可。
