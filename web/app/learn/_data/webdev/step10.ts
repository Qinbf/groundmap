import "server-only";
import type { StepData } from "../types";

export const step10: StepData = {
  id: 10,
  titleKey: "learn.step.10.title",
  whyKey: "learn.step.10.why",
  whatCommand: `git add wiki/sources/react_server_components_rfc.md \\
        wiki/concepts/server_component.md \\
        wiki/concepts/data_fetching.md \\
        wiki/concepts/rendering_strategies.md \\
        wiki/concepts/component_model.md \\
        wiki/concepts/bundle_optimization.md \\
        wiki/indexes/web_dev_index.md \\
        log.md
git commit -m "ingest: React Server Components RFC (Meta, 2020)"`,
  whatNoteKey: "learn.cmd.note.git_commit",
  focusAnchors: [],
  results: [
    {
      kind: "commit",
      hash: "9bf3e2a",
      message: "ingest: React Server Components RFC (Meta, 2020)",
      files: [
        { path: "wiki/sources/react_server_components_rfc.md", changeKind: "created" },
        { path: "wiki/concepts/server_component.md", changeKind: "modified" },
        { path: "wiki/concepts/data_fetching.md", changeKind: "modified" },
        { path: "wiki/concepts/rendering_strategies.md", changeKind: "modified" },
        { path: "wiki/concepts/component_model.md", changeKind: "tagged" },
        { path: "wiki/concepts/bundle_optimization.md", changeKind: "tagged" },
        { path: "wiki/indexes/web_dev_index.md", changeKind: "modified" },
        { path: "log.md", changeKind: "log" },
      ],
      captionKey: "learn.caption.commit_scope",
    },
  ],
  concepts: [
    { termKey: "learn.concept.git.title", bodyKey: "learn.concept.git.body" },
  ],
};
