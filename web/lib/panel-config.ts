/**
 * 侧栏宽度约定（像素）——**唯一真相源**。
 *
 * server 端读 cookie（`server-ui-state.ts` 的 clamp）与 client 端拖拽
 * （`use-panel-resize.ts`）共享同一组 default / min / max，避免两侧 drift
 * 导致「SSR 首帧宽度」与「拖拽可达范围」不一致。
 *
 * default 与既有 Tailwind 固定宽度对齐：左栏 w-72 = 18rem = 288px，
 * 右栏 w-80 = 20rem = 320px——改成可拖拽后默认值保持不变。
 *
 * 本模块**不依赖 next/headers 等 server-only API**，故可被 client component
 * 安全 import（server-ui-state.ts 反之不行）。
 */
export interface PanelConfig {
  /** 持久化宽度的 cookie 名 */
  cookie: string;
  /** 默认宽度（px），与原 Tailwind 固定宽度一致 */
  default: number;
  /** 拖拽下限（px） */
  min: number;
  /** 拖拽上限（px） */
  max: number;
}

export const LEFT_PANEL: PanelConfig = {
  cookie: "kb_left_panel_width",
  default: 288, // w-72
  min: 200,
  max: 560,
};

export const RIGHT_PANEL: PanelConfig = {
  cookie: "kb_right_panel_width",
  default: 320, // w-80
  min: 240,
  max: 600,
};

/** 键盘微调步长（px）：聚焦把手后方向键每次调整的量。 */
export const RESIZE_STEP = 16;
