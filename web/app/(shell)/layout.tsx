import { WikiTree } from "@/components/WikiTree";
import { LeftPanel } from "@/components/LeftPanel";
import { TopHeader } from "@/components/TopHeader";
import { getLeftPanelCollapsed } from "@/lib/server-ui-state";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const leftCollapsed = getLeftPanelCollapsed();
  return (
    <div className="flex flex-col h-screen">
      <TopHeader />
      <div className="flex flex-1 min-h-0 min-w-0">
        <LeftPanel initialCollapsed={leftCollapsed}>
          <WikiTree />
        </LeftPanel>
        {/* min-w-0 关键：否则中间 flex 容器会被 tab 条 / 长内容撑宽，
            导致 tab 条永远不溢出（容器宽度 = 内容宽度），失去横滚效果 */}
        <div className="flex-1 min-h-0 min-w-0 flex">{children}</div>
      </div>
    </div>
  );
}
