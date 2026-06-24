import Link from "next/link";
import { pageExists } from "@/lib/kb-service";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

/**
 * Server-rendered hierarchical breadcrumb.
 * 例：wiki/concepts/transformer.md → wiki / concepts / transformer
 *
 * 索引解析（按优先级）：
 *   1. "wiki" 段（顶层） → wiki/root_index.md
 *   2. <accumulated>/index.md
 *   3. wiki/indexes/<segment>_index.md
 *   4. wiki/indexes/<segment>.md
 *   5. 都不存在 → 该段不可点击
 */
async function resolveSegmentTarget(
  accumulated: string,
  segment: string,
): Promise<string | null> {
  if (accumulated === "wiki" && segment === "wiki") {
    if (await pageExists("wiki/root_index.md")) return "wiki/root_index.md";
  }
  const candidates = [
    `${accumulated}/index.md`,
    `wiki/indexes/${segment}_index.md`,
    `wiki/indexes/${segment}.md`,
  ];
  for (const c of candidates) {
    if (await pageExists(c)) return c;
  }
  return null;
}

export async function HierarchyBreadcrumb({ path }: { path: string }) {
  const locale = getServerLocale();
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items: { label: string; href: string | null; isLast: boolean }[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc = acc ? `${acc}/${seg}` : seg;
    const isLast = i === segments.length - 1;
    let href: string | null = null;
    if (!isLast) {
      const target = await resolveSegmentTarget(acc, seg);
      href = target ? `/page/${target}` : null;
    }
    const label = isLast ? seg.replace(/\.md$/, "") : seg;
    items.push({ label, href, isLast });
  }

  return (
    <nav
      aria-label={t("nav.aria.breadcrumb", locale)}
      className="text-xs font-mono text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5"
    >
      {items.map((it, idx) => (
        <span key={idx} className="flex items-center gap-1">
          {idx > 0 && (
            <span aria-hidden="true" className="text-muted-foreground/50">
              /
            </span>
          )}
          {it.href ? (
            <Link
              href={it.href}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {it.label}
            </Link>
          ) : (
            <span
              className={
                it.isLast ? "text-foreground font-semibold" : "text-muted-foreground"
              }
            >
              {it.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
