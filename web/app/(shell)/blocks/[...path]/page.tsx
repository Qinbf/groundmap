import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HierarchyBreadcrumb } from "@/components/HierarchyBreadcrumb";
import { BlocksTable, type Block } from "@/components/BlocksTable";
import { runKCli } from "@/lib/k-cli";
import { pageExists } from "@/lib/kb-service";
import { getServerLocale } from "@/lib/server-locale";
import { t } from "@/lib/i18n";

interface BlocksPageProps {
  params: { path: string[] };
}

interface BlocksData {
  doc_path: string;
  doc_chars: number;
  block_count: number;
  by_kind: Record<string, number>;
  blocks: Block[];
}

export const dynamic = "force-dynamic";

const KIND_ORDER = ["heading", "paragraph", "list", "blockquote", "table", "code", "figure"];

export default async function BlocksPage({ params }: BlocksPageProps) {
  const locale = getServerLocale();
  const relPath = params.path.map((s) => decodeURIComponent(s)).join("/");

  if (!(await pageExists(relPath))) {
    notFound();
  }

  const result = await runKCli<BlocksData>(["blocks", relPath]);
  if (!result.ok || !result.data) {
    return (
      <main className="flex-1 overflow-y-auto px-10 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">{t("blocks.title", locale)}</h1>
          <p className="text-sm text-muted-foreground">{relPath}</p>
          <Separator className="my-4" />
          <p className="text-sm text-destructive">
            {t("blocks.cli_error", locale, { err: result.error || "unknown" })}
          </p>
        </div>
      </main>
    );
  }

  const data = result.data;
  const orderedKinds = KIND_ORDER.filter((k) => data.by_kind[k]);

  return (
    <main className="flex-1 overflow-y-auto px-10 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t("blocks.title", locale)}</h1>
            <HierarchyBreadcrumb path={relPath} />
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← {t("common.back", locale)}
            </Link>
            <Link
              href={`/page/${relPath}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("blocks.back_to_page", locale)}
            </Link>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="rounded-lg border bg-card/40 p-4 mb-6 space-y-2">
          <div className="text-xs text-muted-foreground font-mono">
            {t("blocks.doc_meta", locale, {
              path: data.doc_path,
              chars: String(data.doc_chars),
              count: String(data.block_count),
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {t("blocks.kind_distribution", locale)}
            </span>
            {orderedKinds.map((kind) => (
              <Badge key={kind} variant="outline" className="font-mono">
                {t(`blocks.kind.${kind}` as Parameters<typeof t>[0], locale)}{" "}
                <span className="ml-1 font-bold">{data.by_kind[kind]}</span>
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground italic pt-1">
            {t("blocks.helper", locale)}
          </p>
        </div>

        {data.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t("blocks.empty", locale)}</p>
        ) : (
          <BlocksTable docPath={relPath} blocks={data.blocks} />
        )}
      </div>
    </main>
  );
}
