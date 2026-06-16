# Release Checklist

Use this checklist before turning a personal GroundMap workspace into a public GitHub repository.

## Do Not Publish the Personal Workspace As-Is

Create a clean repository for the public core. Do not reuse the private repository history.

Recommended split:

- `groundmap-core`: public open-source core,
- `groundmap-pro` or private workspace: industry playbooks, customer integrations, private prompts, business data.

## Workspace Data Layout

Data is stored per topic under `workspaces/<name>/`. For each workspace, the sensitive paths are:

```text
workspaces/<name>/
├── my_thoughts/        # human-only notes — must be empty or redistributable
├── raw/                # source documents + converted *.md / *.outline.json
├── wiki/               # agent-maintained pages
├── exports/            # generated outputs
└── log.md              # operation history
```

> ⚠️ **Important — verify private data state before release:**
> - `.gitignore` excludes `workspaces/*/{raw,my_thoughts,.cache,exports}`, the legacy top-level `raw/`, `my_thoughts/`, `.cache/`, and `workspaces/*/wiki/**/*.outline.json` (derived outline caches). Private data exists only in the working tree. Confirm `git status` / `git ls-files` show no private files staged or tracked before you publish.

## 🚫 Release Blockers (MUST be done before any push to a public remote)

The following two items are **BLOCKERs**, not nice-to-haves. A June 2026 audit of the original private repository confirmed both problems existed in its Git history (a fresh clean repository sidesteps both — verify yours with the acceptance commands below). Publishing without fixing them leaks private derived files and personal identity to the public internet permanently (forks/mirrors keep history even after a force-push).

### BLOCKER 1 — Purge legacy private files from Git history

The **legacy flat top-level `raw/`, `wiki/`, `my_thoughts/`** still appears in **Git history** from before the workspace migration (audit found ~60 legacy `raw/**` derived files added across past commits). New `.gitignore` rules do not remove what is already committed. Purging it from history is a **manual human step** using `git filter-repo` (or BFG) — do not let an automated agent rewrite history. Plan: create a fresh clean repository or run `git filter-repo --path raw --path wiki --path my_thoughts --path exports --invert-paths` (adjust paths to the legacy layout), then force-push to the public remote only after review.

**Acceptance command — must return empty output:**

```bash
git log --all --diff-filter=A -- 'raw/**'
```

### BLOCKER 2 — Rewrite commit author identity

**Commit author identity is also personal data.** Every commit's `author`/`committer` metadata (real name, personal email, machine hostname) becomes public on push — the current history's commits carry a real name, a personal QQ email, and a machine hostname. `git filter-repo --path …` rewrites *files*, **not** author metadata. Anonymize via `git filter-repo --mailmap` (or `--name-callback` / `--email-callback`) to a unified identity (e.g. `GroundMap contributors <noreply@…>`). The fresh-clean-repo path (preferred) sidesteps this entirely.

**Acceptance command — output must contain no personal name, personal email, or machine hostname:**

```bash
git log --all --format='%an <%ae> | %cn <%ce>' | sort -u
```

## Must Remove or Replace (per workspace)

For every `workspaces/<name>/`:

- `my_thoughts/**`
- private `raw/**` files
- proprietary converted `raw/**/*.md` and `raw/**/*.outline.json`
- private `wiki/**` pages
- `exports/**`
- real operation history in `log.md`

Repo-wide:

- local caches such as `.cache/`, `.tmp/`, `.pytest_cache/`, `web/.next/`, `node_modules/`, `.playwright-cli/`
- API keys, tokens, `.env*`, credentials, private URLs
- screenshots that reveal private data
- the reference copy in `claude_code源码/` (gitignored; confirm it is not tracked)

## Safe to Keep

- `scripts/`
- `web/`
- `wiki/_templates/`
- `CLAUDE.md` and `AGENTS.md`
- `.claude/skills/` and `.agents/skills/` (see note below)
- design documentation after removing private examples
- redistributable demo workspaces
- tests
- Git hooks
- GitHub Actions

### Skills: single source of truth

`.claude/skills/` (Claude Code) and `.agents/skills/` (Codex) are **intentional mirrors of each other**, differing only in agent-specific naming — the same relationship `CLAUDE.md` has with `AGENTS.md`. `CLAUDE.md`/`.claude/skills/` is the canonical source; `AGENTS.md`/`.agents/skills/` is the mirror kept byte-aligned.

Decision (resolved): **`.agents/skills/` is tracked** and ships with the repo, matching `AGENTS.md` being tracked. Mirror sync is enforced by `scripts/tests/test_release_guards.py::TestMirrorSync`. Do not delete either tree.

## Public Demo Data Rules

Demo data must be one of:

- original synthetic content,
- public-domain material,
- permissively licensed content,
- content with explicit redistribution permission.

Each demo source should include a note explaining where it came from and why it is safe to redistribute.

### Demo Data Integrity (broken anchor references)

`python scripts/k.py --workspace <name> health` now reports `broken_refs_count` for **both** `[[raw/...#^]]` and `[[wiki/...#^]]` citations. The wiki-internal check was added this round — it previously reported a false `0`, hiding stale cross-page anchors. Current state of the bundled demo workspaces:

- `smb-ecommerce`: **0** — clean. (20 stale `[[wiki/sources/X#^…]]` citations were repointed to the primary `[[raw/…#^…]]` source blocks they actually quote — the cited hash matched the raw block exactly.)
- `rag-evolution`: **21** — 3 are stale heading hashes that can be auto-refreshed (same section, new hash); the other 18 cite anchors that no longer exist in any source. Fix the citation, add `[需要来源]`, or regenerate the affected pages.
- `ai-ml-demo`: **0** — clean (was 14; the stale anchors have since been repaired/regenerated). Note this is a deprecated showcase (31/32 pages `status: deprecated`) — decide whether to ship it or drop it from the public release.

Run `python scripts/k.py --workspace <name> list-broken-refs` for the per-citation list. Get every shipped demo workspace to `broken_refs_count: 0` before release.

> ⚠️ **If** the `rag-evolution/` working-tree files are owned by `root:staff` (a possible artifact of how that demo was imported), edits will be rejected for a normal user — re-own them first: `sudo chown -R "$USER" workspaces/rag-evolution`. (Verify with `stat -f '%Su:%Sg' workspaces/rag-evolution`; on the current tree they are already owned by the normal user, so this step may not be needed.)

## GitHub Repository Settings

After creating the clean repository:

- add a short description,
- add repository topics such as `llm`, `knowledge-base`, `rag`, `markdown`, `agents`, `nextjs`, `git`,
- upload a social preview image,
- enable Issues,
- protect the default branch,
- require CI before merge,
- create an initial release tag.

### Release-day actions (referenced by shipped docs — do these the same day you publish)

`SECURITY.md`, `CODE_OF_CONDUCT.md`, and `SUPPORT.md` all point readers at channels that only exist once you flip them on. Publishing the files without the channels leaves dead instructions, so on release day:

- [ ] **Enable GitHub Security Advisories** (Settings → Security → *Private vulnerability reporting*) — `SECURITY.md` tells reporters to use it instead of public issues.
- [ ] **Enable Discussions** — `SUPPORT.md` directs general usage questions there.
- [ ] **Add a non-personal contact entry point** in the repo About section / org profile (e.g. a project email alias or a "Contact" discussion category) — `SECURITY.md` ("contact method listed in the repository profile") and `CODE_OF_CONDUCT.md` ("the project's published contact method") both reference it. Do not use a personal email.

## First Release Artifacts

- `README.md`
- `README.zh-CN.md`
- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `.github/workflows/ci.yml`
- issue templates
- PR template
- demo workspace
- launch article

## Verify Referenced Files Are Tracked

Every file or relative link referenced from `README.md` / `README.zh-CN.md` (and the docs they link to) must actually exist **and be tracked by Git** — otherwise a fresh clone will hit dead links. Spot-check:

```bash
# All doc targets linked from the READMEs exist and are tracked
for f in docs/quickstart.md docs/why-no-embeddings.md docs/demo.md \
         docs/release-checklist.md docs/launch-playbook.md web/README.md \
         LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md \
         .github/workflows/ci.yml; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 && echo "OK   $f" || echo "MISSING $f"
done

# Example command paths in the READMEs resolve in the default workspace
# (must target tracked wiki/ pages — raw/ is gitignored and absent from a fresh clone)
python scripts/k.py --workspace smb-ecommerce outline wiki/sources/cac_ec_law_2018.md >/dev/null && echo "OK   example outline path"
```

Any `MISSING` line must be fixed (add the file, track it, or remove the reference) before publishing.

## Final Smoke Test

From a fresh clone:

```bash
make setup
make test
make web
```

> ⚠️ `make test` includes `npm run build`. If you are also running a Web dev server locally, stop it first — `npm run dev` and `next build` share `web/.next/`.

The first run should succeed without private files, local caches, or machine-specific assumptions. Note: `k.py health` on a fresh clone reports ~287 broken references ("raw 文件不存在") because the example workspaces' `raw/` sources are intentionally not distributed — this is expected, documented in the README/quickstart, and does not fail `make test`.
