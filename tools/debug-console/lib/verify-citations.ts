/**
 * 块级 + 语义 引用核对（基线，与 mode 无关）。v4 —— 经三轮对抗审查。
 *
 * 对最终答案里每条**块级**引用 `[[path#^p-N-hash]]`：
 *   1. read_block 真读该锚点。失败要**区分**：
 *        - 「锚点/文件确实不存在」（error 明确来自 KB 业务层）→ broken → 降级；
 *        - 「网络/超时/反代故障/DNS」→ **不降级**（unverified，宁可漏也不误伤真实引用）。
 *   2. 语义匹配 —— 只用**硬要素**（日期/数字/百分比/量级，语言中立、可数值归一）做可靠判定：
 *        · 把论断与块都 token 化成 {strong: 具体数字/日期/百分比, years: 裸年份}，用**集合相等**比对
 *          （而非子串 includes —— 否则 '2024' 会命中 '120240'）；各硬要素**消费即挖空**，不泄漏裸尾数
 *          （否则 '660万' 泄漏的 '660' 会与 '660亿' 巧合命中 → 万倍量级差异漏降级）；
 *        · 论断含 strong 要素：块命中任一 strong → 支撑；一个都不命中 → 数字错配（**只命中年份不算支撑**，
 *          否则电商语料里年份无处不在会把头条数字错配整体放过）；
 *        · 论断只有年份 / 无硬要素（纯定性）→ 灰区，启发式不擅自降级，交给判官（有 API key 时）。
 *      唯一的**启发式降级**：某引用存在「有 strong 要素、块全未命中」的出现处，且**没有任何出现处被块 strong 支撑**。
 *   3. 灰区 → 仅当配了可靠 API 判官时并行判一次（YES/NO，带超时）；判 NO → 降级。
 *
 * "降级" = 调用方（UI downgradeRefAnchors）去掉块锚点 → 整页链接（去假精度，仍指向正确源页）。
 */
import { executeTool } from "./kb-http-client";
import { judgeCitation, judgeAvailable } from "./citation-judge";
import { WIKI_REF_RE, normalizeBareSlugRefs, parseWikiRef } from "./wiki-ref";

export interface BlockRefSpec {
  key: string; // collectRefs 口径 key：path#anchor（anchor 不含 ^）
  path: string;
  anchor: string; // 不含 ^
}

export interface CitationVerifyResult {
  brokenAnchors: string[]; // 锚点/文件确实不存在
  downgraded: string[]; // 需降级
  unverified: string[]; // 网络/超时未能核对 —— 不降级
  judged: number;
}

const MAX_JUDGE = 12;
// 灰区判官超时：判官是 temperature=0 / max_tokens=4 的 YES/NO，正常亚秒级返回；
// 3s 已是极宽裕的上限。超时 fallback = null = **保守保留该引用**（不降级），
// 故收紧超时**零质量风险**——只是给「判官卡死」兜个底，避免单条 hung call 把
// 答案出完后的「引用后验」尾巴拖到 8s（该尾巴计入 stream 关闭、即输入框重新可用的时间）。
const JUDGE_TIMEOUT_MS = 3000;

/**
 * read_block 失败时：是不是「确定性不存在」（vs 网络/超时/反代/DNS）。
 * 只命中明确来自 KB 业务层的串；**不**匹配 ENOTFOUND/ECONNREFUSED/http_404/timeout 等传输层故障
 * （那些归 unverified、不降级，避免主站抖动误降级真实引用）。
 */
function errorIsNotFound(err: string): boolean {
  return /未找到\s*anchor|未找到\s*文件|文件不存在|no such file|page_not_found|errno\s*2(?!\d)/i.test(err);
}

function blockContent(data: unknown): string {
  if (data && typeof data === "object" && "content" in data) {
    return String((data as { content: unknown }).content || "");
  }
  return "";
}
function blockKind(data: unknown): string {
  if (data && typeof data === "object" && "kind" in data) {
    return String((data as { kind: unknown }).kind || "");
  }
  return "";
}

/** 归一：全角数字→半角、去千分位逗号、percent→%、小写。 */
function normNum(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => "0123456789"["０１２３４５６７８９".indexOf(c)])
    .replace(/(\d),(?=\d{3}(\D|$))/g, "$1")
    .replace(/percent/gi, "%")
    .toLowerCase();
}

interface NumTokens {
  strong: Set<string>; // 具体数字/日期/百分比/量级（不含裸年份）
  years: Set<string>; // 裸 4 位年份
}

/**
 * 抽硬要素，做**数值归一 + 消费即挖空**后入集合（供集合相等比对）。
 * 核心不变量（经三轮对抗审查固化）：
 *   - **消费即挖空**：每条规则匹配后把该片段置空，杜绝后续通用数字正则二次收割「裸尾数」
 *     （否则 '660万' 既出值 6600000 又泄漏裸 '660'，与 '660亿' 的裸 '660' 巧合命中 → 万倍量级差异漏降级）。
 *   - **量级展开为纯数值串、不加前缀**：'2.63万亿' → '2630000000000'，以便与全数字写法
 *     '2,630,000,000,000' **同值跨表示互认**（保留 F1）。
 *   - **百分比 / 日期加类型前缀**（pct: / date:）：避免与同值的普通数 / 量级跨语义巧合命中
 *     （'2.63万亿' 的 2630000000000 ≠ '2.63%' 的 pct:2.63）。
 *   - 百分比带符号：'-5%' → pct:-5 ≠ '5%' 的 pct:5（增/减方向相反不互相支撑）。
 *   - 日期归一到「年-月」（丢日）；英文月份须精确月名（不再 `[a-z]*` 前缀误吞 marketing→mar），
 *     裸「月-年」只认全称（排除 'may' 等缩写在自由文本里的歧义，如 'results may 2025'）。
 *   - 年份单列（不进 strong）：电商语料里年份无处不在，巧合命中不应算支撑。
 *     1900-2099 区间的纯数量（如 '售出2024件'）会被保守当年份 → 漏降级（安全方向，已知局限；
 *     反向若按数量处理，'2024财报' 这类无「年」的年份写法会与块里 '2024年' 冲突 → 假降级，更糟）。
 */
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
// 精确月名（含全称），避免缩写 `[a-z]*` 吞掉 marketing→mar / mayor→may
const MON_RE = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
// 裸「月 年」（无日号）只认 ≥4 字母全称，排除歧义缩写与情态动词 'may'
const MON_BARE = "january|february|march|april|june|july|august|september|october|november|december";

function hardNumericTokens(s: string): NumTokens {
  let t = normNum(s);
  const strong = new Set<string>();
  const years = new Set<string>();
  const blank = (n: number) => " ".repeat(n);
  // 1) 中文/数字日期 → date:YYYY-M（分隔符不含 '.'，小数另算；月份须 1-12；
  //    分隔后非数字边界，避免 '2025-1234'(电话) 被截成 '2025-12'）
  t = t.replace(/(\d{4})[-/年](\d{1,2})(?!\d)/g, (full, y, mo) => {
    const m = parseInt(mo, 10);
    if (m >= 1 && m <= 12) {
      strong.add(`date:${y}-${m}`);
      return blank(full.length);
    }
    return full; // 非法月（如 2025-99）不当日期
  });
  // 2) 英文月份日期 → date:YYYY-M（跨语言对齐）。带日号：任意月形；裸月-年：只认全称
  t = t.replace(new RegExp(`\\b(${MON_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "g"), (full, mon, _d, y) => {
    strong.add(`date:${y}-${MONTHS[mon.slice(0, 3)]}`);
    return blank(full.length);
  });
  t = t.replace(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MON_RE})\\.?,?\\s+(\\d{4})\\b`, "g"), (full, _d, mon, y) => {
    strong.add(`date:${y}-${MONTHS[mon.slice(0, 3)]}`);
    return blank(full.length);
  });
  t = t.replace(new RegExp(`\\b(${MON_BARE})\\s+(\\d{4})\\b`, "g"), (full, mon, y) => {
    strong.add(`date:${y}-${MONTHS[mon.slice(0, 3)]}`);
    return blank(full.length);
  });
  // 3) 百分比 → pct:val（带符号）。前缀避免与同值普通数 / 量级撞
  t = t.replace(/([+\-﹣－]?)\s*(\d+(?:\.\d+)?)\s*%/g, (full, sign, v) => {
    strong.add(`pct:${/[\-﹣－]/.test(sign) ? "-" : ""}${parseFloat(v)}`);
    return blank(full.length);
  });
  // 4) 量级 万/亿/万亿 → 纯数值串（不加前缀，与 '2,630,000,000,000' 同值互认）
  t = t.replace(/(\d+(?:\.\d+)?)\s*(万亿|亿|万)/g, (full, v, u) => {
    const mult = u === "万亿" ? 1e12 : u === "亿" ? 1e8 : 1e4;
    strong.add(String(Math.round(parseFloat(v) * mult)));
    return blank(full.length);
  });
  // 5) 年份 → years（裸 4 位年份不算 strong；挖空以免下一步当普通数收割）
  t = t.replace(/\b(?:19|20)\d{2}\b/g, (full) => {
    years.add(full);
    return blank(full.length);
  });
  // 6) 剩余通用数字（≥3 位整数 / 小数）→ 原值串（日期/百分比/量级/年份均已挖空，无裸尾数泄漏）
  for (const m of t.matchAll(/\d+\.\d+|\d{3,}/g)) strong.add(m[0]);
  return { strong, years };
}

function matchHits(claim: NumTokens, block: NumTokens): { strongHit: number; yearHit: number } {
  let strongHit = 0;
  let yearHit = 0;
  for (const n of claim.strong) if (block.strong.has(n)) strongHit += 1;
  for (const y of claim.years) if (block.years.has(y)) yearHit += 1;
  return { strongHit, yearHit };
}

const SALIENT_RE = /[A-Za-z]{2,}|\d{2,}|[一-龥]{2,}/;
function hasSalient(s: string): boolean {
  return SALIENT_RE.test(s.replace(/[\[\]|()（）【】#^·\-—\s,，。、:：]/g, ""));
}

/**
 * 取某引用的「论断上下文」们（同 key 可多处出现）。每处：取本引用所在行内、从
 * 「上一条引用结束/行首」到「本引用」之间的片段（剥 [[...]] 与表格 |）；为空则退到整行去引用。
 */
function claimContextsFor(answerText: string, refKey: string): string[] {
  const norm = normalizeBareSlugRefs(answerText);
  const re = new RegExp(WIKI_REF_RE.source, "g");
  const stripRe = new RegExp(WIKI_REF_RE.source, "g");
  const ctxs: string[] = [];
  let m: RegExpExecArray | null;
  let prevEnd = 0;
  while ((m = re.exec(norm)) !== null) {
    const here = re.lastIndex;
    const ref = parseWikiRef(m[1], m[2], m[3]);
    if (`${ref.path}#${ref.anchor || ""}` === refKey) {
      const ls = norm.lastIndexOf("\n", m.index - 1) + 1;
      const left = Math.max(ls, prevEnd);
      let seg = norm.slice(left, m.index).replace(stripRe, "").replace(/\|/g, " ").trim();
      if (!seg) {
        const le = norm.indexOf("\n", m.index);
        const lineEnd = le === -1 ? norm.length : le;
        seg = norm.slice(ls, lineEnd).replace(stripRe, "").replace(/\|/g, " ").trim();
      }
      ctxs.push(seg);
    }
    prevEnd = here;
  }
  return ctxs;
}

export async function verifyBlockCitations(
  answerText: string,
  blockRefs: BlockRefSpec[],
  opts: { useJudge?: boolean } = {},
): Promise<CitationVerifyResult> {
  const useJudge = opts.useJudge ?? judgeAvailable();
  const brokenAnchors: string[] = [];
  const downgraded: string[] = [];
  const unverified: string[] = [];

  const byKey = new Map<string, BlockRefSpec>();
  for (const r of blockRefs) if (!byKey.has(r.key)) byKey.set(r.key, r);
  const uniq = [...byKey.values()];

  const reads = await Promise.all(
    uniq.map((r) =>
      executeTool("read_block", { path: r.path, anchor: `^${r.anchor}` }).then((res) => ({ r, res })),
    ),
  );

  const grays: Array<{ key: string; claim: string; content: string }> = [];

  for (const { r, res } of reads) {
    if (!res.ok) {
      if (errorIsNotFound(res.error || "")) {
        brokenAnchors.push(r.key);
        downgraded.push(r.key);
      } else {
        unverified.push(r.key); // 网络/超时 → 不降级
      }
      continue;
    }
    const content = blockContent(res.data);
    if (!content.trim()) {
      unverified.push(r.key);
      continue;
    }
    if (blockKind(res.data) === "heading") continue; // heading 指整节、只回标题行，豁免

    const ctxs = claimContextsFor(answerText, r.key).filter((c) => hasSalient(c));
    if (ctxs.length === 0) continue;

    const blockTok = hardNumericTokens(content);
    let hardSupported = false; // 某出现处被块的 strong 要素命中 → 整 key 保留
    let numericMismatch = false; // 某出现处有 strong 要素、块全未命中
    let needsJudge = false; // 纯定性 / 仅年份 → 灰区
    let judgeClaim = "";
    for (const ctx of ctxs) {
      const ct = hardNumericTokens(ctx);
      if (ct.strong.size >= 1) {
        if (matchHits(ct, blockTok).strongHit >= 1) hardSupported = true;
        else numericMismatch = true;
      } else {
        // 仅年份 或 无硬要素 → 不凭启发式定，交灰区
        needsJudge = true;
        if (!judgeClaim) judgeClaim = ctx;
      }
    }

    if (hardSupported) continue; // 任一处被 strong 支撑 → 保守保留
    if (numericMismatch) {
      // 有确凿数字错配，且无任何 strong 支撑 → 降级（vague/年份处不救活它）
      downgraded.push(r.key);
      continue;
    }
    if (needsJudge) grays.push({ key: r.key, claim: judgeClaim, content });
  }

  let judged = 0;
  if (useJudge && grays.length > 0) {
    const slice = grays.slice(0, MAX_JUDGE);
    judged = slice.length;
    const verdicts = await Promise.all(
      slice.map((g) =>
        Promise.race([
          judgeCitation(g.claim, g.content),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), JUDGE_TIMEOUT_MS)),
        ]).catch(() => null),
      ),
    );
    verdicts.forEach((v, i) => {
      if (v === false) downgraded.push(slice[i].key);
    });
  }

  return { brokenAnchors, downgraded, unverified, judged };
}
