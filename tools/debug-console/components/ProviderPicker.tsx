"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  unavailable_reason?: string;
  models: string[];
  is_agent: boolean;
}

interface Props {
  provider: string;
  model: string;
  onChange: (provider: string, model: string) => void;
}

export function ProviderPicker({ provider, model, onChange }: Props) {
  const t = useT();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((j) => {
        const list: ProviderInfo[] = j.providers || [];
        setProviders(list);
        setLoading(false);
        // 开箱即用：若初始 provider 不可用（如默认 claude-code 但本机 PATH 无 claude），
        // 自动切到第一个可用 provider + 其首个 model，省去陌生用户首屏手动切换。
        const cur = list.find((p) => p.id === provider);
        if (!cur || !cur.available) {
          const firstAvail = list.find((p) => p.available);
          if (firstAvail) onChange(firstAvail.id, firstAvail.models[0] || "");
        }
      })
      .catch(() => setLoading(false));
    // 仅 mount 时跑一次的初始化校正；provider/onChange 取 mount 时的值即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = providers.find((p) => p.id === provider);

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="k-eyebrow">{t("picker.provider")}</span>
        <span className="text-[11px] text-[var(--paper-mute)]">
          {t("picker.loading")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-4">
      <div className="flex flex-col gap-1">
        <span className="k-eyebrow">{t("picker.provider")}</span>
        <select
          value={provider}
          onChange={(e) => {
            const newProvId = e.target.value;
            const newProv = providers.find((p) => p.id === newProvId);
            const newModel = newProv?.models[0] || "";
            onChange(newProvId, newModel);
          }}
          className="k-select min-w-[140px]"
        >
          {providers.map((p) => (
            <option
              key={p.id}
              value={p.id}
              disabled={!p.available}
              style={{ background: "var(--ink-2)", color: "var(--paper)" }}
            >
              {p.name}
              {!p.available ? t("picker.na") : ""}
              {p.is_agent ? t("picker.agent") : ""}
            </option>
          ))}
        </select>
        {current && !current.available && (
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--vermilion)]">
            {current.unavailable_reason || t("picker.unavailable")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="k-eyebrow">{t("picker.model")}</span>
        <select
          value={model}
          onChange={(e) => onChange(provider, e.target.value)}
          className="k-select min-w-[140px]"
          disabled={!current?.available}
        >
          {current?.models.map((m) => (
            <option
              key={m}
              value={m}
              style={{ background: "var(--ink-2)", color: "var(--paper)" }}
            >
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
