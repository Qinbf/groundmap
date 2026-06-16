"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

export type ResolveAction =
  | "set_status_deprecated"
  | "set_status_reviewed"
  | "set_confidence_medium"
  | "set_confidence_high"
  | "remove_to_be_updated"
  | "resolve_conflict_keep_old"
  | "resolve_conflict_keep_watching"
  | "resolve_conflict_adopt_new"
  | "resolve_conflict_merge";

interface ActionDef {
  /** 翻译 key（如 "action.deprecate"） */
  labelKey: TranslationKey;
  /** 可选 confirm 弹窗的翻译 key（如 "action.deprecate_confirm"） */
  confirmKey?: TranslationKey;
  /** 可选 prompt 弹窗的翻译 key —— 用户输入的文本会作为 payload 字段传给后端
   *  （adopt_new → newClaim；merge → mergedText） */
  promptKey?: TranslationKey;
  /** 当 promptKey 存在时，指定用户输入应映射到 payload 的哪个字段 */
  payloadField?: "newClaim" | "mergedText";
  /** 模板变量（用于 label / confirm / prompt 中的 {path} 等占位） */
  vars?: Record<string, string | number>;
  action: ResolveAction;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
}

interface ResolveButtonsProps {
  path: string;
  actions: ActionDef[];
  showEditLink?: boolean;
}

export function ResolveButtons({ path, actions, showEditLink = true }: ResolveButtonsProps) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  async function handle(action: ActionDef) {
    if (busy) return;
    if (action.confirmKey && !confirm(t(action.confirmKey, action.vars))) return;

    let payload: { newClaim?: string; mergedText?: string } | undefined;
    if (action.promptKey && action.payloadField) {
      const input = window.prompt(t(action.promptKey, action.vars));
      if (input === null || !input.trim()) {
        // 用户取消或输入空 — 静默退出
        return;
      }
      payload = { [action.payloadField]: input };
    }

    setBusy(true);
    setMsg({ kind: "info", text: t("common.processing") });
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, action: action.action, payload }),
      });
      const data = await res.json();
      if (res.ok) {
        const text = data.commit
          ? t("action.commit_msg", { commit: data.commit })
          : t("action.commit_noop");
        setMsg({ kind: "ok", text });
        setTimeout(() => router.refresh(), 600);
      } else {
        // 已知 error enum 映射成 i18n key——避免中英文 mix
        const errorKeyMap: Record<string, TranslationKey> = {
          invalid_json: "action.error.invalid_json",
          missing_path: "action.error.missing_path",
          invalid_action: "action.error.invalid_action",
          invalid_path: "action.error.invalid_path",
          permission_denied: "action.error.permission_denied",
          commit_failed: "action.error.commit_failed",
          write_failed: "action.error.write_failed",
          read_failed: "action.error.read_failed",
        };
        const knownKey = errorKeyMap[data.error];
        const text = knownKey ? t(knownKey) : t("action.error.generic");
        setMsg({ kind: "err", text });
      }
    } catch (e) {
      setMsg({ kind: "err", text: t("common.network_error", { err: String(e) }) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center mt-3">
      {actions.map((a) => (
        <Button
          key={a.action}
          size="sm"
          variant={a.variant || "outline"}
          disabled={busy}
          onClick={() => handle(a)}
        >
          {t(a.labelKey, a.vars)}
        </Button>
      ))}
      {showEditLink && (
        // 直接给 Link 套 buttonVariants className，避免 <a><button></button></a>。
        // busy 期间用 aria-disabled + pointer-events-none + opacity 模拟 disabled。
        <Link
          href={`/page/${path}?mode=edit`}
          className={cn(
            buttonVariants({ size: "sm", variant: "ghost" }),
            busy && "pointer-events-none opacity-50",
          )}
          aria-disabled={busy || undefined}
          tabIndex={busy ? -1 : undefined}
        >
          {t("action.go_edit")}
        </Link>
      )}
      {msg && (
        <span
          className={
            "text-xs ml-1 " +
            (msg.kind === "err"
              ? "text-destructive"
              : msg.kind === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground")
          }
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
