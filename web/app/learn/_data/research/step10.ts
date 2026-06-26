import "server-only";
import type { StepData } from "../types";

export const step10: StepData = {
  id: 10,
  titleKey: "learn.step.10.title",
  whyKey: "learn.step.10.why",
  whatCommand: `git add wiki/sources/rag_lewis_2020.md \\
        wiki/concepts/retrieval_augmented_generation.md \\
        wiki/concepts/dense_passage_retrieval.md \\
        wiki/concepts/parametric_memory.md \\
        wiki/concepts/open_domain_qa.md \\
        wiki/concepts/seq2seq.md \\
        wiki/concepts/hallucination.md \\
        wiki/indexes/nlp_index.md \\
        log.md
git commit -m "ingest: Retrieval-Augmented Generation (Lewis et al., 2020)"`,
  whatNoteKey: "learn.cmd.note.git_commit",
  focusAnchors: [],
  results: [
    {
      kind: "commit",
      hash: "7c3f4a2",
      message: "ingest: Retrieval-Augmented Generation (Lewis et al., 2020)",
      files: [
        { path: "wiki/sources/rag_lewis_2020.md", changeKind: "created" },
        { path: "wiki/concepts/retrieval_augmented_generation.md", changeKind: "created" },
        { path: "wiki/concepts/dense_passage_retrieval.md", changeKind: "created" },
        { path: "wiki/concepts/parametric_memory.md", changeKind: "modified" },
        { path: "wiki/concepts/open_domain_qa.md", changeKind: "modified" },
        { path: "wiki/concepts/seq2seq.md", changeKind: "tagged" },
        { path: "wiki/concepts/hallucination.md", changeKind: "tagged" },
        { path: "wiki/indexes/nlp_index.md", changeKind: "modified" },
        { path: "log.md", changeKind: "log" },
      ],
      captionKey: "learn.caption.commit_scope",
    },
  ],
  concepts: [
    { termKey: "learn.concept.git.title", bodyKey: "learn.concept.git.body" },
  ],
};
