import "server-only";
import type { StepData } from "../types";

export const step10: StepData = {
  id: 10,
  titleKey: "learn.step.10.title",
  whyKey: "learn.step.10.why",
  whatCommand: `git add wiki/sources/attention_is_all_you_need.md \\
        wiki/concepts/transformer.md \\
        wiki/concepts/positional_encoding.md \\
        wiki/concepts/attention_mechanism.md \\
        wiki/concepts/sequence_modeling.md \\
        wiki/concepts/encoder_decoder.md \\
        wiki/concepts/lstm.md \\
        wiki/indexes/deep_learning_index.md \\
        log.md
git commit -m "ingest: Attention Is All You Need (Vaswani et al., 2017)"`,
  whatNoteKey: "learn.cmd.note.git_commit",
  focusAnchors: [],
  results: [
    {
      kind: "commit",
      hash: "7c3f4a2",
      message: "ingest: Attention Is All You Need (Vaswani et al., 2017)",
      files: [
        { path: "wiki/sources/attention_is_all_you_need.md", changeKind: "created" },
        { path: "wiki/concepts/transformer.md", changeKind: "created" },
        { path: "wiki/concepts/positional_encoding.md", changeKind: "created" },
        { path: "wiki/concepts/attention_mechanism.md", changeKind: "modified" },
        { path: "wiki/concepts/sequence_modeling.md", changeKind: "modified" },
        { path: "wiki/concepts/encoder_decoder.md", changeKind: "tagged" },
        { path: "wiki/concepts/lstm.md", changeKind: "tagged" },
        { path: "wiki/indexes/deep_learning_index.md", changeKind: "modified" },
        { path: "log.md", changeKind: "log" },
      ],
      captionKey: "learn.caption.commit_scope",
    },
  ],
  concepts: [
    { termKey: "learn.concept.git.title", bodyKey: "learn.concept.git.body" },
  ],
};
