import Link from "next/link";
import { PageColumns } from "@/components/PageColumns";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

/**
 * /page/[...path] 调 notFound() 时的兜底页。
 * 放在 (shell)/page/[...path]/ 下，让 404 仍然挂在 shell layout 内：
 * 顶部 header / 左栏 wiki tree / 右栏区域全部保留——用户不会突然失去
 * 导航能力，可以直接从左栏点别的页面。
 */
export default function PageNotFound() {
  const locale = getServerLocale();
  const center = (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="mb-3 text-6xl font-bold text-muted-foreground/30 select-none">
        404
      </div>
      <h1 className="mb-2 text-2xl font-semibold">{t("notfound.page.title", locale)}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("notfound.page.desc", locale)}
      </p>
      <div className="flex justify-center gap-3 text-sm">
        <Link
          href="/"
          className="rounded border px-3 py-1.5 hover:bg-accent transition-colors"
        >
          {t("notfound.page.back_home", locale)}
        </Link>
        <span className="rounded border px-3 py-1.5 text-muted-foreground">
          {t("notfound.page.back_tree", locale)}
        </span>
      </div>
    </div>
  );

  // 右栏保留为空 div：保持三栏骨架，视觉上不会因为 404 突然只剩主区
  return <PageColumns center={center} right={<div />} />;
}
