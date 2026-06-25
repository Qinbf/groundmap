"use client";
/**
 * 流程图视图主组件
 *
 * 交互（v4）：
 *   - 点任意节点 → 透传到 page-level，由右侧 PreviewPanel 渲染节点详情
 *   - 流式生成中：顶部胶囊条 "🤔 AI 思考中"；最新节点静态 cyan 高亮环
 *   - 流式期间推理图保持稳定：连线保留蚂蚁线流动但不闪烁/不卡顿（结构签名 memo + edges memo）、
 *     节点不呼吸/不闪、不随增量重新取景
 *   - 不再有内嵌底部详情、modal、悬浮 panel —— 统一走 page-level 右侧栏
 */
import { useMemo, useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { UIMessage } from "./MessageBubble";
import type { WikiRef } from "@/lib/wiki-ref";
import {
  buildFlowGraph,
  layoutGraph,
  type FlowNodeData,
  type GraphEdge,
  type GraphNode,
} from "@/lib/build-flow-graph";
import { FlowNode } from "./FlowNode";
import { useLocale, useT } from "@/lib/i18n-client";

const nodeTypes = { kbcard: FlowNode } as const;

/**
 * 「结构签名」——只在图的结构（节点 / 边 / 工具状态 / 思考步骤标题）真正变化时改变；
 * 正文逐字增长（text-delta）不改变签名。
 *
 * 用途：流式期间 message 每个增量都是新对象，若直接用它当 useMemo 依赖，会导致
 * 每个字符都重建 + 重新布局整张图 → 节点/连线持续抖动。改用结构签名当依赖后，
 * 只有「真正多了一个节点 / 工具状态翻转 / 新的思考步骤」时才重排，推理图保持稳定。
 */
function graphSignature(
  msg: UIMessage | null | undefined,
  userQuery?: string | null,
): string {
  const sig: string[] = [`q:${userQuery?.trim() ? 1 : 0}`];
  for (const part of msg?.parts ?? []) {
    if (part.kind === "tool-call") {
      const r = part.call.result;
      const st = r ? (r.ok ? "ok" : "err") : "pend";
      sig.push(
        `t:${part.call.id}:${part.call.name}:${st}:${part.call.synthetic ? 1 : 0}`,
      );
    } else if (part.kind === "text") {
      // 只取 【TYPE】标题行（不含正文）——正文逐字增长不进签名、不触发重排
      const re = /【([A-Za-z]+)】([^\n]*)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(part.text)) !== null) {
        sig.push(`h:${m[1].toUpperCase()}:${m[2].replace(/\*\*/g, "").trim()}`);
      }
    }
    // reasoning 段不进流程图，忽略
  }
  return sig.join(";");
}

interface Props {
  message: UIMessage | null;
  userQuery?: string | null;
  onOpenRef: (ref: WikiRef) => void;
  onOpenNode: (node: FlowNodeData) => void;
  streaming?: boolean;
}

function FlowGraphInner({ message, userQuery, onOpenRef, onOpenNode, streaming }: Props) {
  const t = useT();
  const { locale } = useLocale();
  // 结构签名作为 memo 依赖（而非 message 本身）——流式逐字增量不重建图，保持稳定。
  const signature = graphSignature(message, userQuery);
  const { nodes, edges } = useMemo(() => {
    const built = buildFlowGraph(message, userQuery, locale);
    const positioned = layoutGraph(built.nodes, built.edges, "LR");
    const toolNodes = positioned.filter(
      (n) => n.data.kind === "file" || n.data.kind === "search" || n.data.kind === "list",
    );
    const pending = toolNodes.find((n) => n.data.status === "pending");
    const latest = pending?.data || toolNodes[toolNodes.length - 1]?.data || null;
    const enriched: GraphNode[] = positioned.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onOpenRef,
        isLatestActive: streaming && latest && n.data.key === latest.key,
      },
    }));
    return { nodes: enriched, edges: built.edges };
    // 依赖用 signature（结构指纹）+ streaming/locale/onOpenRef；message/userQuery 已被 signature 概括。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, streaming, onOpenRef, locale]);

  const rf = useReactFlow();

  // 自动取景（fitView）：流式期间不要每加一个节点就平移/缩放（那正是「一直晃」的来源）。
  // 仅在「首次出现内容」与「流式刚结束」时取景一次；流式进行中保持画面不动，用户可自由平移。
  const prevCountRef = useRef(0);
  const prevStreamingRef = useRef(streaming);
  useEffect(() => {
    const prevCount = prevCountRef.current;
    const wasStreaming = prevStreamingRef.current;
    prevCountRef.current = nodes.length;
    prevStreamingRef.current = streaming;
    if (nodes.length === 0) return;

    const firstContent = prevCount === 0;
    const justFinished = wasStreaming && !streaming;
    // 流式进行中、且既非首次出现内容也非刚结束 → 不重新取景，画面保持稳定
    if (streaming && !firstContent && !justFinished) return;

    const id = setTimeout(() => {
      // 首次出现内容（流式中）用瞬时取景，避免滑动动画；结束/静止时用平滑取景
      rf.fitView({ padding: 0.2, duration: firstContent && streaming ? 0 : 400 });
    }, 80);
    return () => clearTimeout(id);
  }, [nodes.length, streaming, rf]);

  // styledEdges 用 memo（依赖 edges）——edges 只在结构变化时变，流式逐字增量不会产生新的
  // 连线数组引用，react-flow 不会每帧重渲染连线 → 蚂蚁线 CSS 动画的 DOM 持续存在、不被打断，
  // 流动既不闪烁也不卡顿。注意 useMemo 必须在下面的提前 return 之前（hooks 规则）。
  const styledEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const color = edgeColor(e.data.stepType, e.data.isGhost, e.data.isSynthetic);
        return {
          ...e,
          style: {
            stroke: color,
            strokeWidth: e.data.isGhost
              ? 1.5
              : e.data.isSynthetic
                ? 2.5
                : e.data.isFanIn
                  ? 2.5
                  : 2,
            strokeDasharray: e.data.isGhost
              ? "6 4"
              : e.data.isSynthetic
                ? "4 3"
                : undefined,
            opacity: e.data.isGhost ? 0.55 : 1,
          },
          // 保留 react-flow「蚂蚁线」流动动画（用户喜欢的流动感）；
          // synthetic（强制增强）/ ghost 边维持静态以作视觉区分。
          animated: e.animated && !e.data.isGhost,
          labelStyle: { fill: "var(--paper)", fontWeight: 700, fontSize: 10.5, fontFamily: "var(--font-mono)" },
          labelBgStyle: { fill: "var(--ink)", fillOpacity: 0.92 },
          labelBgPadding: [5, 2] as [number, number],
          labelBgBorderRadius: 0,
        };
      }),
    [edges],
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--ink)] text-sm text-[var(--paper-mute)]">
        {t("flow.graph_empty")}
      </div>
    );
  }

  const handleNodeClick = (_e: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as FlowNodeData;
    // 全部节点 → 透传到 page-level，由右侧 PreviewPanel 渲染（统一 UI）
    onOpenNode(data);
  };

  return (
    <div className="relative h-full w-full bg-[var(--ink)]">
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1.6}
        onNodeClick={handleNodeClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2520" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {streaming && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 border border-[var(--amber)]/60 bg-[var(--ink-2)]/90 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--amber)] shadow-lg backdrop-blur">
          <span className="mr-2">{t("flow.reasoning")}</span>
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      )}
    </div>
  );
}

function edgeColor(stepType?: string, isGhost?: boolean, isSynthetic?: boolean): string {
  if (isGhost) return "#64748b";
  if (isSynthetic) return "#ea580c"; // orange — 与 synthetic 节点橙色统一
  switch (stepType) {
    case "INTENT": return "#6366f1";
    case "STRATEGY": return "#a855f7";
    case "SEARCH": return "#2563eb";
    case "EVAL": return "#0891b2";
    case "READ": return "#16a34a";
    case "EXTRACT": return "#84cc16";
    case "LINK": return "#0d9488";
    case "DECIDE": return "#ea580c";
    case "CONFLICT": return "#d97706";
    case "ANSWER": return "#b45309";
    default: return "#475569";
  }
}

export function FlowGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}

export type { GraphNode, GraphEdge };
