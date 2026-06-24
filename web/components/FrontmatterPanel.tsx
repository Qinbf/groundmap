import type { PageFrontmatter } from "@/lib/markdown";
import { parseWikilinks } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { WikiLink } from "@/components/WikiLink";
import { getServerLocale } from "@/lib/server-locale";
import { t, type Locale, type TranslationKey } from "@/lib/i18n";

interface FrontmatterPanelProps {
  frontmatter: PageFrontmatter;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  reviewed: "success",
  draft: "warning",
  deprecated: "destructive",
};

const CONFIDENCE_VARIANT: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  high: "success",
  medium: "secondary",
  low: "warning",
};

export function FrontmatterPanel({ frontmatter }: FrontmatterPanelProps) {
  const locale = getServerLocale();
  const fm = frontmatter;
  const tags = (fm.tags || []) as string[];
  const sources = (fm.sources || []) as string[];

  return (
    <div className="space-y-3 text-sm">
      <Field label={t("fm.field.title", locale)}>
        <span className="font-medium">{fm.title || t("fm.no_title", locale)}</span>
      </Field>
      <Field label={t("fm.field.type", locale)}>
        <Badge variant="outline">
          {tType(fm.type, locale)}
        </Badge>
      </Field>
      <Field label={t("fm.field.status", locale)}>
        <Badge variant={STATUS_VARIANT[fm.status || ""] || "secondary"}>
          {tStatus(fm.status, locale)}
        </Badge>
      </Field>
      <Field label={t("fm.field.confidence", locale)}>
        <Badge variant={CONFIDENCE_VARIANT[fm.confidence || ""] || "secondary"}>
          {tConfidence(fm.confidence, locale)}
        </Badge>
      </Field>
      <Field label={t("fm.field.created_date", locale)}>
        <span className="font-mono text-xs">{fm.created_date || "—"}</span>
      </Field>
      <Field label={t("fm.field.last_modified", locale)}>
        <span className="font-mono text-xs">{fm.last_modified || "—"}</span>
        {fm.last_modified_by && (
          <span className="ml-1 text-xs text-muted-foreground">
            {t("fm.by", locale)} {fm.last_modified_by}
          </span>
        )}
      </Field>
      <Field label={t("fm.field.source_count", locale)}>
        <span className="font-mono text-xs">{fm.source_count ?? 0}</span>
      </Field>
      {tags.length > 0 && (
        <Field label={t("fm.field.tags", locale)}>
          <div className="flex flex-wrap gap-1">
            {tags.map((tg) => (
              <Badge key={tg} variant="secondary" className="text-[10px]">
                {tg}
              </Badge>
            ))}
          </div>
        </Field>
      )}
      {sources.length > 0 && (
        <Field label={t("fm.field.sources", locale)}>
          <ul className="space-y-1 text-xs">
            {sources.map((s, i) => {
              // sources 元素是带 [[]] 包裹的 wikilink 字符串。提取目标后用
              // WikiLink 渲染为可点击链接；解析失败则降级显示原文（避免空白）
              const links = parseWikilinks(s);
              if (links.length === 0) {
                return (
                  <li key={i} className="font-mono text-muted-foreground truncate" title={s}>
                    {s}
                  </li>
                );
              }
              const link = links[0];
              return (
                <li key={i} className="truncate" title={link.target}>
                  <WikiLink target={link.target} anchor={link.anchor} />
                </li>
              );
            })}
          </ul>
        </Field>
      )}
      {fm.scope && (
        <Field label={t("fm.field.scope", locale)}>
          <span className="font-mono text-xs">{String(fm.scope)}</span>
        </Field>
      )}
      {fm.page_count !== undefined && (
        <Field label={t("fm.field.page_count", locale)}>
          <span className="font-mono text-xs">{String(fm.page_count)}</span>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

// 翻译 type/status/confidence 字段值（fallback 到原值）
export function tType(value: string | undefined, locale: Locale): string {
  if (!value) return t("type.unknown", locale);
  const key = `type.${value}` as TranslationKey;
  const translated = t(key, locale);
  return translated === key ? value : translated;
}

export function tStatus(value: string | undefined, locale: Locale): string {
  if (!value) return t("status.draft", locale);
  const key = `status.${value}` as TranslationKey;
  const translated = t(key, locale);
  return translated === key ? value : translated;
}

export function tConfidence(value: string | undefined, locale: Locale): string {
  if (!value) return t("confidence.medium", locale);
  const key = `confidence.${value}` as TranslationKey;
  const translated = t(key, locale);
  return translated === key ? value : translated;
}
