import { TopHeader } from "@/components/TopHeader";

/**
 * Walkthrough 子树共享顶栏。
 * 与 learn/ 类似：单页长滚动叙事，需要更宽横向空间，不放在 (shell) 路由组里。
 */
export default function WalkthroughLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      <TopHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
