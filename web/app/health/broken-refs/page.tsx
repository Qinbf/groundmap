import Link from "next/link";
import { runKCli } from "@/lib/k-cli";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface BrokenRef {
  from_path: string;
  from_title: string;
  line: number;
  target: string;
  anchor: string;
  reason: string;
}

export const dynamic = "force-dynamic";

export default async function BrokenRefsPage() {
  const locale = getServerLocale();
  const result = await runKCli<BrokenRef[]>(["list-broken-refs"]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.broken_refs.title", locale)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("health.broken_refs.desc", locale)}
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
          {t("health.broken_refs.empty", locale)}
        </Card>
      )}

      {result.ok && result.data && result.data.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("health.broken_refs.count", locale, { n: result.data.length })}
          </p>
          {result.data.map((r, i) => (
            <BrokenRefCard key={i} ref_={r} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function BrokenRefCard({
  ref_,
  locale,
}: {
  ref_: BrokenRef;
  locale: ReturnType<typeof getServerLocale>;
}) {
  const reasonKey =
    ref_.reason.includes("anchor")
      ? ("health.broken_refs.reason.anchor_missing" as const)
      : ("health.broken_refs.reason.file_missing" as const);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/page/${ref_.from_path}?mode=edit`}
          className="font-semibold hover:underline truncate"
          title={ref_.from_title}
        >
          {ref_.from_title}
        </Link>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {ref_.from_path}:{ref_.line}
        </span>
      </div>
      <div className="text-xs flex items-center gap-2 flex-wrap">
        <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
          {t(reasonKey, locale)}
        </Badge>
        <code className="font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
          [[{ref_.target}#^{ref_.anchor}]]
        </code>
      </div>
    </Card>
  );
}
