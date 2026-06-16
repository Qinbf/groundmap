# 教程配套示例文件

这个目录存放**新手教程的跟做素材**——因为各 workspace 的 `raw/` 原始资料（可能含版权内容）不随仓库分发，教程里需要亲手操作的环节统一用这里的示例文件代替。

| 文件 | 用途 |
|---|---|
| `sample_haiwaicang_vs_zhiyou.html` | 一篇自写的通识文章（海外仓 vs 直邮），供教程第 4 章「摄入一篇资料」跟做使用 |

## 怎么用（对应教程第 4 章）

```bash
# 1. 把示例文章复制进 workspace 的 raw/（raw/ 目录若不存在会自动创建）
mkdir -p workspaces/smb-ecommerce/raw/articles
cp docs/examples/sample_haiwaicang_vs_zhiyou.html workspaces/smb-ecommerce/raw/articles/

# 2. 转换为 markdown + 自动加锚点
python scripts/convert.py --dir workspaces/smb-ecommerce/raw/articles --ext .html

# 3. 查看生成的大纲（注意：k.py 的路径不带 workspaces/ 前缀）
python scripts/k.py outline raw/articles/sample_haiwaicang_vs_zhiyou.md
```

之后就可以让 AI agent（如 Claude Code）把它摄入知识库——完整步骤见 [`docs/新手教程-手把手搭建知识库.md`](../新手教程-手把手搭建知识库.md) 第 4 章。

## 版权

本目录所有示例文件由项目作者撰写，以 **CC0 1.0**（公有领域贡献）协议发布：可自由复制、修改、分发，无需署名。内容为通识性介绍，不含真实统计数据。
