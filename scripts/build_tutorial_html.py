#!/usr/bin/env python3
"""把新手教程 markdown 渲染成带侧栏目录的精美单页 HTML。

用法：
    python scripts/build_tutorial_html.py

输入：docs/新手教程-手把手搭建知识库.md
输出：docs/新手教程-手把手搭建知识库.html（图片用相对路径 images/tutorial/*，双击即可在浏览器打开）

依赖：markdown（见 requirements-dev.txt）。纯派生产物——内容真相源始终是那份 .md。
"""
import re
import pathlib
import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "新手教程-手把手搭建知识库.md"
OUT = ROOT / "docs" / "新手教程-手把手搭建知识库.html"


def slugify_cjk(value: str, separator: str) -> str:
    """保留中文/字母/数字的 slug（默认 slugify 会把中文全部丢掉）。"""
    value = value.strip().lower()
    value = re.sub(r"[\s\W]+", separator, value, flags=re.UNICODE)
    return value.strip(separator) or "section"


def build() -> None:
    md_text = SRC.read_text(encoding="utf-8")

    # 去掉正文里手写的「## 目录」块（侧栏已提供同等导航，避免重复）
    md_text = re.sub(r"\n## 目录\n.*?\n---\n", "\n\n---\n", md_text, count=1, flags=re.S)

    # H1 作为页面标题
    m = re.search(r"^#\s+(.+?)\s*$", md_text, flags=re.M)
    page_title = m.group(1).strip() if m else "新手教程"

    mdp = markdown.Markdown(
        extensions=["extra", "toc", "sane_lists"],
        extension_configs={"toc": {"toc_depth": "2-3", "slugify": slugify_cjk, "permalink": "#"}},
    )
    body_html = mdp.convert(md_text)
    toc_html = mdp.toc

    # img + 紧随的斜体说明 → <figure><figcaption>
    body_html = re.sub(
        r"<p>\s*(<img[^>]*>)\s*(?:<br\s*/?>)?\s*<em>(.*?)</em>\s*</p>",
        r'<figure>\1<figcaption>\2</figcaption></figure>',
        body_html,
        flags=re.S,
    )
    body_html = re.sub(r"<p>\s*(<img[^>]*>)\s*</p>", r"<figure>\1</figure>", body_html)

    html = (
        TEMPLATE.replace("__TITLE__", page_title)
        .replace("__TOC__", toc_html)
        .replace("__BODY__", body_html)
    )
    OUT.write_text(html, encoding="utf-8")
    print(f"✅ 写入 {OUT.relative_to(ROOT)}（{OUT.stat().st_size // 1024} KB）")


TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root{
  --accent:#d9770a; --accent-soft:#fff7ed; --accent-line:#fdba74;
  --bg:#ffffff; --text:#1f2733; --muted:#6b7785; --border:#e7ebf0;
  --code-bg:#0f1729; --code-text:#e6edf3; --inline-bg:#f1f4f8; --inline-text:#b4451f;
  --sidebar-bg:#fbfcfe; --row:#f8fafc;
  --maxw:880px; --sidew:300px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
  --mono: "SF Mono", "JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, "Liberation Mono", monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);
  font-size:16px;line-height:1.78;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

/* ---------- 布局 ---------- */
.layout{display:flex;align-items:flex-start;max-width:calc(var(--maxw) + var(--sidew) + 80px);margin:0 auto}
.sidebar{position:sticky;top:0;flex:0 0 var(--sidew);width:var(--sidew);height:100vh;
  overflow-y:auto;border-right:1px solid var(--border);background:var(--sidebar-bg);padding:22px 18px 60px}
.sidebar .brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px;letter-spacing:.2px;margin:4px 6px 4px}
.sidebar .brand .dot{width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
.sidebar .tagline{color:var(--muted);font-size:12px;margin:0 6px 16px;line-height:1.5}
.sidebar nav .toc>ul{list-style:none;margin:0;padding:0}
.sidebar nav ul ul{list-style:none;margin:0;padding-left:14px}
.sidebar nav li{margin:1px 0}
.sidebar nav a{display:block;padding:5px 10px;border-radius:7px;color:#3b4655;font-size:13.5px;line-height:1.45;
  border-left:2px solid transparent;transition:background .12s,color .12s}
.sidebar nav a:hover{background:#eef2f7;text-decoration:none}
.sidebar nav ul ul a{font-size:12.5px;color:var(--muted);padding:3px 10px}
.sidebar nav a.active{background:var(--accent-soft);color:var(--accent);font-weight:600;border-left-color:var(--accent)}

.content{flex:1 1 auto;min-width:0;max-width:var(--maxw);padding:40px 40px 120px;margin:0 auto}

/* ---------- 排版 ---------- */
.content h1{font-size:30px;line-height:1.3;font-weight:800;margin:6px 0 8px;letter-spacing:-.01em}
.content h2{font-size:23px;font-weight:750;margin:46px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--border);scroll-margin-top:18px}
.content h3{font-size:18.5px;font-weight:700;margin:30px 0 10px;color:#283342;scroll-margin-top:18px}
.content h4{font-size:15.5px;font-weight:700;margin:22px 0 8px;color:#37424f}
.content h2 .headerlink,.content h3 .headerlink{opacity:0;margin-left:8px;color:var(--accent-line);font-weight:400;text-decoration:none}
.content h2:hover .headerlink,.content h3:hover .headerlink{opacity:1}
.content p{margin:13px 0}
.content ul,.content ol{margin:12px 0;padding-left:24px}
.content li{margin:5px 0}
.content li>ul,.content li>ol{margin:5px 0}
.content hr{border:0;border-top:1px solid var(--border);margin:40px 0}
.content strong{font-weight:700;color:#11161d}

/* 行内 / 代码块 */
.content code{font-family:var(--mono);font-size:.88em;background:var(--inline-bg);color:var(--inline-text);
  padding:.12em .42em;border-radius:5px;border:1px solid #e3e8ef}
.content pre{background:var(--code-bg);color:var(--code-text);padding:18px 20px;border-radius:12px;
  overflow-x:auto;margin:18px 0;line-height:1.6;box-shadow:0 1px 2px rgba(15,23,41,.18)}
.content pre code{background:none;color:inherit;border:0;padding:0;font-size:13px;white-space:pre;
  font-variant-ligatures:none}

/* 表格 */
.content table{border-collapse:collapse;width:100%;margin:18px 0;font-size:14.5px;
  border:1px solid var(--border);border-radius:10px;overflow:hidden;display:table}
.content thead th{background:#f3f6fa;text-align:left;font-weight:700;color:#283342}
.content th,.content td{border-bottom:1px solid var(--border);padding:9px 13px;vertical-align:top}
.content tbody tr:nth-child(2n){background:var(--row)}
.content tbody tr:last-child td{border-bottom:0}

/* 引用框 / callout（颜色由 JS 按首个 emoji 赋类） */
.content blockquote{margin:18px 0;padding:12px 18px;border-left:4px solid var(--accent-line);
  background:var(--accent-soft);border-radius:0 10px 10px 0;color:#3b3326}
.content blockquote p{margin:6px 0}
.content blockquote.info{border-left-color:#60a5fa;background:#eff6ff;color:#1e3a5f}
.content blockquote.tip{border-left-color:#34d399;background:#ecfdf5;color:#14532d}
.content blockquote.warn{border-left-color:#fbbf24;background:#fffbeb;color:#713f12}
.content blockquote.danger{border-left-color:#f87171;background:#fef2f2;color:#7f1d1d}
.content blockquote.note{border-left-color:#a78bfa;background:#f5f3ff;color:#4c1d95}

/* 图片 / 截图 */
.content figure{margin:24px 0;text-align:center}
.content figure img{max-width:100%;height:auto;border:1px solid var(--border);border-radius:12px;
  box-shadow:0 6px 24px rgba(20,30,50,.12)}
.content figcaption{margin-top:9px;color:var(--muted);font-size:13px;font-style:italic}

/* 顶部移动端目录按钮 */
.menu-toggle{display:none}

@media (max-width:1040px){
  .layout{display:block}
  .sidebar{position:fixed;left:0;top:0;z-index:50;height:100vh;width:84%;max-width:330px;
    transform:translateX(-104%);transition:transform .22s ease;box-shadow:0 0 40px rgba(0,0,0,.18)}
  .sidebar.open{transform:translateX(0)}
  .content{padding:64px 20px 100px;max-width:100%}
  .menu-toggle{display:inline-flex;align-items:center;gap:7px;position:fixed;top:12px;left:12px;z-index:60;
    background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 13px;font-size:14px;
    font-weight:600;color:var(--text);box-shadow:0 2px 10px rgba(0,0,0,.08);cursor:pointer}
  .scrim{display:none;position:fixed;inset:0;background:rgba(15,23,41,.4);z-index:40}
  .scrim.show{display:block}
}
</style>
</head>
<body>
<button class="menu-toggle" id="menuToggle">☰ 目录</button>
<div class="scrim" id="scrim"></div>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="dot"></span>GroundMap</div>
    <div class="tagline">新手图文教程 · 手把手搭建并使用知识库</div>
    <nav>__TOC__</nav>
  </aside>
  <main class="content">
__BODY__
  </main>
</div>
<script>
// 给 callout 引用框按首个 emoji 上色
(function(){
  var map={'📌':'info','💡':'tip','ℹ':'info','⚠':'warn','✅':'tip','🔴':'danger','🔒':'note','🎓':'info','🟠':'warn'};
  document.querySelectorAll('.content blockquote').forEach(function(bq){
    var t=(bq.textContent||'').trim();
    for(var k in map){ if(t.indexOf(k)===0){ bq.classList.add(map[k]); break; } }
  });
})();
// 侧栏目录：滚动高亮当前章节
(function(){
  var links=Array.prototype.slice.call(document.querySelectorAll('.sidebar nav a'));
  var byId={}; links.forEach(function(a){ var id=decodeURIComponent((a.getAttribute('href')||'').replace(/^#/,'')); if(id) byId[id]=a; });
  var heads=Array.prototype.slice.call(document.querySelectorAll('.content h2[id], .content h3[id]'));
  if(!('IntersectionObserver' in window) || !heads.length) return;
  var visible=new Set();
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    var top=heads.filter(function(h){return visible.has(h);})[0] || null;
    if(!top){ // 取最靠近视口顶部上方的标题
      for(var i=heads.length-1;i>=0;i--){ if(heads[i].getBoundingClientRect().top<120){ top=heads[i]; break; } }
    }
    links.forEach(function(a){a.classList.remove('active');});
    if(top && byId[top.id]) byId[top.id].classList.add('active');
  },{rootMargin:'-10% 0px -75% 0px',threshold:0});
  heads.forEach(function(h){obs.observe(h);});
})();
// 移动端抽屉
(function(){
  var sb=document.getElementById('sidebar'),mt=document.getElementById('menuToggle'),sc=document.getElementById('scrim');
  function toggle(open){ sb.classList.toggle('open',open); sc.classList.toggle('show',open); }
  if(mt) mt.addEventListener('click',function(){toggle(!sb.classList.contains('open'));});
  if(sc) sc.addEventListener('click',function(){toggle(false);});
  document.querySelectorAll('.sidebar nav a').forEach(function(a){a.addEventListener('click',function(){toggle(false);});});
})();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    build()
