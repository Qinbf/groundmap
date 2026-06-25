"use client";

/**
 * 知识图谱可视化（v0.6）— 「深空数据网络」科技感主题，canvas + d3-force 实时物理。
 *
 * 美学方向（前沿 / 高级 / 科技感）：
 *   - near-black 深空画布 + 世界坐标细网格（随平移缩放走，给「无限数据画布」感）
 *   - 节点是发光球体：亮核 + 同色外辉光（bloom）；按重要度（度数）大幅拉开尺寸，
 *     枢纽更大且套一圈光环（beacon ring）
 *   - 边是低亮度光纤；hover 时关联边点亮发光、其余整体淡出
 *   - 玻璃拟态 HUD 面板（图例 / 缩放 / hover 卡），随主题（深/浅）自适应
 *   - 电光配色（蓝 / 青 / 紫 主调 + 金 / 品红 点缀）
 *   默认深色；另保留干净的浅色「蓝图」变体。
 *
 * 为什么 canvas + d3-force：DOM(React Flow) 做图谱必卡——hover 全量重渲染、
 * 一次性同步力导向。canvas 自绘 + 实时物理 = 节点带阻尼收敛、拖拽橡皮筋、60fps、
 * hover 高亮零 React churn。
 *
 * ⚠️ 维护不变量（完整规范见 GroundMap-设计文档.md §10.6）：
 *   布局力与节点尺寸**必须随每张图的密度自适应**，不得写死按某个 workspace 调的常量。
 *   - 节点半径按「相对本图 maxDeg」(见 nodeRadius)，不是绝对度数；
 *   - charge / linkDist / linkStrength 随 节点数 + 平均度数 计算（见下方 sim 构建）。
 *   否则换到密度差异大的库（如超稠密的 ip：平均度数≈44）会挤成团、大小失去对比。
 *   改这些公式后，须在「最稀疏」和「最稠密」两个库各抽查一次渲染。
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-client";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";

// ============================================================
// 类型
// ============================================================

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

interface SimNode {
  id: string;
  api: ApiNode;
  deg: number;
  r: number;
  label: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  link_type: string;
}

type ZoomFilterEvent = WheelEvent | MouseEvent | TouchEvent;

const FONT_STACK =
  '-apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Helvetica Neue", system-ui, sans-serif';
const MONO_STACK = 'ui-monospace, "SF Mono", "JetBrains Mono", "Roboto Mono", Menlo, monospace';

// ============================================================
// 主题调色板
// ============================================================

interface NodePair { fill: string; stroke: string }
interface Palette {
  dark: boolean;
  bg: string;
  bgGrad: [string, string]; // 径向纵深：中心 → 边缘
  grid: string;
  node: Record<string, NodePair>;
  nodeDefault: NodePair;
  linkBase: string;
  linkRel: Record<string, string>;
  linkHi: Record<string, string>;
  label: string;
  labelHalo: string;
  labelHi: string;
  dim: number;
  glow: boolean;
}

// 深色：深空 + 电光发光
const DARK: Palette = {
  dark: true,
  bg: "#070a12",
  bgGrad: ["rgba(56,92,160,0.10)", "rgba(2,4,9,0.55)"],
  grid: "rgba(120,150,210,0.05)",
  node: {
    concept:        { fill: "#4f9dff", stroke: "#9cc4ff" },
    entity:         { fill: "#22d3ee", stroke: "#9bf0fb" },
    source_summary: { fill: "#dca94e", stroke: "#f0cd87" },
    analysis:       { fill: "#9d6bff", stroke: "#c9b0ff" },
    comparison:     { fill: "#f25fb0", stroke: "#ffaad8" },
    index:          { fill: "#8aa2c8", stroke: "#c2d2ea" },
  },
  nodeDefault: { fill: "#7d8aa0", stroke: "#b8c4d8" },
  linkBase: "rgba(125,160,220,0.16)",
  linkRel: {
    REFERENCES: "rgba(125,160,220,0.16)",
    SUPPORTS: "rgba(34,211,170,0.55)",
    REFUTES: "rgba(251,111,126,0.6)",
    EXTENDS: "rgba(79,157,255,0.55)",
    IS_A: "rgba(157,107,255,0.55)",
    PART_OF: "rgba(245,185,66,0.55)",
    ALTERNATIVE_TO: "rgba(232,121,232,0.55)",
    CITES: "rgba(125,160,220,0.16)",
  },
  linkHi: {
    REFERENCES: "#aab8d4",
    SUPPORTS: "#22d3ee",
    REFUTES: "#fb6f7e",
    EXTENDS: "#4f9dff",
    IS_A: "#9d6bff",
    PART_OF: "#f5b942",
    ALTERNATIVE_TO: "#e879e8",
    CITES: "#aab8d4",
  },
  label: "#c4d2ea",
  labelHalo: "rgba(5,8,15,0.78)",
  labelHi: "#ffffff",
  dim: 0.08,
  glow: true,
};

// 浅色：干净「蓝图」schematic
const LIGHT: Palette = {
  dark: false,
  bg: "#f4f6fb",
  bgGrad: ["rgba(255,255,255,0.6)", "rgba(40,70,130,0.05)"],
  grid: "rgba(70,100,160,0.06)",
  node: {
    concept:        { fill: "#3b82f6", stroke: "#1e5fd6" },
    entity:         { fill: "#0ea5b7", stroke: "#0a7c8a" },
    source_summary: { fill: "#e0982e", stroke: "#b97714" },
    analysis:       { fill: "#7c5fe0", stroke: "#5b3fc0" },
    comparison:     { fill: "#d6489a", stroke: "#b22f7c" },
    index:          { fill: "#64748b", stroke: "#475569" },
  },
  nodeDefault: { fill: "#94a3b8", stroke: "#64748b" },
  linkBase: "rgba(100,116,139,0.26)",
  linkRel: {
    REFERENCES: "rgba(100,116,139,0.26)",
    SUPPORTS: "rgba(14,165,183,0.6)",
    REFUTES: "rgba(224,68,94,0.62)",
    EXTENDS: "rgba(59,130,246,0.58)",
    IS_A: "rgba(124,95,224,0.58)",
    PART_OF: "rgba(224,152,46,0.6)",
    ALTERNATIVE_TO: "rgba(177,79,196,0.58)",
    CITES: "rgba(100,116,139,0.26)",
  },
  linkHi: {
    REFERENCES: "#475569",
    SUPPORTS: "#0a7c8a",
    REFUTES: "#e0445e",
    EXTENDS: "#1e5fd6",
    IS_A: "#5b3fc0",
    PART_OF: "#b97714",
    ALTERNATIVE_TO: "#b14fc4",
    CITES: "#475569",
  },
  label: "#1e293b",
  labelHalo: "rgba(244,246,251,0.85)",
  labelHi: "#0f172a",
  dim: 0.12,
  glow: false,
};

const RELATION_KEYS = ["REFERENCES", "SUPPORTS", "REFUTES", "EXTENDS", "IS_A", "PART_OF", "ALTERNATIVE_TO", "CITES"];

// ============================================================
// 工具
// ============================================================

/** 按重要度（度数）大幅拉开：叶子 ~4，枢纽 ~46（约 11×），让重点一眼可辨。 */
/** 半径按「相对本图最高度数」映射：孤立 ~6 → 本图枢纽 ~48。
 *  用相对度数（而非绝对）→ 无论稀疏图还是稠密图（度数都很高）都保持大小对比。 */
function nodeRadius(deg: number, maxDeg: number): number {
  const norm = maxDeg > 0 ? deg / maxDeg : 0;
  return 6 + Math.pow(norm, 0.6) * 42;
}

function shortLabel(n: ApiNode): string {
  if (n.title && n.title.length <= 30) return n.title;
  const noExt = n.path.replace(/\.md$/, "");
  const segs = noExt.split("/");
  return segs[segs.length - 1];
}
function friendlyLabel(path: string): string {
  const noExt = path.replace(/\.md$/, "");
  return noExt.startsWith("wiki/") ? noExt.slice(5) : noExt;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mixWhite(hex: string, amount: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16), g = parseInt(m.substring(2, 4), 16), b = parseInt(m.substring(4, 6), 16);
  return `rgb(${Math.round(r + (255 - r) * amount)}, ${Math.round(g + (255 - g) * amount)}, ${Math.round(b + (255 - b) * amount)})`;
}
function mixBlack(hex: string, amount: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16), g = parseInt(m.substring(2, 4), 16), b = parseInt(m.substring(4, 6), 16);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}
function truncateToWidth(ctx: CanvasRenderingContext2D, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let res = s;
  while (res.length > 1 && ctx.measureText(res + "…").width > maxW) res = res.slice(0, -1);
  return res + "…";
}

// 玻璃拟态面板样式（随图谱主题自适应）
function panelStyle(dark: boolean): React.CSSProperties {
  return dark
    ? {
        background: "rgba(12,17,30,0.74)",
        border: "1px solid rgba(125,165,255,0.18)",
        color: "#d6e0f3",
        boxShadow: "0 12px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(150,185,255,0.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }
    : {
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(15,23,42,0.1)",
        color: "#1e293b",
        boxShadow: "0 8px 28px rgba(15,23,42,0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      };
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
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // 科技感默认深色

  const [data, setData] = useState<ApiGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [hoverCard, setHoverCard] = useState<{ api: ApiNode; sx: number; sy: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const neighborRef = useRef<Map<string, Set<string>>>(new Map());
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null); // 点击选中并持久高亮的节点
  const draggingRef = useRef<SimNode | null>(null);
  const dprRef = useRef<number>(1);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const themeRef = useRef<Palette>(DARK);
  const pointerDownRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  themeRef.current = theme === "dark" ? DARK : LIGHT;

  // ---------- 数据加载 ----------
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

  const allTypes = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.nodes.map((n) => n.type))).sort();
  }, [data]);

  // ---------- 绘制 ----------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pal = themeRef.current;
    const isDark = pal.glow;
    const { w, h } = sizeRef.current;
    const dpr = dprRef.current;
    const tf = transformRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    // 焦点 = 正在 hover 的节点；无 hover 时退回到「点击选中」的节点（持久高亮）。
    // 下方所有高亮 / 淡出 / 标签逻辑都以此为准（变量名沿用 hoverId 仅为少改）。
    const hoverId = hoverIdRef.current ?? selectedIdRef.current;
    const neigh = hoverId ? neighborRef.current.get(hoverId) : null;

    // 背景 + 径向纵深
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.5, Math.max(w, h) * 0.8);
    vg.addColorStop(0, pal.bgGrad[0]);
    vg.addColorStop(1, pal.bgGrad[1]);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // ---- 世界坐标层：网格 + 边 + 节点 ----
    ctx.save();
    ctx.translate(tf.x, tf.y);
    ctx.scale(tf.k, tf.k);

    // 网格（随平移缩放走）
    const step = tf.k < 0.3 ? 180 : 90;
    const left = -tf.x / tf.k, top = -tf.y / tf.k, right = (w - tf.x) / tf.k, bottom = (h - tf.y) / tf.k;
    ctx.lineWidth = 1 / tf.k;
    ctx.strokeStyle = pal.grid;
    ctx.beginPath();
    for (let x = Math.floor(left / step) * step; x < right; x += step) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
    for (let y = Math.floor(top / step) * step; y < bottom; y += step) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
    ctx.stroke();

    // 边
    ctx.lineCap = "round";
    for (const l of links) {
      const s = l.source as SimNode;
      const tg = l.target as SimNode;
      if (!s || !tg || s.x == null || tg.x == null) continue;
      const active = !!hoverId && (s.id === hoverId || tg.id === hoverId);
      const dimmed = !!hoverId && !active;
      ctx.globalAlpha = dimmed ? pal.dim : 1;
      // 高亮边用图例同款实色（linkHi），且更粗、不加发光——发光会把细线晕开、
      // 显得发灰发虚、和图例对不上。要的就是「干净、就是图例那个颜色」。
      ctx.strokeStyle = active ? pal.linkHi[l.link_type] || pal.linkHi.REFERENCES : pal.linkRel[l.link_type] || pal.linkBase;
      ctx.lineWidth = clamp((active ? 2.6 : 1.0) / tf.k, 0.7, 3.4);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tg.x, tg.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 节点（发光球 + 枢纽光环）
    for (const n of nodes) {
      const active = !hoverId || n.id === hoverId || (neigh ? neigh.has(n.id) : false);
      const dimmed = !!hoverId && !active;
      const isHover = n.id === hoverId;
      const isHub = n.r >= 28;
      ctx.globalAlpha = dimmed ? pal.dim : 1;
      const c = pal.node[n.api.type] || pal.nodeDefault;

      // 辉光 / 落影
      if (isDark) {
        ctx.shadowColor = c.fill;
        ctx.shadowBlur = isHover ? 24 : isHub ? 13 : 5;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = isHover ? "rgba(30,41,59,0.32)" : "rgba(30,41,59,0.18)";
        ctx.shadowBlur = isHover ? 12 : 6;
        ctx.shadowOffsetY = 2;
      }

      // 球体：亮核 → 本色 → 边缘略暗
      const grad = ctx.createRadialGradient(
        n.x - n.r * 0.28, n.y - n.r * 0.32, n.r * 0.12,
        n.x, n.y, n.r * 1.03,
      );
      grad.addColorStop(0, mixWhite(c.fill, isDark ? 0.55 : 0.3));
      grad.addColorStop(0.5, c.fill);
      grad.addColorStop(1, isDark ? mixBlack(c.fill, 0.18) : mixBlack(c.fill, 0.08));
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 描边
      ctx.lineWidth = clamp((isHover ? 2 : 1.2) / tf.k, 0.8, 2.6);
      ctx.strokeStyle = c.stroke;
      ctx.globalAlpha = (dimmed ? pal.dim : 1) * (isDark ? 0.85 : 1);
      ctx.stroke();

      // 枢纽光环（beacon ring）：重要节点额外一圈
      if (isHub && !dimmed) {
        const ringR = n.r + clamp(n.r * 0.22, 4, 10);
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
        ctx.lineWidth = clamp(1.2 / tf.k, 0.6, 1.6);
        ctx.strokeStyle = mixWhite(c.fill, isDark ? 0.2 : 0.0);
        ctx.globalAlpha = isHover ? 0.55 : 0.3;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- 标签（屏幕空间，hub 优先 + 防重叠 + 截断）----
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";

    const cand: { n: SimNode; sx: number; sy: number; screenR: number; isHi: boolean }[] = [];
    for (const n of nodes) {
      const active = !hoverId || n.id === hoverId || (neigh ? neigh.has(n.id) : false);
      if (hoverId && !active) continue;
      const sx = n.x * tf.k + tf.x;
      const sy = n.y * tf.k + tf.y;
      const screenR = n.r * tf.k;
      if (sx < -80 || sx > w + 80 || sy < -40 || sy > h + 40) continue;
      const show = hoverId ? true : screenR >= 15 || tf.k >= 1.45;
      if (!show) continue;
      cand.push({ n, sx, sy, screenR, isHi: n.id === hoverId });
    }
    cand.sort((a, b) => Number(b.isHi) - Number(a.isHi) || b.n.deg - a.n.deg);

    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const c of cand) {
      const fs = c.isHi ? 13 : 11.5;
      ctx.font = `${c.isHi ? 600 : 400} ${fs}px ${FONT_STACK}`;
      const maxW = c.n.deg >= 4 ? 140 : 96;
      const text = truncateToWidth(ctx, c.n.label, maxW);
      const tw = ctx.measureText(text).width;
      const tx = c.sx;
      const ty = c.sy + c.screenR + 5;
      const box = { x0: tx - tw / 2 - 2, y0: ty - 1, x1: tx + tw / 2 + 2, y1: ty + fs + 2 };
      if (!hoverId) {
        let clash = false;
        for (const p of placed) {
          if (box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0) { clash = true; break; }
        }
        if (clash) continue;
      }
      placed.push(box);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = pal.labelHalo;
      ctx.strokeText(text, tx, ty);
      ctx.fillStyle = c.isHi ? pal.labelHi : pal.label;
      ctx.fillText(text, tx, ty);
    }
  }, []);

  // ---------- 命中测试 ----------
  const pickNode = useCallback((px: number, py: number): SimNode | null => {
    const tf = transformRef.current;
    const gx = (px - tf.x) / tf.k;
    const gy = (py - tf.y) / tf.k;
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - gx, dy = n.y - gy;
      const hit = n.r + 3 / tf.k;
      if (dx * dx + dy * dy <= hit * hit) return n;
    }
    return null;
  }, []);

  // ---------- 适应视图 ----------
  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    const zb = zoomRef.current;
    const nodes = nodesRef.current;
    if (!canvas || !zb || nodes.length === 0) return;
    const { w, h } = sizeRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r);
      minY = Math.min(minY, n.y - n.r);
      maxX = Math.max(maxX, n.x + n.r);
      maxY = Math.max(maxY, n.y + n.r);
    }
    const gw = Math.max(maxX - minX, 1);
    const gh = Math.max(maxY - minY, 1);
    const k = clamp(Math.min(w / gw, h / gh) * (1 - 0.06), 0.15, 4);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    select(canvas).call(zb.transform, zoomIdentity.translate(w / 2 - k * cx, h / 2 - k * cy).scale(k));
  }, []);

  // ---------- 构建模拟 + 交互 ----------
  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const setSize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h };
      dprRef.current = dpr;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    setSize();

    const idSet = new Set(data.nodes.map((n) => n.path));
    const maxDeg = Math.max(1, ...data.nodes.map((n) => n.inbound_count + n.outbound_count));
    const nodes: SimNode[] = data.nodes.map((n) => {
      const deg = n.inbound_count + n.outbound_count;
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * 120;
      return {
        id: n.path,
        api: n,
        deg,
        r: nodeRadius(deg, maxDeg),
        label: shortLabel(n),
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad,
      };
    });
    const links: SimLink[] = data.edges
      .filter((e) => idSet.has(e.from) && idSet.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, link_type: e.link_type }));

    const neighbors = new Map<string, Set<string>>();
    for (const e of links) {
      const s = e.source as string, tg = e.target as string;
      if (!neighbors.has(s)) neighbors.set(s, new Set());
      if (!neighbors.has(tg)) neighbors.set(tg, new Set());
      neighbors.get(s)!.add(tg);
      neighbors.get(tg)!.add(s);
    }
    nodesRef.current = nodes;
    linksRef.current = links;
    neighborRef.current = neighbors;

    // d3-force：显著加大间距，整体更分散
    // 力参数随图密度自适应：节点越多、平均度数越高 → 斥力越强、连接越松，
    // 这样稀疏图(smb)和超稠密图(ip, 平均度≈44)都能真正铺开、不挤成一坨。
    const nCount = nodes.length;
    const avgDeg = (links.length * 2) / Math.max(nCount, 1);
    const charge = -(700 + nCount * 8 + avgDeg * 45);
    const linkStrength = Math.min(0.09, 1.3 / Math.max(avgDeg, 1));
    const linkDist = 120 + avgDeg * 1.5;
    const sim = forceSimulation<SimNode, SimLink>(nodes)
      .force("charge", forceManyBody<SimNode>().strength(charge).distanceMax(4000))
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => {
            const s = l.source as SimNode, tg = l.target as SimNode;
            return linkDist + (s.r + tg.r);
          })
          .strength(linkStrength),
      )
      .force("x", forceX<SimNode>(0).strength(0.02))
      .force("y", forceY<SimNode>(0).strength(0.02))
      .force("collide", forceCollide<SimNode>((d) => d.r + 16).strength(0.95))
      .alpha(1)
      .alphaDecay(0.025)
      .velocityDecay(0.42);
    simRef.current = sim;

    // 信息卡定位到某节点（按其当前坐标 + 变换）；传 null 则隐藏。
    // 定义在 zoom 行为之前——fitView 会触发一次 zoom 事件、其回调会用到它。
    const cardFor = (id: string | null) => {
      if (!id) { setHoverCard(null); return; }
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) { setHoverCard(null); return; }
      const tf = transformRef.current;
      setHoverCard({ api: node.api, sx: node.x * tf.k + tf.x, sy: node.y * tf.k + tf.y - node.r * tf.k });
    };

    const zb = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.12, 4])
      .filter((event: ZoomFilterEvent) => {
        if (event.type === "wheel") return true;
        if ("button" in event && event.button != null && event.button !== 0) return false;
        const rect = canvas.getBoundingClientRect();
        const point = "touches" in event ? event.touches[0] ?? event.changedTouches[0] : event;
        if (!point) return true;
        const px = point.clientX - rect.left;
        const py = point.clientY - rect.top;
        return !pickNode(px, py);
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        // 平移/缩放后屏幕坐标变了：清掉 hover，但保留「选中」的持久高亮，
        // 信息卡按选中节点的新坐标重定位（无选中则隐藏）。
        hoverIdRef.current = null;
        cardFor(selectedIdRef.current);
        draw();
      });
    zoomRef.current = zb;
    select(canvas).call(zb).on("dblclick.zoom", null);

    sim.stop();
    for (let i = 0; i < 300; i++) sim.tick();
    fitView();
    sim.alpha(0.2).restart();
    sim.on("tick", () => draw());
    sim.on("end", () => draw());

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { px: e.clientX - rect.left, py: e.clientY - rect.top };
    };

    const onPointerMove = (e: PointerEvent) => {
      const { px, py } = toLocal(e);
      // 任意拖动（拖节点 或 空白平移）超过阈值即记为「移动过」→ 松手不算点击，
      // 否则平移空白后会误判成「点空白 → 取消选中」。
      if (pointerDownRef.current) {
        const ddx = px - pointerDownRef.current.x, ddy = py - pointerDownRef.current.y;
        if (ddx * ddx + ddy * ddy > 16) pointerDownRef.current.moved = true;
      }
      const drag = draggingRef.current;
      if (drag) {
        const tf = transformRef.current;
        drag.fx = (px - tf.x) / tf.k;
        drag.fy = (py - tf.y) / tf.k;
        sim.alphaTarget(0.3).restart();
        return;
      }
      const hit = pickNode(px, py);
      const newId = hit ? hit.id : null;
      if (newId !== hoverIdRef.current) {
        hoverIdRef.current = newId;
        canvas.style.cursor = newId ? "pointer" : "grab";
        // 卡片跟随 hover；无 hover 时退回展示「选中」节点的卡
        cardFor(newId ?? selectedIdRef.current);
        draw();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const { px, py } = toLocal(e);
      pointerDownRef.current = { x: px, y: py, moved: false };
      const hit = pickNode(px, py);
      if (hit) {
        draggingRef.current = hit;
        hit.fx = hit.x;
        hit.fy = hit.y;
        canvas.setPointerCapture?.(e.pointerId);
        canvas.style.cursor = "grabbing";
      }
    };

    const onPointerUp = () => {
      const down = pointerDownRef.current;
      const drag = draggingRef.current;
      if (drag) {
        drag.fx = null;
        drag.fy = null;
        sim.alphaTarget(0);
        draggingRef.current = null;
        canvas.style.cursor = "grab";
      }
      // 单击（未拖动）：点节点 = 选中并持久高亮其关联子图（再点同一个=取消）；
      // 点空白 = 取消选中。不跳转——停留在图谱页。
      if (down && !down.moved) {
        const hit = pickNode(down.x, down.y);
        selectedIdRef.current = hit ? (selectedIdRef.current === hit.id ? null : hit.id) : null;
        cardFor(hoverIdRef.current ?? selectedIdRef.current);
        draw();
      }
      pointerDownRef.current = null;
    };

    // 双击节点 = 打开对应 wiki 页（保留导航能力，与单击选中互不冲突）
    const onDblClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = pickNode(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) router.push(`/page/${hit.id}`);
    };

    const onPointerLeave = () => {
      if (!draggingRef.current && hoverIdRef.current) {
        hoverIdRef.current = null;
        draw();
      }
      // 离开画布：清 hover，但保留选中的持久高亮 + 其信息卡
      cardFor(selectedIdRef.current);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", onDblClick);

    const ro = new ResizeObserver(() => { setSize(); draw(); });
    ro.observe(wrap);
    draw();

    return () => {
      sim.stop();
      sim.on("tick", null);
      sim.on("end", null);
      select(canvas).on(".zoom", null);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("dblclick", onDblClick);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    draw();
  }, [theme, draw]);

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    const zb = zoomRef.current;
    if (!canvas || !zb) return;
    select(canvas).call(zb.scaleBy, factor);
  };

  const dark = theme === "dark";
  const pal = dark ? DARK : LIGHT;

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="flex flex-col h-full">
      {/* 顶部说明 + 滤镜 */}
      <div className="px-5 py-3 border-b border-border bg-background space-y-2 md:space-y-1.5 shrink-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-base font-semibold tracking-tight text-foreground">{t("graph.title")}</h1>
          <p className="hidden md:block text-[11px] text-muted-foreground leading-snug">{t("graph.subtitle")}</p>
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
              onClick={() => { setFilterType(""); setFilterTag(""); setIncludeArchive(false); }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {t("graph.filter.reset")}
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <div className="inline-flex rounded-md border border-input overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-2 py-0.5 ${dark ? "bg-accent text-foreground font-medium" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {t("graph.theme.dark")}
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-2 py-0.5 border-l border-input ${!dark ? "bg-accent text-foreground font-medium" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {t("graph.theme.light")}
              </button>
            </div>
            {data && (
              <span className="text-[11px] text-muted-foreground font-mono pl-1">
                {t("graph.stats", { nodes: data.nodes.length, edges: data.edges.length })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 画布区 */}
      <div ref={wrapRef} className="flex-1 min-h-0 relative overflow-hidden" style={{ background: pal.bg }}>
        <canvas ref={canvasRef} className="block touch-none select-none" style={{ cursor: "grab" }} />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2.5 text-sm" style={{ color: dark ? "#9fb2d4" : "#64748b" }}>
              <span
                className="inline-block w-4 h-4 rounded-full animate-spin"
                style={{ border: `2px solid ${dark ? "rgba(159,178,212,0.25)" : "rgba(100,116,139,0.3)"}`, borderTopColor: dark ? "#9fb2d4" : "#64748b" }}
              />
              {t("graph.loading")}
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm z-10">
            {t("graph.error", { err: error })}
          </div>
        )}
        {data && data.nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm z-10" style={{ color: dark ? "#9fb2d4" : "#64748b" }}>
            {t("graph.empty")}
          </div>
        )}

        {hoverCard && (
          <HoverCard
            api={hoverCard.api}
            sx={hoverCard.sx}
            sy={hoverCard.sy}
            accent={(pal.node[hoverCard.api.type] || pal.nodeDefault).fill}
            dark={dark}
            wrap={wrapRef.current}
          />
        )}

        {/* 缩放控件（玻璃 HUD）*/}
        <div
          className="absolute bottom-4 left-4 z-10 flex flex-col rounded-xl overflow-hidden"
          style={panelStyle(dark)}
        >
          <ZoomBtn onClick={() => zoomBy(1.4)} title={t("graph.zoom.in")} dark={dark}>+</ZoomBtn>
          <ZoomBtn onClick={() => zoomBy(1 / 1.4)} title={t("graph.zoom.out")} dark={dark} border>−</ZoomBtn>
          <ZoomBtn onClick={() => fitView()} title={t("graph.zoom.fit")} dark={dark} border small>⤢</ZoomBtn>
        </div>

        <Legend pal={pal} dark={dark} />
      </div>
    </div>
  );
}

function ZoomBtn({
  onClick, title, dark, border, small, children,
}: {
  onClick: () => void; title: string; dark: boolean; border?: boolean; small?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-9 h-9 flex items-center justify-center leading-none transition-colors ${small ? "text-xs" : "text-lg"}`}
      style={{
        color: dark ? "#cdd9ef" : "#334155",
        borderTop: border ? `1px solid ${dark ? "rgba(125,165,255,0.14)" : "rgba(15,23,42,0.08)"}` : undefined,
        background: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(125,165,255,0.1)" : "rgba(15,23,42,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

// 把节点 type 原始值（concept/entity/source_summary/...）映射为界面语言下的显示文案；
// 表里没有对应 type.* 时回退到原始值（与 WikiTree 的渲染口径一致；底层 schema 值不变）。
function localizeType(t: ReturnType<typeof useT>, raw: string): string {
  const key = `type.${raw}`;
  const out = t(key as never);
  return out === key ? raw : out;
}

// 关系类型显示名翻译（找不到键则回退到原始 token，如自定义别名）
function localizeRelation(t: ReturnType<typeof useT>, raw: string): string {
  const key = `graph.rel.${raw}`;
  const out = t(key as never);
  return out === key ? raw : out;
}

// ============================================================
// hover 卡（玻璃 HUD，随主题）
// ============================================================

function HoverCard({
  api, sx, sy, accent, dark, wrap,
}: {
  api: ApiNode; sx: number; sy: number; accent: string; dark: boolean; wrap: HTMLDivElement | null;
}) {
  const t = useT();
  const W = 268;
  const wrapW = wrap?.clientWidth ?? 1200;
  const left = Math.max(8, Math.min(sx - W / 2, wrapW - W - 8));
  const top = sy - 14;
  const below = top < 100;
  const tags = api.tags || [];
  const muted = dark ? "#8da2c6" : "#64748b";
  const ps = panelStyle(dark);
  return (
    <div
      className="absolute z-20 rounded-xl px-3.5 py-2.5 pointer-events-none"
      style={{
        ...ps,
        left,
        top: below ? sy + 22 : undefined,
        bottom: below ? undefined : `calc(100% - ${top}px)`,
        width: W,
        boxShadow: `${ps.boxShadow}, 0 0 0 1px ${accent}${dark ? "44" : "30"}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: accent, boxShadow: dark ? `0 0 8px ${accent}` : undefined }} />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: accent, fontFamily: MONO_STACK }}>
          {localizeType(t, api.type)}
        </span>
        {api.status === "draft" && <span className="text-[10px] ml-auto" style={{ color: "#e0982e" }}>{t("status.draft")}</span>}
        {api.status === "deprecated" && <span className="text-[10px] ml-auto" style={{ color: "#e0607a" }}>{t("status.deprecated")}</span>}
      </div>
      <div className="font-semibold text-sm leading-snug" style={{ color: dark ? "#eef3fb" : "#0f172a" }}>
        {api.title || friendlyLabel(api.path)}
      </div>
      <div className="text-[11px] mt-1.5" style={{ color: muted, fontFamily: MONO_STACK }}>
        {t("graph.hover.links", { inn: api.inbound_count, out: api.outbound_count })}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tg) => (
            <span key={tg} className="text-[10px] rounded px-1.5 py-0.5" style={{ background: `${accent}24`, color: dark ? mixWhite(accent, 0.25) : accent, fontFamily: MONO_STACK }}>
              {tg}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 图例（玻璃 HUD，默认精简）
// ============================================================

function Legend({ pal, dark }: { pal: Palette; dark: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const nodeTypes = Object.keys(pal.node);
  const muted = dark ? "#8197bb" : "#64748b";
  const text = dark ? "#c4d2ea" : "#334155";
  return (
    <div className="absolute top-4 right-4 z-10 rounded-xl p-3 text-[11px] max-w-[15rem]" style={panelStyle(dark)}>
      <div className="font-semibold mb-1.5 uppercase tracking-widest text-[9px]" style={{ color: muted, fontFamily: MONO_STACK }}>
        {t("graph.legend.nodes")}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {nodeTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full shrink-0"
              style={{ width: 9, height: 9, background: pal.node[type].fill, boxShadow: dark ? `0 0 6px ${pal.node[type].fill}aa` : undefined }}
            />
            <span className="truncate" style={{ color: text, fontFamily: MONO_STACK }}>{localizeType(t, type)}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2.5 flex items-center gap-1 text-[10px] transition-colors"
        style={{ color: muted, fontFamily: MONO_STACK }}
      >
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        {t("graph.legend.edges")}
      </button>

      {open && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
            {RELATION_KEYS.map((rel) => (
              <div key={rel} className="flex items-center gap-1.5" title={rel}>
                <span className="inline-block shrink-0" style={{ width: 14, height: 2, background: pal.linkHi[rel], borderRadius: 1 }} />
                <span className="truncate" style={{ color: text }}>{localizeRelation(t, rel)}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] mt-2 leading-snug" style={{ color: muted }}>{t("graph.legend.edges_hint")}</div>
          <div className="mt-2.5 pt-2" style={{ borderTop: `1px solid ${dark ? "rgba(125,165,255,0.14)" : "rgba(15,23,42,0.08)"}` }}>
            <ul className="space-y-1 text-[10px] leading-snug list-none" style={{ color: muted }}>
              <li className="flex gap-1.5"><span className="shrink-0" aria-hidden="true">·</span><span>{t("graph.help.drag")}</span></li>
              <li className="flex gap-1.5"><span className="shrink-0" aria-hidden="true">·</span><span>{t("graph.help.click")}</span></li>
              <li className="flex gap-1.5"><span className="shrink-0" aria-hidden="true">·</span><span>{t("graph.help.relation")}</span></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
