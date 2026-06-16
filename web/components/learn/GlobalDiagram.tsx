"use client";
import { FileInput, ListTree, FileText, Network, BookOpen, ScrollText, GitCommit } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import type { LucideIcon } from "lucide-react";

interface DiagramNode {
  icon: LucideIcon;
  labelKey: Parameters<ReturnType<typeof useT>>[0];
}

const NODES: DiagramNode[] = [
  { icon: FileInput, labelKey: "learn.diagram.raw" },
  { icon: ListTree, labelKey: "learn.diagram.outline" },
  { icon: FileText, labelKey: "learn.diagram.summary" },
  { icon: Network, labelKey: "learn.diagram.wiki" },
  { icon: BookOpen, labelKey: "learn.diagram.moc" },
  { icon: ScrollText, labelKey: "learn.diagram.log" },
  { icon: GitCommit, labelKey: "learn.diagram.commit" },
];

/**
 * Hero 区横向流程图：raw → outline → summary → wiki → MOC → log → commit
 * 一眼看完整 ingest 走的是这七站。
 */
export function GlobalDiagram() {
  const t = useT();
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-1 min-w-max">
        {NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border min-w-[88px]">
                <Icon className="h-5 w-5 text-foreground/70" />
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  {t(node.labelKey)}
                </span>
              </div>
              {i < NODES.length - 1 && (
                <div className="px-1 text-muted-foreground/50 text-sm select-none">→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
