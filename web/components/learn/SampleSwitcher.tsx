"use client";
import { useT } from "@/lib/i18n-client";
import type { SampleId, SampleMeta } from "@/app/learn/_data/types";

interface SampleSwitcherProps {
  samples: SampleMeta[];
  active: SampleId;
  onChange: (id: SampleId) => void;
}

export function SampleSwitcher({ samples, active, onChange }: SampleSwitcherProps) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{t("learn.sample.label")}</span>
      <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
        {samples.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={
                "flex flex-col items-start text-left px-4 py-2 rounded-md transition-colors min-w-0 " +
                (isActive
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-muted")
              }
            >
              <span className="text-sm font-medium leading-tight">{t(s.labelKey)}</span>
              <span
                className={
                  "text-[11px] leading-tight mt-0.5 " +
                  (isActive ? "text-background/70" : "text-muted-foreground")
                }
              >
                {t(s.subtitleKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
