"use client";
/**
 * 右侧分屏预览面板 — 两种入口：
 *   1. 聊天/预览里点 [[wiki-ref]]  → refData 模式，按路径 fetch 文件
 *   2. 流程图里点节点              → nodeData 模式，按节点 kind 分发渲染
 *      - file/ghost/result(带 path) → 同 refData 行为，fetch 内容
 *      - thought/query/search/list/other → 直接渲染节点内联数据
 */
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  hrefToRef,
  inlineWikiRefs,
  refToAdminUrl,
  refToToolCall,
  type WikiRef,
} from "@/lib/wiki-ref";
import type { FlowNodeData } from "@/lib/build-flow-graph";
import {
  ANCHOR_COMPONENTS,
  AnchorRegistryContext,
  References,
  buildAnchorRegistry,
} from "@/lib/anchor-refs";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface Props {
  refData?: WikiRef | null;
  nodeData?: FlowNodeData | null;
  /** 要查询的 workspace（须与答案一致，否则锚点对不上）；null = web 默认库 */
  workspace?: string | null;
  onClose: () => void;
  onOpenRef: (ref: WikiRef) => void;
}

interface FallbackInfo {
  from: string;
  to: string;
  reason: string;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      rendered: { title?: string; body: string; raw?: unknown };
      fallback?: FallbackInfo;
    };

export function PreviewPanel({ refData, nodeData, workspace, onClose, onOpenRef }: Props) {
  const t = useT();
  // 决定是否需要 fetch（refData 模式 或 nodeData 模式且 kind 是含 path 的 file/ghost/result）
  const fetchTarget: { tool: string; args: Record<string, unknown> } | null = (() => {
    if (refData) return refToToolCall(refData);
    if (
      nodeData &&
      (nodeData.kind === "file" || nodeData.kind === "ghost") &&
      nodeData.path
    ) {
      const ref: WikiRef = {
        path: nodeData.path,
        anchor: nodeData.anchor || null,
        isBlock: !!nodeData.isBlock,
        alias: null,
      };
      return refToToolCall(ref);
    }
    return null;
  })();

  // 显示用的 ref（顶栏路径 / 打开按钮）
  const displayRef: WikiRef | null = refData
    ? refData
    : nodeData?.path
      ? {
          path: nodeData.path,
          anchor: nodeData.anchor || null,
          isBlock: !!nodeData.isBlock,
          alias: null,
        }
      : null;

  const [state, setState] = useState<FetchState>(
    fetchTarget ? { kind: "loading" } : { kind: "ok", rendered: { body: "" } },
  );

  useEffect(() => {
    if (!fetchTarget) {
      setState({ kind: "ok", rendered: { body: "" } });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });

    const post = (tool: string, args: Record<string, unknown>) =>
      fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args, workspace: workspace || undefined }),
      }).then((r) => r.json());

    const path = typeof fetchTarget.args.path === "string" ? fetchTarget.args.path : "";
    const anchor = typeof fetchTarget.args.anchor === "string" ? fetchTarget.args.anchor : "";
    const hadAnchor = fetchTarget.tool !== "read_page" && !!anchor;

    (async () => {
      try {
        const j = await post(fetchTarget.tool, fetchTarget.args);
        if (cancelled) return;
        if (j.ok) {
          const fb =
            j.data && typeof j.data === "object" && "_fallback" in j.data
              ? ((j.data as { _fallback: unknown })._fallback as FallbackInfo)
              : undefined;
          setState({
            kind: "ok",
            rendered: renderToolResult(fetchTarget.tool, j.data),
            fallback: fb,
          });
          return;
        }
        // 锚点确实不存在（且原本带锚点）→ 退化为整页展示，而不是对用户抛裸错。
        // 即便模型编造了精确锚点位置，用户至少仍能看到正确的来源页。
        if (hadAnchor && path && /未找到\s*anchor|no such file|page_not_found/i.test(j.error || "")) {
          const j2 = await post("read_page", { path });
          if (cancelled) return;
          if (j2.ok) {
            setState({
              kind: "ok",
              rendered: renderToolResult("read_page", j2.data),
              fallback: { from: `${path}#^${anchor}`, to: path, reason: t("preview.anchor_missing_degraded") },
            });
            return;
          }
        }
        setState({ kind: "error", message: j.error || t("preview.unknown_error") });
      } catch (e) {
        if (!cancelled) setState({ kind: "error", message: String(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchTarget?.tool,
    JSON.stringify(fetchTarget?.args ?? {}),
    workspace,
  ]);

  return (
    <aside className="flex h-full flex-col border-l border-[var(--line)] bg-[var(--ink)]">
      {/* 顶部条 */}
      <header className="flex items-start gap-2 border-b border-[var(--line)] bg-[var(--ink-2)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="k-eyebrow mb-1.5 flex items-center gap-2">
            <span>{t("preview.eyebrow")}</span>
            <span className="text-[var(--line-2)]">·</span>
            <span className="text-[var(--paper-dim)]">
              {refData ? t("preview.wiki_ref") : nodeData?.kind || t("preview.node")}
            </span>
          </div>
          {/* 节点类型 badge（仅 nodeData 模式）*/}
          {nodeData && !refData && (
            <div className="mb-1.5">
              <span className={kindBadgeClass(nodeData.kind)}>
                {kindLabel(nodeData, t)}
              </span>
            </div>
          )}
          {displayRef ? (
            <>
              <div className="truncate font-mono text-[12px] text-[var(--amber)]">
                {displayRef.path}
                {displayRef.anchor && (
                  <span className="text-[var(--paper-mute)]">
                    {displayRef.isBlock ? "#^" : "#"}
                    <span className="text-[var(--emerald)]">{displayRef.anchor}</span>
                  </span>
                )}
              </div>
              {state.kind === "ok" && state.fallback && (
                <div
                  className="mt-0.5 truncate font-mono text-[10px] text-[var(--amber-soft)]"
                  title={state.fallback.reason}
                >
                  {t("preview.fallback", { to: state.fallback.to })}
                </div>
              )}
            </>
          ) : (
            <div className="truncate font-mono text-[13px] font-semibold text-[var(--paper)]">
              {nodeData?.title || t("preview.details")}
            </div>
          )}
          {state.kind === "ok" && state.rendered.title && (
            <div className="mt-1 truncate text-[12px] text-[var(--paper-dim)]">
              {state.rendered.title}
            </div>
          )}
        </div>
        {displayRef && (
          <a
            href={refToAdminUrl(
              state.kind === "ok" && state.fallback
                ? { ...displayRef, path: state.fallback.to }
                : displayRef,
            )}
            target="_blank"
            rel="noreferrer"
            className="k-btn shrink-0"
            title={t("preview.open_admin_tip")}
          >
            {t("preview.open")}
          </a>
        )}
        <button
          onClick={onClose}
          className="k-btn shrink-0"
          title={t("preview.close_tip")}
        >
          ✕
        </button>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {/* nodeData 模式且无 fetch：直接渲染节点信息 */}
        {nodeData && !fetchTarget && (
          <NodeInlineRender node={nodeData} onOpenRef={onOpenRef} />
        )}

        {/* nodeData 模式且有 fetch */}
        {nodeData && fetchTarget && <FileNodeHeader node={nodeData} />}

        {/* fetch 路径：loading / error / ok */}
        {fetchTarget && (
          <>
            {state.kind === "loading" && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--paper-mute)]">
                <span className="k-thinking">
                  <span /><span /><span />
                </span>
                {t("preview.fetching")}
              </div>
            )}
            {state.kind === "error" && (
              <div className="border border-[var(--vermilion)] bg-[var(--vermilion)]/10 p-3 font-mono text-[12px] text-[var(--vermilion)]">
                <div className="k-eyebrow mb-1 text-[var(--vermilion)]">{t("preview.load_failed")}</div>
                {state.message}
              </div>
            )}
            {state.kind === "ok" && (
              <AnchoredMarkdownBody
                content={state.rendered.body}
                onOpenRef={onOpenRef}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ============================================================
// 节点 inline 渲染（无 fetch 的 thought/query/search/result）
// ============================================================
// ============================================================
// 论文样式文件内容渲染
// 按出现顺序统一编号 [n] 上标 + 文末 References 区
// 与主 web/ 端 PageRenderer 视觉风格一致
// ============================================================
function AnchoredMarkdownBody({
  content,
  onOpenRef,
}: {
  content: string;
  onOpenRef: (ref: WikiRef) => void;
}) {
  const { registry, refs } = useMemo(
    () => buildAnchorRegistry(content, { scanWikilinks: true }),
    [content],
  );

  // 把 [[wiki/...]] 双链替换成自定义 href，让 a 组件能拦截
  const inlined = useMemo(() => inlineWikiRefs(content), [content]);

  const components: Components = useMemo(
    () => ({
      ...ANCHOR_COMPONENTS,
      a({ href, children, ...rest }) {
        const ref = href ? hrefToRef(href) : null;
        if (ref) {
          return (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                onOpenRef(ref);
              }}
              className="text-[var(--amber)] underline hover:text-[var(--paper)]"
            >
              {children}
            </a>
          );
        }
        return (
          <a href={href} target="_blank" rel="noreferrer" {...rest}>
            {children}
          </a>
        );
      },
    }),
    [onOpenRef],
  );

  return (
    <AnchorRegistryContext.Provider value={registry}>
      <div className="markdown-body text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {inlined}
        </ReactMarkdown>
        <References refs={refs} />
      </div>
    </AnchorRegistryContext.Provider>
  );
}

// 把 markdown 里的 [[wiki/X]] / [[raw/...#^anchor]] 渲染为可点击链接 — 点击触发 onOpenRef
function RefAwareMarkdown({
  text,
  onOpenRef,
  className = "markdown-body text-sm leading-relaxed",
}: {
  text: string;
  onOpenRef: (ref: WikiRef) => void;
  className?: string;
}) {
  const inlined = useMemo(() => inlineWikiRefs(text), [text]);
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...rest }) {
            const ref = href ? hrefToRef(href) : null;
            if (ref) {
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenRef(ref);
                  }}
                  className="border border-[var(--line)] bg-[var(--amber-bg)] px-1 py-[1px] font-mono text-[11.5px] text-[var(--amber)] no-underline hover:bg-[var(--amber)] hover:text-[var(--ink)]"
                  title={`${ref.path}${ref.anchor ? (ref.isBlock ? "#^" : "#") + ref.anchor : ""}`}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        {inlined}
      </ReactMarkdown>
    </div>
  );
}

function NodeInlineRender({
  node,
  onOpenRef,
}: {
  node: FlowNodeData;
  onOpenRef: (ref: WikiRef) => void;
}) {
  const t = useT();
  if (node.kind === "query") {
    return (
      <section>
        <div className="mb-1 text-xs text-slate-500">{t("preview.full_query")}</div>
        <div className="whitespace-pre-wrap rounded bg-slate-950/50 p-3 text-base text-slate-100">
          {node.body || node.subtitle || node.title}
        </div>
      </section>
    );
  }
  if (node.kind === "thought") {
    return (
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{t("preview.step_type")}</span>
          <span className="rounded bg-purple-700 px-1.5 py-0.5 font-mono text-[10px] text-purple-100">
            {node.thoughtType || "?"}
          </span>
        </div>
        {node.subtitle && (
          <div className="mb-2 text-base font-medium text-slate-100">{node.subtitle}</div>
        )}
        {node.body && (
          <>
            <div className="mb-1 text-xs text-slate-500">{t("preview.full_reasoning")}</div>
            <RefAwareMarkdown
              text={node.body}
              onOpenRef={onOpenRef}
              className="markdown-body rounded bg-slate-950/50 p-3 text-sm leading-relaxed text-slate-200"
            />
          </>
        )}
      </section>
    );
  }
  if (node.kind === "result") {
    return (
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{t("flow.kind_result")}</span>
          {node.subtitle && <span className="text-slate-400">{node.subtitle}</span>}
        </div>
        {node.body && (
          <RefAwareMarkdown
            text={node.body}
            onOpenRef={onOpenRef}
            className="markdown-body rounded border border-yellow-700/50 bg-yellow-950/30 p-4 text-sm leading-relaxed text-slate-100"
          />
        )}
      </section>
    );
  }
  if (node.kind === "warning") {
    return (
      <section>
        <div className="mb-2 rounded border-2 border-dashed border-red-500 bg-red-950/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-red-700 px-2 py-0.5 text-[10px] font-mono uppercase text-red-100">
              {t("preview.incomplete")}
            </span>
            <span className="text-base font-bold text-red-100">{node.title}</span>
          </div>
          <div className="mb-2 text-sm text-red-200">{node.subtitle}</div>
          {node.body && (
            <RefAwareMarkdown
              text={node.body}
              onOpenRef={onOpenRef}
              className="markdown-body text-xs leading-relaxed text-red-100"
            />
          )}
        </div>
        <div className="rounded bg-cyan-950/40 p-3 text-xs text-cyan-200">
          <div className="mb-1 font-bold">{t("preview.suggested_action")}</div>
          <div>{t("preview.warn_body")}</div>
        </div>
      </section>
    );
  }
  // search / list / other
  return (
    <section>
      <div className="mb-1 text-xs text-slate-500">
        {t("preview.tool_call", { toolName: node.toolName || node.title })}
        {node.durationMs !== undefined && (
          <span className="ml-2 text-slate-500">{node.durationMs}ms</span>
        )}
        <span className="ml-2 text-slate-500">{t("preview.status", { status: node.status })}</span>
      </div>
      {node.toolArgs && (
        <details className="mb-3" open>
          <summary className="cursor-pointer text-xs text-slate-500">{t("preview.params")}</summary>
          <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-2 text-[10px] text-slate-300">
            {JSON.stringify(node.toolArgs, null, 2)}
          </pre>
        </details>
      )}
      <div className="mb-1 text-xs text-slate-500">{t("preview.full_result")}</div>
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-200">
        {node.resultPreview || t("preview.empty")}
      </pre>
    </section>
  );
}

// 顶部条：file/ghost 节点 fetch 内容前先显示节点头部信息
function FileNodeHeader({ node }: { node: FlowNodeData }) {
  const t = useT();
  return (
    <section className="mb-3">
      {node.kind === "ghost" && (
        <div className="mb-2 rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-200">
          {t("preview.ghost_body")}
        </div>
      )}
      {node.kind === "file" && node.toolName && (
        <details className="mb-2">
          <summary className="cursor-pointer text-xs text-slate-500">
            {t("preview.tool_call_status", { toolName: node.toolName, status: node.status ?? "" })}
            {node.durationMs !== undefined && (
              <span className="ml-2">{node.durationMs}ms</span>
            )}
          </summary>
          {node.toolArgs && (
            <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-2 text-[10px] text-slate-300">
              {JSON.stringify(node.toolArgs, null, 2)}
            </pre>
          )}
        </details>
      )}
    </section>
  );
}

function kindLabel(n: FlowNodeData, t: TFn): string {
  switch (n.kind) {
    case "query": return t("flow.kind_query");
    case "thought": return `🧠 ${n.thoughtType || t("flow.kind_thought_fallback")}`;
    case "file": return `📄 ${n.fileType}`;
    case "search": return t("flow.kind_search");
    case "list": return t("flow.kind_list");
    case "ghost": return t("flow.kind_ghost");
    case "result": return t("flow.kind_result");
    default: return n.kind;
  }
}

function kindBadgeClass(kind: string): string {
  const base = "rounded px-2 py-0.5 text-[10px] font-mono uppercase";
  switch (kind) {
    case "query": return `${base} bg-indigo-700 text-indigo-100`;
    case "thought": return `${base} bg-purple-700 text-purple-100`;
    case "file": return `${base} bg-emerald-700 text-emerald-100`;
    case "search": return `${base} bg-blue-700 text-blue-100`;
    case "list": return `${base} bg-slate-600 text-slate-100`;
    case "ghost": return `${base} bg-slate-700 text-slate-300`;
    case "result": return `${base} bg-yellow-700 text-yellow-100`;
    default: return `${base} bg-slate-700 text-slate-200`;
  }
}

// ============================================================
// 工具结果 → markdown body 渲染
// ============================================================
function renderToolResult(
  tool: string,
  data: unknown,
): { title?: string; body: string; raw?: unknown } {
  if (!data || typeof data !== "object") {
    return { body: String(data ?? "") };
  }
  const d = data as Record<string, unknown>;

  if (tool === "read_page") {
    const meta = (d.meta || {}) as Record<string, unknown>;
    const title = typeof meta.title === "string" ? meta.title : undefined;
    const content = typeof d.content === "string" ? d.content : "";
    return { title, body: content, raw: data };
  }

  if (tool === "read_section") {
    const title = typeof d.title === "string" ? d.title : undefined;
    // read-section 的返回里 preview 是片段摘要，content/text 是全文（取决于 k.py 版本）
    const body =
      typeof d.content === "string"
        ? d.content
        : typeof d.text === "string"
          ? d.text
          : typeof d.preview === "string"
            ? d.preview
            : JSON.stringify(data, null, 2);
    return { title, body, raw: data };
  }

  if (tool === "read_block") {
    const kind = typeof d.kind === "string" ? d.kind : "block";
    const body = typeof d.content === "string" ? d.content : JSON.stringify(data, null, 2);
    return { title: kind, body, raw: data };
  }

  return { body: "```json\n" + JSON.stringify(data, null, 2) + "\n```" };
}
