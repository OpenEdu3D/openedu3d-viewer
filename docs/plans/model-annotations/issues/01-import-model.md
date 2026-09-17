# 01：嵌入组件并导入静态 GLB

**What to build:** 开发者通过公开 Vue 组件嵌入模型画布，指定 URL 或选择本地 GLB 后可以观察模型，并获得明确的加载状态与事件。

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**GitHub:** https://github.com/OpenEdu3D/openedu3d-viewer/issues/3

- [ ] 新主要组件、模型描述类型和公开导出可以用于独立的 Vue 接入示例。
- [ ] URL 与本地 File 都能加载静态、未压缩 GLB，A 布局中能导入本地文件。
- [ ] 成功导入后自动取景，支持旋转、缩放和重置视角。
- [ ] 加载、空模型、无有效网格、失败、格式不支持和 WebGL 不可用有明确反馈；失败不替换为无关模型。
- [ ] 更换、清空与快速连续切换模型时仅最新来源生效，旧场景不残留。
- [ ] 组件创建的对象 URL、过期加载结果和卸载时的渲染资源有正确生命周期。
- [ ] 默认样式能独立显示画布与导入操作；容器尺寸变化后可继续观察。
- [ ] 从公开组件输入与事件在真实浏览器验证加载、切换、清空和失败行为，类型检查与构建保持通过。

## Parent

正式规格 #2；原型 primary source 见 GitHub Issue #1。
