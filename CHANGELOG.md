# Changelog

## 0.1.0 — 2026-09-17

首个可独立安装的 Vue 三维教学标注版本。

- 新增 `ModelAnnotationViewer`：静态、未压缩 GLB 的 URL / File 导入、旋转、缩放与取景。
- 支持表面锚点、引线、可读文字、侧栏创建/编辑/删除/定位，以及宿主 JSON 保存恢复。
- 支持只读课堂展示、可隐藏侧栏、遮挡隐藏/淡化和窄容器布局。
- 提供 ESM/CJS、TypeScript 声明和独立 CSS 入口，保留既有组件导出。
- 新增真实心脏参考模型、六张实操截图、可恢复观察标注和 [使用教程](docs/usage-guide.md)。第三方模型及截图署名见 [资产说明](public/README.md)。
- 通过类型检查、15 项 Chromium 浏览器测试和实际 tarball 独立接入验证。

首版不支持动画、骨骼、变形目标、Draco / Meshopt / KTX2 压缩、多文件 glTF 或跨版本锚点迁移。上传和持久化由宿主负责。模型及截图不包含在 npm tarball 中。

GitHub Release 提供安装 tarball；npm registry 的发布需维护者完成账号登录与组织发布权限配置，README 保留 tarball 安装步骤。
