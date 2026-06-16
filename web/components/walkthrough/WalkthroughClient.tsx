"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n-client";

const TABS = [
  { id: "ex1", num: "1", labelKey: "walkthrough.tab.ex1" },
  { id: "ex2", num: "2", labelKey: "walkthrough.tab.ex2" },
  { id: "ex3", num: "3", labelKey: "walkthrough.tab.ex3" },
  { id: "ex4", num: "4", labelKey: "walkthrough.tab.ex4" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// 暗色补丁：walkthrough.css 派生自历史 HTML 导出，若干容器写死了浅底
// （background: white / 各种 pastel），既有 .dark 段未覆盖全，暗色下会闪白。
// 这里集中补齐剩余项——作用域全在 .dark .walkthrough-content 下，不影响亮色；
// 等整页 JSX 化（见 ui-1）后可移除。.dark 前缀已抬高特异性，无需 !important。
const WALKTHROUGH_DARK_PATCH = `
.dark .walkthrough-content .example,
.dark .walkthrough-content .graph-section,
.dark .walkthrough-content table.summary,
.dark .walkthrough-content .thinking,
.dark .walkthrough-content .answer-panel,
.dark .walkthrough-content .mode-result-body {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}
.dark .walkthrough-content .response-table tr.picked,
.dark .walkthrough-content .audit-row.fail,
.dark .walkthrough-content .audit-row.warn {
  background: hsl(var(--muted));
}
`;

interface WalkthroughClientProps {
  headerHtml: string;
  ex1Html: string;
  ex2Html: string;
  ex3Html: string;
  ex4Html: string;
  footerHtml: string;
}

export function WalkthroughClient({
  headerHtml,
  ex1Html,
  ex2Html,
  ex3Html,
  ex4Html,
  footerHtml,
}: WalkthroughClientProps) {
  const t = useT();
  const [active, setActive] = useState<TabId>("ex1");
  const examples: Record<TabId, string> = {
    ex1: ex1Html,
    ex2: ex2Html,
    ex3: ex3Html,
    ex4: ex4Html,
  };

  return (
    <div className="walkthrough-content">
      {/* 暗色补丁：walkthrough.css 里若干硬编码浅底（background: white / 各种 pastel）
          未被既有 .dark 覆盖，暗色下会闪白。这里集中补齐——等整页 JSX 化后可移除。
          作用域内联，避免动 walkthrough.css（派生自历史 HTML 导出）。 */}
      <style>{WALKTHROUGH_DARK_PATCH}</style>
      <div className="container">
        {/* 整页正文目前仅中文（dangerouslySetInnerHTML 注入静态 HTML，不随语言切换）。
            短期提示 + 留待整页 i18n 化。 */}
        <div
          role="note"
          className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {t("walkthrough.chinese_only_notice")}
        </div>
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

        <div className="tabs">
          {TABS.map(({ id, num, labelKey }) => (
            <button
              key={id}
              type="button"
              className={`tab-btn${active === id ? " active" : ""}`}
              data-tab={id}
              onClick={() => {
                setActive(id);
                requestAnimationFrame(() => {
                  document
                    .getElementById(id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
            >
              <span className="num">{num}</span>
              {t(labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {TABS.map(({ id }) => (
          <div
            key={id}
            id={id}
            className={`example${active === id ? " active" : ""}`}
            dangerouslySetInnerHTML={{ __html: examples[id] }}
          />
        ))}

        <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
      </div>
    </div>
  );
}
