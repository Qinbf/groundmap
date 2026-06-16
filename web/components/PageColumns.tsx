import { RightPanel } from "./RightPanel";
import { EditorTabs } from "./EditorTabs";
import { HashScroller } from "./HashScroller";
import { getRightPanelCollapsed } from "@/lib/server-ui-state";

interface PageColumnsProps {
  center: React.ReactNode;
  right: React.ReactNode;
}

export function PageColumns({ center, right }: PageColumnsProps) {
  const initialCollapsed = getRightPanelCollapsed();
  return (
    <>
      <HashScroller />
      <div className="flex-1 flex flex-col min-w-0">
        <EditorTabs />
        {/* 水平内边距 px-10 = 40px：≥ 折叠态浮动按钮占位（right-3 + w-6 = 36px），
            避免按钮浮在正文边缘字符上面 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 min-w-0">
          {center}
        </main>
      </div>
      <RightPanel initialCollapsed={initialCollapsed}>{right}</RightPanel>
    </>
  );
}
