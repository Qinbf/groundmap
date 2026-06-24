/**
 * Server-only：从 cookie 读 UI 持久化状态
 *
 * 这些是纯界面偏好（折叠/展开等），写在 cookie 上让 SSR 第一帧就能拿到，
 * 避免 client hydrate 后再调整造成的视觉抖动。
 */
import { cookies } from "next/headers";
import { LEFT_PANEL, RIGHT_PANEL, type PanelConfig } from "@/lib/panel-config";

export const RIGHT_PANEL_COOKIE = "kb_right_panel_collapsed";
export const LEFT_PANEL_COOKIE = "kb_left_panel_collapsed";

/**
 * 返回 true / false / null：
 *   - true / false：用户已显式选择
 *   - null：cookie 不存在（首次访问，由 client 端按视口宽度自动决定）
 *
 * 区分这两种状态对 auto-collapse 至关重要：用户明确选了 0 (展开) 之后，
 * 哪怕是窄屏也不应再 auto-collapse；否则跨页面导航重挂时又被打回去。
 */
export function getRightPanelCollapsed(): boolean | null {
  const v = cookies().get(RIGHT_PANEL_COOKIE)?.value;
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

export function getLeftPanelCollapsed(): boolean | null {
  const v = cookies().get(LEFT_PANEL_COOKIE)?.value;
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

/**
 * 返回 clamp 后的侧栏宽度（px），或 null（cookie 不存在 → 由 client 用 default）。
 *
 * server 端就 clamp 到 [min, max]，让首帧 SSR 宽度恒在合法区间——即使 cookie
 * 被手改成越界值也不会渲染出畸形宽度。与 client 的 clamp 共用同一组常量
 * （panel-config.ts），两侧不会 drift。
 */
function readPanelWidth(config: PanelConfig): number | null {
  const v = cookies().get(config.cookie)?.value;
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(config.max, Math.max(config.min, n));
}

export function getLeftPanelWidth(): number | null {
  return readPanelWidth(LEFT_PANEL);
}

export function getRightPanelWidth(): number | null {
  return readPanelWidth(RIGHT_PANEL);
}
