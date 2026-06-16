import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runKCli } from "@/lib/k-cli";
import { getServerLocale } from "@/lib/server-locale";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

interface HealthData {
  total_pages: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_confidence: Record<string, number>;
  orphans_count: number;
  conflicts_count: number;
  to_update_count: number;
  low_confidence_count: number;
  stale_drafts_count: number;
  broken_refs_count: number;
  last_check: string;
}

export async function HealthDashboard() {
  const locale = getServerLocale();
  const result = await runKCli<HealthData>(["health"]);

  if (!result.ok) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("health.title", locale)}</h1>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {t("common.error_kcli", locale, { err: result.error || "" })}
        </div>
      </div>
    );
  }

  const data = result.data!;

  const cards = [
    {
      label: t("health.card.total_pages", locale),
      value: data.total_pages,
      tone: "neutral" as const,
      href: undefined,
    },
    {
      label: t("health.card.orphans", locale),
      value: data.orphans_count,
      tone: data.orphans_count > 0 ? "warning" : "ok",
      href: data.orphans_count > 0 ? "/health/orphans" : undefined,
    },
    {
      label: t("health.card.conflicts", locale),
      value: data.conflicts_count,
      tone: data.conflicts_count > 0 ? "danger" : "ok",
      href: data.conflicts_count > 0 ? "/health/conflicts" : undefined,
    },
    {
      label: t("health.card.to_update", locale),
      value: data.to_update_count,
      tone: data.to_update_count > 0 ? "warning" : "ok",
      href: data.to_update_count > 0 ? "/health/to-update" : undefined,
    },
    {
      label: t("health.card.low_confidence", locale),
      value: data.low_confidence_count,
      tone: data.low_confidence_count > 0 ? "warning" : "ok",
      href: data.low_confidence_count > 0 ? "/health/low-confidence" : undefined,
    },
    {
      label: t("health.card.stale_drafts", locale),
      value: data.stale_drafts_count,
      tone: data.stale_drafts_count > 0 ? "warning" : "ok",
      href: data.stale_drafts_count > 0 ? "/health/stale-drafts" : undefined,
    },
    {
      label: t("health.card.broken_refs", locale),
      value: data.broken_refs_count ?? 0,
      tone: (data.broken_refs_count ?? 0) > 0 ? "danger" : "ok",
      href: (data.broken_refs_count ?? 0) > 0 ? "/health/broken-refs" : undefined,
    },
  ] as const;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("health.title", locale)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("health.last_check", locale, { date: data.last_check })}
          </p>
        </div>
        <Link href="/" className="text-sm text-primary hover:underline whitespace-nowrap">
          {t("health.return_browse", locale)}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <HealthCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DistributionCard
          title={t("health.dist.by_type", locale)}
          data={data.by_type}
          field="type"
          locale={locale}
        />
        <DistributionCard
          title={t("health.dist.by_status", locale)}
          data={data.by_status}
          field="status"
          locale={locale}
        />
        <DistributionCard
          title={t("health.dist.by_confidence", locale)}
          data={data.by_confidence}
          field="confidence"
          locale={locale}
        />
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "ok" | "warning" | "danger" | "neutral";
  href?: string;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : "border-border";
  const valueClass =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "danger"
      ? "text-destructive"
      : "";

  const inner = (
    <Card className={`${toneClass} transition-shadow hover:shadow-md`}>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** 把分布卡片的 key 翻译为对应字段的展示文字（type/status/confidence）。
 *  如果 i18n 表里没有对应翻译就回退为原 key——保证未来加新字段值不会显示 "undefined"。
 */
function translateDistributionKey(field: "type" | "status" | "confidence", key: string, locale: Locale): string {
  const candidate = `${field}.${key}` as TranslationKey;
  const translated = t(candidate, locale);
  // t() 找不到时返回 key 本身——和 candidate 字面相同就说明没翻译，回退原始 key
  return translated === candidate ? key : translated;
}

function DistributionCard({
  title,
  data,
  field,
  locale,
}: {
  title: string;
  data: Record<string, number>;
  field: "type" | "status" | "confidence";
  locale: Locale;
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ul className="space-y-1.5 text-sm">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span className="text-muted-foreground">
                {translateDistributionKey(field, k, locale)}
              </span>
              <span className="font-mono font-semibold">{v}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
