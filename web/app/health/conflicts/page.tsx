import Link from "next/link";
import { runKCli } from "@/lib/k-cli";
import { Card } from "@/components/ui/card";
import { ResolveButtons } from "@/components/ResolveButtons";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface Conflict {
  path: string;
  title: string;
  block: string;
  line: number;
}

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  const locale = getServerLocale();
  const result = await runKCli<Conflict[]>(["list-conflicts"]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.conflicts.title", locale)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("health.conflicts.desc", locale)}
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
          {t("health.conflicts.empty", locale)}
        </Card>
      )}

      {result.ok && result.data && result.data.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("health.conflicts.count", locale, { n: result.data.length })}
          </p>
          {result.data.map((c, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link href={`/page/${c.path}`} className="font-semibold hover:underline">
                  {c.title}
                </Link>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {c.path}:{c.line}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded overflow-x-auto font-mono">
                {c.block.replace(/^\n+/, "")}
              </pre>
              <ResolveButtons
                path={c.path}
                actions={[
                  {
                    labelKey: "action.adopt_new",
                    promptKey: "action.adopt_new_prompt",
                    payloadField: "newClaim",
                    action: "resolve_conflict_adopt_new",
                    variant: "default",
                  },
                  {
                    labelKey: "action.merge",
                    promptKey: "action.merge_prompt",
                    payloadField: "mergedText",
                    action: "resolve_conflict_merge",
                    variant: "default",
                  },
                  {
                    labelKey: "action.keep_old",
                    confirmKey: "action.keep_old_confirm",
                    action: "resolve_conflict_keep_old",
                    variant: "outline",
                  },
                  {
                    labelKey: "action.keep_watching",
                    confirmKey: "action.keep_watching_confirm",
                    action: "resolve_conflict_keep_watching",
                    variant: "secondary",
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
