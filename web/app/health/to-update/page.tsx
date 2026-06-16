import Link from "next/link";
import { runKCli } from "@/lib/k-cli";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResolveButtons } from "@/components/ResolveButtons";
import { tType } from "@/components/FrontmatterPanel";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface Item {
  path: string;
  title: string;
  type: string;
  last_modified: string;
}

export const dynamic = "force-dynamic";

export default async function ToUpdatePage() {
  const locale = getServerLocale();
  const result = await runKCli<Item[]>(["list-to-update"]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.to_update.title", locale)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("health.to_update.desc", locale)}</p>
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
        <Card className="p-8 text-center text-muted-foreground">{t("health.to_update.empty", locale)}</Card>
      )}

      {result.ok && result.data && result.data.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("health.to_update.count", locale, { n: result.data.length })}
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
                <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
                  <Badge variant="outline">{tType(p.type, locale)}</Badge>
                  {p.last_modified && (
                    <span className="text-xs text-muted-foreground font-mono">{p.last_modified}</span>
                  )}
                </div>
              </div>
              <ResolveButtons
                path={p.path}
                actions={[
                  {
                    labelKey: "action.clear_to_be_updated",
                    confirmKey: "action.clear_to_be_updated_confirm",
                    vars: { path: p.path },
                    action: "remove_to_be_updated",
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
