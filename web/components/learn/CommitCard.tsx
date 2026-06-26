"use client";
import { GitCommit, FileText } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";
import type { CommitChangeKind, CommitFile } from "@/app/learn/_data/types";

interface CommitCardProps {
  hash: string;
  message: string;
  files: CommitFile[];
  captionKey?: TranslationKey;
}

/** changeKind → i18n 徽章 key（路径本身不翻译，注记走 i18n） */
const CHANGE_KIND_KEY: Record<CommitChangeKind, TranslationKey> = {
  created: "learn.commit.created",
  modified: "learn.commit.modified",
  tagged: "learn.commit.tagged",
  log: "learn.commit.log",
};

const CHANGE_KIND_CLASS: Record<CommitChangeKind, string> = {
  created:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  modified: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  tagged: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  log: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
};

export function CommitCard({ hash, message, files, captionKey }: CommitCardProps) {
  const t = useT();
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b">
        <GitCommit className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("learn.commit.hash_label")}
        </span>
        <code className="text-xs font-mono text-foreground">{hash}</code>
      </div>
      <div className="px-4 py-3 border-b">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {t("learn.commit.message_label")}
        </div>
        <div className="font-mono text-sm text-foreground">{message}</div>
      </div>
      <div className="px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          {t("learn.commit.files_label")} · {files.length}
        </div>
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate font-mono text-foreground/80">{f.path}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none ${CHANGE_KIND_CLASS[f.changeKind]}`}
              >
                {t(CHANGE_KIND_KEY[f.changeKind])}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {captionKey && (
        <div className="px-4 py-2 bg-muted/20 border-t text-xs text-muted-foreground italic">
          {t(captionKey)}
        </div>
      )}
      <div className="px-4 py-2 bg-muted/20 border-t text-xs text-muted-foreground italic">
        {t("learn.commit.what_is")}
      </div>
    </div>
  );
}
