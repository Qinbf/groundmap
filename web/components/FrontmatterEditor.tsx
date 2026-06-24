"use client";
import { useState } from "react";
import type { PageFrontmatter } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-client";

const TYPE_OPTIONS = ["entity", "concept", "source_summary", "analysis", "comparison", "index"];
const STATUS_OPTIONS = ["draft", "reviewed", "deprecated"];
const CONFIDENCE_OPTIONS = ["high", "medium", "low"];
const MODIFIED_BY_OPTIONS = ["LLM", "Human"];

interface FrontmatterEditorProps {
  value: PageFrontmatter;
  onChange: (next: PageFrontmatter) => void;
}

export function FrontmatterEditor({ value, onChange }: FrontmatterEditorProps) {
  const t = useT();
  const [tagInput, setTagInput] = useState("");

  function set<K extends keyof PageFrontmatter>(key: K, v: PageFrontmatter[K]) {
    onChange({ ...value, [key]: v });
  }

  const tags = (value.tags || []) as string[];
  const sources = (value.sources || []) as string[];

  function addTag() {
    const tg = tagInput.trim();
    if (!tg) return;
    if (tags.includes(tg)) return;
    set("tags", [...tags, tg]);
    setTagInput("");
  }

  function removeTag(tg: string) {
    set("tags", tags.filter((x) => x !== tg));
  }

  return (
    <div className="space-y-3 text-sm">
      <Row label={t("fm.field.title")}>
        <input
          type="text"
          value={value.title || ""}
          onChange={(e) => set("title", e.target.value)}
          className="w-full rounded border bg-background px-2 py-1 text-sm"
        />
      </Row>
      <Row label={t("fm.field.type")}>
        <Select
          value={value.type}
          options={TYPE_OPTIONS}
          renderOption={(o) => t(`type.${o}` as never) || o}
          onChange={(v) => set("type", v)}
        />
      </Row>
      <Row label={t("fm.field.status")}>
        <Select
          value={value.status}
          options={STATUS_OPTIONS}
          renderOption={(o) => t(`status.${o}` as never) || o}
          onChange={(v) => set("status", v)}
        />
      </Row>
      <Row label={t("fm.field.confidence")}>
        <Select
          value={value.confidence}
          options={CONFIDENCE_OPTIONS}
          renderOption={(o) => t(`confidence.${o}` as never) || o}
          onChange={(v) => set("confidence", v)}
        />
      </Row>
      <Row label={t("fm.field.last_modified_by")}>
        <Select
          value={value.last_modified_by}
          options={MODIFIED_BY_OPTIONS}
          onChange={(v) => set("last_modified_by", v)}
        />
      </Row>
      <Row label={t("fm.field.last_modified")}>
        <DateInput value={value.last_modified} onChange={(v) => set("last_modified", v)} />
      </Row>
      <Row label={t("fm.field.created_date")}>
        <DateInput value={value.created_date} onChange={(v) => set("created_date", v)} />
      </Row>
      <Row label={t("fm.field.source_count")}>
        <input
          type="number"
          min={0}
          value={value.source_count ?? 0}
          onChange={(e) => {
            const n = Number(e.target.value);
            // 用户输 "abc" / 留空 / 负号 → 不写 NaN，回落为 0
            set("source_count", Number.isFinite(n) && n >= 0 ? n : 0);
          }}
          className="w-full rounded border bg-background px-2 py-1 text-sm font-mono"
        />
      </Row>
      <Row label={t("fm.field.tags")}>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map((tg) => (
            <Badge
              key={tg}
              variant="secondary"
              className="text-[10px] cursor-pointer"
              onClick={() => removeTag(tg)}
            >
              {tg} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={t("fm.tag_placeholder")}
            className="flex-1 rounded border bg-background px-2 py-1 text-xs"
          />
        </div>
      </Row>
      {sources.length > 0 && (
        <Row label={t("fm.sources_label")}>
          <ul className="text-xs space-y-0.5 font-mono text-muted-foreground">
            {sources.map((s, i) => (
              <li key={i} className="truncate" title={s}>{s}</li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-1">{t("fm.sources_readonly")}</p>
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
  renderOption,
}: {
  value: string | undefined;
  options: string[];
  onChange: (v: string) => void;
  renderOption?: (o: string) => string;
}) {
  const opts = value && !options.includes(value) ? [...options, value] : options;
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border bg-background px-2 py-1 text-sm"
    >
      {opts.map((o) => (
        <option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>
      ))}
    </select>
  );
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 日期输入：onBlur 时校验 YYYY-MM-DD 与日期合法性，无效时高亮边框。
 *  允许保留无效字符串（用户可继续编辑）；frontmatter 仍写入用户输入，由 PUT
 *  后的 validate-frontmatter 做最终校验。 */
function DateInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const v = value || "";
  const isInvalid =
    touched && v !== "" && (!ISO_DATE_RE.test(v) || isNaN(Date.parse(v)));
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setTouched(true)}
      placeholder="YYYY-MM-DD"
      className={
        "w-full rounded border bg-background px-2 py-1 text-sm font-mono " +
        (isInvalid ? "border-destructive" : "")
      }
      aria-invalid={isInvalid || undefined}
    />
  );
}
