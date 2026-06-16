import { TopHeader } from "@/components/TopHeader";

/**
 * Health 子树共享顶栏 + 简单滚动容器。
 * 不挂左/右栏：health 仪表板自身就是结构化卡片，三栏会喧宾夺主。
 */
export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <TopHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
