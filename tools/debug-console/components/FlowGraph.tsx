"use client";
/**
 * 流程图视图主组件
 *
 * 交互（v4）：
 *   - 点任意节点 → 透传到 page-level，由右侧 PreviewPanel 渲染节点详情
 *   - 流式生成中：顶部胶囊条 "🤔 AI 思考中"；最新节点 cyan 呼吸光晕
 *   - 不再有内嵌底部详情、modal、悬浮 panel —— 统一走 page-level 右侧栏
 */
import { useMemo, useEffect } from "react";
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

const nodeTypes = { kbcard: FlowNode } as const;

interface Props {
  message: UIMessage | null;
  userQuery?: string | null;
  onOpenRef: (ref: WikiRef) => void;
  onOpenNode: (node: FlowNodeData) => void;
  streaming?: boolean;
}

function FlowGraphInner({ message, userQuery, onOpenRef, onOpenNode, streaming }: Props) {
  const { nodes, edges, latestActive } = useMemo(() => {
    const built = buildFlowGraph(message, userQuery);
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
    return { nodes: enriched, edges: built.edges, latestActive: latest };
  }, [message, userQuery, onOpenRef, streaming]);

  const rf = useReactFlow();

  useEffect(() => {
    if (nodes.length === 0) return;
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.2, duration: 400 });
    }, 80);
    return () => clearTimeout(t);
  }, [nodes.length, rf]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--ink)] text-sm text-[var(--paper-mute)]">
        发送一条消息后这里会出现流程图
      </div>
    );
  }

  const handleNodeClick = (_e: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as FlowNodeData;
    // 全部节点 → 透传到 page-level，由右侧 PreviewPanel 渲染（统一 UI）
    onOpenNode(data);
  };

  const styledEdges: Edge[] = edges.map((e) => {
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
      animated: e.animated && !e.data.isGhost,
      labelStyle: { fill: "var(--paper)", fontWeight: 700, fontSize: 10.5, fontFamily: "var(--font-mono)" },
      labelBgStyle: { fill: "var(--ink)", fillOpacity: 0.92 },
      labelBgPadding: [5, 2] as [number, number],
      labelBgBorderRadius: 0,
    };
  });

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
          <span className="mr-2">reasoning…</span>
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
