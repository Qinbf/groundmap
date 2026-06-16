import Link from "next/link";
import { runKCli } from "@/lib/k-cli";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResolveButtons } from "@/components/ResolveButtons";
import { tType, tStatus } from "@/components/FrontmatterPanel";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface Orphan {
  path: string;
  title: string;
  type: string;
  status: string;
  confidence: string;
  last_modified: string;
}

export const dynamic = "force-dynamic";

export default async function OrphansPage() {
  const locale = getServerLocale();
  const result = await runKCli<Orphan[]>(["list-orphans"]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.orphans.title", locale)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("health.orphans.desc", locale)}
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

      {result.ok && result.data && result.data.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          {t("health.orphans.empty", locale)}
        </Card>
      )}

      {result.ok && result.data && result.data.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("health.orphans.count", locale, { n: result.data.length })}
          </p>
          {result.data.map((p) => (
            <Card key={p.path} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/page/${p.path}`} className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.path}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <Badge variant="outline">{tType(p.type, locale)}</Badge>
                  <Badge variant="secondary">{tStatus(p.status, locale)}</Badge>
                </div>
              </div>
              <ResolveButtons
                path={p.path}
                actions={[
                  {
                    labelKey: "action.deprecate",
                    confirmKey: "action.deprecate_confirm",
                    vars: { path: p.path },
                    action: "set_status_deprecated",
                    variant: "outline",
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
