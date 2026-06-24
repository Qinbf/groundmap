"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { stripAnchors } from "@/lib/markdown";
import type { BacklinkHit, OutlinkHit } from "@/lib/kb-service";

interface BacklinksPanelProps {
  back: BacklinkHit[];
  out: OutlinkHit[];
}

/**
 * 显示反向 / 出向链接。
 *
 * 按"链接源/目标路径"聚合（同一个 from_path 出现 N 次合并为一项 + ×N 徽章），
 * 并按目录桶分组（concepts / sources / analyses / indexes / entities / raw / other）。
 *
 * 渲染策略（按聚合后唯一路径数）：
 *   ≤ FLAT_THRESHOLD: 不分组，平铺
 *   > FLAT_THRESHOLD: 按桶分组，每桶可折叠；桶内超过 PER_BUCKET_INITIAL 显示"展开全部"
 *   > FILTER_THRESHOLD: 顶部加路径过滤框
 */

const FLAT_THRESHOLD = 10;
const FILTER_THRESHOLD = 30;
const PER_BUCKET_INITIAL = 10;

// 桶在视觉上的优先级顺序
const BUCKET_ORDER = [
  "indexes",
  "concepts",
  "entities",
  "sources",
  "analyses",
  "raw",
  "other",
];

function bucketOf(p: string): string {
  if (p === "wiki/root_index.md") return "indexes";
  const parts = p.split("/");
  if (parts[0] === "wiki" && parts.length >= 2) return parts[1];
  if (parts[0] === "raw") return "raw";
  return "other";
}

function bucketLabel(b: string, t: ReturnType<typeof useT>): string {
  switch (b) {
    case "indexes":
      return t("type.index");
    case "concepts":
      return t("type.concept");
    case "entities":
      return t("type.entity");
    case "sources":
      return t("type.source_summary");
    case "analyses":
      return t("type.analysis");
    case "raw":
      return t("type.raw_source");
    case "other":
      return t("type.unknown");
    default:
      // wiki/ 下的其他目录（operations / _templates / 未来新增分类）：
      // 直接展示目录名，比都标"未分类"更可读
      return b;
  }
}

interface AggBack {
  path: string;
  bucket: string;
  count: number;
  preview: string;
}
interface AggOut {
  target: string;
  bucket: string;
  count: number;
  firstAnchor: string | null;
  alias: string | null;
}

function aggregateBack(hits: BacklinkHit[]): AggBack[] {
  const m = new Map<string, BacklinkHit[]>();
  for (const h of hits) {
    const arr = m.get(h.from_path);
    if (arr) arr.push(h);
    else m.set(h.from_path, [h]);
  }
  return [...m.entries()]
    .map(([path, occs]) => {
      occs.sort((a, b) => a.line - b.line);
      return {
        path,
        bucket: bucketOf(path),
        count: occs.length,
        preview: occs[0].context,
      };
    })
    .sort(
      (a, b) => b.count - a.count || a.path.localeCompare(b.path),
    );
}

function aggregateOut(hits: OutlinkHit[]): AggOut[] {
  const m = new Map<string, OutlinkHit[]>();
  for (const h of hits) {
    const arr = m.get(h.target);
    if (arr) arr.push(h);
    else m.set(h.target, [h]);
  }
  return [...m.entries()]
    .map(([target, occs]) => {
      occs.sort((a, b) => a.line - b.line);
      return {
        target,
        bucket: bucketOf(target),
        count: occs.length,
        firstAnchor: occs[0].anchor,
        alias: occs.length === 1 ? occs[0].alias : null,
      };
    })
    .sort(
      (a, b) => b.count - a.count || a.target.localeCompare(b.target),
    );
}

export function BacklinksPanel({ back, out }: BacklinksPanelProps) {
  const t = useT();
  const aggBack = useMemo(() => aggregateBack(back), [back]);
  const aggOut = useMemo(() => aggregateOut(out), [out]);

  return (
    <div className="space-y-5 text-sm">
      <LinkSection<AggBack>
        title={t("panel.backlinks")}
        totalRaw={back.length}
        entries={aggBack}
        getKey={(e) => e.path}
        getBucket={(e) => e.bucket}
        getSearchText={(e) => e.path}
        renderItem={(e) => <BackItem e={e} />}
      />
      <LinkSection<AggOut>
        title={t("panel.outlinks")}
        totalRaw={out.length}
        entries={aggOut}
        getKey={(e) => e.target + (e.firstAnchor ?? "")}
        getBucket={(e) => e.bucket}
        getSearchText={(e) => e.target}
        renderItem={(e) => <OutItem e={e} />}
      />
    </div>
  );
}

// =====================================================================
// 单个条目
// =====================================================================

// BackItem / OutItem 不再用 <li> 作根节点——caller 已把它们包在 <li key=...>
// 中。改用 <div> 避免 <li><li> 双层 nesting。
function BackItem({ e }: { e: AggBack }) {
  return (
    <div className="text-xs">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <Link
          href={`/page/${e.path}`}
          title={e.path}
          className="font-mono text-primary hover:underline truncate"
        >
          {e.path}
        </Link>
        {e.count > 1 && <CountBadge n={e.count} />}
      </div>
      <p className="mt-0.5 text-muted-foreground line-clamp-2">
        {stripAnchors(e.preview)}
      </p>
    </div>
  );
}

function OutItem({ e }: { e: AggOut }) {
  const href = `/page/${e.target}${e.firstAnchor ? `#${e.firstAnchor}` : ""}`;
  return (
    <div className="text-xs">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <Link
          href={href}
          title={e.target + (e.firstAnchor ? `#${e.firstAnchor}` : "")}
          className="font-mono text-primary hover:underline truncate"
        >
          {e.target}
          {e.firstAnchor && e.count === 1 && (
            <span className="text-muted-foreground">#{e.firstAnchor}</span>
          )}
        </Link>
        {e.count > 1 && <CountBadge n={e.count} />}
      </div>
      {e.alias && (
        <span className="text-[11px] text-muted-foreground ml-0.5">
          ({e.alias})
        </span>
      )}
    </div>
  );
}

function CountBadge({ n }: { n: number }) {
  const t = useT();
  return (
    <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground border border-border rounded px-1 leading-tight">
      {t("panel.mention_count", { n })}
    </span>
  );
}

// =====================================================================
// 通用 Section（封装"标题 + 数量 + 过滤 + 平铺/分组"逻辑）
// =====================================================================

interface LinkSectionProps<T> {
  title: string;
  totalRaw: number; // 原始 hits 数（含重复路径）
  entries: T[]; // 聚合后唯一路径
  getKey: (e: T) => string;
  getBucket: (e: T) => string;
  getSearchText: (e: T) => string;
  renderItem: (e: T) => ReactNode;
}

function LinkSection<T>({
  title,
  totalRaw,
  entries,
  getKey,
  getBucket,
  getSearchText,
  renderItem,
}: LinkSectionProps<T>) {
  const t = useT();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => getSearchText(e).toLowerCase().includes(q));
  }, [entries, filter, getSearchText]);

  if (entries.length === 0) {
    return (
      <div>
        <SectionHeader
          title={title}
          totalRaw={totalRaw}
          aggregated={entries.length}
        />
        <div className="text-xs text-muted-foreground mt-1">
          {t("panel.no_links")}
        </div>
      </div>
    );
  }

  const useFlat = entries.length <= FLAT_THRESHOLD;
  const showFilter = entries.length > FILTER_THRESHOLD;

  // flat 模式
  if (useFlat) {
    return (
      <div>
        <SectionHeader
          title={title}
          totalRaw={totalRaw}
          aggregated={entries.length}
        />
        <ul className="space-y-2 mt-1.5">
          {entries.map((e) => (
            // ul 的直接子节点必须是 li（HTML 规范）；renderItem 内部不再用 li
            <li key={getKey(e)}>{renderItem(e)}</li>
          ))}
        </ul>
      </div>
    );
  }

  // 分组模式
  const grouped: Record<string, T[]> = {};
  for (const e of filtered) {
    const b = getBucket(e);
    (grouped[b] ||= []).push(e);
  }
  const buckets = orderedBuckets(grouped);

  return (
    <div>
      <SectionHeader
        title={title}
        totalRaw={totalRaw}
        aggregated={entries.length}
      />
      {showFilter && (
        <input
          type="text"
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          placeholder={t("panel.filter_placeholder")}
          className="w-full mt-2 px-2 py-1 text-xs rounded border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
      <div className="mt-2 space-y-2">
        {buckets.length === 0 && filter ? (
          <div className="text-xs text-muted-foreground">
            {t("common.empty")}
          </div>
        ) : (
          buckets.map(([bucket, items]) => (
            <BucketGroup<T>
              key={bucket}
              bucket={bucket}
              items={items}
              getKey={getKey}
              renderItem={renderItem}
              filtering={filter.trim().length > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  totalRaw,
  aggregated,
}: {
  title: string;
  totalRaw: number;
  aggregated: number;
}) {
  const t = useT();
  // aggregated = 唯一路径数；totalRaw = 原始 [[link]] 总出现次数
  // 仅当不一致时才同时展示"unique / total"，否则单数
  const countText =
    aggregated === totalRaw
      ? String(totalRaw)
      : t("panel.unique_of_total", { unique: aggregated, total: totalRaw });
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {title}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {countText}
      </span>
    </div>
  );
}

function orderedBuckets<T>(grouped: Record<string, T[]>): [string, T[]][] {
  const known = BUCKET_ORDER.filter((k) => grouped[k]?.length).map(
    (k) => [k, grouped[k]!] as [string, T[]],
  );
  const extra = Object.keys(grouped)
    .filter((k) => !BUCKET_ORDER.includes(k) && grouped[k].length)
    .sort()
    .map((k) => [k, grouped[k]!] as [string, T[]]);
  return [...known, ...extra];
}

function BucketGroup<T>({
  bucket,
  items,
  getKey,
  renderItem,
  filtering,
}: {
  bucket: string;
  items: T[];
  getKey: (e: T) => string;
  renderItem: (e: T) => ReactNode;
  filtering: boolean;
}) {
  const t = useT();
  // 默认展开。过滤态下也保持展开（用户在主动找东西）
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // 过滤态下强制完整显示该桶（不再隐藏 PER_BUCKET_INITIAL 之后的）
  const visible =
    filtering || showAll ? items : items.slice(0, PER_BUCKET_INITIAL);
  const hasMore = !filtering && items.length > PER_BUCKET_INITIAL;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`bucket-${bucket}`}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span>{bucketLabel(bucket, t)}</span>
        <span className="tabular-nums text-muted-foreground/70">
          ({items.length})
        </span>
      </button>
      {open && (
        <ul
          id={`bucket-${bucket}`}
          className="mt-1.5 ml-4 space-y-2"
        >
          {visible.map((e) => (
            <li key={getKey(e)}>{renderItem(e)}</li>
          ))}
          {hasMore && (
            <li>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] text-primary hover:underline"
              >
                {showAll
                  ? t("panel.show_less")
                  : t("panel.show_all", { n: items.length })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
