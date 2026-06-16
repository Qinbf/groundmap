"use client";
import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import type { PageFrontmatter } from "@/lib/markdown";
import { FrontmatterEditor } from "@/components/FrontmatterEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-client";

function EditorLoading() {
  const t = useT();
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      {t("wiki_link.editor_loading")}
    </div>
  );
}

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <EditorLoading />,
});

const EDITOR_EXTENSIONS = [markdown(), EditorView.lineWrapping];
const EDITOR_BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
};

const MarkdownEditor = memo(function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={EDITOR_EXTENSIONS}
      onChange={onChange}
      theme="light"
      basicSetup={EDITOR_BASIC_SETUP}
    />
  );
});

interface PageEditorProps {
  path: string;
  initialFrontmatter: PageFrontmatter;
  initialContent: string;
}

export function PageEditor({ path, initialFrontmatter, initialContent }: PageEditorProps) {
  const t = useT();
  const router = useRouter();
  const [frontmatter, setFrontmatter] = useState<PageFrontmatter>(initialFrontmatter);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);

  const onContentChange = useCallback((v: string) => setContent(v), []);

  const dirty =
    JSON.stringify(frontmatter) !== JSON.stringify(initialFrontmatter) ||
    content !== initialContent;

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setStatus({ kind: "info", msg: t("editor.saving") });
    try {
      // last_modified：仅当用户**没有手动改过**该字段时，自动更新为今天。
      //   这样导入旧文档场景（用户故意把日期设回原作者修改时间）不会被覆盖。
      // last_modified_by：通过 web 编辑保存的来源是人类（与 applyResolve 一致）。
      const userTouchedDate =
        frontmatter.last_modified !== initialFrontmatter.last_modified;
      const updatedFm = {
        ...frontmatter,
        last_modified: userTouchedDate
          ? frontmatter.last_modified
          : new Date().toISOString().slice(0, 10),
        last_modified_by: "Human",
      };
      // 原子化：写文件 + commit 由后端一并完成；commit 失败时后端会回滚文件
      const putRes = await fetch(`/api/pages/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontmatter: updatedFm,
          content,
          commit_message: `update: edit ${path} via web`,
        }),
      });
      const putData = await putRes.json();
      if (!putRes.ok) {
        const errKey = putData.error === "commit_failed" ? "editor.commit_failed" : "editor.save_failed";
        setStatus({
          kind: "err",
          msg: t(errKey, { err: putData.message || putData.reason || "" }),
        });
        setSaving(false);
        return;
      }

      if (putData.noop) {
        setStatus({ kind: "ok", msg: t("editor.save_noop") });
      } else {
        setStatus({
          kind: "ok",
          msg: t("editor.save_ok", { commit: putData.commit || "?" }),
        });
      }
      router.refresh();
    } catch (err) {
      setStatus({ kind: "err", msg: t("common.network_error", { err: String(err) }) });
    } finally {
      setSaving(false);
    }
  }, [frontmatter, initialFrontmatter, content, path, saving, router, t]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, save]);

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-2 flex flex-col h-full">
        <div className="flex items-center justify-between border-b pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="warning">{t("editor.mode")}</Badge>
            {dirty && <Badge variant="secondary">{t("editor.dirty")}</Badge>}
            {status && (
              <span
                className={
                  status.kind === "err"
                    ? "text-xs text-destructive"
                    : status.kind === "ok"
                    ? "text-xs text-emerald-600 dark:text-emerald-400"
                    : "text-xs text-muted-foreground"
                }
              >
                {status.msg}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/page/${path}`)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? t("editor.saving") : t("editor.save_kbd")}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden border rounded-md">
          <MarkdownEditor value={content} onChange={onContentChange} />
        </div>
      </div>
      <aside className="border rounded-md p-3 overflow-y-auto h-full">
        <h3 className="text-sm font-semibold mb-3">{t("panel.frontmatter")}</h3>
        <FrontmatterEditor value={frontmatter} onChange={setFrontmatter} />
      </aside>
    </div>
  );
}
