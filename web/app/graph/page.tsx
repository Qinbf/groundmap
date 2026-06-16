/**
 * /graph — 知识图谱可视化。
 *
 * React Flow 力导向 2D 图：节点按 type 染色、按入出度缩放，边按关系类型染色，
 * hover 高亮关联子图，点击节点跳转到对应 wiki 页。完整实现见 GraphView。
 *
 * page 本身是薄壳——标题栏、过滤器、图例、画布都在 GraphView 里。
 */

import { GraphView } from "@/components/GraphView";

export default function GraphPage() {
  return <GraphView />;
}
