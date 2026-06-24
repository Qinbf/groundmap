#!/usr/bin/env bash
#
# 一键安装知识库 Git hooks 到本地 .git/hooks/
# 用法：bash scripts/install_hooks.sh
#

set -e

cd "$(dirname "$0")/.."

REPO_ROOT="$(pwd)"
HOOKS_SRC="$REPO_ROOT/scripts/hooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$REPO_ROOT/.git" ]; then
    echo "❌ 错误：当前目录不是 Git 仓库（找不到 .git/）"
    exit 1
fi

if [ ! -d "$HOOKS_SRC" ]; then
    echo "❌ 错误：找不到 hooks 源目录 $HOOKS_SRC"
    exit 1
fi

mkdir -p "$HOOKS_DST"

# 当前要安装的 hooks 列表
hooks=(pre-commit)

for hook in "${hooks[@]}"; do
    src="$HOOKS_SRC/$hook"
    dst="$HOOKS_DST/$hook"

    if [ ! -f "$src" ]; then
        echo "⚠️  跳过：$src 不存在"
        continue
    fi

    cp "$src" "$dst"
    chmod +x "$dst"
    echo "✅ 安装：$hook → $dst"
done

echo ""
echo "完成。Git hooks 已激活。"
echo "如需禁用某次 hook（仅人类手动 commit 时），用：git commit --no-verify"
