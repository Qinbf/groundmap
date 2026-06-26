"use client";
/**
 * 推理图视图（讲解页版）—— 移植自查询控制台 components/FlowGraph.tsx。
 * 差异：数据源是静态轨迹 EX1_MESSAGE；点/键盘激活节点 → 上抛给父组件（高亮 + 滚到对应讲解步骤）。
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
import {
  buildFlowGraph,
  layoutGraph,
  type FlowNodeData,
  type UIMessage,
} from "@/lib/flow/build-flow-graph";
import { ReasoningFlowNode } from "./ReasoningFlowNode";
import { useLocale } from "@/lib/i18n-client";

const nodeTypes = { kbcard: ReasoningFlowNode } as const;

interface Props {
  message: UIMessage;
  userQuery: string;
  selectedKey?: string | null;
  onSelectNode: (node: FlowNodeData) => void;
}

function ReasoningGraphInner({ message, userQuery, selectedKey, onSelectNode }: Props) {
  const { locale } = useLocale();

  // 构建 + 布局只依赖轨迹/语言（与选中无关）——选中变化不重建图
  const base = useMemo(() => {
    const built = buildFlowGraph(message, userQuery, locale);
    // stepRef = 时间序下标（0=起始问题，1..13=步骤），把卡片和下方步骤一一对应
    built.nodes.forEach((n, i) => {
      n.data.stepRef = i;
    });
    return { nodes: layoutGraph(built.nodes, built.edges), edges: built.edges };
  }, [message, userQuery, locale]);

  // 选中态 + 键盘激活回调注入（仅依赖 selectedKey / 回调，开销极小）
  const nodes = useMemo(
    () =>
      base.nodes.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: selectedKey === n.data.key, onActivate: onSelectNode },
      })),
    [base.nodes, selectedKey, onSelectNode],
  );

  const rf = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);

  // 初次布局后 fitView
  useEffect(() => {
    const id = setTimeout(() => rf.fitView({ padding: 0.16, duration: 400 }), 80);
    return () => clearTimeout(id);
  }, [base.nodes.length, rf]);

  // 窗口缩放 / 跨 720px 断点（rg-body 横→竖、画布尺寸大变）后重新居中
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => rf.fitView({ padding: 0.16, duration: 200 }), 140);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [rf]);

  const styledEdges: Edge[] = base.edges.map((e) => {
    const color = edgeColor(e.data.stepType);
    return {
      ...e,
      style: { stroke: color, strokeWidth: e.data.isFanIn ? 2.5 : 2 },
      animated: e.animated,
      labelStyle: { fill: "var(--rg-paper)", fontWeight: 700, fontSize: 10.5 },
      labelBgStyle: { fill: "var(--rg-ink)", fillOpacity: 0.92 },
    } as Edge;
  });

  const handleNodeClick = (_e: React.MouseEvent, node: Node) => {
    onSelectNode(node.data as unknown as FlowNodeData);
  };

  return (
    <div ref={wrapRef} className="h-full w-full">
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
    </div>
  );
}

// 边按「目标 thought 步骤的 TYPE」染色；指向 tool 节点（search/file/list）的边不带 stepType、恒为灰。
// 故这里只列 thought 实际会出现的 TYPE（INTENT/STRATEGY/EVAL/EXTRACT/CONFLICT/DECIDE/ANSWER）。
function edgeColor(stepType?: string): string {
  switch (stepType) {
    case "INTENT": return "#6366f1";
    case "STRATEGY": return "#a855f7";
    case "EVAL": return "#0891b2";
    case "EXTRACT": return "#84cc16";
    case "DECIDE": return "#ea580c";
    case "CONFLICT": return "#d97706";
    case "ANSWER": return "#b45309";
    default: return "#475569";
  }
}

export function ReasoningGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <ReasoningGraphInner {...props} />
    </ReactFlowProvider>
  );
}
