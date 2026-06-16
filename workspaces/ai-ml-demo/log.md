# 操作日志

> 追加写入，禁止修改历史条目。

## [2026-05-20] bootstrap | 初始化 AI/ML 论文 v0 演示库

- v0 演示数据由项目初始化时创建：concepts × 11、sources × 9、entities × 5、indexes × 3、analyses × 3、operations × 1
- 用于展示知识库基础结构（概念页 / 实体页 / 来源摘要 / MOC / 分析）

## [2026-05-28] human | 整体归档为 v0 演示库

- 按 CLAUDE.md "删除即标记" 规则，全库页面标 `status: deprecated`，保留可读、不真删
- 本 workspace 自此作为归档工作流的演示样例；活跃演示见 smb-ecommerce / rag-evolution

## [2026-06-12] update | 补齐 workspace 标准结构 + 清理迁移遗留

- 新建本 log.md（迁移期缺失，违反「每个 workspace 内部结构相同」约定）
- root_index「为什么归档」节移除指向自身的过时入口说明，改为指向两个活跃 workspace
- 「归档目录索引」节修正 4 条 `[[wiki/_archive_ai_ml_demo/...]]` 失效链接为实际路径
