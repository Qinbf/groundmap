# Contributing

Thanks for helping improve GroundMap. This project is opinionated by design: it is a Git-native knowledge base for external AI agents, not a hidden RAG service.

## Development Setup

```bash
make setup
make test
make web
```

Manual setup:

```bash
python -m pip install -r requirements-dev.txt
cd web && npm install && cd ..
python -m pytest scripts/tests
cd web && npm run lint && npm run build
```

## Before Opening a PR

Run:

```bash
make test
git diff --check
```

If your change touches wiki parsing, links, anchors, or health checks, add or update tests under `scripts/tests/`.

If your change touches the Web UI, run:

```bash
cd web
npm run lint
npm run build
```

## Design Invariants

Please preserve these constraints:

- Markdown + Git remain the source of truth.
- The core knowledge base must not embed LLM SDK calls or agent runtimes.
- Retrieval must not depend on embeddings or vector stores by default.
- Tools should return complete pages or complete sections, not arbitrary chunks.
- `raw/**`, `my_thoughts/**`, `#human-only`, and `locked: true` content must stay protected.
- Deletes should be represented as `status: deprecated`, not physical removal.
- Substantive claims in wiki pages should cite source blocks when possible.

## Good First Contributions

- Improve onboarding docs.
- Add tests around `scripts/k.py`.
- Improve error messages.
- Make the Web console easier to scan.
- Add demo content with redistributable sources.
- Improve CI reliability.

## Commit Style

Use short, descriptive commit messages:

```text
docs: explain anchor citation model
test: cover broken source links
web: improve health dashboard empty state
cli: add json output to list-conflicts
```

## Security and Private Data

Do not include private notes, proprietary raw documents, customer data, API keys, or personal knowledge base content in PRs. Public demo data must be redistributable.
