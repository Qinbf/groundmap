import Link from "next/link";
import { PageColumns } from "@/components/PageColumns";
import { PageRenderer } from "@/components/PageRenderer";
import { getPage, listPages, type PageMeta } from "@/lib/kb-service";
import { stripLeadingH1 } from "@/lib/markdown-render";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

export default async function Home() {
  const locale = getServerLocale();

  const rootIndexPath = "wiki/root_index.md";
  const [rootPage, allPages] = await Promise.all([
    getPage(rootIndexPath),
    listPages(),
  ]);

  let center: React.ReactNode;
  const right = <Stats pages={allPages} locale={locale} />;

  if (rootPage) {
    center = (
      <Welcome
        title={String(rootPage.frontmatter.title || t("app.name", locale))}
        content={stripLeadingH1(rootPage.content)}
        path={rootIndexPath}
        locale={locale}
      />
    );
  } else {
    center = <EmptyState locale={locale} />;
  }

  return <PageColumns center={center} right={right} />;
}

function Welcome({
  title,
  content,
  path,
  locale,
}: {
  title: string;
  content: string;
  path: string;
  locale: ReturnType<typeof getServerLocale>;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-3xl font-bold leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.subtitle", locale)}</p>
        </div>
        <Link
          href={`/page/${path}`}
          className="text-sm text-primary hover:underline whitespace-nowrap"
        >
          {t("home.open_root", locale)}
        </Link>
      </div>
      <PageRenderer content={content} />
    </div>
  );
}

function EmptyState({ locale }: { locale: ReturnType<typeof getServerLocale> }) {
  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <h1 className="mb-3 text-3xl font-bold">{t("app.name", locale)}</h1>
      <p className="mb-6 text-muted-foreground">{t("home.empty_msg", locale)}</p>
      <div className="flex justify-center gap-3 text-sm">
        <Link href="/health" className="rounded border px-3 py-1.5 hover:bg-accent">
          {t("nav.health", locale)}
        </Link>
        <a
          href="/api/pages/tree"
          className="rounded border px-3 py-1.5 hover:bg-accent font-mono text-xs"
        >
          /api/pages/tree
        </a>
      </div>
    </div>
  );
}

/** 把 [key,count] 列表按 count 降序排，纯展示层用。 */
function countBy(pages: PageMeta[], pick: (p: PageMeta) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const p of pages) {
    const k = pick(p);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function Stats({
  pages,
  locale,
}: {
  pages: PageMeta[];
  locale: ReturnType<typeof getServerLocale>;
}) {
  const totalPages = pages.length;
  const byType = countBy(pages, (p) => p.type);
  const byStatus = countBy(pages, (p) => p.status);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("home.overview", locale)}</h3>
        <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
          {t("home.subtitle", locale)}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("home.total_pages", locale)}</span>
            <span className="font-mono font-semibold">{totalPages}</span>
          </div>
        </div>
      </div>

      {byType.length > 0 && (
        <Distribution
          title={t("home.by_type", locale)}
          rows={byType}
          total={totalPages}
          labelOf={(k) => {
            // t() 在 key 缺失时返回 key 本身，故用 ===-比对而非 || 兜底（schema 外的脏 type 显示裸值）
            const label = t(`type.${k}` as never, locale);
            return label === `type.${k}` ? k : label;
          }}
        />
      )}

      {byStatus.length > 0 && (
        <Distribution
          title={t("home.by_status", locale)}
          rows={byStatus}
          total={totalPages}
          labelOf={(k) => {
            const label = t(`status.${k}` as never, locale);
            return label === `status.${k}` ? k : label;
          }}
        />
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("home.shortcuts", locale)}</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href="/health" className="text-primary hover:underline">
              {t("home.health_link", locale)}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** 一组分布：标题 + 每项「标签 / 计数 / 占比条」。纯展示，无新数据源。 */
function Distribution({
  title,
  rows,
  total,
  labelOf,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  labelOf: (key: string) => string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5 text-xs">
        {rows.map(([key, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={key}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">{labelOf(key)}</span>
                <span className="shrink-0 font-mono text-foreground/80">{count}</span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
