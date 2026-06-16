# Why No Embeddings by Default

GroundMap does not reject embeddings as a technology. It rejects embeddings as the default foundation for a long-lived, auditable knowledge base.

The core bet is this:

> For agent-maintained knowledge, human-readable structure and source traceability matter more than approximate semantic recall.

## The Usual RAG Shape

Many RAG systems follow this pipeline:

```text
document -> chunks -> embeddings -> vector search -> retrieved fragments -> answer
```

That works well for many question-answering products, but it creates a few problems for durable knowledge management:

- chunks are not natural units of meaning,
- retrieval hides why a fragment was selected,
- adjacent context may disappear,
- citations often point to chunks rather than stable source locations,
- the system becomes harder to audit with normal Git review.

## The GroundMap Shape

GroundMap uses a different pipeline:

```text
document -> markdown with anchors -> source summary -> wiki pages -> Git review
```

Search and navigation use:

- full-text search,
- frontmatter metadata,
- backlinks,
- outlinks,
- tags,
- complete page reading,
- complete H2/H3 section reading,
- stable block anchors.

The agent reads complete semantic units and writes back structured markdown.

## Why This Helps

### Better auditability

Every important claim can point to a stable source block:

```markdown
The method improves reviewability by keeping claims attached to source anchors.
[[raw/papers/example#^p-12-a1b2c3]]
```

That citation can be reviewed in a normal diff.

### Better maintenance

A wiki page can carry status, confidence, source count, tags, and update markers. Maintenance becomes an explicit workflow rather than an invisible retrieval behavior.

### Better human-agent collaboration

Humans can read the same files agents read. Agents can leave conflict blocks, update markers, and summaries in durable places. The knowledge base remains understandable when no model is running.

### Fewer hidden dependencies

No vector database is required to start. No embedding model migration is required to keep old pages usable. A cache can be rebuilt from markdown.

## When Embeddings Might Still Make Sense

Embeddings can be useful as an optional derived index when:

- the repository is very large,
- users need fuzzy discovery across many domains,
- recall is more important than auditability for a specific workflow,
- embeddings are clearly marked as a secondary signal.

If added, embeddings should remain derived infrastructure. Markdown + Git should still be the source of truth.

## The Principle

GroundMap optimizes for knowledge that survives model changes, tool changes, and team changes.

That means:

- keep the source readable,
- preserve complete context,
- cite exact blocks,
- make maintenance visible,
- let agents reason outside the knowledge base.
