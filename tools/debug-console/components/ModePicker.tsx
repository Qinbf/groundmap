"use client";
import { QUERY_MODES, type QueryMode } from "@/lib/default-system-prompt";

interface Props {
  mode: QueryMode;
  onChange: (mode: QueryMode) => void;
}

export function ModePicker({ mode, onChange }: Props) {
  const current = QUERY_MODES.find((m) => m.id === mode);
  return (
    <div className="flex flex-col gap-1">
      <span className="k-eyebrow">mode</span>
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as QueryMode)}
        className="k-select min-w-[120px]"
        title={current?.description}
      >
        {QUERY_MODES.map((m) => (
          <option
            key={m.id}
            value={m.id}
            title={m.description}
            style={{ background: "var(--ink-2)", color: "var(--paper)" }}
          >
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
