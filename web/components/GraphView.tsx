"use client";

/**
 * 知识图谱可视化（v0.4b）— 浅色主题，与全站设计系统统一。
 *
 * 设计要点：
 *   - 浅色背景（卡片白）+ 极淡网格点阵
 *   - 节点：实心填充（语义色 500 系）+ 同色细边 + 柔和落影；
 *           半径按入出度 ^0.78 缩放，min 14 / max 88——hub 一眼可见
 *   - 边：默认浅灰，几乎隐入背景；hover 节点时**关联边亮起 + 其他边淡化**
 *   - 文字：深色（foreground）+ 反 zoom 字号恒定 + 白色 halo 让多色边背景下仍可读
 *   - 浮窗 / 图例：白卡 + border + shadow，与全站 Card 一致
 */

import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useStore,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
  type ReactFlowState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";

interface ApiNode {
  path: string;
  title: string;
  type: string;
  status: string;
  tags: string[];
  inbound_count: number;
  outbound_count: number;
}

interface ApiEdge {
  from: string;
  to: string;
  link_type: string;
  anchor?: string;
}

interface ApiGraph {
  nodes: ApiNode[];
  edges: ApiEdge[];
}

// 浅背景下用饱和的 500 系列实心色 + 同色半透明落影
const NODE_COLORS: Record<string, { core: string; glow: string }> = {
  concept:        { core: "#3b82f6", glow: "rgba(59, 130, 246, 0.30)" },  // blue-500
  entity:         { core: "#10b981", glow: "rgba(16, 185, 129, 0.30)" },  // emerald-500
  source_summary: { core: "#f59e0b", glow: "rgba(245, 158, 11, 0.30)" },  // amber-500
  analysis:       { core: "#a855f7", glow: "rgba(168, 85, 247, 0.30)" },  // purple-500
  comparison:     { core: "#ec4899", glow: "rgba(236, 72, 153, 0.30)" },  // pink-500
  index:          { core: "#64748b", glow: "rgba(100, 116, 139, 0.28)" }, // slate-500
};
const DEFAULT_NODE_COLOR = { core: "#94a3b8", glow: "rgba(148, 163, 184, 0.28)" };

// 边色——浅背景下用浅灰：静止态隐约可见连接网（让"图谱"读得出结构），
// hover 时关联边再全亮、非关联边淡化。关系边本就稍深。
const EDGE_COLORS: Record<string, string> = {
  REFERENCES:     "rgba(148, 163, 184, 0.55)",
  SUPPORTS:       "rgba(16, 185, 129, 0.70)",
  REFUTES:        "rgba(236, 72, 153, 0.70)",
  EXTENDS:        "rgba(59, 130, 246, 0.70)",
  IS_A:           "rgba(168, 85, 247, 0.70)",
  PART_OF:        "rgba(245, 158, 11, 0.70)",
  ALTERNATIVE_TO: "rgba(217, 70, 239, 0.70)",
  CITES:          "rgba(100, 116, 139, 0.55)",
};

// hover 节点时关联边的"全亮"色（500 系实色）
const EDGE_HIGHLIGHT_COLORS: Record<string, string> = {
  REFERENCES:     "#64748b",
  SUPPORTS:       "#10b981",
  REFUTES:        "#ec4899",
  EXTENDS:        "#3b82f6",
  IS_A:           "#a855f7",
  PART_OF:        "#f59e0b",
  ALTERNATIVE_TO: "#d946ef",
  CITES:          "#64748b",
};

// 图例用纯色 swatch
const NODE_LEGEND_COLORS = NODE_COLORS;
const EDGE_LEGEND_COLORS: Record<string, string> = {
  REFERENCES:     "#94a3b8",  // 默认色调示意
  SUPPORTS:       "#10b981",
  REFUTES:        "#ec4899",
  EXTENDS:        "#3b82f6",
  IS_A:           "#a855f7",
  PART_OF:        "#f59e0b",
  ALTERNATIVE_TO: "#d946ef",
  CITES:          "#64748b",
};

/** 节点半径：按入度+出度 pow 0.78 缩放，min 14, max 88。
 *  - 度数 0 → 14
 *  - 度数 5 → 14 + 3.6^0.78 * 6 ≈ 31
 *  - 度数 10 → 14 + 10^0.78 * 6 ≈ 50
 *  - 度数 22 → 14 + 22^0.78 * 6 ≈ 76
 *  - 度数 40+ → 封顶 88
 *  比 sqrt 缩放陡得多，让 hub 真正"大"。
 */
function nodeSize(node: ApiNode): number {
  const deg = node.inbound_count + node.outbound_count;
  return Math.min(14 + Math.pow(deg, 0.78) * 6, 88);
}

function nodeLabelFontSize(node: ApiNode): number {
  const deg = node.inbound_count + node.outbound_count;
  return Math.min(10 + Math.sqrt(deg) * 0.8, 15);
}

function nodeShortLabel(node: ApiNode): string {
  if (node.title && node.title.length <= 18) return node.title;
  const noExt = node.path.replace(/\.md$/, "");
  const segs = noExt.split("/");
  return segs[segs.length - 1];
}

function friendlyLabel(path: string): string {
  const noExt = path.replace(/\.md$/, "");
  return noExt.startsWith("wiki/") ? noExt.slice(5) : noExt;
}

// ============================================================
// 自定义节点：实心圆（语义实色 + 同色细边 + 柔和落影）+ 圆下方常显标题
// ============================================================

interface CircleNodeData extends Record<string, unknown> {
  apiNode: ApiNode;
  core: string;
  glow: string;
  size: number;
  label: string;
  labelFontSize: number;
  /** 当前是否被 hover 高亮（hover 节点本身 或 hover 节点的邻居）— 由主组件透传 */
  highlighted: boolean;
  /** 当前是否被淡化（hover 状态下的非邻居）*/
  dimmed: boolean;
  /** 入场动画的 stagger 延迟（ms），由节点序号推算 */
  appearDelay: number;
}

const zoomSelector = (s: ReactFlowState) => s.transform[2];

const CircleNode = memo(function CircleNode({ data, selected }: NodeProps<Node<CircleNodeData>>) {
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const zoom = useStore(zoomSelector);
  const { apiNode, core, glow, size, label, labelFontSize, highlighted, dimmed, appearDelay } = data;

  const handleEnter = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    setHovered(true);
  };

  // 反 zoom：让 label 字号视觉恒定
  const labelScale = Math.min(1 / Math.max(zoom, 0.001), 2.4);
  const labelVisible = zoom > 0.2;

  // 状态优先级：selected/hovered > highlighted > dimmed > default
  const isActive = hovered || selected;
  const opacity = dimmed ? 0.18 : 1;
  const glowIntensity = isActive ? 1.8 : highlighted ? 1.3 : 1;

  return (
    <div
      className="gv-node-appear"
      style={{
        width: size,
        height: size,
        ...({ "--gv-delay": `${appearDelay}ms` } as React.CSSProperties),
      }}
    >
    <div
      ref={ref}
      className="relative"
      style={{
        width: "100%",
        height: "100%",
        opacity,
        transition: "opacity 200ms ease",
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 实心圆 + 同色细边 + 柔和落影（浅底上的"卡片化"存在感，非发光）。
          顶部一抹高光让圆有微立体感。
          注意：hover 反馈靠加强落影与加粗边而非 transform: scale——
          scale 会改变 React Flow 节点容器的视觉边缘，导致鼠标在边缘抖动时
          enter/leave 反复触发（实测 5/s 抖），把联动状态搅乱。 */}
      <div
        className="rounded-full"
        style={{
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${core} 46%, ${core} 100%)`,
          boxShadow: [
            `0 1px 2px rgba(15, 23, 42, 0.12)`,
            `0 ${size * 0.06}px ${size * 0.18 * glowIntensity}px ${glow}`,
            isActive ? `0 0 0 ${size * 0.06}px ${glow}, 0 ${size * 0.12}px ${size * 0.3}px ${glow}` : "",
          ]
            .filter(Boolean)
            .join(", "),
          border: `${isActive ? 2 : 1}px solid ${core}`,
          transition: "box-shadow 240ms ease-out, border-width 120ms ease",
          cursor: "pointer",
        }}
      />

      {/* Handle 不可见但允许连边 */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          border: "none",
          background: "transparent",
        }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          border: "none",
          background: "transparent",
        }}
        isConnectable={false}
      />

      {/* 圆下方常显短标题 — 反 zoom，文字字号视觉恒定 */}
      {labelVisible && (
        <div
          style={{
            position: "absolute",
            top: size + 6,
            left: "50%",
            transform: `translateX(-50%) scale(${labelScale})`,
            transformOrigin: "top center",
            fontSize: labelFontSize,
            lineHeight: 1.15,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? "#0f172a" : "#334155",
            textAlign: "center",
            maxWidth: Math.max(size * 3, 140),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
            // 白色 halo 让深色文字在边的彩色背景 / 节点上仍清晰
            textShadow:
              "0 0 3px rgba(255, 255, 255, 0.95), 0 0 3px rgba(255, 255, 255, 0.95), 0 0 2px rgba(255, 255, 255, 0.95)",
            letterSpacing: 0.2,
          }}
        >
          {label}
        </div>
      )}

      {hovered && rect && typeof document !== "undefined" &&
        createPortal(
          <HoverCard rect={rect} apiNode={apiNode} core={core} />,
          document.body,
        )}
    </div>
    </div>
  );
});

const NODE_TYPES: NodeTypes = { circle: CircleNode };

// ============================================================
// hover 浮窗（Portal）
// ============================================================

function HoverCard({
  rect,
  apiNode,
  core,
}: {
  rect: DOMRect;
  apiNode: ApiNode;
  core: string;
}) {
  const CARD_W = 280;
  const CARD_H_EST = 110;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

  let left = rect.right + 14;
  if (left + CARD_W > vw - 12) left = Math.max(12, rect.left - CARD_W - 14);
  let top = rect.top + rect.height / 2 - CARD_H_EST / 2;
  if (top < 12) top = 12;
  if (top + CARD_H_EST > vh - 12) top = vh - CARD_H_EST - 12;

  return (
    <div
      className="rounded-xl border border-border bg-popover px-3.5 py-2.5 pointer-events-none"
      style={{
        position: "fixed",
        left,
        top,
        width: CARD_W,
        zIndex: 1000,
        boxShadow: `0 0 0 1px ${core}33, 0 8px 28px rgba(15, 23, 42, 0.16)`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block rounded-full"
          style={{ width: 8, height: 8, background: core }}
        />
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: core }}
        >
          {apiNode.type}
        </span>
      </div>
      <div className="font-semibold text-sm leading-tight text-foreground">
        {apiNode.title || friendlyLabel(apiNode.path)}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mt-1 break-all">
        {apiNode.path}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
        <span>↓ {apiNode.inbound_count}</span>
        <span>↑ {apiNode.outbound_count}</span>
        {apiNode.status === "draft" && <span className="text-amber-600">draft</span>}
        {apiNode.status === "deprecated" && <span className="text-rose-600">deprecated</span>}
      </div>
    </div>
  );
}

// ============================================================
// 力导向布局
// ============================================================

function layoutForce(
  nodeIds: string[],
  edges: { from: string; to: string }[],
  width = 2400,
  height = 1600,
  iters = 350,
): { x: number; y: number }[] {
  const n = nodeIds.length;
  if (n === 0) return [];
  const idToIdx = new Map(nodeIds.map((id, i) => [id, i]));
  const pos = nodeIds.map((_, i) => {
    const angle = (i / n) * Math.PI * 2;
    const r = Math.min(width, height) * 0.38;
    return { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) };
  });
  const cx = width / 2;
  const cy = height / 2;
  let temp = Math.min(width, height) / 10;
  const k = Math.sqrt((width * height) / n);

  for (let iter = 0; iter < iters; iter++) {
    const force = pos.map(() => ({ dx: 0, dy: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const repulse = (k * k) / dist;
        force[i].dx += (dx / dist) * repulse;
        force[i].dy += (dy / dist) * repulse;
        force[j].dx -= (dx / dist) * repulse;
        force[j].dy -= (dy / dist) * repulse;
      }
    }
    for (const e of edges) {
      const i = idToIdx.get(e.from);
      const j = idToIdx.get(e.to);
      if (i === undefined || j === undefined) continue;
      const dx = pos[i].x - pos[j].x;
      const dy = pos[i].y - pos[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const attract = (dist * dist) / k;
      force[i].dx -= (dx / dist) * attract;
      force[i].dy -= (dy / dist) * attract;
      force[j].dx += (dx / dist) * attract;
      force[j].dy += (dy / dist) * attract;
    }
    for (let i = 0; i < n; i++) {
      force[i].dx -= (pos[i].x - cx) * 0.001;
      force[i].dy -= (pos[i].y - cy) * 0.001;
    }
    for (let i = 0; i < n; i++) {
      const f = Math.sqrt(force[i].dx ** 2 + force[i].dy ** 2) + 0.01;
      pos[i].x += (force[i].dx / f) * Math.min(f, temp);
      pos[i].y += (force[i].dy / f) * Math.min(f, temp);
    }
    temp *= 0.97;
  }
  return pos;
}

// ============================================================
// 主组件
// ============================================================

interface GraphViewProps {
  initialFilters?: { type?: string; tag?: string; includeArchive?: boolean };
}

export function GraphView({ initialFilters = {} }: GraphViewProps) {
  const t = useT();
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>(initialFilters.type || "");
  const [filterTag, setFilterTag] = useState<string>(initialFilters.tag || "");
  const [includeArchive, setIncludeArchive] = useState<boolean>(!!initialFilters.includeArchive);
  const [data, setData] = useState<ApiGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // hover 联动：哪个节点被 hover → 高亮其入边 + 出边 + 邻居节点
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 邻接表（hover 时快速查邻居 + 关联边）
  const adjacency = useMemo(() => {
    if (!data) return { neighbors: new Map<string, Set<string>>(), edgeIdxByNode: new Map<string, number[]>() };
    const neighbors = new Map<string, Set<string>>();
    const edgeIdxByNode = new Map<string, number[]>();
    data.edges.forEach((e, i) => {
      if (!neighbors.has(e.from)) neighbors.set(e.from, new Set());
      if (!neighbors.has(e.to)) neighbors.set(e.to, new Set());
      neighbors.get(e.from)!.add(e.to);
      neighbors.get(e.to)!.add(e.from);
      if (!edgeIdxByNode.has(e.from)) edgeIdxByNode.set(e.from, []);
      if (!edgeIdxByNode.has(e.to)) edgeIdxByNode.set(e.to, []);
      edgeIdxByNode.get(e.from)!.push(i);
      edgeIdxByNode.get(e.to)!.push(i);
    });
    return { neighbors, edgeIdxByNode };
  }, [data]);

  // 数据加载
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (filterType) sp.set("type", filterType);
    if (filterTag) sp.set("tag", filterTag);
    if (includeArchive) sp.set("include_archive", "1");
    fetch(`/api/graph${sp.toString() ? "?" + sp.toString() : ""}`)
      .then((r) => r.json())
      .then((d: ApiGraph & { error?: string }) => {
        if (cancelled) return;
        if (d.error) {
          setError(d.error);
          setData({ nodes: [], edges: [] });
          return;
        }
        setData({ nodes: d.nodes || [], edges: d.edges || [] });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterType, filterTag, includeArchive]);

  // 数据变化 → 布局 + 推到 React Flow state（不含 hover 联动状态）
  useEffect(() => {
    if (!data) return;
    const positions = layoutForce(
      data.nodes.map((n) => n.path),
      data.edges,
    );
    const rfn: Node[] = data.nodes.map((n, i) => {
      const c = NODE_COLORS[n.type] || DEFAULT_NODE_COLOR;
      const size = nodeSize(n);
      const pos = positions[i] || { x: 0, y: 0 };
      return {
        id: n.path,
        type: "circle",
        position: { x: pos.x - size / 2, y: pos.y - size / 2 },
        data: {
          apiNode: n,
          core: c.core,
          glow: c.glow,
          size,
          label: nodeShortLabel(n),
          labelFontSize: nodeLabelFontSize(n),
          highlighted: false,
          dimmed: false,
          // 节点序号 → stagger 延迟；封顶 1400ms 防大图入场过久
          appearDelay: Math.min(i * 14, 1400),
        },
        style: { background: "transparent", border: "none", padding: 0, width: size, height: size },
      };
    });
    const rfe: Edge[] = data.edges.map((e, i) => {
      const color = EDGE_COLORS[e.link_type] || EDGE_COLORS.REFERENCES;
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        // 力导向图用 center-to-center 直线比默认贝塞尔 S 曲线更干净利落
        type: "straight",
        animated: false,
        data: { linkType: e.link_type },
        style: {
          stroke: color,
          strokeWidth: 1,
          transition: "stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease",
        },
      };
    });
    setRfNodes(rfn);
    setRfEdges(rfe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // hover 节点 → 重算 nodes/edges 的 highlighted/dimmed 与边色
  useEffect(() => {
    if (!data) return;
    const hovered = hoveredNodeId;
    const neighborSet = hovered ? adjacency.neighbors.get(hovered) || new Set() : null;
    const activeEdgeIdxSet = hovered
      ? new Set(adjacency.edgeIdxByNode.get(hovered) || [])
      : null;

    setRfNodes((nodes) =>
      nodes.map((node) => {
        const isHovered = hovered === node.id;
        const isNeighbor = neighborSet ? neighborSet.has(node.id) : false;
        const highlighted = !!hovered && (isHovered || isNeighbor);
        const dimmed = !!hovered && !highlighted;
        const d = node.data as CircleNodeData;
        if (d.highlighted === highlighted && d.dimmed === dimmed) return node;
        return { ...node, data: { ...d, highlighted, dimmed } };
      }),
    );

    setRfEdges((edges) =>
      edges.map((edge, i) => {
        const linkType = (edge.data as { linkType?: string } | undefined)?.linkType || "REFERENCES";
        if (!hovered) {
          // 复原默认
          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: EDGE_COLORS[linkType] || EDGE_COLORS.REFERENCES,
              strokeWidth: 1,
              opacity: 1,
            },
            zIndex: 0,
          };
        }
        const isActive = activeEdgeIdxSet!.has(i);
        if (isActive) {
          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: EDGE_HIGHLIGHT_COLORS[linkType] || EDGE_HIGHLIGHT_COLORS.REFERENCES,
              strokeWidth: 2,
              opacity: 1,
              filter: `drop-shadow(0 0 4px ${EDGE_HIGHLIGHT_COLORS[linkType] || "#94a3b8"})`,
            },
            zIndex: 1000,
          };
        }
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: EDGE_COLORS[linkType] || EDGE_COLORS.REFERENCES,
            strokeWidth: 0.5,
            opacity: 0.18,
            filter: "none",
          },
          zIndex: 0,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, adjacency]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_evt, node) => {
    setHoveredNodeId(node.id);
  }, []);
  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      router.push(`/page/${node.id}`);
    },
    [router],
  );

  const allTypes = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.nodes.map((n) => n.type))).sort();
  }, [data]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部说明 + 过滤栏。窄屏隐藏副标题省高度，过滤项加大行距防换行时挤在一起。 */}
      <div className="px-5 py-3 border-b border-border bg-background space-y-2 md:space-y-1.5 shrink-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-base font-semibold tracking-tight text-foreground">{t("graph.title")}</h1>
          <p className="hidden md:block text-[11px] text-muted-foreground leading-snug">
            {t("graph.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{t("graph.filter.type_label")}</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-input rounded-md px-2 py-0.5 bg-background text-xs text-foreground"
            >
              <option value="">{t("graph.filter.type_all")}</option>
              {allTypes.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{t("graph.filter.tag_label")}</span>
            <input
              type="text"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              placeholder={t("graph.filter.tag_placeholder")}
              className="border border-input rounded-md px-2 py-0.5 bg-background text-xs text-foreground w-40 placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchive}
              onChange={(e) => setIncludeArchive(e.target.checked)}
              className="accent-primary"
            />
            {t("graph.filter.include_archive")}
          </label>
          {(filterType || filterTag || includeArchive) && (
            <button
              type="button"
              onClick={() => {
                setFilterType("");
                setFilterTag("");
                setIncludeArchive(false);
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {t("graph.filter.reset")}
            </button>
          )}
          {data && (
            <span className="ml-auto text-[11px] text-muted-foreground font-mono">
              {t("graph.stats", { nodes: data.nodes.length, edges: data.edges.length })}
            </span>
          )}
        </div>
      </div>

      {/* 入场动画 keyframes：节点带 overshoot 弹入（stagger 延迟由 --gv-delay 控制）、
          边随后整体淡入。放静态 <style> 里保证 className 稳定——hover 重渲染不会重启动画。 */}
      <style>{`
        @keyframes gvNodeIn {
          0%   { opacity: 0; transform: scale(0.2); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        .gv-node-appear {
          animation: gvNodeIn 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          animation-delay: var(--gv-delay, 0ms);
          will-change: transform, opacity;
        }
        @keyframes gvEdgeIn { from { opacity: 0; } to { opacity: 1; } }
        .react-flow__edge { animation: gvEdgeIn 0.7s ease-out both; animation-delay: 0.4s; }
        @media (prefers-reduced-motion: reduce) {
          .gv-node-appear, .react-flow__edge { animation: none !important; }
        }
      `}</style>

      {/* React Flow 主区 — 浅色背景：极淡的中心柔光，避免纯白单调 */}
      <div
        className="flex-1 min-h-0 relative"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 28% 22%, rgba(59, 130, 246, 0.05), transparent 60%)",
            "radial-gradient(ellipse 65% 65% at 78% 72%, rgba(168, 85, 247, 0.045), transparent 62%)",
            "radial-gradient(ellipse at center, #fbfcfe 0%, #f1f5f9 100%)",
          ].join(", "),
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10 pointer-events-none">
            {t("graph.loading")}
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm z-10">
            {t("graph.error", { err: error })}
          </div>
        )}
        {data && data.nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
            {t("graph.empty")}
          </div>
        )}
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.1}
          maxZoom={3}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="#cbd5e1"
            style={{ opacity: 0.7 }}
          />
          <Controls
            showInteractive={false}
            className="!shadow-md !border-border !rounded-lg overflow-hidden !bg-card [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
          />
          <MiniMap
            zoomable
            pannable
            ariaLabel="Graph minimap"
            nodeStrokeWidth={2}
            nodeBorderRadius={20}
            maskColor="rgba(148, 163, 184, 0.18)"
            className="!shadow-md !border-border !rounded-lg !bg-card"
            style={{ backgroundColor: "#ffffff" }}
            nodeColor={(n) => {
              const path = n.id;
              const apiNode = data?.nodes.find((d) => d.path === path);
              return (apiNode && NODE_COLORS[apiNode.type]?.core) || DEFAULT_NODE_COLOR.core;
            }}
            nodeStrokeColor={(n) => {
              const path = n.id;
              const apiNode = data?.nodes.find((d) => d.path === path);
              return (apiNode && NODE_COLORS[apiNode.type]?.core) || DEFAULT_NODE_COLOR.core;
            }}
          />
          <Legend />
        </ReactFlow>
      </div>
    </div>
  );
}

/** 图例：白卡（bg-card + border + shadow），浮在画布右上 */
function Legend() {
  const t = useT();
  return (
    <div
      className="absolute top-4 right-4 z-10 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-lg p-3 text-[10px] max-w-[15rem]"
      style={{ pointerEvents: "auto" }}
    >
      <div className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-widest text-[9px]">
        {t("graph.legend.nodes")}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {Object.entries(NODE_LEGEND_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full shrink-0"
              style={{ width: 9, height: 9, background: c.core }}
            />
            <span className="font-mono text-foreground/80 truncate">{type}</span>
          </div>
        ))}
      </div>
      <div className="font-semibold mt-2.5 mb-1.5 text-muted-foreground uppercase tracking-widest text-[9px]">
        {t("graph.legend.edges")}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {Object.entries(EDGE_LEGEND_COLORS).map(([rel, color]) => (
          <div key={rel} className="flex items-center gap-1.5">
            <span
              className="inline-block shrink-0"
              style={{ width: 14, height: 2, background: color, borderRadius: 1 }}
            />
            <span className="font-mono text-foreground/80 truncate">{rel}</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-muted-foreground mt-2 leading-snug">
        {t("graph.legend.edges_hint")}
      </div>
      <div className="border-t border-border mt-2.5 pt-2">
        <div className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-widest text-[9px]">
          {t("graph.help.title")}
        </div>
        <ul className="space-y-1 text-[9px] text-muted-foreground leading-snug list-none">
          <li className="flex gap-1.5">
            <span className="text-muted-foreground/60 shrink-0" aria-hidden="true">·</span>
            <span>{t("graph.help.drag")}</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-muted-foreground/60 shrink-0" aria-hidden="true">·</span>
            <span>{t("graph.help.click")}</span>
          </li>
          <li className="flex gap-1.5">
            <span className="text-muted-foreground/60 shrink-0" aria-hidden="true">·</span>
            <span>{t("graph.help.relation")}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
