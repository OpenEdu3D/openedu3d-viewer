# 参与开发

使用 Node.js 20.19+ 和 npm。执行 `npm ci`，然后 `npm run dev`，可运行 `examples/App.vue` 的正式组件示例。原创心脏模型位于 `public/heart.glb`。

`scripts/create-demo-heart.py` 只依赖 Python 3 标准库；按 [示例资产说明](./public/README.md) 的命令可重新生成模型。普通组件开发使用已提交的 GLB，无需运行生成器。更改模型节点结构或几何后，同时更新示例使用的模型版本 ID。

修改 `src/annotations` 实现通用 GLB 表面标注；公开入口是 `src/index.ts`。保持现有组件导出兼容，模型存储与课程持久化交给宿主。公开 API 或行为变化时同步 README、示例和类型。

## 提交前检查

```bash
npm ci
npx playwright install chromium
npm run type-check
npm run build
npm test
npm run check:package
```

浏览器测试使用公开组件输入、命名 v-model、事件和真实 canvas 操作，避免依赖 Three.js 私有字段或逐像素截图。新增行为优先用一个失败的消费者行为测试引导一个完整实现，再继续下一项。

`npm test` 启动 127.0.0.1:5175；独立消费者验证使用 127.0.0.1:5176，并在临时目录安装依赖。CI 会安装 Chromium 及系统依赖。请保持这些端口可用；测试输出位于 `node_modules/.cache/openedu3d/test-results`。

`npm run build` 先生成 JS/CSS，再生成声明，避免 Vite 清空声明目录。`npm pack` 只包含 dist、README、LICENSE 等包元数据，不包含示例资产、原型、测试或仓库内部计划。

尚未进行 npm 发布时，通过 `npm run build` 和 `npm pack` 生成 tarball，按照 README 的 Vue 消费者示例安装接入。维护者执行 `check:package` 是验证本地 tarball，不会发布包或写入远程仓库。

## Issue 与 PR

先在 GitHub Issue 中描述问题、用户操作步骤和预期结果。涉及模型加载时说明 GLB 是否静态、是否压缩及浏览器情况；请确保有权共享附带模型。PR 应说明行为变化及验证结果。正式任务与原型决策见 [实现计划](./docs/plans/model-annotations/README.md)。

该仓库使用 MIT License；请为新增示例资源记录来源和许可。不要提交凭据、私有产品代码或未经授权的第三方资产。

## 发布检查

维护者确认版本和变更说明，运行完整检查及独立消费者验证，再使用 `npm pack --dry-run` 核对公开文件。npm 发布是单独的维护者操作，本轮功能交付不自动发布。
