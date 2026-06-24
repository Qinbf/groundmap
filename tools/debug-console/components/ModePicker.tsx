"use client";
import { QUERY_MODES, type QueryMode } from "@/lib/default-system-prompt";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

interface Props {
  mode: QueryMode;
  onChange: (mode: QueryMode) => void;
}

const MODE_DESC_KEY: Record<QueryMode, TranslationKey> = {
  quick: "mode.quick.desc",
  audit: "mode.audit.desc",
  explore: "mode.explore.desc",
  devil: "mode.devil.desc",
};

export function ModePicker({ mode, onChange }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1">
      <span className="k-eyebrow">{t("picker.mode")}</span>
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as QueryMode)}
        className="k-select min-w-[120px]"
        title={t(MODE_DESC_KEY[mode])}
      >
        {QUERY_MODES.map((m) => (
          <option
            key={m.id}
            value={m.id}
            title={t(MODE_DESC_KEY[m.id])}
            style={{ background: "var(--ink-2)", color: "var(--paper)" }}
          >
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
