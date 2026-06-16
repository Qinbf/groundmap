/**
 * 引用语义判官 —— 两级核对的第 2 级，只用于**灰区**（启发式既非明显匹配也非零重叠）的引用：
 * 问一次极小的 YES/NO（"这个引用块是否真支撑论断"）。
 *
 * 只用**专用 API 判官**（DeepSeek / OpenAI 兼容），不接 Claude Code CLI：
 * 实测 `claude -p` 一次性判官对"这一段文字本身是否陈述该事实"把握不可靠（倾向于
 * "出自相关文档就算支撑"地宽容判 YES），会漏掉错配。故灰区判官仅在配了 API key 时启用；
 * 没配 → 灰区保守保留（不降级），真正的错配靠启发式的"零重叠→降级"兜住。
 */
import OpenAI from "openai";

function apiClient(): { client: OpenAI; model: string } | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" }),
      model: process.env.JUDGE_MODEL || "deepseek-v4-flash",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined }),
      model: process.env.JUDGE_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

/** 是否有可靠的（API）判官可用。CLI 判官不可靠，不计入。 */
export function judgeAvailable(): boolean {
  return !!(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * 返回 true=支撑 / false=不支撑 / null=不确定（无 key、失败、回复模糊）。
 * 调用方只对明确的 false 降级，对 null / true 保守不降级。
 */
export async function judgeCitation(claim: string, block: string): Promise<boolean | null> {
  const j = apiClient();
  if (!j) return null;
  try {
    const res = await j.client.chat.completions.create({
      model: j.model,
      temperature: 0,
      max_tokens: 4,
      messages: [
        {
          role: "system",
          content:
            "核对引用是否精确。把【论断】拆成关键事实要素（日期、数字、专有名词、主体、事件）；" +
            "只看【引用文本这一段文字本身】，判断这些关键要素是否实质出现在该段里（翻译/同义算出现；" +
            "仅主题相关、或该段是过渡句/引子/元评论 不算）。出现 → YES；该段一个关键要素都不含 → NO。只回 YES 或 NO。",
        },
        { role: "user", content: `论断：${claim}\n\n引用文本：${block}` },
      ],
    });
    const ans = (res.choices[0]?.message?.content || "").toUpperCase().match(/\b(YES|NO)\b/);
    return ans ? ans[1] === "YES" : null;
  } catch {
    return null;
  }
}
