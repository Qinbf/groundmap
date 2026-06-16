import { TopHeader } from "@/components/TopHeader";

/**
 * Graph 子树共享顶栏。与全站一致走 light 主题——图谱画布自身的浅色配色在
 * GraphView 内实现（节点 / 边 / 图例 / 浮窗均用全站设计 token）。
 * 不挂左 / 右栏：图谱是全幅画布，三栏会挤占空间。
 */
export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <TopHeader />
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
