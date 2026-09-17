# 示例资产

`heart.glb` 是 OpenEdu3D 为模型标注交互演示原创的简化心脏示意模型，由程序化几何生成，无第三方模型素材，按仓库 [MIT License](../LICENSE) 提供。

生成脚本为 `scripts/create-demo-heart.py`。模型最初用于 A/B/C 交互原型，原始记录保留在 prototype/model-annotations 分支。正式示例沿用该静态、未压缩 GLB。它不具备医学解剖精度，不应作为专业医学知识的依据。

从仓库根目录执行以下命令可重新生成并覆盖 `public/heart.glb`：

```bash
python3 scripts/create-demo-heart.py
```

脚本仅使用 Python 3 标准库，无需安装第三方依赖。输出路径相对于脚本所属仓库计算，与执行命令时的工作目录无关。改变几何或节点顺序后，应为该模型使用新的稳定 ID，旧锚点不自动迁移。

`public` 目录由 Vite 开发示例提供，模型不包含在 npm tarball 中。消费者需要将自己的模型放入静态资源目录或提供可访问的 URL。
