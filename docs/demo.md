# Demo Plan

A strong public demo is the difference between "interesting architecture" and "I want to try this now".

This repository ships **engine code only** — workspace data is created on demand by users. To get started, run `python scripts/k.py new-workspace my-research` and ingest your own content.

> 📦 **Workspace `raw/` source documents are not distributed** (copyright reasons; excluded by `.gitignore`). On a fresh clone, no workspace exists yet — create one with `k.py new-workspace <name>`. Any demo step that needs an actual raw document (conversion, anchor inspection) requires bringing your own redistributable source file.

## Demo Goals

The demo should show five things in under five minutes:

1. Convert a source document into anchored markdown.
2. Inspect the generated outline.
3. Create or read a source summary.
4. Navigate concept/entity/index pages in the Web console.
5. Run health checks that reveal conflicts, update markers, broken refs, and source issues.

## Recommended Demo Topic

Use a compact topic with public sources and obvious relationships. Good options:

- AI/ML papers with permissive public access,
- public government policy documents,
- open technical standards,
- a synthetic company handbook,
- a toy research corpus written specifically for the demo.

Avoid:

- customer data,
- private notes,
- copyrighted PDFs that cannot be redistributed,
- real business playbooks,
- sources with unclear licensing.

## Demo Layout

Each demo workspace follows the standard per-workspace layout:

```text
workspaces/<name>/
├── raw/
│   ├── articles/
│   ├── papers/
│   └── assets/
├── wiki/
│   ├── root_index.md
│   ├── indexes/
│   ├── concepts/
│   ├── entities/
│   ├── sources/
│   └── analyses/
├── exports/
├── my_thoughts/        # human-only; must be empty/redistributable before release
└── log.md
```

The packaged CLI does not exist yet. Until it does, drive the demo against an existing workspace (default `my-research`). All of the following work on a fresh clone — they only read the bundled `wiki/` pages:

```bash
# k.py path arguments are workspace-relative
python scripts/k.py --workspace my-research search "cross-border"
python scripts/k.py --workspace my-research outline wiki/sources/cac_ec_law_2018.md
python scripts/k.py --workspace my-research read-section wiki/sources/cac_ec_law_2018.md "核心条款"
python scripts/k.py --workspace my-research health --json
cd web && KB_WORKSPACE=my-research npm run dev
```

To demo the conversion step (raw document → anchored markdown), bring your own redistributable source file first — the bundled workspaces ship without `raw/`:

```bash
mkdir -p workspaces/my-research/raw/articles
cp /path/to/my_article.html workspaces/my-research/raw/articles/

# convert.py --dir is repo-relative
python scripts/convert.py --dir workspaces/my-research/raw/articles --ext .html
python scripts/k.py --workspace my-research outline raw/articles/my_article.md
```

## Demo Script

### 1. The problem

"Most RAG systems lose the document structure. GroundMap keeps knowledge as markdown and Git."

### 2. The source

Show one raw document and its converted markdown anchors.

### 3. The wiki

Show one source summary, one concept page, one entity page, and one index page.

### 4. The trace

Click or search from a claim to its source anchor.

### 5. The maintenance loop

Run:

```bash
python scripts/k.py health --json
```

Explain how conflicts, `to-be-updated`, bare claims, and broken references become explicit maintenance work.

## Public Release Requirement

Before publishing, the demo must pass:

```bash
python -m pytest scripts/tests
python scripts/k.py health --json
cd web && npm run lint && npm run build
```

> ⚠️ Stop any local Web dev server before `npm run build` (they share `web/.next/`; building over a live dev server can make it serve 404s). For a types-only check use `cd web && npx tsc --noEmit`.
