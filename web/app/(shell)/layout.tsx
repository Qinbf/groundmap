import { Suspense } from "react";
import { WikiTree } from "@/components/WikiTree";
import { LeftPanel } from "@/components/LeftPanel";
import { TopHeader } from "@/components/TopHeader";
import { ScrollMemory } from "@/components/ScrollMemory";
import { getLeftPanelCollapsed, getLeftPanelWidth } from "@/lib/server-ui-state";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const leftCollapsed = getLeftPanelCollapsed();
  const leftWidth = getLeftPanelWidth();
  return (
    <div className="flex flex-col h-screen">
      {/* 跨 /、/page/*、/blocks/* 记忆并还原主阅读区滚动位置（按历史条目）。
          useSearchParams 需在 Suspense 边界内；渲染 null 故无 fallback。 */}
      <Suspense fallback={null}>
        <ScrollMemory />
      </Suspense>
      <TopHeader />
      <div className="flex flex-1 min-h-0 min-w-0">
        <LeftPanel initialCollapsed={leftCollapsed} initialWidth={leftWidth}>
          <WikiTree />
        </LeftPanel>
        {/* min-w-0 关键：否则中间 flex 容器会被 tab 条 / 长内容撑宽，
            导致 tab 条永远不溢出（容器宽度 = 内容宽度），失去横滚效果 */}
        <div className="flex-1 min-h-0 min-w-0 flex">{children}</div>
      </div>
    </div>
  );
}
