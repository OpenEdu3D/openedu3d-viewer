# 示例资产

`heart.glb` 是 OpenEdu3D 为模型标注交互演示原创的简化心脏示意模型，由程序化几何生成，无第三方模型素材，按仓库 [MIT License](../LICENSE) 提供。

生成脚本为 `scripts/create-demo-heart.py`。模型最初用于 A/B/C 交互原型，原始记录保留在 prototype/model-annotations 分支。正式示例沿用该静态、未压缩 GLB。它不具备医学解剖精度，不应作为专业医学知识的依据。

从仓库根目录执行以下命令可重新生成并覆盖 `public/heart.glb`：

```bash
python3 scripts/create-demo-heart.py
```

脚本仅使用 Python 3 标准库，无需安装第三方依赖。输出路径相对于脚本所属仓库计算，与执行命令时的工作目录无关。改变几何或节点顺序后，应为该模型使用新的稳定 ID，旧锚点不自动迁移。

## HuBMAP / Human Reference Atlas 心脏参考模型

`models/hra-heart-male-v1.2.glb` 用于真实解剖参考模型的组件验收。该资产来自 HuBMAP 的 Human Reference Atlas（HRA），使用美国国家医学图书馆提供的 Visible Human Male 数据制作。模型按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 提供，与仓库源代码的 MIT 许可分别适用。

署名：**Kristen Browne; Heidi Schlehlein (2022). _3D Reference Organ for Heart, Male v1.2._ HuBMAP. [DOI: 10.48539/HBM373.VSTV.568](https://doi.org/10.48539/HBM373.VSTV.568).**

来源与许可依据：[官方版本说明](https://hubmapconsortium.github.io/ccf-releases/v1.2/docs/ref-organs/heart-male.html)（[可直接读取的官方元数据](https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/main/v1.2/markdown/ref-organs/heart-male.md)）；模型下载：[官方 GLB](https://cdn.humanatlas.io/hra-releases/v1.2/models/VH_M_Heart.glb)。对应参考对象：[HRA Heart, Male v1.2](https://purl.humanatlas.io/ref-organ/heart-male/v1.2)。

这里的参考器官版本为 **Heart, Male v1.2，2022-05-06**。下载路径中的 `hra-releases/v1.2` 是 HRA / CCF 集合发布目录；两者的对应关系以该参考器官的官方元数据中给出的模型链接为依据，并非仅根据目录名推断。

本仓库保留下载文件原始字节，仅重命名文件。2026-09-17 检查结果：GLB 2.0、18 个节点、14 个网格、14 个图元、4,071,500 字节；没有动画、骨骼、变形目标、Draco、Meshopt 或 KTX2 压缩扩展。唯一缓冲区内嵌于 GLB，无外部纹理资源。SHA-256：

```text
b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70
```

再分发该模型及使用模型的截图时应保留上述署名、来源和 CC BY 4.0 链接；如修改模型，应说明修改情况。本模型用于教学展示组件的行为与显示验收，具体课程内容仍需由课程作者审核。

`public` 目录由 Vite 开发示例提供，模型不包含在 npm tarball 中。消费者需要将自己的模型放入静态资源目录或提供可访问的 URL。
