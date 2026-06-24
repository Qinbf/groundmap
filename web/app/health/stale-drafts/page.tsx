import Link from "next/link";
import { runKCli } from "@/lib/k-cli";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResolveButtons } from "@/components/ResolveButtons";
import { tType, tStatus } from "@/components/FrontmatterPanel";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface Page {
  path: string;
  title: string;
  type: string;
  status: string;
  confidence: string;
  last_modified: string;
}

export const dynamic = "force-dynamic";

const STALE_DAYS = 30;

export default async function StaleDraftsPage() {
  const locale = getServerLocale();
  const result = await runKCli<Page[]>(["list-pages", "--status=draft"]);

  let stale: Page[] = [];
  if (result.ok && result.data) {
    const now = Date.now();
    const threshold = STALE_DAYS * 24 * 60 * 60 * 1000;
    stale = result.data.filter((p) => {
      if (!p.last_modified) return false;
      const ts = new Date(p.last_modified).getTime();
      if (Number.isNaN(ts)) return false;
      return now - ts > threshold;
    });
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.stale.title", locale, { days: STALE_DAYS })}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("health.stale.desc", locale, { days: STALE_DAYS })}
          </p>
        </div>
        <Link href="/health" className="text-sm text-primary hover:underline whitespace-nowrap">
          {t("health.return_dashboard", locale)}
        </Link>
      </div>

      {!result.ok && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {t("common.error_kcli", locale, { err: result.error || "" })}
        </div>
      )}

      {result.ok && stale.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">{t("health.stale.empty", locale)}</Card>
      )}

      {stale.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("health.stale.count", locale, { n: stale.length })}
          </p>
          {stale.map((p) => (
            <Card key={p.path} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/page/${p.path}`} className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.path}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
                  <Badge variant="outline">{tType(p.type, locale)}</Badge>
                  <Badge variant="warning">{tStatus(p.status, locale)}</Badge>
                  {p.last_modified && (
                    <span className="text-xs text-muted-foreground font-mono">{p.last_modified}</span>
                  )}
                </div>
              </div>
              <ResolveButtons
                path={p.path}
                actions={[
                  {
                    labelKey: "action.review",
                    confirmKey: "action.review_confirm",
                    vars: { path: p.path },
                    action: "set_status_reviewed",
                    variant: "default",
                  },
                ]}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
