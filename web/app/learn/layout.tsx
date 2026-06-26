import { TopHeader } from "@/components/TopHeader";

/**
 * Learn 子树共享顶栏。教学演示页是单页长滚动叙事，需要更宽横向空间，
 * 因此不放在 (shell) 路由组里——避免被左侧 WikiTree 挤占空间。
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <TopHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
