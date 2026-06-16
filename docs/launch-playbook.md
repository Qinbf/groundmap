# Launch Playbook

This document is about making GroundMap understandable, memorable, and easy to try.

## Positioning

Short version:

> GroundMap is a source-grounded knowledge map for humans and AI agents.

Longer version:

> It keeps long-lived knowledge in Markdown, uses stable source anchors for citations, and lets external agents read complete pages instead of retrieving arbitrary vector chunks.

## Audience

Primary:

- AI engineers building agent workflows,
- technical founders,
- consultants building AI systems for SMBs,
- knowledge management nerds,
- developers skeptical of opaque RAG pipelines.

Secondary:

- researchers,
- technical writers,
- developer tool builders,
- local-first software users.

## Launch Assets

Prepare these before posting:

- GitHub repository with CI passing.
- 90-second screen recording.
- One clear architecture diagram.
- One "why no embeddings by default" article.
- One demo workspace.
- A short comparison table against classic RAG.
- A pinned discussion for feedback.

## README First Screen

The first screen should answer:

- What is it?
- Why is it different?
- Can I run it in five minutes?
- Is there a screenshot or diagram?

Avoid burying the core idea below installation details.

## Demo Video Outline

1. Show the Web console.
2. Open a concept page with citations.
3. Jump to a source anchor.
4. Run `python scripts/k.py health --json`.
5. Show a conflict or `to-be-updated` marker.
6. Explain: "This is knowledge maintenance as code review."

## Launch Post Draft

```text
I built GroundMap: a source-grounded knowledge map for humans and AI agents.

Instead of chunking everything into a vector DB, it keeps knowledge in Markdown, attaches claims to stable source anchors, and lets agents read complete pages/sections.

The goal: make AI knowledge bases auditable, diffable, and maintainable.

Repo: <link>
Demo: <link>
```

## Where to Share

- GitHub trending-friendly launch post,
- Hacker News "Show HN",
- Reddit communities focused on local-first, LLMs, and knowledge management,
- X/Twitter thread with diagram + demo GIF,
- LinkedIn post for SMB AI consulting audience,
- Chinese tech communities with the Chinese README.

## What to Avoid

- Overclaiming that embeddings are always bad.
- Positioning as a chatbot.
- Shipping with private data.
- Making users configure an LLM key before they understand the architecture.
- Launching without a demo that works from a fresh clone.

## Star Growth Loops

- Convert every common question into docs.
- Keep issues friendly and fast.
- Label good first issues.
- Publish short design notes instead of only code changes.
- Make examples easy to fork.
- Keep the project opinionated enough to be memorable.
