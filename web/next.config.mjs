/** @type {import('next').NextConfig} */
const nextConfig = {
  // gray-matter 是 CommonJS 模块；声明为 server external 让其
  // 不被 Next.js 的 server bundler 强行打包，运行时直接 require
  experimental: {
    serverComponentsExternalPackages: ["gray-matter"],
  },

  // 基础安全响应头：本地知识库工具一般在内网/本地跑，但仍应该挡住基本攻击面：
  //   - X-Content-Type-Options: nosniff   阻止 mime sniffing
  //   - X-Frame-Options: DENY              拒绝被任意页面 iframe（防 clickjack）
  //   - Referrer-Policy                    点击链接到外部站点不暴露完整 URL
  //   - Permissions-Policy                 关闭浏览器功能 API（不需要）
  //   - Strict-Transport-Security 不设：本地 HTTP 跑，加上反而坏
  //   - CSP 不设：CodeMirror / react-markdown 内联样式与 dynamic import 难精确白名单；
  //               宁缺毋滥（CSP 配错比不配更危险）。需要时建议在反代层加。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
