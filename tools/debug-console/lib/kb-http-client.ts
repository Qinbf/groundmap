/**
 * KB HTTP 客户端 — 调用主 web/ 的 /api/agent-tool 端点
 *
 * 这是 debug-console 与主管理台之间唯一的耦合面。
 * 工具名 / 参数 schema 由 lib/kb-tools.ts 定义，本模块只负责 fetch 转发。
 */

export interface ToolExecResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  /** 调用耗时（ms），用于 trace 可视化 */
  duration_ms: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function kbApiBase(): string {
  return process.env.KB_API_BASE || "http://localhost:3006";
}

/** 批量验证文件是否存在（只读 check，不返回内容） */
export async function validatePaths(
  paths: string[],
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  await Promise.all(
    paths.map(async (p) => {
      try {
        const res = await fetch(`${kbApiBase()}/api/agent-tool`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "read_page", args: { path: p } }),
        });
        results.set(p, res.ok);
      } catch {
        results.set(p, false);
      }
    }),
  );
  return results;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<ToolExecResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${kbApiBase()}/api/agent-tool`;
  const t0 = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: name, args }),
      signal: controller.signal,
    });
    const duration_ms = Date.now() - t0;

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return { ok: false, error: `non-json response (status ${res.status})`, duration_ms };
    }

    if (!res.ok) {
      const errMsg =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `http_${res.status}`;
      return { ok: false, error: errMsg, duration_ms };
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "ok" in parsed &&
      (parsed as { ok: unknown }).ok === true &&
      "data" in parsed
    ) {
      return { ok: true, data: (parsed as { data: unknown }).data, duration_ms };
    }

    return {
      ok: false,
      error: "unexpected response shape",
      duration_ms,
    };
  } catch (e: unknown) {
    const duration_ms = Date.now() - t0;
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: `timeout (${timeoutMs}ms)`, duration_ms };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      duration_ms,
    };
  } finally {
    clearTimeout(timer);
  }
}
