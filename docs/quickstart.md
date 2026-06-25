# Quickstart

This guide gets a local GroundMap workspace running with the CLI, tests, health check, and Web console.

> 📦 **Example `raw/` sources are not distributed with this repository** (copyright reasons; `workspaces/*/raw/` is excluded by `.gitignore`). The example workspaces ship their full `wiki/` pages, which remain completely browsable. After a fresh clone, `k.py health` reports a **nonzero number of broken references** ("raw 文件不存在" / raw file missing) and **source issues** (`broken-source-link`) — both are expected and do **not** mean your installation failed; they are the same raw-absent artifact (only the deep links into the missing raw blocks are unresolved). The exact count depends on which workspace is active (a bare command auto-selects the alphabetically-first example workspace).

Hands-on companion examples live under `docs/examples/`; a step-by-step illustrated tutorial (Chinese) is at [docs/新手教程-手把手搭建知识库.md](新手教程-手把手搭建知识库.md).

## Requirements

- Python 3.10+
- Node.js 22+
- npm
- Git

## Install

```bash
git clone https://github.com/Qinbf/groundmap.git
cd groundmap
make setup
```

`make setup` installs Python dependencies, Web dependencies, and local Git hooks.

If you prefer manual steps:

```bash
python -m pip install -r requirements-dev.txt
cd web
npm install
cd ..
bash scripts/install_hooks.sh
```

## Verify

```bash
make test
```

This runs:

- Python tests,
- Web lint,
- Web production build,
- knowledge base health check.

On a fresh clone the health check reports a nonzero number of broken references, all with reason "raw 文件不存在" (raw file missing). This is the expected consequence of the example `raw/` sources not being distributed (see the note at the top) — not an installation failure. The exact count depends on which workspace is active (a bare `k.py health` auto-selects the alphabetically-first example workspace). The command still exits 0 and `make test` passes.

Manual equivalents:

```bash
python -m pytest scripts/tests
python scripts/k.py health --json
cd web && npm run lint && npm run build
```

> ⚠️ **If a Web dev server is running locally, stop it before `make test` or `npm run build`.** `npm run dev` and `next build` share `web/.next/`; building over a live dev server can make it serve 404s. To check types only without a full build, run `cd web && npx tsc --noEmit`. (CI builds in a clean environment, so this only affects local runs.)

## Start the Web Console

```bash
make web
```

Open [http://localhost:3006](http://localhost:3006).

## Workspaces

Engine code (`scripts/`, `web/`) is shared across topics; data lives under `workspaces/<name>/` with the same internal layout (`wiki/`, `raw/`, `exports/`, `my_thoughts/`, `.cache/`, `log.md`). When no workspace is specified, the CLI auto-selects one (and prints a hint when several exist); pass `--workspace <name>` (CLI) or `KB_WORKSPACE=<name>` (Web) to choose.

This repository ships **three example workspaces** — `smb-ecommerce`, `rag-evolution`, and `ai-ml-demo` — whose `wiki/` pages are fully browsable on a fresh clone. Only each workspace's `raw/` sources (copyright) and `my_thoughts/` (private notes) are excluded by `.gitignore`. To start your **own** knowledge base, create a new workspace (optional — not a prerequisite for exploring the examples):

```bash
python scripts/k.py new-workspace my-research
# Then ingest your own sources under workspaces/my-research/raw/articles/
```

To see the canonical workspace data layout and convention, look at `wiki/_templates/` (engine-level templates, not workspace data) or read `scripts/k.py new-workspace --help`.

## Recommended: Build Your Own Knowledge Base With an Agent

The best first real workflow is to treat GroundMap as the reusable engine and keep your own source documents in a workspace that an external coding agent manages for you.

For non-sensitive experiments, an in-repo workspace is fine:

```bash
python scripts/k.py new-workspace my-research
mkdir -p workspaces/my-research/raw/papers
# Put your own PDFs, HTML files, Word docs, or Markdown files here.
```

For private, copyrighted, or client-specific documents, prefer a separate data root via `KB_ROOT` so the open-source engine repo stays clean:

```bash
mkdir -p ~/work/my-kb-data/workspaces
KB_ROOT=~/work/my-kb-data python scripts/k.py new-workspace my-research
mkdir -p ~/work/my-kb-data/workspaces/my-research/raw/papers
# Put your own PDFs, HTML files, Word docs, or Markdown files here.
```

Then start Claude Code, Codex, Cursor-style agents, or another coding agent from the GroundMap repository and give it an explicit instruction like:

```text
Read AGENTS.md first. Use KB_ROOT=~/work/my-kb-data and workspace my-research.
I placed source documents under raw/papers/.
Please ingest them into the knowledge base:
- convert the raw files,
- create source summaries with block-level citations,
- update the relevant concept/entity/index pages,
- run list-bare-claims, list-coarse-citations, list-source-issues, list-broken-refs, and list-relation-issues,
- run health,
- summarize what changed.
```

The important split is:

- You place original documents under `raw/articles/` or `raw/papers/`.
- The agent reads `AGENTS.md`, runs `scripts/convert.py` and `scripts/k.py`, writes `wiki/**`, and keeps citations anchored.
- GroundMap itself never calls an LLM; the agent performs the reasoning outside the knowledge base.

Browse the resulting workspace with:

```bash
cd web
KB_ROOT=~/work/my-kb-data KB_WORKSPACE=my-research npm run dev
```

If you created the workspace inside the engine repo instead, omit `KB_ROOT`:

```bash
cd web
KB_WORKSPACE=my-research npm run dev
```

## Explore the CLI

All of the following work on a fresh clone (they only read the bundled `wiki/` pages):

```bash
python scripts/k.py --help
python scripts/k.py health --json
python scripts/k.py --workspace smb-ecommerce search "cross-border"
python scripts/k.py list-pages --json
python scripts/k.py list-conflicts
python scripts/k.py list-to-update

# Read a bundled wiki page: outline it first, then read a full section by a heading / ^anchor from that outline
python scripts/k.py --workspace rag-evolution outline wiki/sources/bge.md
python scripts/k.py --workspace rag-evolution read-section wiki/sources/bge.md "<heading-or-^anchor-from-the-outline-above>"

# Switch workspace
python scripts/k.py --workspace ai-ml-demo search "transformer"
```

## Convert a Source Document

After creating a workspace with `k.py new-workspace my-research`, you can bring your own redistributable source material and ingest it. Put source files under a workspace's `raw/articles/` or `raw/papers/` directory, then run convert and inspect the outline. Using the `my-research` workspace and a file named `my_article.html` as an example:

```bash
mkdir -p workspaces/my-research/raw/articles
cp /path/to/my_article.html workspaces/my-research/raw/articles/

# convert.py takes a repo-relative directory
python scripts/convert.py --dir workspaces/my-research/raw/articles --ext .html

# k.py path arguments are workspace-relative (resolved under the active workspace)
python scripts/k.py outline raw/articles/my_article.md
```

Converted markdown and `.outline.json` files are derived artifacts. Do not hand-edit them; regenerate from the original source file.

## Work With an External Agent

Agents should read `AGENTS.md` before making changes. The core rule is simple:

- the knowledge base exposes files, scripts, and Web actions,
- the external agent performs reasoning,
- the repository itself does not call an LLM.

## Common Problems

### `python-frontmatter` is missing

Run:

```bash
python -m pip install -r requirements-dev.txt
```

### Web build cannot find dependencies

Run:

```bash
cd web
npm install
```

### Port 3006 is already in use

Edit `web/package.json` and change the `-p 3006` argument in `dev` and `start`, or run:

```bash
cd web
npm run dev -- -p 3010
```
