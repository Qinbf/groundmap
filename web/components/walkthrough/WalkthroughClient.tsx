"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n-client";
import { useLocale } from "@/lib/i18n-client";
import { buildFlowGraph, type FlowNodeData } from "@/lib/flow/build-flow-graph";
import { EX1_MESSAGE, EX1_QUERY } from "./ex1-trace";
import { ReasoningGraph } from "./ReasoningGraph";
import { ReasoningDetailPanel } from "./ReasoningDetailPanel";

// 暗色补丁：walkthrough.css 派生自历史 HTML 导出，若干容器写死了浅底，暗色下会闪白。
const WALKTHROUGH_DARK_PATCH = `
.dark .walkthrough-content .example,
.dark .walkthrough-content .thinking,
.dark .walkthrough-content .answer-panel {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}
.dark .walkthrough-content .response-table tr.picked {
  background: hsl(var(--muted));
}
`;

interface WalkthroughClientProps {
  headerHtml: string;
  bannerHtml: string;
  workflowHtml: string;
}

/**
 * 查询讲解页：用一次真实跑过的查询，展示「分层钻取」机制。
 *
 * 与旧版的差异：原先手画的静态 SVG「遍历图」已替换为**和查询控制台一致的推理图**
 * （ReasoningGraph，react-flow），由静态轨迹 ex1-trace 驱动。图里每张卡片都和下方
 * 13 个讲解步骤一一对应——点卡片跳到对应步骤、点步骤标题在图里高亮对应卡片。
 * 步骤正文走 header.zh.html / ex1.zh.html 或 header.en.html / ex1.en.html（page.tsx
 * 按 locale 选），结构 / 类名 / id / 锚点 1:1 镜像。
 */
export function WalkthroughClient({ headerHtml, bannerHtml, workflowHtml }: WalkthroughClientProps) {
  const t = useT();
  const { locale } = useLocale();

  const [selected, setSelected] = useState<FlowNodeData | null>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const graphSectionRef = useRef<HTMLDivElement>(null);

  // 一次性构建：用于计数 + 步骤号→节点 的反查（点步骤标题 → 在图里高亮对应卡片）
  const { nodeCount, edgeCount, nodesByStep } = useMemo(() => {
    const built = buildFlowGraph(EX1_MESSAGE, EX1_QUERY, locale);
    const byStep = new Map<number, FlowNodeData>();
    built.nodes.forEach((n, i) => {
      n.data.stepRef = i;
      byStep.set(i, n.data);
    });
    return { nodeCount: built.nodes.length, edgeCount: built.edges.length, nodesByStep: byStep };
  }, [locale]);

  // 跳到下方对应讲解步骤 + 闪一下高亮
  const jumpToStep = useCallback((ref: number) => {
    const el = document.getElementById(`wt-step-${ref}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("wt-step-flash");
    window.setTimeout(() => el.classList.remove("wt-step-flash"), 1400);
  }, []);

  // 给注入的步骤卡片分配 id + 让标题栏可点（反向：点步骤 → 选中图中卡片）
  useEffect(() => {
    const root = workflowRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLElement>(".step").forEach((stepEl) => {
      const numText = stepEl.querySelector(".step-num")?.textContent?.trim() || "";
      const num = parseInt(numText, 10);
      if (!Number.isFinite(num)) return;
      stepEl.id = `wt-step-${num}`;
      const header = stepEl.querySelector<HTMLElement>(".step-header");
      if (!header) return;
      header.style.cursor = "pointer";
      header.title = t("walkthrough.detail.what");
      // 键盘可达：注入的 .step-header 非原生 button，补 role/tabindex/aria + Enter/Space 激活
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      header.setAttribute("aria-label", t("walkthrough.detail.what"));
      const activate = () => {
        const node = nodesByStep.get(num);
        if (!node) return;
        setSelected(node);
        graphSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      const onClick = () => activate();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      };
      header.addEventListener("click", onClick);
      header.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        header.removeEventListener("click", onClick);
        header.removeEventListener("keydown", onKeyDown);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [workflowHtml, nodesByStep, t]);

  return (
    <div className="walkthrough-content">
      <style>{WALKTHROUGH_DARK_PATCH}</style>
      <div className="container">
        <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

        {/* 域中性提示：例子取自 RAG 演化史，但分层钻取流程对任何领域都一样。 */}
        <p className="my-4 text-sm leading-relaxed text-muted-foreground">
          {t("walkthrough.domain_note")}
        </p>

        <div className="example active">
          {/* 问题横幅 */}
          <div dangerouslySetInnerHTML={{ __html: bannerHtml }} />

          {/* ── 推理图（与查询控制台一致）+ 卡片讲解面板 ── */}
          <div ref={graphSectionRef} className="rg-section" id="wt-reasoning-graph">
            <div className="rg-head">
              <h3>{t("walkthrough.graph.title")}</h3>
              <p className="rg-sub">{t("walkthrough.graph.subtitle")}</p>
              <p className="rg-hint">{t("walkthrough.graph.hint")}</p>
            </div>
            <div className="rg-body">
              <div className="rg-canvas">
                <ReasoningGraph
                  message={EX1_MESSAGE}
                  userQuery={EX1_QUERY}
                  selectedKey={selected?.key ?? null}
                  onSelectNode={setSelected}
                />
              </div>
              <div className="rg-aside">
                <ReasoningDetailPanel
                  node={selected}
                  nodeCount={nodeCount}
                  edgeCount={edgeCount}
                  onJumpStep={jumpToStep}
                  onClose={() => setSelected(null)}
                />
              </div>
            </div>
            <ReasoningLegend />
          </div>

          {/* 步骤工作流 + 传统 chunk-RAG 对照（静态 HTML） */}
          <div ref={workflowRef} dangerouslySetInnerHTML={{ __html: workflowHtml }} />
        </div>

        {/* 可复现收尾（域中性） */}
        <div className="footer">
          <p>
            <strong>{t("walkthrough.reproduce.title")}</strong>
          </p>
          <p>{t("walkthrough.reproduce.body")}</p>
          <pre className="tool" style={{ margin: "8px 0" }}>
            {`python scripts/k.py --workspace rag-evolution search "graph rag community detection" --json
python scripts/k.py --workspace rag-evolution outlinks wiki/concepts/graph_rag.md
python scripts/k.py --workspace rag-evolution list-conflicts`}
          </pre>
        </div>
      </div>
    </div>
  );
}

/** 卡片图例：解释 6 种卡片 + 两个角标的含义 */
function ReasoningLegend() {
  const t = useT();
  // 圆点色对齐各卡片的实际边框色（query=indigo-300 / search=blue-500 / list=slate-500 / result=yellow-400）
  const items: Array<{ color: string; label: string }> = [
    { color: "#a5b4fc", label: t("walkthrough.legend.query") },
    { color: "#c084fc", label: t("walkthrough.legend.thought") },
    { color: "#3b82f6", label: t("walkthrough.legend.search") },
    { color: "#34d399", label: t("walkthrough.legend.file") },
    { color: "#64748b", label: t("walkthrough.legend.list") },
    { color: "#facc15", label: t("walkthrough.legend.result") },
  ];
  return (
    <div className="rg-legend">
      <span className="rg-legend-title">{t("walkthrough.legend.title")}</span>
      {items.map((it) => (
        <span key={it.label} className="rg-legend-item">
          <span className="rg-dot" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
      <span className="rg-legend-note">{t("walkthrough.legend.badge_step")}</span>
      <span className="rg-legend-note">{t("walkthrough.legend.badge_hit")}</span>
    </div>
  );
}
