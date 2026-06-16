import Link from "next/link";
import { notFound } from "next/navigation";
import { PageColumns } from "@/components/PageColumns";
import { PageRenderer } from "@/components/PageRenderer";
import { PageEditor } from "@/components/PageEditor";
import { FrontmatterPanel } from "@/components/FrontmatterPanel";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { OutlinePanel } from "@/components/OutlinePanel";
import { HierarchyBreadcrumb } from "@/components/HierarchyBreadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPage, getBacklinks, getOutlinks } from "@/lib/kb-service";
import { stripLeadingH1 } from "@/lib/markdown-render";
import { checkWritePermission } from "@/lib/permissions";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface PageProps {
  params: { path: string[] };
  searchParams: { mode?: string };
}

export const dynamic = "force-dynamic";

export default async function PageView({ params, searchParams }: PageProps) {
  const locale = getServerLocale();
  const relPath = params.path.map((s) => decodeURIComponent(s)).join("/");
  const editMode = searchParams.mode === "edit";

  // 先确认页面命中（含读侧白名单：my_thoughts/ 等非可读区 getPage 返回 null →
  // notFound）。命中后再并发取反链 / 出链——避免对无效 / 越权路径先做两次全库扫描。
  const page = await getPage(relPath);
  if (!page) {
    notFound();
  }

  // 命中后再一次性取反链 + 出链。BacklinksPanel 因此可以是纯 server component，
  // 避免 client 端 null→loading→data 造成的右栏闪烁。
  const [back, out] = await Promise.all([
    getBacklinks(relPath),
    getOutlinks(relPath),
  ]);

  const { frontmatter, content, raw } = page;
  const writable = checkWritePermission(relPath, raw);
  const canEdit = writable.allowed;

  let center: React.ReactNode;

  if (editMode && canEdit) {
    center = (
      <div className="h-full flex flex-col">
        <div className="mb-3">
          <PageHeader path={relPath} title={String(frontmatter.title || relPath)} locale={locale} />
        </div>
        <div className="flex-1 min-h-0">
          <PageEditor
            path={relPath}
            initialFrontmatter={frontmatter}
            initialContent={content}
          />
        </div>
      </div>
    );
  } else {
    center = (
      <div className="max-w-7xl mx-auto">
        <PageHeader
          path={relPath}
          title={String(frontmatter.title || relPath)}
          canEdit={canEdit}
          locale={locale}
        />
        {!canEdit && (
          <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {t("page.locked", locale, { reason: writable.reason || "" })}
          </div>
        )}
        <Separator className="mb-4" />
        <PageRenderer content={stripLeadingH1(content)} />
      </div>
    );
  }

  // 编辑模式下：右栏只显示 backlinks（frontmatter 在 center 的 PageEditor 内已有
  // 编辑器，避免与右栏只读面板重复）
  // 阅读模式下：右栏从上到下显示 frontmatter / outline / backlinks
  const right = editMode && canEdit ? (
    <BacklinksPanel back={back} out={out} />
  ) : (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">{t("panel.frontmatter", locale)}</h3>
        <FrontmatterPanel frontmatter={frontmatter} />
      </div>
      <Separator />
      <OutlinePanel path={relPath} />
      <Separator />
      <BacklinksPanel back={back} out={out} />
    </div>
  );

  return <PageColumns center={center} right={right} />;
}

async function PageHeader({
  path,
  title,
  canEdit,
  locale,
}: {
  path: string;
  title: string;
  canEdit?: boolean;
  locale: ReturnType<typeof getServerLocale>;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <HierarchyBreadcrumb path={path} />
      </div>
      <div className="flex gap-2 shrink-0">
        {/* 直接给 Link 套 buttonVariants className，避免 <a><button></button></a>
            interactive 嵌套（HTML 规范禁止 + screen reader 重复朗读）*/}
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ← {t("common.back", locale)}
        </Link>
        <Link
          href={`/blocks/${path}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          title={t("page.view_blocks", locale)}
        >
          {t("page.blocks", locale)}
        </Link>
        {canEdit && (
          <Link
            href={`/page/${path}?mode=edit`}
            className={buttonVariants({ size: "sm" })}
          >
            {t("page.edit", locale)}
          </Link>
        )}
      </div>
    </div>
  );
}
