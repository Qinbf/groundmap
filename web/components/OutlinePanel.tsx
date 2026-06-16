"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

interface OutlineSection {
  level: number;
  seq: number;
  anchor: string;
  title: string;
  line: number;
  char_start: number;
  char_end: number;
  preview: string;
  agent_summary: string | null;
  children: OutlineSection[];
}

interface OutlineData {
  doc_path: string;
  doc_chars: number;
  doc_paragraphs: number;
  generated_at: string;
  sections: OutlineSection[];
}

interface OutlinePanelProps {
  path: string;
}

/**
 * 渲染文档章节大纲（OutlinePanel）
 * - 数据源：/api/outline?path=...，由 k.py outline 给出
 * - 短文档（无 heading）：显示空提示
 * - 点击章节：跳到 heading 对应 id（PageRenderer 已把 ^h-... 锚点转为 <hN id="...">）
 *
 * 该组件适用于 raw .md 与长 wiki 页面——只要文档有 H1/H2/H3 + outline.json，就能用。
 */
export function OutlinePanel({ path }: OutlinePanelProps) {
  const t = useT();
  const [data, setData] = useState<OutlineData | null>(null);
  // 用 i18n key 而非后端原文——后端 error 是 stderr 文字，跨语言用户只会看到中英文 mix
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    fetch(`/api/outline?path=${encodeURIComponent(path)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok || d.error) {
          // 后端只暴露错误**类型**给 UI，不暴露后端原文——避免中英文 mix
          if (d.error === "invalid_path") setErrorKey("outline.error.invalid_path");
          else if (r.status === 404 || d.error === "missing path") setErrorKey("outline.error.not_found");
          else setErrorKey("outline.error.generic");
        } else {
          setData(d as OutlineData);
        }
      })
      .catch(() => {
        if (!cancelled) setErrorKey("outline.error.generic");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (loading) {
    return <div className="text-xs text-muted-foreground">{t("common.loading")}</div>;
  }

  if (errorKey) {
    return <div className="text-xs text-destructive">{t(errorKey)}</div>;
  }

  if (!data) return null;

  const hasSections = data.sections && data.sections.length > 0;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{t("panel.outline")}</h3>
      <p className="text-[11px] text-muted-foreground mb-3 font-mono">
        {t("outline.doc_meta", {
          chars: String(data.doc_chars),
          sections: String(countSections(data.sections)),
          paragraphs: String(data.doc_paragraphs),
        })}
      </p>
      {!hasSections ? (
        <p className="text-xs text-muted-foreground italic">{t("outline.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {data.sections.map((s, i) => (
            <SectionItem key={s.anchor || `${s.level}-${s.seq}-${i}`} section={s} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function countSections(sections: OutlineSection[]): number {
  return sections.reduce((acc, s) => acc + 1 + countSections(s.children), 0);
}

function SectionItem({ section, depth }: { section: OutlineSection; depth: number }) {
  const t = useT();
  const summary = section.agent_summary || section.preview || "";
  const tagText = section.agent_summary
    ? t("outline.tag.summary")
    : section.preview
    ? t("outline.tag.preview")
    : "";

  // 缩进根据 H 层级 - 1（H1 不缩进，H2 缩进 1 级，H3 缩进 2 级 ...）
  const indentClass = depth === 0 ? "" : depth === 1 ? "ml-3" : "ml-6";
  const sizeClass =
    section.level === 1
      ? "font-semibold"
      : section.level === 2
      ? "font-medium"
      : "";

  // 没经过 convert.py 处理的页面 anchor 为空字符串 → 渲染为不可点击 div
  // 而不是 <a href="#">（避免点击跳到页顶造成困惑）
  const hasAnchor = !!section.anchor;
  const baseClass = "block rounded px-1.5 py-0.5 transition-colors";
  const interactiveClass = hasAnchor
    ? `${baseClass} group hover:bg-muted/60 cursor-pointer`
    : `${baseClass} cursor-default`;

  // anchor 为空（未跑 convert.py）时仍展示标题与预览，但去掉跳转
  const itemContent = (
    <>
      <span className={`text-xs truncate block ${sizeClass}`}>{section.title}</span>
      {summary && (
        <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
          {tagText && <span className="font-mono mr-1">[{tagText}]</span>}
          {summary}
        </span>
      )}
    </>
  );

  return (
    <li className={indentClass}>
      {hasAnchor ? (
        <a
          href={`#${section.anchor}`}
          className={interactiveClass}
          title={t("outline.click_to_jump")}
        >
          {itemContent}
        </a>
      ) : (
        <div className={interactiveClass}>{itemContent}</div>
      )}
      {section.children.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {section.children.map((c, i) => (
            <SectionItem key={c.anchor || `${c.level}-${c.seq}-${i}`} section={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
